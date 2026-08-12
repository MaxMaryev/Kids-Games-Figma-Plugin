/**
 * Переводит вектор из мировых координат в локальные координаты родителя.
 * Инвертируется только линейная часть 2×2 — translation в дельте сокращается,
 * поэтому результат не зависит от того, куда уехал origin родителя. Это важно для
 * групп: их x/y выводятся из bbox детей и пересчитываются на каждое изменение.
 */
export function worldVectorToLocal(
  transform: Transform,
  worldDx: number,
  worldDy: number
): { x: number; y: number } {
  const [[a, b], [c, d]] = transform;
  const det = a * d - b * c;
  if (Math.abs(det) < 1e-10) {
    return { x: worldDx, y: worldDy };
  }
  return {
    x: (d * worldDx - b * worldDy) / det,
    y: (a * worldDy - c * worldDx) / det,
  };
}

const ALIGN_EPS = 1e-3;

/**
 * Ставит узел так, чтобы левый верхний угол его absoluteBoundingBox попал в заданную
 * мировую точку. Работает измерением: замерили — сдвинули на дельту — замерили снова.
 * Так снимается зависимость от протухших матриц и от обратной связи «двигаю ребёнка →
 * меняется bbox родителя-группы → меняются локальные координаты».
 */
export type AlignReport = {
  /** false — узел не отдал absoluteBoundingBox, ничего не двигали. */
  measured: boolean;
  /** Сколько раз реально сдвигали. */
  passes: number;
  from: { x: number; y: number } | null;
  to: { x: number; y: number } | null;
  target: { x: number; y: number };
  /** Остаток после последнего прохода: сколько не доехали. */
  residual: { x: number; y: number } | null;
};

export function alignNodeToWorldPoint(
  node: SceneNode,
  worldX: number,
  worldY: number,
  passes = 3
): AlignReport {
  const report: AlignReport = {
    measured: false,
    passes: 0,
    from: null,
    to: null,
    target: { x: worldX, y: worldY },
    residual: null,
  };

  for (let pass = 0; pass < passes; pass++) {
    const box = node.absoluteBoundingBox;
    if (!box) {
      return report;
    }
    report.measured = true;
    if (!report.from) {
      report.from = { x: box.x, y: box.y };
    }
    report.to = { x: box.x, y: box.y };
    const worldDx = worldX - box.x;
    const worldDy = worldY - box.y;
    report.residual = { x: worldDx, y: worldDy };
    if (Math.abs(worldDx) < ALIGN_EPS && Math.abs(worldDy) < ALIGN_EPS) {
      return report;
    }
    const parent = node.parent;
    const transform =
      parent && "absoluteTransform" in parent ? parent.absoluteTransform : null;
    const local = transform
      ? worldVectorToLocal(transform, worldDx, worldDy)
      : { x: worldDx, y: worldDy };
    node.x += local.x;
    node.y += local.y;
    report.passes++;
  }

  const finalBox = node.absoluteBoundingBox;
  if (finalBox) {
    report.to = { x: finalBox.x, y: finalBox.y };
    report.residual = { x: worldX - finalBox.x, y: worldY - finalBox.y };
  }
  return report;
}

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
