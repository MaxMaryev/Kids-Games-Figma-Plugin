export function parentHasAutoLayout(parent: SceneNode | PageNode): boolean {
  return "layoutMode" in parent && parent.layoutMode !== "NONE";
}

export function getAbsoluteRenderBounds(
  node: SceneNode
): Rect | null {
  if (!("absoluteRenderBounds" in node)) {
    return null;
  }
  return node.absoluteRenderBounds;
}

export function canInsertIntoParent(
  parent: BaseNode | null
): parent is BaseNode & ChildrenMixin {
  return Boolean(parent && "insertChild" in parent);
}

export function isPageLikeParent(parent: BaseNode): boolean {
  return parent.type === "PAGE" || parent.type === "DOCUMENT";
}

/**
 * Типы, которые в PSD становятся папкой. BOOLEAN_OPERATION сюда не входит
 * намеренно: у него есть children, но это операнды, а не слои.
 */
export function isPsdContainerType(node: SceneNode): node is SceneNode &
  ChildrenMixin {
  return (
    node.type === "FRAME" ||
    node.type === "GROUP" ||
    node.type === "COMPONENT" ||
    node.type === "COMPONENT_SET" ||
    node.type === "INSTANCE" ||
    node.type === "SECTION"
  );
}

export function hasVisibleEffects(node: SceneNode): boolean {
  if (!("effects" in node)) {
    return false;
  }
  const effects = node.effects;
  if (!Array.isArray(effects)) {
    return false;
  }
  return effects.some((effect) => effect.visible !== false);
}

function hasVisiblePaintList(paints: unknown): boolean {
  if (!Array.isArray(paints)) {
    return false;
  }
  return (paints as readonly Paint[]).some((paint) => paint.visible !== false);
}

/** Собственная заливка или обводка контейнера — её нельзя отрендерить отдельно от детей. */
export function hasVisiblePaint(node: SceneNode): boolean {
  const fills = "fills" in node ? node.fills : null;
  const strokes = "strokes" in node ? node.strokes : null;
  return hasVisiblePaintList(fills) || hasVisiblePaintList(strokes);
}

export function hasMaskChild(node: SceneNode & ChildrenMixin): boolean {
  return node.children.some(
    (child) => "isMask" in child && child.isMask === true
  );
}

/**
 * Путь индексов от корня документа до узла. В Figma children[0] — нижний слой,
 * поэтому в панели Layers порядок обратный: больший индекс = выше.
 */
function layerOrderPath(node: SceneNode): number[] {
  const path: number[] = [];
  let current: BaseNode = node;
  while (current.parent) {
    const parent: BaseNode = current.parent;
    if (!("children" in parent)) {
      break;
    }
    path.unshift((parent.children as readonly BaseNode[]).indexOf(current));
    current = parent;
  }
  return path;
}

/** Порядок как в панели Layers: сверху вниз, родитель выше своих детей. */
export function sortNodesTopToBottom(nodes: readonly SceneNode[]): SceneNode[] {
  const decorated = nodes.map((node) => ({ node, path: layerOrderPath(node) }));
  decorated.sort((a, b) => {
    const shared = Math.min(a.path.length, b.path.length);
    for (let level = 0; level < shared; level++) {
      if (a.path[level] !== b.path[level]) {
        return b.path[level] - a.path[level];
      }
    }
    return a.path.length - b.path.length;
  });
  return decorated.map((item) => item.node);
}
