import {
  DEFAULT_LAYER_NAME_PRESETS,
  type LayerNamePreset,
} from "./layerNamePresets";

/**
 * Операции над деревом пресетов. Всё чистое: на вход дерево, на выход новое
 * дерево, вход не мутируется. Применяет их main.ts, потому что скрипт ui.html
 * не проходит через сборку и импортировать этот модуль не может.
 */

export type MoveDirection = "up" | "down";

/** Версия формата в clientStorage — чтобы потом можно было мигрировать. */
export const PRESET_STORAGE_VERSION = 1;

export type StoredPresetTree = {
  version: number;
  presets: LayerNamePreset[];
};

let generatedIdCounter = 0;

export function createPresetId(): string {
  generatedIdCounter++;
  return "u:" + Date.now().toString(36) + "-" + generatedIdCounter.toString(36);
}

function cloneNode(node: LayerNamePreset): LayerNamePreset {
  const copy: LayerNamePreset = { id: node.id, template: node.template };
  if (node.children && node.children.length > 0) {
    copy.children = node.children.map(cloneNode);
  }
  return copy;
}

function cloneTree(tree: LayerNamePreset[]): LayerNamePreset[] {
  return tree.map(cloneNode);
}

export function findPreset(
  tree: LayerNamePreset[],
  id: string
): LayerNamePreset | null {
  for (const node of tree) {
    if (node.id === id) {
      return node;
    }
    if (node.children) {
      const found = findPreset(node.children, id);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

export function countPresets(tree: LayerNamePreset[]): number {
  let total = 0;
  for (const node of tree) {
    total++;
    if (node.children) {
      total += countPresets(node.children);
    }
  }
  return total;
}

/**
 * Разбор того, что лежит в clientStorage. Мусорные узлы выбрасываются, пустой
 * результат — повод вернуть стандартный набор: лучше рабочий список, чем
 * пустая вкладка.
 */
export function normalizePresetTree(raw: unknown): LayerNamePreset[] {
  const presets = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as StoredPresetTree).presets)
      ? (raw as StoredPresetTree).presets
      : null;
  if (!presets) {
    return cloneTree(DEFAULT_LAYER_NAME_PRESETS);
  }
  const seenIds: { [id: string]: true } = {};
  const normalized = normalizeNodes(presets, seenIds);
  if (normalized.length === 0) {
    return cloneTree(DEFAULT_LAYER_NAME_PRESETS);
  }
  return normalized;
}

function normalizeNodes(
  raw: unknown[],
  seenIds: { [id: string]: true }
): LayerNamePreset[] {
  const result: LayerNamePreset[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const candidate = item as Partial<LayerNamePreset>;
    const template =
      typeof candidate.template === "string" ? candidate.template.trim() : "";
    if (template.length === 0) {
      continue;
    }
    const rawId = typeof candidate.id === "string" ? candidate.id : "";
    const id = rawId.length > 0 && !seenIds[rawId] ? rawId : createPresetId();
    seenIds[id] = true;
    const node: LayerNamePreset = { id, template };
    if (Array.isArray(candidate.children)) {
      const children = normalizeNodes(candidate.children, seenIds);
      if (children.length > 0) {
        node.children = children;
      }
    }
    result.push(node);
  }
  return result;
}

export function defaultPresetTree(): LayerNamePreset[] {
  return cloneTree(DEFAULT_LAYER_NAME_PRESETS);
}

export type RenamePresetResult = {
  tree: LayerNamePreset[];
  /** Сколько вложенных узлов подхватило новый префикс. */
  affected: number;
  found: boolean;
};

/**
 * Переименование узла. Потомки, чей шаблон начинается со старого шаблона,
 * получают новый префикс: `Eyes_` → `Eye_` тянет `Eyes_01_R` → `Eye_01_R`.
 * `Eyebrows_` при этом не трогается — он не потомок.
 */
export function renamePreset(
  tree: LayerNamePreset[],
  id: string,
  nextTemplate: string
): RenamePresetResult {
  const template = nextTemplate.trim();
  const target = findPreset(tree, id);
  if (!target || template.length === 0) {
    return { tree: cloneTree(tree), affected: 0, found: Boolean(target) };
  }

  const previousTemplate = target.template;
  let affected = 0;

  const rewriteDescendants = (nodes: LayerNamePreset[]): LayerNamePreset[] =>
    nodes.map((node) => {
      const copy = cloneNode(node);
      if (
        previousTemplate.length > 0 &&
        copy.template.indexOf(previousTemplate) === 0
      ) {
        copy.template = template + copy.template.slice(previousTemplate.length);
        affected++;
      }
      if (copy.children) {
        copy.children = rewriteDescendants(copy.children);
      }
      return copy;
    });

  const walk = (nodes: LayerNamePreset[]): LayerNamePreset[] =>
    nodes.map((node) => {
      if (node.id === id) {
        const copy = cloneNode(node);
        copy.template = template;
        if (copy.children) {
          copy.children = rewriteDescendants(copy.children);
        }
        return copy;
      }
      const copy = cloneNode(node);
      if (copy.children) {
        copy.children = walk(copy.children);
      }
      return copy;
    });

  return { tree: walk(tree), affected, found: true };
}

export type AddPresetResult = {
  tree: LayerNamePreset[];
  addedId: string;
};

/** Новый узел уходит в конец детей родителя либо в конец корня. */
export function addPreset(
  tree: LayerNamePreset[],
  parentId: string | null,
  template: string
): AddPresetResult {
  const cleaned = template.trim();
  if (cleaned.length === 0) {
    return { tree: cloneTree(tree), addedId: "" };
  }
  const added: LayerNamePreset = { id: createPresetId(), template: cleaned };

  if (!parentId) {
    return { tree: cloneTree(tree).concat([added]), addedId: added.id };
  }

  const walk = (nodes: LayerNamePreset[]): LayerNamePreset[] =>
    nodes.map((node) => {
      const copy = cloneNode(node);
      if (copy.id === parentId) {
        copy.children = (copy.children || []).concat([added]);
        return copy;
      }
      if (copy.children) {
        copy.children = walk(copy.children);
      }
      return copy;
    });

  return { tree: walk(tree), addedId: added.id };
}

export type RemovePresetResult = {
  tree: LayerNamePreset[];
  /** Узел вместе с поддеревом. */
  removed: number;
};

export function removePreset(
  tree: LayerNamePreset[],
  id: string
): RemovePresetResult {
  const target = findPreset(tree, id);
  if (!target) {
    return { tree: cloneTree(tree), removed: 0 };
  }
  const removed = 1 + (target.children ? countPresets(target.children) : 0);

  const walk = (nodes: LayerNamePreset[]): LayerNamePreset[] => {
    const result: LayerNamePreset[] = [];
    for (const node of nodes) {
      if (node.id === id) {
        continue;
      }
      const copy = cloneNode(node);
      if (copy.children) {
        copy.children = walk(copy.children);
        if (copy.children.length === 0) {
          delete copy.children;
        }
      }
      result.push(copy);
    }
    return result;
  };

  return { tree: walk(tree), removed };
}

/** Обмен с соседом внутри своего родителя. На краях — ничего не делаем. */
export function movePreset(
  tree: LayerNamePreset[],
  id: string,
  direction: MoveDirection
): LayerNamePreset[] {
  let done = false;

  const reorder = (nodes: LayerNamePreset[]): LayerNamePreset[] => {
    const copies = nodes.map(cloneNode);
    const index = copies.map((node) => node.id).indexOf(id);
    if (index !== -1) {
      const target = direction === "up" ? index - 1 : index + 1;
      if (target >= 0 && target < copies.length) {
        const moved = copies[index];
        copies[index] = copies[target];
        copies[target] = moved;
      }
      done = true;
      return copies;
    }
    for (const copy of copies) {
      if (!done && copy.children) {
        copy.children = reorder(copy.children);
      }
    }
    return copies;
  };

  return reorder(tree);
}
