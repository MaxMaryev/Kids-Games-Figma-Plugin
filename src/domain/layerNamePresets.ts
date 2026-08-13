/**
 * Пресеты имён слоёв персонажа. Дерево из этого файла — стандартный список:
 * main.ts отдаёт его в UI, если пользователь ещё ничего не правил. Свои правки
 * художник хранит в clientStorage (см. presetTreeOps.ts), поэтому дописывать
 * узлы сюда нужно только для нового стандартного набора «из коробки».
 */
export type LayerNamePreset = {
  /** Стабильный ключ узла. Не меняется при переименовании шаблона. */
  id: string;
  /** Шаблон имени. Хвостовой `_` = группа (номер дописывается в конец). */
  template: string;
  children?: LayerNamePreset[];
};

/** Сегмент-счётчик в шаблонах листьев: `Eyes_01_R` → `Eyes_02_R`. */
const COUNTER_SEGMENT = "01";

const SEPARATOR = "_";

/** Форма стандартного дерева без id — id проставляются ниже автоматически. */
type LayerNamePresetSeed = {
  template: string;
  children?: LayerNamePresetSeed[];
};

const DEFAULT_PRESET_SEEDS: LayerNamePresetSeed[] = [
  { template: "Headdress_" },
  {
    template: "Hair_Front_",
    children: [
      { template: "Hair_Front_01_1" },
      { template: "Hair_Front_01_2" },
    ],
  },
  {
    template: "Eyes_",
    children: [
      {
        template: "Eyes_01_R",
        children: [
          { template: "Eyes_01_R_BottomLash" },
          { template: "Eyes_01_R_TopLash" },
          { template: "Eyes_01_R_Eye" },
          { template: "Eyes_01_R_Eyeshadow" },
        ],
      },
      {
        template: "Eyes_01_L",
        children: [
          { template: "Eyes_01_L_BottomLash" },
          { template: "Eyes_01_L_TopLash" },
          { template: "Eyes_01_L_Eye" },
          { template: "Eyes_01_L_Eyeshadow" },
        ],
      },
    ],
  },
  {
    template: "Eyebrows_",
    children: [{ template: "Eyebrows_01_R" }, { template: "Eyebrows_01_L" }],
  },
  { template: "Mouth_" },
  { template: "Blush_" },
  { template: "Body_" },
  {
    template: "T-shirt_",
    children: [{ template: "T-shirt_01_2" }, { template: "T-shirt_01_1" }],
  },
  {
    template: "Shorts_",
    children: [{ template: "Shorts_01_2" }, { template: "Shorts_01_1" }],
  },
  {
    template: "Dress_",
    children: [
      {
        template: "Dress_T-shirt_",
        children: [
          { template: "Dress_T-shirt_01_2" },
          { template: "Dress_T-shirt_01_1" },
        ],
      },
      {
        template: "Dress_Shorts_",
        children: [
          { template: "Dress_Shorts_01_2" },
          { template: "Dress_Shorts_01_1" },
        ],
      },
    ],
  },
  {
    template: "Outfits_",
    children: [
      {
        template: "Outfits_T-shirt_",
        children: [
          { template: "Outfits_T-shirt_01_2" },
          { template: "Outfits_T-shirt_01_1" },
        ],
      },
      {
        template: "Outfits_Shorts_01",
        children: [
          { template: "Outfits_Shorts_01_2" },
          { template: "Outfits_Shorts_01_1" },
        ],
      },
    ],
  },
  {
    template: "T-shirt_Shoulders_",
    children: [
      {
        template: "T-shirt_Sleeve_R_",
        children: [
          { template: "T-shirt_Sleeve_R_01_1" },
          { template: "T-shirt_Sleeve_R_01_2" },
        ],
      },
      {
        template: "T-shirt_Sleeve_L_",
        children: [
          { template: "T-shirt_Sleeve_L_01_1" },
          { template: "T-shirt_Sleeve_L_01_2" },
        ],
      },
    ],
  },
  {
    template: "Dress_Shoulders_",
    children: [
      {
        template: "Dress_Sleeve_R_",
        children: [
          { template: "Dress_Sleeve_R_01_1" },
          { template: "Dress_Sleeve_R_01_2" },
        ],
      },
      {
        template: "Dress_Sleeve_L_",
        children: [
          { template: "Dress_Sleeve_L_01_1" },
          { template: "Dress_Sleeve_L_01_2" },
        ],
      },
    ],
  },
  {
    template: "Outfits_Shoulders_",
    children: [
      {
        template: "Outfits_Sleeve_R_",
        children: [
          { template: "Outfits_Sleeve_R_01_1" },
          { template: "Outfits_Sleeve_R_01_2" },
        ],
      },
      {
        template: "Outfits_Sleeve_L_",
        children: [
          { template: "Outfits_Sleeve_L_01_1" },
          { template: "Outfits_Sleeve_L_01_2" },
        ],
      },
    ],
  },
  {
    template: "Shoes_",
    children: [{ template: "Shoes_01_R" }, { template: "Shoes_01_L" }],
  },
  { template: "Shorts_Back_" },
  { template: "Dress_Back_" },
  { template: "Outfits_Back_" },
  {
    template: "Hair_Back_",
    children: [{ template: "Hair_Back_01_1" }, { template: "Hair_Back_01_2" }],
  },
];

