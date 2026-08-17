import { toDocBox } from "../domain/psdLayout";
import type { PsdBox } from "../domain/psdLayout";
import type { PsdExportTreeNode, PsdSolidFill } from "../messages";
import {
  getAbsoluteRenderBounds,
  hasMaskChild,
  hasVisibleEffects,
  hasVisiblePaint,
  isPsdContainerType,
} from "./nodeQueries";

/** Меньше половины пикселя — в PSD такой слой всё равно не попадёт. */
const MIN_SIZE = 0.5;

export type PsdTree = {
  children: PsdExportTreeNode[];
  /** Листья в том же порядке, что и их index в дереве. */
  leaves: SceneNode[];
  warnings: string[];
  docWidth: number;
  docHeight: number;
  estimatedPixelBytes: number;
};

function intersectBox(box: PsdBox, clip: PsdBox | null): PsdBox {
  if (!clip) {
    return box;
  }
  const x = Math.max(box.x, clip.x);
  const y = Math.max(box.y, clip.y);
  const right = Math.min(box.x + box.width, clip.x + clip.width);
  const bottom = Math.min(box.y + box.height, clip.y + clip.height);
  return { x, y, width: right - x, height: bottom - y };
}

function isEmptyBox(box: PsdBox): boolean {
  return box.width < MIN_SIZE || box.height < MIN_SIZE;
}

function visiblePaints(value: unknown): Paint[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return (value as readonly Paint[]).filter((paint) => paint.visible !== false);
}

/**
 * Сплошная заливка корневого фрейма → синтетический нижний слой. В PSD нет
 * слоя-подложки, поэтому иначе залитый фрейм экспортировался бы прозрачным.
 */
function rootSolidFill(root: SceneNode): PsdSolidFill | null {
  if (!("fills" in root)) {
    return null;
  }
  const paints = visiblePaints(root.fills);
  if (paints.length !== 1) {
    return null;
  }
  const paint = paints[0];
  if (paint.type !== "SOLID") {
    return null;
  }
  return {
    r: Math.round(paint.color.r * 255),
    g: Math.round(paint.color.g * 255),
    b: Math.round(paint.color.b * 255),
    opacity: typeof paint.opacity === "number" ? paint.opacity : 1,
  };
}

/** Пустой контейнер тоже схлопывается, но это норма и в предупреждения не идёт. */
const EMPTY_CONTAINER = "пустой контейнер";

/**
 * Контейнер уходит одним плоским слоем, если его нельзя честно разложить по
 * детям: групповая прозрачность, изолированный режим наложения и эффекты
 * считаются от композита, а собственную заливку контейнера не отрендерить
 * отдельно от содержимого.
 */
function mustFlatten(node: SceneNode & ChildrenMixin): string | null {
  if (node.children.length === 0) {
    return EMPTY_CONTAINER;
  }
  if (hasMaskChild(node)) {
    return "внутри маска";
  }
  if ("opacity" in node && node.opacity < 1) {
    return "своя прозрачность";
  }
  if ("blendMode" in node && node.blendMode !== "PASS_THROUGH") {
    return "свой режим наложения";
  }
  if (hasVisibleEffects(node)) {
    return "свои эффекты";
  }
  if (node.type !== "GROUP" && hasVisiblePaint(node)) {
    return "своя заливка или обводка";
  }
  return null;
}

function clipsOwnContent(node: SceneNode): boolean {
  return "clipsContent" in node && node.clipsContent === true;
}

type WalkContext = {
  originX: number;
  originY: number;
  scale: number;
  leaves: SceneNode[];
  warnings: string[];
  estimatedPixelBytes: number;
};

function makeLeaf(
  node: SceneNode,
  renderBox: PsdBox,
  boundsBox: PsdBox,
  clipBox: PsdBox | null,
  ctx: WalkContext
): PsdExportTreeNode {
  const index = ctx.leaves.length;
  ctx.leaves.push(node);
  const visible = intersectBox(renderBox, clipBox);
  ctx.estimatedPixelBytes +=
    Math.round(visible.width) * Math.round(visible.height) * 4;
  return {
    kind: "leaf",
    nodeId: node.id,
    name: node.name,
    index,
    renderBox,
    boundsBox,
    clipBox,
  };
}

