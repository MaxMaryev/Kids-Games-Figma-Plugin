import type { LayerNamePreset } from "./domain/layerNamePresets";
import {
  addPreset,
  countPresets,
  defaultPresetTree,
  findPreset,
  movePreset,
  normalizePresetTree,
  removePreset,
  renamePreset,
  PRESET_STORAGE_VERSION,
} from "./domain/presetTreeOps";
import { runMultipleOfFourCheck } from "./features/multipleOfFourCheck";
import { runMultipleOfFourFix } from "./features/multipleOfFourFix";
import { runRasterize } from "./features/rasterize";
import { runRenameLayers } from "./features/renameLayers";
import {
  isPluginMessageFromUi,
  type MultipleOfFourCheckResultMessage,
  type MultipleOfFourFixResultMessage,
} from "./messages";

declare const __PLUGIN_VERSION__: string;

const UPDATE_BANNER_DISMISSED_KEY = "updateBannerDismissedForVersion";
const RECENT_NAME_PRESETS_KEY = "recentNamePresets";
const RECENT_NAME_PRESETS_LIMIT = 5;
const PRESET_TREE_KEY = "layerNamePresetsTree";

figma.showUI(__html__, {
  width: 320,
  height: 560,
  themeColors: true,
  title: "😊 Kids Games Plugin 😊",
});

/** Дерево пресетов держим в памяти: правки идут одна за другой. */
let presetTree: LayerNamePreset[] = defaultPresetTree();
let presetTreeLoaded = false;

async function loadPresetTree(): Promise<LayerNamePreset[]> {
  if (presetTreeLoaded) {
    return presetTree;
  }
  try {
    const stored = await figma.clientStorage.getAsync(PRESET_TREE_KEY);
    presetTree = normalizePresetTree(stored);
  } catch {
    presetTree = defaultPresetTree();
  }
  presetTreeLoaded = true;
  return presetTree;
}

async function savePresetTree(tree: LayerNamePreset[]): Promise<void> {
  presetTree = tree;
  presetTreeLoaded = true;
  await figma.clientStorage.setAsync(PRESET_TREE_KEY, {
    version: PRESET_STORAGE_VERSION,
    presets: tree,
  });
}

function postPresetTreeToUi(notice?: string): void {
  figma.ui.postMessage({
    type: "layerNamePresets",
    presets: presetTree,
    notice,
  });
}

function postSelectionToUi(): void {
  figma.ui.postMessage({
    type: "selectionChanged",
    count: figma.currentPage.selection.length,
  });
}

function postBootstrapToUi(): void {
  figma.ui.postMessage({ type: "pluginVersion", version: __PLUGIN_VERSION__ });
  postSelectionToUi();
  // Дерево может быть ещё не прочитано из clientStorage — тогда уйдёт следом.
  if (presetTreeLoaded) {
    postPresetTreeToUi();
  }
}

// Синхронный postMessage часто уходит до того, как iframe повесит onmessage.
postBootstrapToUi();
setTimeout(postBootstrapToUi, 120);
setTimeout(postBootstrapToUi, 400);

loadPresetTree().then(() => {
  postPresetTreeToUi();
  setTimeout(() => postPresetTreeToUi(), 200);
});

figma.on("selectionchange", postSelectionToUi);

/** После переименования шаблона чипсы «Недавние» не должны указывать в пустоту. */
async function rewriteRecentTemplate(
  previousTemplate: string,
  nextTemplate: string
): Promise<void> {
  if (previousTemplate === nextTemplate) {
    return;
  }
  const stored = await figma.clientStorage.getAsync(RECENT_NAME_PRESETS_KEY);
  if (!Array.isArray(stored)) {
    return;
  }
  let changed = false;
  const templates: string[] = [];
  for (const item of stored) {
    if (typeof item !== "string") continue;
    if (item === previousTemplate) {
      changed = true;
      if (templates.indexOf(nextTemplate) === -1) {
        templates.push(nextTemplate);
      }
      continue;
    }
    if (templates.indexOf(item) === -1) {
      templates.push(item);
    }
  }
  if (!changed) {
    return;
  }
  await figma.clientStorage.setAsync(RECENT_NAME_PRESETS_KEY, templates);
  figma.ui.postMessage({ type: "recentNamePresets", templates });
}

function focusSceneNodeById(nodeId: string): void {
  const node = figma.getNodeById(nodeId);
  if (!node || !("type" in node)) {
    return;
  }
  if (node.type === "DOCUMENT" || node.type === "PAGE") {
    return;
  }
  const sceneNode = node as SceneNode;
  figma.currentPage.selection = [sceneNode];
  figma.viewport.scrollAndZoomIntoView([sceneNode]);
}

