import { buildNamesForSelection } from "../domain/layerNamePresets";
import { sortNodesTopToBottom } from "../figma/nodeQueries";
import type { RenameLayersMessage, RenameLayersResultMessage } from "../messages";

export function runRenameLayers(
  message: RenameLayersMessage
): RenameLayersResultMessage {
  const template = typeof message.template === "string" ? message.template.trim() : "";
  if (template.length === 0) {
    return {
      type: "renameLayersResult",
      ok: false,
      renamed: 0,
      names: [],
      error: "Пустой шаблон имени.",
    };
  }

  const selection = figma.currentPage.selection;
  if (selection.length === 0) {
    figma.notify("Нет выделения");
    return {
      type: "renameLayersResult",
      ok: false,
      renamed: 0,
      names: [],
      error: "Выделите слой(и) на канвасе.",
    };
  }

  const ordered = sortNodesTopToBottom(selection);
  const names = buildNamesForSelection(template, ordered.length);
  const applied: string[] = [];
  const errors: string[] = [];

  for (let index = 0; index < ordered.length; index++) {
    const node = ordered[index];
    const name = names[index];
    try {
      node.name = name;
      applied.push(name);
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      errors.push(`${node.name}: ${text}`);
    }
  }

  if (applied.length > 0) {
    figma.notify(`Переименовано: ${applied.length}`);
  }

  const payload: RenameLayersResultMessage = {
    type: "renameLayersResult",
    ok: errors.length === 0,
    renamed: applied.length,
    names: applied,
  };
  if (errors.length > 0) {
    payload.error = errors.join("\n");
  }
  return payload;
}
