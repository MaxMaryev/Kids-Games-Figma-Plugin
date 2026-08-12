import { analyzePixelDimensions } from "../domain/multipleOfFour";
import { alignNodeToWorldPoint, worldVectorToLocal } from "../figma/geometry";
import {
  canInsertIntoParent,
  getAbsoluteRenderBounds,
  parentHasAutoLayout,
} from "../figma/nodeQueries";
import type { MultipleOfFourFixResultMessage } from "../messages";
import {
  MO4_WRAPPER_PLUGIN_KEY,
  MO4_WRAPPER_PLUGIN_VALUE,
  NO4_CHILD_NAME_PREFIX,
} from "./multipleOfFourPadding";

/** Лог одного запуска: уходит и в консоль, и в UI (панель «Диагностика»). */
const DEBUG_LOG_LIMIT = 400;
let debugLog: string[] = [];

function resetDebugLog(): void {
  debugLog = [];
}

function logJSON(label: string, payload: unknown): void {
  let text: string;
  try {
    text = `${label} ${JSON.stringify(payload)}`;
  } catch {
    text = `${label} <не сериализуется>`;
  }
  if (debugLog.length < DEBUG_LOG_LIMIT) {
    debugLog.push(text);
  }
  console.log(text);
}

function isMo4WrapperFrame(node: BaseNode): boolean {
  return (
    node.type === "FRAME" &&
    node.getPluginData(MO4_WRAPPER_PLUGIN_KEY) === MO4_WRAPPER_PLUGIN_VALUE
  );
}

function getExistingMo4WrapperForNode(node: SceneNode): FrameNode | null {
  if (node.type === "FRAME" && isMo4WrapperFrame(node)) {
    return node;
  }
  const parent = node.parent;
  if (parent && isMo4WrapperFrame(parent)) {
    return parent as FrameNode;
  }
  return null;
}

/**
 * Локальные размеры, при которых мировой AABB узла станет (worldWidth × worldHeight).
 * Мировой AABB локального прямоугольника (lw, lh) в системе родителя:
 *   width  = |a|·lw + |b|·lh
 *   height = |c|·lw + |d|·lh
 * Отсюда обычное решение системы 2×2 — учитывает поворот и неравномерный масштаб.
 * Возвращает знаковые значения: функция используется и для добора остатка.
 * exact = false, когда система вырождена (поворот ≈45° при равном масштабе: мировой
 * AABB там всегда квадратный, и неквадратная цель недостижима в принципе).
 */
function worldDimsToLocalDims(
  parentTransform: Transform | null,
  worldWidth: number,
  worldHeight: number
): { width: number; height: number; exact: boolean } {
  if (!parentTransform) {
    return { width: worldWidth, height: worldHeight, exact: true };
  }

  const [[a, b], [c, d]] = parentTransform;
  const p = Math.abs(a);
  const q = Math.abs(b);
  const r = Math.abs(c);
  const s = Math.abs(d);
  const det = p * s - q * r;
  const sx = Math.sqrt(a * a + c * c);
  const sy = Math.sqrt(b * b + d * d);

  // Порог берём относительно масштаба: det = sx·sy·cos2θ, и абсолютное значение
  // само по себе ничего не говорит о том, насколько система вырождена.
  if (Math.abs(det) < 1e-6 * Math.max(1e-12, sx * sy)) {
    // Однозначного решения нет — раскладываем по осям масштаба и помечаем как неточное.
    return {
      width: sx < 1e-10 ? worldWidth : worldWidth / sx,
      height: sy < 1e-10 ? worldHeight : worldHeight / sy,
      exact: false,
    };
  }

  return {
    width: (s * worldWidth - q * worldHeight) / det,
    height: (p * worldHeight - r * worldWidth) / det,
    exact: true,
  };
}