figma.ui.onmessage = async (raw: unknown) => {
  if (!isPluginMessageFromUi(raw)) {
    return;
  }

  if (raw.type === "requestPluginVersion") {
    postBootstrapToUi();
    return;
  }

  if (raw.type === "getUpdateBannerDismissed") {
    const stored = await figma.clientStorage.getAsync(UPDATE_BANNER_DISMISSED_KEY);
    const dismissed =
      typeof stored === "string" && stored.length > 0 ? stored : null;
    figma.ui.postMessage({
      type: "updateBannerDismissed",
      dismissedRemoteVersion: dismissed,
    });
    return;
  }

  if (raw.type === "setUpdateBannerDismissed") {
    if (typeof raw.remoteVersion === "string" && raw.remoteVersion.length > 0) {
      await figma.clientStorage.setAsync(
        UPDATE_BANNER_DISMISSED_KEY,
        raw.remoteVersion,
      );
    }
    return;
  }

  if (raw.type === "rasterize") {
    figma.ui.postMessage(await runRasterize(raw));
    return;
  }

  if (raw.type === "multipleOfFourCheck") {
    try {
      figma.ui.postMessage(runMultipleOfFourCheck());
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      const payload: MultipleOfFourCheckResultMessage = {
        type: "multipleOfFourCheckResult",
        violations: [],
        skipped: [
          {
            nodeId: "",
            name: "Ошибка",
            reason: text,
          },
        ],
      };
      figma.ui.postMessage(payload);
    }
    return;
  }

  if (raw.type === "multipleOfFourFix") {
    try {
      figma.ui.postMessage(runMultipleOfFourFix());
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      const payload: MultipleOfFourFixResultMessage = {
        type: "multipleOfFourFixResult",
        ok: false,
        fixedParents: 0,
        skipped: 0,
        errors: [text],
      };
      figma.ui.postMessage(payload);
    }
    return;
  }

  if (raw.type === "renameLayers") {
    try {
      figma.ui.postMessage(runRenameLayers(raw));
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      figma.ui.postMessage({
        type: "renameLayersResult",
        ok: false,
        renamed: 0,
        names: [],
        error: text,
      });
    }
    return;
  }

  if (raw.type === "getRecentNamePresets") {
    const stored = await figma.clientStorage.getAsync(RECENT_NAME_PRESETS_KEY);
    const templates = Array.isArray(stored)
      ? stored.filter((item): item is string => typeof item === "string")
      : [];
    figma.ui.postMessage({ type: "recentNamePresets", templates });
    return;
  }

  if (raw.type === "setRecentNamePresets") {
    const templates = Array.isArray(raw.templates)
      ? raw.templates
          .filter((item): item is string => typeof item === "string")
          .slice(0, RECENT_NAME_PRESETS_LIMIT)
      : [];
    await figma.clientStorage.setAsync(RECENT_NAME_PRESETS_KEY, templates);
    return;
  }

  if (raw.type === "renamePreset") {
    const tree = await loadPresetTree();
    const target = findPreset(tree, raw.id);
    const previousTemplate = target ? target.template : "";
    const result = renamePreset(tree, raw.id, raw.template);
    if (!result.found) {
      postPresetTreeToUi("Тип не найден — список обновлён.");
      return;
    }
    await savePresetTree(result.tree);
    if (previousTemplate.length > 0) {
      await rewriteRecentTemplate(previousTemplate, raw.template.trim());
    }
    const notice =
      result.affected > 0
        ? `Переименовано. Обновлено вложенных: ${result.affected}.`
        : "Переименовано.";
    postPresetTreeToUi(notice);
    return;
  }

  if (raw.type === "addPreset") {
    const tree = await loadPresetTree();
    const result = addPreset(tree, raw.parentId, raw.template);
    if (result.addedId.length === 0) {
      postPresetTreeToUi("Пустое имя — тип не добавлен.");
      return;
    }
    await savePresetTree(result.tree);
    postPresetTreeToUi(`Добавлено: ${raw.template.trim()}`);
    return;
  }

  if (raw.type === "removePreset") {
    const tree = await loadPresetTree();
    const result = removePreset(tree, raw.id);
    if (result.removed === 0) {
      postPresetTreeToUi("Тип не найден — список обновлён.");
      return;
    }
    await savePresetTree(result.tree);
    postPresetTreeToUi(`Удалено типов: ${result.removed}.`);
    return;
  }

  if (raw.type === "movePreset") {
    const tree = await loadPresetTree();
    await savePresetTree(movePreset(tree, raw.id, raw.direction));
    postPresetTreeToUi();
    return;
  }

  if (raw.type === "resetPresets") {
    const tree = defaultPresetTree();
    await savePresetTree(tree);
    postPresetTreeToUi(`Список сброшен к стандартному (${countPresets(tree)}).`);
    return;
  }

  if (raw.type === "focusNode") {
    focusSceneNodeById(raw.nodeId);
    return;
  }

  if (raw.type === "selectNodes") {
    const nodes: SceneNode[] = [];
    for (const id of raw.nodeIds) {
      const node = figma.getNodeById(id);
      if (!node || !("type" in node)) continue;
      if (node.type === "DOCUMENT" || node.type === "PAGE") continue;
      nodes.push(node as SceneNode);
    }
    figma.currentPage.selection = nodes;
    if (nodes.length > 0) {
      figma.viewport.scrollAndZoomIntoView(nodes);
    }
  }
};
