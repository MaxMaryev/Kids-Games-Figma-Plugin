/**
 * Сборка .psd на стороне iframe.
 *
 * Почему здесь, а не в песочнице: exportAsync отдаёт PNG, а PSD нужен сырой
 * RGBA — декодировать картинку без canvas нечем. Скачать файл из песочницы
 * тоже нельзя. Поэтому песочница считает геометрию и шлёт байты, а вся работа
 * с пикселями и с ag-psd живёт тут.
 *
 * Модуль собирается отдельным проходом esbuild в IIFE с globalName KGP_PSD и
 * вставляется в ui.html: сам ui.html через сборщик не проходит и импортов не знает.
 */
import { writePsd } from "ag-psd";
import type { Layer } from "ag-psd";
import {
  boxToRect,
  intersectRect,
  isEmptyRect,
  pickAnchor,
  placeBitmap,
} from "../domain/psdLayout";
import type { PsdBox, PsdRect } from "../domain/psdLayout";
import type { PsdExportTreeNode, PsdSolidFill } from "../messages";

export type PsdBridgeConfig = {
  postToPlugin: (message: unknown) => void;
  onProgress: (done: number, total: number, layerName: string) => void;
  onStatus: (text: string, isError?: boolean) => void;
  onWarnings: (warnings: string[]) => void;
  onBusy: (busy: boolean) => void;
};

type LeafInfo = {
  name: string;
  renderBox: PsdBox;
  boundsBox: PsdBox;
  clipBox: PsdBox | null;
};

type DecodedLayer = {
  rect: PsdRect;
  imageData: ImageData;
};

type Session = {
  id: number;
  docWidth: number;
  docHeight: number;
  fileName: string;
  psb: boolean;
  leafCount: number;
  tree: PsdExportTreeNode[];
  leaves: LeafInfo[];
  decoded: (DecodedLayer | null)[];
  composite: ImageData | null;
  warnings: string[];
  done: number;
  chain: Promise<void>;
  cancelled: boolean;
};

let config: PsdBridgeConfig | null = null;
let session: Session | null = null;

export function configure(next: PsdBridgeConfig): void {
  config = next;
}

export function isBusy(): boolean {
  return session !== null;
}

function emitStatus(text: string, isError?: boolean): void {
  if (config) {
    config.onStatus(text, isError);
  }
}

function emitBusy(busy: boolean): void {
  if (config) {
    config.onBusy(busy);
  }
}

export function reset(): void {
  session = null;
  emitBusy(false);
}

export function cancel(): void {
  if (!session) {
    return;
  }
  const id = session.id;
  session.cancelled = true;
  session = null;
  emitBusy(false);
  emitStatus("Экспорт отменён.");
  if (config) {
    config.postToPlugin({ type: "psdExportCancel", sessionId: id });
  }
}

/* ------------------------------------------------------------------ */
/* Приём байтов                                                        */
/* ------------------------------------------------------------------ */

/**
 * Uint8Array между песочницей и iframe в разных версиях хоста доезжает то
 * типизированным массивом, то обычным объектом с числовыми ключами.
 * Нормализуем, чтобы это перестало быть риском.
 */
function toUint8Array(value: unknown): Uint8Array<ArrayBuffer> {
  if (value instanceof Uint8Array) {
    // Уже нужный вид; дженерик уточняем, чтобы массив принимал Blob.
    return value as Uint8Array<ArrayBuffer>;
  }
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }
  if (Array.isArray(value)) {
    return Uint8Array.from(value as number[]);
  }
  if (value && typeof value === "object") {
    const source = value as { length?: number; byteLength?: number };
    const length =
      typeof source.length === "number"
        ? source.length
        : typeof source.byteLength === "number"
          ? source.byteLength
          : 0;
    const bytes = new Uint8Array(length);
    const indexed = value as Record<number, number>;
    for (let i = 0; i < length; i++) {
      bytes[i] = indexed[i];
    }
    return bytes;
  }
  return new Uint8Array(0);
}

function collectLeaves(nodes: PsdExportTreeNode[], into: LeafInfo[]): void {
  for (const node of nodes) {
    if (node.kind === "group") {
      collectLeaves(node.children, into);
    } else if (node.kind === "leaf") {
      into[node.index] = {
        name: node.name,
        renderBox: node.renderBox,
        boundsBox: node.boundsBox,
        clipBox: node.clipBox,
      };
    }
  }
}

/* ------------------------------------------------------------------ */
/* Растр                                                               */
/* ------------------------------------------------------------------ */

function createContext(
  width: number,
  height: number
): CanvasRenderingContext2D | null {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas.getContext("2d", { willReadFrequently: true });
}

