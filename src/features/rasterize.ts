import { placeRectangleAtDocumentBox } from "../figma/geometry";
import { parentHasAutoLayout } from "../figma/nodeQueries";
import type { DoneMessage, RasterizeMessage } from "../messages";

export async function runRasterize(
  message: RasterizeMessage
): Promise<DoneMessage> {
  const selection = [...figma.currentPage.selection];
  if (selection.length === 0) {
    figma.notify("Нет выделения");
    return {
      type: "done",
      ok: false,
      done: 0,
      errors: [],
      error: "Выделите слой(и) на канвасе.",
    };
  }

  const requestedScale = message.scale;
  const scale = Number.isFinite(requestedScale)
    ? Math.min(4, Math.max(1, requestedScale))
    : 1;
  const disposition = message.originalDisposition;
  const replaceOriginal = disposition === "replace";
  const hideOriginal = disposition === "hide";
  let doneCount = 0;
  const errors: string[] = [];
  const createdRasters: RectangleNode[] = [];

  for (const node of selection) {
    const parent = node.parent;
    if (!parent || !("insertChild" in parent)) {
      errors.push(`${node.name}: нельзя вставить слой в родителя`);
      continue;
    }
    const parentForPlacement = parent as SceneNode | PageNode;
    try {
      const documentBox = node.absoluteBoundingBox;
      if (!documentBox) {
        errors.push(`${node.name}: нет absoluteBoundingBox`);
        continue;
      }
      const bytes = await node.exportAsync({
        format: "PNG",
        constraint: { type: "SCALE", value: scale },
      });
      const image = figma.createImage(bytes);
      const raster = figma.createRectangle();
      raster.name = `${node.name} PNG`;
      raster.fills = [
        {
          type: "IMAGE",
          imageHash: image.hash,
          scaleMode: "FILL",
          scalingFactor: 1,
        },
      ];
      if (replaceOriginal) {
        const insertIndex = parent.children.indexOf(node);
        node.remove();
        parent.insertChild(insertIndex, raster);
      } else {
        const insertIndex = parent.children.indexOf(node) + 1;
        parent.insertChild(insertIndex, raster);
        if (hideOriginal) {
          node.visible = false;
        }
      }
      if (parentHasAutoLayout(parentForPlacement)) {
        raster.layoutPositioning = "ABSOLUTE";
      }
      placeRectangleAtDocumentBox(raster, parentForPlacement, documentBox);
      createdRasters.push(raster);
      doneCount++;
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      errors.push(`${node.name}: ${text}`);
    }
  }

  if (createdRasters.length > 0) {
    figma.currentPage.selection = createdRasters;
  }

  const payload: DoneMessage = {
    type: "done",
    ok: errors.length === 0,
    done: doneCount,
    errors,
  };
  if (doneCount === 0 && errors.length > 0) {
    payload.error = errors.join("\n");
  }
  if (doneCount > 0) {
    figma.notify(`Растеризовано: ${doneCount}`);
  }
  return payload;
}