function copyLayoutSlotFromNodeToWrapper(
  source: SceneNode,
  wrapper: FrameNode,
  outerParent: SceneNode | PageNode
): void {
  if (!parentHasAutoLayout(outerParent)) {
    return;
  }
  if (
    "layoutSizingHorizontal" in source &&
    "layoutSizingHorizontal" in wrapper
  ) {
    wrapper.layoutSizingHorizontal = source.layoutSizingHorizontal;
    wrapper.layoutSizingVertical = source.layoutSizingVertical;
  }
  if ("layoutAlign" in source && "layoutAlign" in wrapper) {
    wrapper.layoutAlign = source.layoutAlign;
  }
  if ("layoutGrow" in source && "layoutGrow" in wrapper) {
    wrapper.layoutGrow = source.layoutGrow;
  }
  if ("layoutPositioning" in source && "layoutPositioning" in wrapper) {
    wrapper.layoutPositioning = source.layoutPositioning;
  }
}

/**
 * Создаёт обёртку поверх node в его родителе и сразу ставит её на место исходного слоя.
 * sourceBox — absoluteBoundingBox узла, снятый до любых изменений.
 */
function wrapSceneNodeInFixFrame(node: SceneNode, sourceBox: Rect): FrameNode {
  const parent = node.parent;
  if (!canInsertIntoParent(parent)) {
    throw new Error("Нельзя вставить обёртку в родителя");
  }
  if (parent.type === "COMPONENT") {
    throw new Error("Родитель — главный компонент");
  }

  const outerParent = parent as SceneNode | PageNode;
  const index = parent.children.indexOf(node);
  const localWidth = node.width;
  const localHeight = node.height;
  const originalNodeName = node.name;
  const baseNameForWrapper = originalNodeName.startsWith(NO4_CHILD_NAME_PREFIX)
    ? originalNodeName.slice(NO4_CHILD_NAME_PREFIX.length)
    : originalNodeName;

  const wrapper = figma.createFrame();
  wrapper.name = baseNameForWrapper;
  wrapper.clipsContent = false;
  wrapper.fills = [];
  wrapper.strokes = [];
  wrapper.layoutMode = "NONE";
  wrapper.setPluginData(MO4_WRAPPER_PLUGIN_KEY, MO4_WRAPPER_PLUGIN_VALUE);

  parent.insertChild(index, wrapper);
  wrapper.resizeWithoutConstraints(
    Math.max(1, localWidth),
    Math.max(1, localHeight)
  );
  copyLayoutSlotFromNodeToWrapper(node, wrapper, outerParent);

  // Свежесозданный фрейм встаёт в локальные (0,0) родителя. Ставим его на место
  // исходного слоя сразу же: иначе он раздувает bbox родителя-группы (её origin
  // тут же уезжает, обесценивая посчитанные координаты), а любой ранний выход
  // ниже по коду оставил бы фрейм вдалеке от картинки. При auto-layout позицией
  // владеет раскладка — не вмешиваемся.
  if (!parentHasAutoLayout(outerParent)) {
    const wrapperBefore = wrapper.absoluteBoundingBox;
    const report = alignNodeToWorldPoint(wrapper, sourceBox.x, sourceBox.y);
    logJSON("[mo4] wrap: align wrapper to source", {
      sourceBox,
      wrapperBefore,
      report,
    });
  }
  const nodeBoxBeforeAppend = node.absoluteBoundingBox;

  // appendChild сохраняет relativeTransform, а НЕ абсолютную позицию: узел остаётся
  // с теми же локальными x/y и уезжает на разницу origin'ов старого родителя и обёртки.
  // Поэтому возвращаем его на место замером. Обёртка не повёрнута относительно
  // родителя, так что мировая ориентация узла не меняется и достаточно совместить
  // левый верхний угол bbox. Вручную ставить node.x = 0 нельзя — для повёрнутых нод
  // x/y это пивот, а не визуальный угол.
  wrapper.appendChild(node);
  node.name = `${NO4_CHILD_NAME_PREFIX}${baseNameForWrapper}`;
  const nodeBoxAfterAppend = node.absoluteBoundingBox;
  const restoreReport = nodeBoxBeforeAppend
    ? alignNodeToWorldPoint(node, nodeBoxBeforeAppend.x, nodeBoxBeforeAppend.y)
    : null;
  logJSON("[mo4] wrap: after appendChild", {
    nodeBoxBeforeAppend,
    nodeBoxAfterAppend,
    restoreReport,
    nodeBoxRestored: node.absoluteBoundingBox,
    nodeLocal: { x: node.x, y: node.y, w: node.width, h: node.height },
    wrapperBox: wrapper.absoluteBoundingBox,
    wrapperLocal: { x: wrapper.x, y: wrapper.y, w: wrapper.width, h: wrapper.height },
  });

  return wrapper;
}

