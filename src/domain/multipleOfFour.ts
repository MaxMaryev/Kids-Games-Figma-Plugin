/**
 * Целый размер в пикселях по верхней границе bbox.
 * Если значение почти целое (в пределах PIXEL_EPS), снапим к ближайшему целому —
 * это убирает float-шум вида 864.00390625 (= 864 + 1/256), который Figma может
 * вернуть в render bounds, но визуально и при экспорте это 864.
 */
const PIXEL_EPS = 0.01;
export function pixelSizeFromLength(length: number): number {
  const rounded = Math.round(length);
  if (Math.abs(length - rounded) < PIXEL_EPS) {
    return rounded;
  }
  return Math.ceil(length);
}

export function isMultipleOfFour(value: number): boolean {
  return value % 4 === 0;
}

export function ceilToMultipleOfFour(value: number): number {
  return Math.ceil(value / 4) * 4;
}

export type DimensionAnalysis = {
  ok: boolean;
  width: number;
  height: number;
  targetWidth: number;
  targetHeight: number;
  deltaWidth: number;
  deltaHeight: number;
};

export function analyzePixelDimensions(
  width: number,
  height: number
): DimensionAnalysis {
  const w = pixelSizeFromLength(width);
  const h = pixelSizeFromLength(height);
  const targetWidth = ceilToMultipleOfFour(w);
  const targetHeight = ceilToMultipleOfFour(h);
  const ok = isMultipleOfFour(w) && isMultipleOfFour(h);
  return {
    ok,
    width: w,
    height: h,
    targetWidth,
    targetHeight,
    deltaWidth: targetWidth - w,
    deltaHeight: targetHeight - h,
  };
}

export type EdgePadding = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

/** Распределить дельту по двум противоположным сторонам: меньшая часть к «началу» (верх/лево). */
export function splitDeltaAcrossAxis(delta: number): {
  start: number;
  end: number;
} {
  const start = Math.floor(delta / 2);
  const end = delta - start;
  return { start, end };
}

export function paddingForParentExpansion(
  deltaWidth: number,
  deltaHeight: number
): EdgePadding {
  const horizontal = splitDeltaAcrossAxis(deltaWidth);
  const vertical = splitDeltaAcrossAxis(deltaHeight);
  return {
    top: vertical.start,
    bottom: vertical.end,
    left: horizontal.start,
    right: horizontal.end,
  };
}
