import { analyzePixelDimensions } from "../domain/multipleOfFour";
import { getAbsoluteRenderBounds } from "../figma/nodeQueries";
import type {
  MultipleOfFourCheckResultMessage,
  MultipleOfFourSkippedPayload,
  MultipleOfFourViolationPayload,
} from "../messages";

export function runMultipleOfFourCheck(): MultipleOfFourCheckResultMessage {
  const selection = [...figma.currentPage.selection];
  const violations: SceneNode[] = [];
  const violationPayloads: MultipleOfFourViolationPayload[] = [];
  const skipped: MultipleOfFourSkippedPayload[] = [];

  if (selection.length === 0) {
    figma.notify("Нет выделения");
    return { type: "multipleOfFourCheckResult", violations: [], skipped: [] };
  }

  for (const node of selection) {
    const renderBounds = getAbsoluteRenderBounds(node);
    const absBox = "absoluteBoundingBox" in node ? node.absoluteBoundingBox : null;
    try {
      console.log(
        "[mo4 check]",
        JSON.stringify({
          name: node.name,
          type: node.type,
          local: { x: node.x, y: node.y, w: node.width, h: node.height },
          absBox,
          renderBounds,
        })
      );
    } catch {
      console.log("[mo4 check]", node.name, { renderBounds, absBox });
    }
    if (!renderBounds) {
      skipped.push({
        nodeId: node.id,
        name: node.name,
        reason: "Нет absoluteRenderBounds (слой невидим или не поддерживается).",
      });
      continue;
    }
    const analysis = analyzePixelDimensions(
      renderBounds.width,
      renderBounds.height
    );
    try {
      console.log(
        "[mo4 check] analysis",
        JSON.stringify({ name: node.name, analysis })
      );
    } catch {
      console.log("[mo4 check] analysis", node.name, analysis);
    }
    if (analysis.ok) {
      continue;
    }
    violations.push(node);
    violationPayloads.push({
      nodeId: node.id,
      name: node.name,
      width: analysis.width,
      height: analysis.height,
      targetWidth: analysis.targetWidth,
      targetHeight: analysis.targetHeight,
    });
  }

  if (violations.length > 0) {
    figma.currentPage.selection = violations;
  } else {
    figma.currentPage.selection = [];
  }

  return {
    type: "multipleOfFourCheckResult",
    violations: violationPayloads,
    skipped,
  };
}