/**
 * Подгоняет размер и положение обёртки под absoluteRenderBounds контента (обводки и т.д.)
 * и при необходимости добавляет паддинг до кратности 4. Выполняется и когда размеры
 * уже кратны 4 — иначе фрейм остался бы по width/height без учёта обводки.
 * Если задан originalRenderBounds — опорный bbox сразу после wrap; иначе читается с обёртки.
 */
function applyPaddingToWrapperFrame(
  wrapper: FrameNode,
  originalRenderBounds: Rect | null
): boolean {
  const renderBounds = originalRenderBounds ?? getAbsoluteRenderBounds(wrapper);
  logJSON("[mo4] applyPadding: input", {
    wrapperName: wrapper.name,
    fromOriginal: Boolean(originalRenderBounds),
    renderBounds,
    wrapperBefore: { x: wrapper.x, y: wrapper.y, w: wrapper.width, h: wrapper.height },
  });
  if (!renderBounds) {
    logJSON("[mo4] applyPadding: no renderBounds, skip", {});
    return false;
  }

  const analysis = analyzePixelDimensions(
    renderBounds.width,
    renderBounds.height
  );
  logJSON("[mo4] applyPadding: analysis", analysis);

  // Считаем паддинг от фактической (float) разницы target − renderBounds,
  // а размер обёртки берём ровно target — чтобы фрейм был кратен 4 без хвостов.
  const totalDeltaW = analysis.targetWidth - renderBounds.width;
  const totalDeltaH = analysis.targetHeight - renderBounds.height;
  const padLeft = totalDeltaW / 2;
  const padTop = totalDeltaH / 2;
  const expandedDocumentRect: Rect = {
    x: renderBounds.x - padLeft,
    y: renderBounds.y - padTop,
    width: analysis.targetWidth,
    height: analysis.targetHeight,
  };

  const outer = wrapper.parent;
  if (!canInsertIntoParent(outer)) {
    logJSON("[mo4] applyPadding: bad outer parent, skip", {});
    return false;
  }
  const outerScene = outer as SceneNode | PageNode;
  const autoLayoutParent = parentHasAutoLayout(outerScene);

  // Позиции детей снимаем в мировых координатах: локальные x/y недостоверны, если
  // родитель — группа, у которой origin пересчитывается на каждое изменение bbox.
  const childSnap: Array<{ node: SceneNode; worldX: number; worldY: number }> = [];
  for (const child of wrapper.children) {
    const scene = child as SceneNode;
    const box = scene.absoluteBoundingBox;
    childSnap.push({
      node: scene,
      worldX: box ? box.x : Number.NaN,
      worldY: box ? box.y : Number.NaN,
    });
  }
  const wrapperBoxBefore = wrapper.absoluteBoundingBox;

  logJSON("[mo4] applyPadding: plan", {
    expandedDocumentRect,
    padLeft,
    padTop,
    parentType: outerScene.type,
    parentAutolayout: autoLayoutParent,
    wrapperBoxBefore,
    childSnap: childSnap.map((c) => ({ name: c.node.name, worldX: c.worldX, worldY: c.worldY })),
  });

  // Матрицу родителя читаем непосредственно перед использованием — она протухает
  // после каждого изменения детей группы.
  const parentTransform: Transform | null =
    "absoluteTransform" in outerScene ? outerScene.absoluteTransform : null;
  const localDims = worldDimsToLocalDims(
    parentTransform,
    expandedDocumentRect.width,
    expandedDocumentRect.height
  );
  wrapper.resizeWithoutConstraints(
    Math.max(0.01, localDims.width),
    Math.max(0.01, localDims.height)
  );

  // Проверочный проход: сверяем фактический мировой размер и добираем остаток
  // тем же решением, но уже по свежей матрице.
  const measured = localDims.exact ? wrapper.absoluteBoundingBox : null;
  if (measured) {
    const residualW = expandedDocumentRect.width - measured.width;
    const residualH = expandedDocumentRect.height - measured.height;
    if (Math.abs(residualW) > 0.01 || Math.abs(residualH) > 0.01) {
      const freshTransform: Transform | null =
        "absoluteTransform" in outerScene ? outerScene.absoluteTransform : null;
      const correction = worldDimsToLocalDims(
        freshTransform,
        residualW,
        residualH
      );
      logJSON("[mo4] applyPadding: size correction", {
        measured: { w: measured.width, h: measured.height },
        residualW,
        residualH,
        correction,
      });
      if (correction.exact) {
        wrapper.resizeWithoutConstraints(
          Math.max(0.01, wrapper.width + correction.width),
          Math.max(0.01, wrapper.height + correction.height)
        );
      }
    }
  }

  if (!autoLayoutParent) {
    const wrapperBoxAfterResize = wrapper.absoluteBoundingBox;
    const wrapperReport = alignNodeToWorldPoint(
      wrapper,
      expandedDocumentRect.x,
      expandedDocumentRect.y
    );
    logJSON("[mo4] applyPadding: align wrapper", {
      wrapperBoxAfterResize,
      report: wrapperReport,
    });
    // Обёртка переехала — возвращаем каждого ребёнка в его исходную мировую точку.
    for (const { node, worldX, worldY } of childSnap) {
      if (Number.isNaN(worldX) || Number.isNaN(worldY)) {
        logJSON("[mo4] applyPadding: child без bbox, не двигаем", { name: node.name });
        continue;
      }
      const boxBeforeRestore = node.absoluteBoundingBox;
      const localBeforeRestore = { x: node.x, y: node.y };
      const childReport = alignNodeToWorldPoint(node, worldX, worldY);
      logJSON("[mo4] applyPadding: restore child", {
        name: node.name,
        type: node.type,
        boxBeforeRestore,
        localBeforeRestore,
        report: childReport,
        localAfterRestore: { x: node.x, y: node.y },
      });
    }
  } else {
    // Позицией обёртки владеет auto-layout, поэтому держим содержимое в её локальных
    // координатах: контент должен отступить от края фрейма ровно на паддинг.
    const anchorX = wrapperBoxBefore ? wrapperBoxBefore.x : renderBounds.x;
    const anchorY = wrapperBoxBefore ? wrapperBoxBefore.y : renderBounds.y;
    const shift = worldVectorToLocal(
      wrapper.absoluteTransform,
      padLeft - (renderBounds.x - anchorX),
      padTop - (renderBounds.y - anchorY)
    );
    logJSON("[mo4] applyPadding: autolayout shift", shift);
    for (const { node } of childSnap) {
      node.x += shift.x;
      node.y += shift.y;
    }
  }

  logJSON("[mo4] applyPadding: AFTER", {
    wrapper: { x: wrapper.x, y: wrapper.y, w: wrapper.width, h: wrapper.height },
    wrapperAbs: wrapper.absoluteBoundingBox,
    wrapperRender: wrapper.absoluteRenderBounds,
    children: wrapper.children.map((c) => ({
      name: c.name,
      local: { x: c.x, y: c.y, w: c.width, h: c.height },
      abs: "absoluteBoundingBox" in c ? c.absoluteBoundingBox : null,
    })),
  });

  // Успех: подгонка под render bounds и/или паддинг до кратности 4 (в т.ч. при analysis.ok).
  return true;
}

