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
export function worldDimsToLocalDims(
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

/**
 * Ставит прямоугольник ровно на заданный bbox в координатах документа.
 * Размер и позиция считаются через матрицу родителя и замер: локальный ноль родителя
 * не обязан совпадать с углом его absoluteBoundingBox (у групп — почти никогда),
 * поэтому «мировое минус bbox родителя» даёт промах в тысячи единиц.
 */
export function placeRectangleAtDocumentBox(
  rectangle: RectangleNode,
  parent: SceneNode | PageNode,
  documentBox: Rect
): void {
  const parentTransform =
    "absoluteTransform" in parent ? parent.absoluteTransform : null;
  const localDims = worldDimsToLocalDims(
    parentTransform,
    documentBox.width,
    documentBox.height
  );
  // Сначала размер: выравнивание меряет bbox, который от размера и зависит.
  rectangle.resize(
    Math.max(0.01, localDims.width),
    Math.max(0.01, localDims.height)
  );
  alignNodeToWorldPoint(rectangle, documentBox.x, documentBox.y);
}