async function decodeBitmap(bytes: Uint8Array<ArrayBuffer>): Promise<ImageBitmap> {
  const blob = new Blob([bytes], { type: "image/png" });
  try {
    return await createImageBitmap(blob, {
      premultiplyAlpha: "none",
      colorSpaceConversion: "none",
    });
  } catch (error) {
    // Старые движки не знают опций — декодируем как получится.
    return await createImageBitmap(blob);
  }
}

function solidImageData(
  fill: PsdSolidFill,
  width: number,
  height: number
): ImageData | null {
  const ctx = createContext(width, height);
  if (!ctx) {
    return null;
  }
  ctx.fillStyle = `rgba(${fill.r}, ${fill.g}, ${fill.b}, ${fill.opacity})`;
  ctx.fillRect(0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

async function decodeComposite(
  current: Session,
  bytes: Uint8Array<ArrayBuffer>
): Promise<void> {
  const bitmap = await decodeBitmap(bytes);
  try {
    const ctx = createContext(current.docWidth, current.docHeight);
    if (!ctx) {
      return;
    }
    ctx.drawImage(bitmap, 0, 0);
    current.composite = ctx.getImageData(
      0,
      0,
      current.docWidth,
      current.docHeight
    );
  } finally {
    bitmap.close();
  }
}

async function decodeLayer(
  current: Session,
  index: number,
  bytes: Uint8Array<ArrayBuffer>
): Promise<void> {
  const leaf = current.leaves[index];
  if (!leaf) {
    return;
  }
  const bitmap = await decodeBitmap(bytes);
  try {
    const anchor = pickAnchor(
      bitmap.width,
      bitmap.height,
      leaf.renderBox,
      leaf.boundsBox
    );
    if (anchor.source === "fallback") {
      current.warnings.push(
        `${leaf.name}: слой обрезан родителем, позиция может быть неточной`
      );
    }
    const placed = placeBitmap(bitmap.width, bitmap.height, anchor.box);
    const clip = leaf.clipBox ? boxToRect(leaf.clipBox) : null;
    const rect = intersectRect(placed, clip);
    if (isEmptyRect(rect)) {
      return;
    }
    const width = rect.right - rect.left;
    const height = rect.bottom - rect.top;
    const ctx = createContext(width, height);
    if (!ctx) {
      return;
    }
    ctx.drawImage(bitmap, placed.left - rect.left, placed.top - rect.top);
    current.decoded[index] = {
      rect,
      imageData: ctx.getImageData(0, 0, width, height),
    };
  } finally {
    bitmap.close();
  }
}

/* ------------------------------------------------------------------ */
/* Сборка PSD                                                          */
/* ------------------------------------------------------------------ */

function toAgLayer(
  node: PsdExportTreeNode,
  current: Session
): Layer | null {
  if (node.kind === "group") {
    const children: Layer[] = [];
    for (const child of node.children) {
      const built = toAgLayer(child, current);
      if (built) {
        children.push(built);
      }
    }
    if (children.length === 0) {
      return null;
    }
    return { name: node.name, opened: true, children };
  }

  if (node.kind === "solid") {
    const imageData = solidImageData(
      node.fill,
      current.docWidth,
      current.docHeight
    );
    if (!imageData) {
      return null;
    }
    return {
      name: node.name,
      left: 0,
      top: 0,
      right: current.docWidth,
      bottom: current.docHeight,
      imageData,
    };
  }

  const decoded = current.decoded[node.index];
  if (!decoded) {
    return null;
  }
  // opacity и blendMode намеренно нейтральные: они уже запечены в пиксели
  // самим exportAsync, второй раз их применять нельзя.
  return {
    name: node.name,
    left: decoded.rect.left,
    top: decoded.rect.top,
    right: decoded.rect.right,
    bottom: decoded.rect.bottom,
    imageData: decoded.imageData,
    opacity: 1,
    blendMode: "normal",
    hidden: false,
  };
}

function formatSize(bytes: number): string {
  const mb = bytes / 1024 / 1024;
  if (mb >= 1) {
    return mb.toFixed(1).replace(".", ",") + " МБ";
  }
  return Math.max(1, Math.round(bytes / 1024)) + " КБ";
}

function pluralLayers(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return "слой";
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return "слоя";
  }
  return "слоёв";
}

function countLayers(layers: Layer[]): number {
  let total = 0;
  for (const layer of layers) {
    if (layer.children && layer.children.length > 0) {
      total += countLayers(layer.children);
    } else {
      total++;
    }
  }
  return total;
}

function download(buffer: ArrayBuffer, fileName: string): void {
  const blob = new Blob([buffer], { type: "image/vnd.adobe.photoshop" });
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    // Если песочница iframe запрещает загрузку по ссылке — пробуем окном.
    window.open(url, "_blank");
  }
  // Отзываем с запасом: Figma отдаёт файл асинхронно.
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function finalize(current: Session): void {
  const children: Layer[] = [];
  for (const node of current.tree) {
    const built = toAgLayer(node, current);
    if (built) {
      children.push(built);
    }
  }

  if (children.length === 0) {
    emitStatus("Не удалось собрать ни одного слоя.", true);
    if (config) {
      config.postToPlugin({
        type: "psdExportNotify",
        text: "PSD не собран: нет слоёв",
        isError: true,
      });
    }
    return;
  }

  const buffer = writePsd(
    {
      width: current.docWidth,
      height: current.docHeight,
      children,
      imageData: current.composite || undefined,
    },
    {
      generateThumbnail: false,
      // trimImageData срезала бы прозрачные поля и сделала рамку слоя плотнее,
      // чем бокс в Figma. Размер слоя должен совпадать — поэтому false.
      trimImageData: false,
      psb: current.psb,
    }
  );

  const total = countLayers(children);
  const fileName = current.fileName + (current.psb ? ".psb" : ".psd");
  download(buffer, fileName);

  emitStatus(
    `Готово: ${fileName}, ${total} ${pluralLayers(total)}, ${formatSize(buffer.byteLength)}.`
  );
  if (config) {
    config.onWarnings(current.warnings);
    config.postToPlugin({
      type: "psdExportNotify",
      text: `PSD готов: ${total} ${pluralLayers(total)}`,
    });
  }
}

/* ------------------------------------------------------------------ */
/* Приём сообщений                                                     */
/* ------------------------------------------------------------------ */

function enqueue(current: Session, step: () => Promise<void> | void): void {
  current.chain = current.chain
    .then(() => {
      if (current.cancelled || session !== current) {
        return;
      }
      return step();
    })
    .catch((error: unknown) => {
      const text = error instanceof Error ? error.message : String(error);
      current.warnings.push(text);
    });
}

type IncomingMessage = { type?: unknown; sessionId?: unknown };

function sessionFor(msg: IncomingMessage): Session | null {
  if (!session || session.cancelled) {
    return null;
  }
  return session.id === msg.sessionId ? session : null;
}

/** true — сообщение съедено модулем и в ui.html дальше не идёт. */
export function handleMessage(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") {
    return false;
  }
  const msg = raw as IncomingMessage & Record<string, unknown>;

  if (msg.type === "psdExportStructure") {
    const current: Session = {
      id: msg.sessionId as number,
      docWidth: msg.docWidth as number,
      docHeight: msg.docHeight as number,
      fileName: msg.fileName as string,
      psb: msg.psb === true,
      leafCount: msg.leafCount as number,
      tree: msg.children as PsdExportTreeNode[],
      leaves: [],
      decoded: [],
      composite: null,
      warnings: ((msg.warnings as string[]) || []).slice(),
      done: 0,
      chain: Promise.resolve(),
      cancelled: false,
    };
    collectLeaves(current.tree, current.leaves);
    session = current;
    emitBusy(true);
    if (config) {
      config.onProgress(0, current.leafCount, "");
    }
    emitStatus(
      `Экспорт: ${current.docWidth}×${current.docHeight} px, ${current.leafCount} ${pluralLayers(current.leafCount)}…`
    );
    return true;
  }

  if (msg.type === "psdExportComposite") {
    const current = sessionFor(msg);
    if (current) {
      const bytes = toUint8Array(msg.bytes);
      enqueue(current, () => decodeComposite(current, bytes));
    }
    return true;
  }

  if (msg.type === "psdExportLayerBytes") {
    const current = sessionFor(msg);
    if (!current) {
      return true;
    }
    const index = msg.index as number;
    const ok = msg.ok === true;
    const bytes = ok ? toUint8Array(msg.bytes) : null;
    enqueue(current, async () => {
      if (bytes) {
        await decodeLayer(current, index, bytes);
      }
      current.done++;
      const leaf = current.leaves[index];
      if (config) {
        config.onProgress(
          current.done,
          current.leafCount,
          leaf ? leaf.name : ""
        );
        config.postToPlugin({
          type: "psdExportLayerAck",
          sessionId: current.id,
          index,
        });
      }
    });
    return true;
  }

  if (msg.type === "psdExportFinished") {
    const current = sessionFor(msg);
    if (!current) {
      // sessionId 0 — отказ ещё до старта сессии (нет выделения и т.п.).
      if (msg.ok !== true) {
        emitStatus(String(msg.error || "Экспорт не удался."), true);
        emitBusy(false);
      }
      return true;
    }
    const warnings = (msg.warnings as string[]) || [];
    enqueue(current, () => {
      for (const warning of warnings) {
        if (current.warnings.indexOf(warning) === -1) {
          current.warnings.push(warning);
        }
      }
      if (msg.ok === true) {
        finalize(current);
      } else {
        emitStatus(String(msg.error || "Экспорт не удался."), true);
      }
      if (session === current) {
        session = null;
      }
      emitBusy(false);
    });
    return true;
  }

  return false;
}