function sortNodesForStableWrap(nodes: SceneNode[]): SceneNode[] {
  return [...nodes].sort((a, b) => {
    const parentA = a.parent;
    const parentB = b.parent;
    if (!parentA || !parentB || parentA.id !== parentB.id) {
      return 0;
    }
    const children = (parentA as ChildrenMixin).children;
    return children.indexOf(b) - children.indexOf(a);
  });
}

export function runMultipleOfFourFix(): MultipleOfFourFixResultMessage {
  resetDebugLog();
  const selection = sortNodesForStableWrap([...figma.currentPage.selection]);
  const errors: string[] = [];
  let fixedParents = 0;
  let skipped = 0;
  const wrappersToSelect: FrameNode[] = [];

  if (selection.length === 0) {
    figma.notify("Нет выделения");
    return {
      type: "multipleOfFourFixResult",
      ok: true,
      fixedParents: 0,
      skipped: 0,
      errors: [],
      debug: debugLog.slice(),
    };
  }

  const wrappersSeen = new Set<string>();

  for (const node of selection) {
    const parent = node.parent;
    if (!canInsertIntoParent(parent)) {
      errors.push(`${node.name}: нельзя вставить слой в родителя`);
      continue;
    }
    if (parent.type === "COMPONENT") {
      errors.push(
        `${node.name}: родитель — главный компонент; изменение затронет все инстансы, пропуск.`
      );
      continue;
    }

    try {
      const existing = getExistingMo4WrapperForNode(node);
      let wrapper: FrameNode;
      let originalRenderBounds: Rect | null;
      if (existing) {
        wrapper = existing;
        originalRenderBounds = null;
        logJSON("[mo4] reuse existing wrapper", {
          name: existing.name,
          rect: { x: existing.x, y: existing.y, w: existing.width, h: existing.height },
          abs: existing.absoluteBoundingBox,
          render: existing.absoluteRenderBounds,
        });
      } else {
        const absBox = "absoluteBoundingBox" in node ? node.absoluteBoundingBox : null;
        originalRenderBounds = getAbsoluteRenderBounds(node);
        logJSON("[mo4] BEFORE wrap", {
          name: node.name,
          type: node.type,
          local: { x: node.x, y: node.y, w: node.width, h: node.height },
          absBox,
          renderBounds: originalRenderBounds,
          parentType: parent.type,
          parentName: "name" in parent ? parent.name : "(no name)",
        });
        // Проверяем ДО оборачивания: без bbox обёртке неоткуда взять позицию, и слой
        // остался бы обёрнут фреймом, брошенным в локальных (0,0) родителя.
        if (!originalRenderBounds || !absBox) {
          logJSON("[mo4] skip: нет bbox, не оборачиваем", { name: node.name });
          skipped++;
          continue;
        }
        wrapper = wrapSceneNodeInFixFrame(node, absBox);
        logJSON("[mo4] AFTER wrap", {
          wrapper: { x: wrapper.x, y: wrapper.y, w: wrapper.width, h: wrapper.height },
          wrapperAbs: wrapper.absoluteBoundingBox,
          wrapperRender: wrapper.absoluteRenderBounds,
          children: wrapper.children.map((c) => ({
            name: c.name,
            local: { x: c.x, y: c.y, w: c.width, h: c.height },
            abs: "absoluteBoundingBox" in c ? c.absoluteBoundingBox : null,
          })),
        });
      }

      if (wrappersSeen.has(wrapper.id)) {
        continue;
      }
      wrappersSeen.add(wrapper.id);
      wrappersToSelect.push(wrapper);

      const changed = applyPaddingToWrapperFrame(wrapper, originalRenderBounds);
      if (changed) {
        fixedParents++;
      } else {
        skipped++;
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      errors.push(`${node.name}: ${text}`);
    }
  }

  if (wrappersToSelect.length > 0) {
    figma.currentPage.selection = wrappersToSelect;
  }

  const ok = errors.length === 0;
  if (fixedParents > 0) {
    figma.notify(`Готово: обновлено контейнеров: ${fixedParents}`);
  }

  return {
    type: "multipleOfFourFixResult",
    ok,
    fixedParents,
    skipped,
    errors,
    debug: debugLog.slice(),
  };
}
