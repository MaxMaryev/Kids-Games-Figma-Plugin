/**
 * Геометрия слоёв PSD: перевод мировых боксов Figma в координаты документа,
 * обрезка и выбор якоря по реальному размеру растра.
 *
 * Модуль намеренно не знает ни про типы Figma, ни про DOM: его компилируют оба
 * tsconfig — и песочница (считает боксы), и UI-бандл (ставит слой по битмапу).
 */

/** Прямоугольник в пикселях документа PSD, дробный. */
export type PsdBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Целочисленные границы слоя PSD — ровно то, что уходит в ag-psd. */
export type PsdRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

/**
 * Мировой бокс Figma → координаты документа.
 * Начало отсчёта — absoluteBoundingBox корневого фрейма: если брать render
 * bounds, собственная тень фрейма сдвинула бы все слои разом.
 */
export function toDocBox(
  rect: { x: number; y: number; width: number; height: number },
  originX: number,
  originY: number,
  scale: number
): PsdBox {
  return {
    x: (rect.x - originX) * scale,
    y: (rect.y - originY) * scale,
    width: rect.width * scale,
    height: rect.height * scale,
  };
}

export function boxToRect(box: PsdBox): PsdRect {
  const left = Math.round(box.x);
  const top = Math.round(box.y);
  return {
    left,
    top,
    right: left + Math.round(box.width),
    bottom: top + Math.round(box.height),
  };
}

export function isEmptyRect(rect: PsdRect): boolean {
  return rect.right <= rect.left || rect.bottom <= rect.top;
}

/** Пересечение с клипом; null-клип означает «не обрезаем». */
export function intersectRect(rect: PsdRect, clip: PsdRect | null): PsdRect {
  if (!clip) {
    return rect;
  }
  return {
    left: Math.max(rect.left, clip.left),
    top: Math.max(rect.top, clip.top),
    right: Math.min(rect.right, clip.right),
    bottom: Math.min(rect.bottom, clip.bottom),
  };
}

export type AnchorSource = "render" | "bounds" | "fallback";

export type AnchorChoice = {
  box: PsdBox;
  source: AnchorSource;
};

/**
 * Допуск в 1 px гасит ceil/floor Figma на дробных границах: render bounds
 * приходят дробными, а PNG всегда целый.
 */
const ANCHOR_EPS = 1;

function matchesSize(
  box: PsdBox,
  bitmapWidth: number,
  bitmapHeight: number
): boolean {
  return (
    Math.abs(bitmapWidth - Math.round(box.width)) <= ANCHOR_EPS &&
    Math.abs(bitmapHeight - Math.round(box.height)) <= ANCHOR_EPS
  );
}

/**
 * Куда ставить растр. exportAsync рендерит узел изолированно и не обрезает его
 * предком, а absoluteRenderBounds — обрезает. Поэтому размер всегда берём от
 * битмапа, а начало координат — от того бокса, который сошёлся по размеру:
 *
 *  render   — обычный случай, бокс с тенями и обводками;
 *  bounds   — узел обрезан предком, но собственных эффектов у него нет;
 *  fallback — не сошлось ни с чем (обрезан И с эффектами), позиция приблизительная.
 */
export function pickAnchor(
  bitmapWidth: number,
  bitmapHeight: number,
  renderBox: PsdBox,
  boundsBox: PsdBox
): AnchorChoice {
  if (matchesSize(renderBox, bitmapWidth, bitmapHeight)) {
    return { box: renderBox, source: "render" };
  }
  if (matchesSize(boundsBox, bitmapWidth, bitmapHeight)) {
    return { box: boundsBox, source: "bounds" };
  }
  return { box: renderBox, source: "fallback" };
}

/**
 * Границы слоя от якоря и реального растра. right/bottom считаются от битмапа,
 * а не от бокса — только так гарантируется right-left === imageData.width,
 * чего требует ag-psd.
 */
export function placeBitmap(
  bitmapWidth: number,
  bitmapHeight: number,
  anchor: PsdBox
): PsdRect {
  const left = Math.round(anchor.x);
  const top = Math.round(anchor.y);
  return {
    left,
    top,
    right: left + bitmapWidth,
    bottom: top + bitmapHeight,
  };
}
