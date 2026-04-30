/** Позиция прямоугольника по bbox в координатах документа относительно родителя. */
export function placeRectangleAtDocumentBox(
  rectangle: RectangleNode,
  parent: SceneNode | PageNode,
  documentBox: Rect
): void {
  const parentBox =
    "absoluteBoundingBox" in parent ? parent.absoluteBoundingBox : null;
  if (parentBox) {
    rectangle.x = documentBox.x - parentBox.x;
    rectangle.y = documentBox.y - parentBox.y;
  } else {
    rectangle.x = documentBox.x;
    rectangle.y = documentBox.y;
  }
  rectangle.resize(documentBox.width, documentBox.height);
}
