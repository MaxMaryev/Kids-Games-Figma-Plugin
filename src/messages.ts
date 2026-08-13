import type { LayerNamePreset } from "./domain/layerNamePresets";
import type { MoveDirection } from "./domain/presetTreeOps";

export type OriginalDisposition = "keep" | "replace" | "hide";

export type RasterizeMessage = {
  type: "rasterize";
  scale: number;
  originalDisposition: OriginalDisposition;
};

export type MultipleOfFourCheckMessage = {
  type: "multipleOfFourCheck";
};

export type MultipleOfFourFixMessage = {
  type: "multipleOfFourFix";
};

export type FocusNodeMessage = {
  type: "focusNode";
  nodeId: string;
};

export type SelectNodesMessage = {
  type: "selectNodes";
  nodeIds: string[];
};

export type RequestPluginVersionMessage = {
  type: "requestPluginVersion";
};

export type GetUpdateBannerDismissedMessage = {
  type: "getUpdateBannerDismissed";
};

export type SetUpdateBannerDismissedMessage = {
  type: "setUpdateBannerDismissed";
  remoteVersion: string;
};

export type RenameLayersMessage = {
  type: "renameLayers";
  template: string;
  /** Номер, с которого начинается счётчик. По умолчанию 1. */
  startNumber?: number;
};

export type GetRecentNamePresetsMessage = {
  type: "getRecentNamePresets";
};

export type SetRecentNamePresetsMessage = {
  type: "setRecentNamePresets";
  templates: string[];
};

export type RenamePresetMessage = {
  type: "renamePreset";
  id: string;
  template: string;
};

export type AddPresetMessage = {
  type: "addPreset";
  /** null — добавить в корень дерева. */
  parentId: string | null;
  template: string;
};

export type RemovePresetMessage = {
  type: "removePreset";
  id: string;
};

export type MovePresetMessage = {
  type: "movePreset";
  id: string;
  direction: MoveDirection;
};

export type ResetPresetsMessage = {
  type: "resetPresets";
};

export type UndoPresetEditMessage = {
  type: "undoPresetEdit";
};

export type PluginMessageFromUi =
  | RasterizeMessage
  | MultipleOfFourCheckMessage
  | MultipleOfFourFixMessage
  | RenameLayersMessage
  | GetRecentNamePresetsMessage
  | SetRecentNamePresetsMessage
  | RenamePresetMessage
  | AddPresetMessage
  | RemovePresetMessage
  | MovePresetMessage
  | ResetPresetsMessage
  | UndoPresetEditMessage
  | FocusNodeMessage
  | SelectNodesMessage
  | RequestPluginVersionMessage
  | GetUpdateBannerDismissedMessage
  | SetUpdateBannerDismissedMessage;

export type DoneMessage = {
  type: "done";
  ok: boolean;
  done: number;
  errors: string[];
  error?: string;
};

export type MultipleOfFourViolationPayload = {
  nodeId: string;
  name: string;
  width: number;
  height: number;
  targetWidth: number;
  targetHeight: number;
};

export type MultipleOfFourSkippedPayload = {
  nodeId: string;
  name: string;
  reason: string;
};

export type MultipleOfFourCheckResultMessage = {
  type: "multipleOfFourCheckResult";
  violations: MultipleOfFourViolationPayload[];
  skipped: MultipleOfFourSkippedPayload[];
};

export type MultipleOfFourFixResultMessage = {
  type: "multipleOfFourFixResult";
  ok: boolean;
  fixedParents: number;
  skipped: number;
  errors: string[];
  /** Построчный лог запуска — UI показывает его в блоке «Диагностика». */
  debug?: string[];
};

export type RenameLayersResultMessage = {
  type: "renameLayersResult";
  ok: boolean;
  renamed: number;
  /** Применённые имена в порядке сверху вниз — UI показывает первое и последнее. */
  names: string[];
  error?: string;
};

export type LayerNamePresetsMessage = {
  type: "layerNamePresets";
  presets: LayerNamePreset[];
  /** Короткий текст в статус после правки дерева. */
  notice?: string;
  /** Есть ли что откатывать — UI показывает «Отменить» только тогда. */
  canUndo?: boolean;
  /** Типы, добавленные или переименованные относительно стандартного набора. */
  customIds?: string[];
};

export type RecentNamePresetsMessage = {
  type: "recentNamePresets";
  templates: string[];
};

export type SelectionChangedMessage = {
  type: "selectionChanged";
  count: number;
};

export type PluginVersionMessage = {
  type: "pluginVersion";
  version: string;
};

export type UpdateBannerDismissedMessage = {
  type: "updateBannerDismissed";
  dismissedRemoteVersion: string | null;
};

export type PluginMessageToUi =
  | DoneMessage
  | MultipleOfFourCheckResultMessage
  | MultipleOfFourFixResultMessage
  | RenameLayersResultMessage
  | LayerNamePresetsMessage
  | RecentNamePresetsMessage
  | SelectionChangedMessage
  | PluginVersionMessage
  | UpdateBannerDismissedMessage;

export function isPluginMessageFromUi(raw: unknown): raw is PluginMessageFromUi {
  if (!raw || typeof raw !== "object" || !("type" in raw)) {
    return false;
  }
  const type = (raw as { type: unknown }).type;
  return (
    type === "rasterize" ||
    type === "multipleOfFourCheck" ||
    type === "multipleOfFourFix" ||
    type === "renameLayers" ||
    type === "getRecentNamePresets" ||
    type === "setRecentNamePresets" ||
    type === "renamePreset" ||
    type === "addPreset" ||
    type === "removePreset" ||
    type === "movePreset" ||
    type === "resetPresets" ||
    type === "undoPresetEdit" ||
    type === "focusNode" ||
    type === "selectNodes" ||
    type === "requestPluginVersion" ||
    type === "getUpdateBannerDismissed" ||
    type === "setUpdateBannerDismissed"
  );
}