/** Префикс id стандартных узлов. Шаблоны в наборе выше уникальны. */
export const STANDARD_PRESET_ID_PREFIX = "std:";

function withStandardIds(seeds: LayerNamePresetSeed[]): LayerNamePreset[] {
  return seeds.map((seed) => {
    const preset: LayerNamePreset = {
      id: STANDARD_PRESET_ID_PREFIX + seed.template,
      template: seed.template,
    };
    if (seed.children && seed.children.length > 0) {
      preset.children = withStandardIds(seed.children);
    }
    return preset;
  });
}

export const DEFAULT_LAYER_NAME_PRESETS: LayerNamePreset[] =
  withStandardIds(DEFAULT_PRESET_SEEDS);

export const DEFAULT_START_NUMBER = 1;
const MAX_START_NUMBER = 9999;

/** Стартовый номер из UI: целое в [1, 9999], мусор и NaN → 1. */
export function normalizeStartNumber(raw: unknown): number {
  const value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(value)) {
    return DEFAULT_START_NUMBER;
  }
  const whole = Math.trunc(value);
  if (whole < DEFAULT_START_NUMBER) {
    return DEFAULT_START_NUMBER;
  }
  return whole > MAX_START_NUMBER ? MAX_START_NUMBER : whole;
}

/**
 * Отсчёт идёт от startNumber (по умолчанию 1) и всегда минимум в две цифры.
 * Ширина дальше растёт естественно: старт 8 на пяти слоях даёт 08, 09, 10, 11, 12.
 */
export function formatCounter(
  index: number,
  startNumber: number = DEFAULT_START_NUMBER
): string {
  const value = index + startNumber;
  return value < 10 ? "0" + value : String(value);
}

/**
 * Имя для слоя с порядковым номером `index` (0-based, сверху вниз в Layers).
 * Счётчик начинается с `startNumber`; примеры ниже — для старта 1.
 *
 * - `Eyes_` (группа) → `Eyes_01`, `Eyes_02`…
 * - `Eyes_01_R_TopLash` (лист со счётчиком) → `Eyes_02_R_TopLash`…
 * - `Body` (без счётчика) → `Body_01`, `Body_02`…
 *
 * Место счётчика в шаблоне ищется как литеральный сегмент `01` — шаблоны приходят
 * из дерева пресетов и всегда его содержат, поэтому старт 5 даёт `Eyes_05_R_TopLash`.
 *
 * ВНИМАНИЕ: в ui.html есть зеркальная копия этой функции (`previewName`) для
 * предпросмотра — правки нужно вносить в обоих местах.
 */
export function buildNameForIndex(
  template: string,
  index: number,
  startNumber: number = DEFAULT_START_NUMBER
): string {
  const counter = formatCounter(index, startNumber);
  if (template.length > 0 && template.slice(-1) === SEPARATOR) {
    return template + counter;
  }
  const segments = template.split(SEPARATOR);
  const counterAt = segments.indexOf(COUNTER_SEGMENT);
  if (counterAt === -1) {
    return template + SEPARATOR + counter;
  }
  segments[counterAt] = counter;
  return segments.join(SEPARATOR);
}

export function buildNamesForSelection(
  template: string,
  count: number,
  startNumber: number = DEFAULT_START_NUMBER
): string[] {
  const names: string[] = [];
  for (let index = 0; index < count; index++) {
    names.push(buildNameForIndex(template, index, startNumber));
  }
  return names;
}
