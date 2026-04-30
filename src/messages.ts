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

export type PluginMessageFromUi =
  | RasterizeMessage
  | MultipleOfFourCheckMessage
  | MultipleOfFourFixMessage
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
    type === "focusNode" ||
    type === "selectNodes" ||
    type === "requestPluginVersion" ||
    type === "getUpdateBannerDismissed" ||
    type === "setUpdateBannerDismissed"
  );
}
