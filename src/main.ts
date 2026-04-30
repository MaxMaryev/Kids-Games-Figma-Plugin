import { runMultipleOfFourCheck } from "./features/multipleOfFourCheck";
import { runMultipleOfFourFix } from "./features/multipleOfFourFix";
import { runRasterize } from "./features/rasterize";
import {
  isPluginMessageFromUi,
  type MultipleOfFourCheckResultMessage,
  type MultipleOfFourFixResultMessage,
} from "./messages";

declare const __PLUGIN_VERSION__: string;

const UPDATE_BANNER_DISMISSED_KEY = "updateBannerDismissedForVersion";

figma.showUI(__html__, {
  width: 320,
  height: 480,
  themeColors: true,
  title: "😊 Kids Games Plugin 😊",
});

function postPluginVersionToUi(): void {
  figma.ui.postMessage({ type: "pluginVersion", version: __PLUGIN_VERSION__ });
}

// Синхронный postMessage часто уходит до того, как iframe повесит onmessage.
postPluginVersionToUi();
setTimeout(postPluginVersionToUi, 120);
setTimeout(postPluginVersionToUi, 400);

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
    figma.ui.postMessage({ type: "pluginVersion", version: __PLUGIN_VERSION__ });
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
