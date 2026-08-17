import { sanitizePsdFileName } from "../domain/psdFileName";
import { buildPsdTree } from "../figma/psdTraversal";
import type {
  PsdExportFinishedMessage,
  PsdExportStartMessage,
} from "../messages";

/** Обычный .psd не открывает стороны больше 30000 px — дальше только .psb. */
const PSD_MAX_SIDE = 30000;
const PSB_MAX_SIDE = 300000;
const MAX_LEAVES = 800;
/** writePsd строит буфер за один вызов, поэтому все ImageData живут одновременно. */
const MAX_PIXEL_BYTES = 1_200_000_000;
/**
 * Если figma.ui.onmessage окажется сериализованным, ack не придёт никогда.
 * Таймаут превращает возможный вечный зависон в просто медленный экспорт.
 */
const ACK_TIMEOUT_MS = 3000;

const ROOT_TYPES = [
  "FRAME",
  "COMPONENT",
  "COMPONENT_SET",
  "INSTANCE",
  "SECTION",
  "GROUP",
];

type Session = {
  id: number;
  cancelled: boolean;
  resolveAck: (() => void) | null;
};

let session: Session | null = null;
let nextSessionId = 1;

function finish(
  sessionId: number,
  ok: boolean,
  warnings: string[],
  error?: string
): void {
  const payload: PsdExportFinishedMessage = {
    type: "psdExportFinished",
    sessionId,
    ok,
    warnings,
  };
  if (error) {
    payload.error = error;
  }
  figma.ui.postMessage(payload);
}

function fail(error: string): void {
  figma.notify(error, { error: true });
  finish(0, false, [], error);
}

/** Ждём подтверждения от UI, но не дольше ACK_TIMEOUT_MS. */
function waitForAck(current: Session): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) {
        return;
      }
      settled = true;
      current.resolveAck = null;
      resolve();
    };
    current.resolveAck = done;
    setTimeout(done, ACK_TIMEOUT_MS);
  });
}

export function resolvePsdAck(sessionId: number, index: number): void {
  if (!session || session.id !== sessionId) {
    return;
  }
  // index приходит для диагностики: в полёте всегда ровно один слой.
  void index;
  const resolve = session.resolveAck;
  if (resolve) {
    resolve();
  }
}

export function cancelPsdExport(sessionId: number): void {
  if (!session || session.id !== sessionId) {
    return;
  }
  session.cancelled = true;
  const resolve = session.resolveAck;
  if (resolve) {
    resolve();
  }
}

function validateRoot(): SceneNode | null {
  const selection = figma.currentPage.selection;
  if (selection.length === 0) {
    fail("Нет выделения — выделите фрейм.");
    return null;
  }
  if (selection.length > 1) {
    fail(`Выделите ровно один фрейм — сейчас выделено ${selection.length}.`);
    return null;
  }
  const node = selection[0];
  if (ROOT_TYPES.indexOf(node.type) === -1) {
    fail(`PSD собирается из фрейма — выделен слой типа ${node.type}.`);
    return null;
  }
  if ("rotation" in node && Math.abs(node.rotation) > 0.01) {
    fail("Поверните фрейм в 0° — холст PSD не может быть повёрнутым.");
    return null;
  }
  if (!node.absoluteBoundingBox) {
    fail("У фрейма нет границ — экспортировать нечего.");
    return null;
  }
  return node;
}

export async function runPsdExport(
  message: PsdExportStartMessage
): Promise<void> {
  const root = validateRoot();
  if (!root) {
    return;
  }

  const requested = message.scale;
  const scale = Number.isFinite(requested)
    ? Math.min(4, Math.max(1, requested))
    : 1;

  let tree;
  try {
    tree = buildPsdTree(root, scale);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
    return;
  }

  const maxSide = Math.max(tree.docWidth, tree.docHeight);
  if (maxSide > PSB_MAX_SIDE) {
    fail(`Холст ${tree.docWidth}×${tree.docHeight} px — это больше предела PSB.`);
    return;
  }
  const psb = maxSide > PSD_MAX_SIDE;
  if (tree.leaves.length === 0) {
    fail("Во фрейме нет видимых слоёв.");
    return;
  }
  if (tree.leaves.length > MAX_LEAVES) {
    fail(
      `Слоёв: ${tree.leaves.length}. Больше ${MAX_LEAVES} Photoshop и память браузера не потянут — разбейте фрейм.`
    );
    return;
  }
  if (tree.estimatedPixelBytes > MAX_PIXEL_BYTES) {
    const gb = (tree.estimatedPixelBytes / 1024 / 1024 / 1024).toFixed(1);
    fail(`Слишком много пикселей (≈${gb} ГБ). Уменьшите масштаб.`);
    return;
  }

  const current: Session = {
    id: nextSessionId++,
    cancelled: false,
    resolveAck: null,
  };
  session = current;
  const warnings = tree.warnings.slice();

  figma.ui.postMessage({
    type: "psdExportStructure",
    sessionId: current.id,
    docWidth: tree.docWidth,
    docHeight: tree.docHeight,
    scale,
    fileName: sanitizePsdFileName(root.name),
    psb,
    leafCount: tree.leaves.length,
    children: tree.children,
    warnings: tree.warnings,
  });

  try {
    const composite = await root.exportAsync({
      format: "PNG",
      constraint: { type: "SCALE", value: scale },
    });
    if (session !== current || current.cancelled) {
      return;
    }
    figma.ui.postMessage({
      type: "psdExportComposite",
      sessionId: current.id,
      bytes: composite,
    });
  } catch (error) {
    // Композит нужен только для превью в сторонних просмотрщиках — без него PSD валиден.
    const text = error instanceof Error ? error.message : String(error);
    warnings.push(`Превью документа не собрано: ${text}`);
  }

  for (let index = 0; index < tree.leaves.length; index++) {
    if (session !== current || current.cancelled) {
      return;
    }
    const node = tree.leaves[index];
    let bytes: Uint8Array = new Uint8Array(0);
    let ok = false;
    let reason: string | undefined;

    if (node.removed) {
      reason = "слой удалён во время экспорта";
    } else {
      try {
        bytes = await node.exportAsync({
          format: "PNG",
          constraint: { type: "SCALE", value: scale },
        });
        ok = true;
      } catch (error) {
        reason = error instanceof Error ? error.message : String(error);
      }
    }

    if (session !== current || current.cancelled) {
      return;
    }
    if (!ok) {
      warnings.push(`${node.name}: ${reason}`);
    }

    figma.ui.postMessage({
      type: "psdExportLayerBytes",
      sessionId: current.id,
      index,
      ok,
      bytes,
      reason,
    });

    await waitForAck(current);
  }

  if (session !== current || current.cancelled) {
    return;
  }
  session = null;
  finish(current.id, true, warnings);
}
