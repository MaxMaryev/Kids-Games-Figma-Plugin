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