function walk(
  node: SceneNode,
  clipBox: PsdBox | null,
  ctx: WalkContext
): PsdExportTreeNode | null {
  if (!node.visible) {
    return null;
  }
  if (node.type === "SLICE") {
    return null;
  }
  if ("opacity" in node && node.opacity === 0) {
    return null;
  }

  const bounds = node.absoluteBoundingBox;
  if (!bounds) {
    return null;
  }
  const render = getAbsoluteRenderBounds(node) || bounds;
  const renderBox = toDocBox(render, ctx.originX, ctx.originY, ctx.scale);
  const boundsBox = toDocBox(bounds, ctx.originX, ctx.originY, ctx.scale);
  if (isEmptyBox(renderBox)) {
    return null;
  }
  if (isEmptyBox(intersectBox(renderBox, clipBox))) {
    return null;
  }

  if (!isPsdContainerType(node)) {
    return makeLeaf(node, renderBox, boundsBox, clipBox, ctx);
  }

  const flattenReason = mustFlatten(node);
  if (flattenReason) {
    if (flattenReason !== EMPTY_CONTAINER) {
      ctx.warnings.push(`${node.name}: слой собран целиком — ${flattenReason}`);
    }
    return makeLeaf(node, renderBox, boundsBox, clipBox, ctx);
  }

  const childClip = clipsOwnContent(node)
    ? intersectBox(boundsBox, clipBox)
    : clipBox;
  const children: PsdExportTreeNode[] = [];
  for (const child of node.children) {
    const built = walk(child, childClip, ctx);
    if (built) {
      children.push(built);
    }
  }
  // Пустых папок в PSD быть не должно: если все дети отсеялись, отсеивается и группа.
  if (children.length === 0) {
    return null;
  }
  return { kind: "group", nodeId: node.id, name: node.name, children };
}

export function buildPsdTree(root: SceneNode, scale: number): PsdTree {
  const bounds = root.absoluteBoundingBox;
  if (!bounds) {
    throw new Error("У фрейма нет absoluteBoundingBox");
  }

  const docWidth = Math.max(1, Math.round(bounds.width * scale));
  const docHeight = Math.max(1, Math.round(bounds.height * scale));
  const ctx: WalkContext = {
    originX: bounds.x,
    originY: bounds.y,
    scale,
    leaves: [],
    warnings: [],
    estimatedPixelBytes: 0,
  };

  const docBox: PsdBox = { x: 0, y: 0, width: docWidth, height: docHeight };
  const rootClip = clipsOwnContent(root) ? docBox : null;

  const children: PsdExportTreeNode[] = [];

  const background = rootSolidFill(root);
  if (background) {
    children.push({ kind: "solid", name: "Фон", fill: background });
  } else if ("fills" in root && visiblePaints(root.fills).length > 0) {
    ctx.warnings.push(
      "Фон фрейма не перенесён — залейте его сплошным цветом или вынесите отдельным слоем"
    );
  }
  if ("strokes" in root && visiblePaints(root.strokes).length > 0) {
    ctx.warnings.push("Обводка корневого фрейма в PSD не переносится");
  }

  if (isPsdContainerType(root) && !hasMaskChild(root)) {
    for (const child of root.children) {
      const built = walk(child, rootClip, ctx);
      if (built) {
        children.push(built);
      }
    }
  } else {
    // Корень с маской (или не-контейнер) раскладывать не на что — один слой.
    const render = getAbsoluteRenderBounds(root) || bounds;
    const renderBox = toDocBox(render, ctx.originX, ctx.originY, ctx.scale);
    const boundsBox = toDocBox(bounds, ctx.originX, ctx.originY, ctx.scale);
    children.push(makeLeaf(root, renderBox, boundsBox, rootClip, ctx));
  }

  return {
    children,
    leaves: ctx.leaves,
    warnings: ctx.warnings,
    docWidth,
    docHeight,
    estimatedPixelBytes: ctx.estimatedPixelBytes,
  };
}
