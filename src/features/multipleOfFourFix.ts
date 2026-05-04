import { analyzePixelDimensions } from "../domain/multipleOfFour";

function logJSON(label: string, payload: unknown): void {
  try {
    console.log(label, JSON.stringify(payload));
  } catch {
    console.log(label, payload);
  }
}
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
 * Converts world-space axis-aligned bounding-box dimensions to the local dimensions
 * needed by resizeWithoutConstraints so that the node's world AABB equals (worldWidth × worldHeight).
 * Handles parent rotation and non-uniform scale; assumes no shear.
 */
function worldDimsToLocalDims(
  parentTransform: Transform | null,
  worldWidth: number,
  worldHeight: number
): { width: number; height: number } {
  if (!parentTransform) return { width: worldWidth, height: worldHeight };

  const [[a, b], [c, d]] = parentTransform;
  const sx = Math.sqrt(a * a + c * c); // scale along local x-axis
  const sy = Math.sqrt(b * b + d * d); // scale along local y-axis

  if (sx < 1e-10 || sy < 1e-10) return { width: worldWidth, height: worldHeight };

  const cosT = Math.abs(a / sx); // |cos θ|
  const sinT = Math.abs(c / sx); // |sin θ|
  const cos2T = cosT * cosT - sinT * sinT; // cos(2θ)

  if (Math.abs(cos2T) < 1e-6) {
    // Near 45° / 135° — system is indeterminate; swap heuristic
    return { width: worldHeight / sy, height: worldWidth / sx };
  }

  return {
    width: Math.abs((cosT * worldWidth - sinT * worldHeight) / (sx * cos2T)),
    height: Math.abs((cosT * worldHeight - sinT * worldWidth) / (sy * cos2T)),
  };
}

/**
 * Converts a world-space point to the local coordinate space of a parent node,
 * correctly handling rotation and scale via the inverse of absoluteTransform.
 */
function worldToLocal(
  parentTransform: Transform,
  worldX: number,
  worldY: number
): { x: number; y: number } {
  const [[a, b, tx], [c, d, ty]] = parentTransform;
  const det = a * d - b * c;
  if (Math.abs(det) < 1e-10) {
    // Degenerate transform (collapsed node), fall back to translation only.
    return { x: worldX - tx, y: worldY - ty };
  }
  const dx = worldX - tx;
  const dy = worldY - ty;
  return {
    x: (d * dx - b * dy) / det,
    y: (a * dy - c * dx) / det,
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

/** Создаёт обёртку поверх node в его родителе, занимая ту же локальную позицию. */
function wrapSceneNodeInFixFrame(node: SceneNode): FrameNode {
  const parent = node.parent;
  if (!canInsertIntoParent(parent)) {
    throw new Error("Нельзя вставить обёртку в родителя");
  }
  if (parent.type === "COMPONENT") {
    throw new Error("Родитель — главный компонент");
  }

  const outerParent = parent as SceneNode | PageNode;
  const index = parent.children.indexOf(node);
  const localX = node.x;
  const localY = node.y;
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

  // Перекладываем узел внутрь обёртки. Figma сама пересчитает relativeTransform
  // так, чтобы абсолютная позиция/поворот узла сохранились.
  // НЕЛЬЗЯ вручную делать node.x = 0; node.y = 0 — для повёрнутых/масштабированных
  // нод это сломало бы визуальную позицию (x/y — это пивот, а не визуальный угол).
  wrapper.appendChild(node);
  node.name = `${NO4_CHILD_NAME_PREFIX}${baseNameForWrapper}`;
  // localX, localY больше не используются — оставлены только для возможной отладки.
  void localX;
  void localY;

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
    return false;
  }
  const outerScene = outer as SceneNode | PageNode;

  // absoluteTransform is available on all SceneNodes; PAGE children live in world space.
  const parentTransform: Transform | null =
    "absoluteTransform" in outerScene ? outerScene.absoluteTransform : null;
  // parentOrigin is the translation part only — kept for logging.
  const parentOrigin = parentTransform
    ? { x: parentTransform[0][2], y: parentTransform[1][2] }
    : outerScene.type === "PAGE"
      ? { x: 0, y: 0 }
      : null;
  if (!parentOrigin) {
    return false;
  }

  // Сдвигаем детей на дельту перемещения обёртки в её локальной системе координат.
  // Это сохраняет абсолютную позицию каждого ребёнка независимо от поворота/scale.
  const oldWrapperX = wrapper.x;
  const oldWrapperY = wrapper.y;
  const childSnap: Array<{ node: SceneNode; x: number; y: number }> = [];
  for (const child of wrapper.children) {
    childSnap.push({
      node: child as SceneNode,
      x: child.x,
      y: child.y,
    });
  }
  logJSON("[mo4] applyPadding: plan", {
    parentOrigin,
    expandedDocumentRect,
    padLeft,
    padTop,
    parentAutolayout: parentHasAutoLayout(outerScene),
    oldWrapperLocal: { x: oldWrapperX, y: oldWrapperY },
    childSnap: childSnap.map((c) => ({ name: c.node.name, x: c.x, y: c.y })),
  });

  const localDims = worldDimsToLocalDims(
    parentTransform,
    expandedDocumentRect.width,
    expandedDocumentRect.height
  );
  wrapper.resizeWithoutConstraints(localDims.width, localDims.height);
  if (!parentHasAutoLayout(outerScene)) {
    // worldToLocal maps a world point to the frame's local *origin*. But the frame's
    // axis-aligned bounding box (AABB) top-left is generally not the same as its origin
    // when the parent has rotation. We compute the offset from origin→AABB-top-left and
    // subtract it so the AABB aligns with expandedDocumentRect.
    let targetWorldX = expandedDocumentRect.x;
    let targetWorldY = expandedDocumentRect.y;
    if (parentTransform) {
      const [[a, b], [c, d]] = parentTransform;
      const lw = localDims.width;
      const lh = localDims.height;
      // Minimum x/y offsets of the four rotated corners relative to the origin.
      targetWorldX -= Math.min(0, a * lw, b * lh, a * lw + b * lh);
      targetWorldY -= Math.min(0, c * lw, d * lh, c * lw + d * lh);
    }
    const localPos = parentTransform
      ? worldToLocal(parentTransform, targetWorldX, targetWorldY)
      : { x: targetWorldX, y: targetWorldY }; // PAGE: world === local
    wrapper.x = localPos.x;
    wrapper.y = localPos.y;
  }
  const dx = wrapper.x - oldWrapperX;
  const dy = wrapper.y - oldWrapperY;

  for (const { node, x, y } of childSnap) {
    node.x = x - dx;
    node.y = y - dy;
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
        wrapper = wrapSceneNodeInFixFrame(node);
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
  };
}
