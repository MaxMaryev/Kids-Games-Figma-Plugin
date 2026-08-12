// src/domain/layerNamePresets.ts
var COUNTER_SEGMENT = "01";
var SEPARATOR = "_";
var DEFAULT_PRESET_SEEDS = [
  { template: "Headdress_" },
  {
    template: "Hair_Front_",
    children: [
      { template: "Hair_Front_01_1" },
      { template: "Hair_Front_01_2" }
    ]
  },
  {
    template: "Eyes_",
    children: [
      {
        template: "Eyes_01_R",
        children: [
          { template: "Eyes_01_R_BottomLash" },
          { template: "Eyes_01_R_TopLash" },
          { template: "Eyes_01_R_Eye" },
          { template: "Eyes_01_R_Eyeshadow" }
        ]
      },
      {
        template: "Eyes_01_L",
        children: [
          { template: "Eyes_01_L_BottomLash" },
          { template: "Eyes_01_L_TopLash" },
          { template: "Eyes_01_L_Eye" },
          { template: "Eyes_01_L_Eyeshadow" }
        ]
      }
    ]
  },
  {
    template: "Eyebrows_",
    children: [{ template: "Eyebrows_01_R" }, { template: "Eyebrows_01_L" }]
  },
  { template: "Mouth_" },
  { template: "Blush_" },
  { template: "Body_" },
  {
    template: "T-shirt_",
    children: [{ template: "T-shirt_01_2" }, { template: "T-shirt_01_1" }]
  },
  {
    template: "Shorts_",
    children: [{ template: "Shorts_01_2" }, { template: "Shorts_01_1" }]
  },
  {
    template: "Dress_",
    children: [
      {
        template: "Dress_T-shirt_",
        children: [
          { template: "Dress_T-shirt_01_2" },
          { template: "Dress_T-shirt_01_1" }
        ]
      },
      {
        template: "Dress_Shorts_",
        children: [
          { template: "Dress_Shorts_01_2" },
          { template: "Dress_Shorts_01_1" }
        ]
      }
    ]
  },
  {
    template: "Outfits_",
    children: [
      {
        template: "Outfits_T-shirt_",
        children: [
          { template: "Outfits_T-shirt_01_2" },
          { template: "Outfits_T-shirt_01_1" }
        ]
      },
      {
        template: "Outfits_Shorts_01",
        children: [
          { template: "Outfits_Shorts_01_2" },
          { template: "Outfits_Shorts_01_1" }
        ]
      }
    ]
  },
  {
    template: "T-shirt_Shoulders_",
    children: [
      {
        template: "T-shirt_Sleeve_R_",
        children: [
          { template: "T-shirt_Sleeve_R_01_1" },
          { template: "T-shirt_Sleeve_R_01_2" }
        ]
      },
      {
        template: "T-shirt_Sleeve_L_",
        children: [
          { template: "T-shirt_Sleeve_L_01_1" },
          { template: "T-shirt_Sleeve_L_01_2" }
        ]
      }
    ]
  },
  {
    template: "Dress_Shoulders_",
    children: [
      {
        template: "Dress_Sleeve_R_",
        children: [
          { template: "Dress_Sleeve_R_01_1" },
          { template: "Dress_Sleeve_R_01_2" }
        ]
      },
      {
        template: "Dress_Sleeve_L_",
        children: [
          { template: "Dress_Sleeve_L_01_1" },
          { template: "Dress_Sleeve_L_01_2" }
        ]
      }
    ]
  },
  {
    template: "Outfits_Shoulders_",
    children: [
      {
        template: "Outfits_Sleeve_R_",
        children: [
          { template: "Outfits_Sleeve_R_01_1" },
          { template: "Outfits_Sleeve_R_01_2" }
        ]
      },
      {
        template: "Outfits_Sleeve_L_",
        children: [
          { template: "Outfits_Sleeve_L_01_1" },
          { template: "Outfits_Sleeve_L_01_2" }
        ]
      }
    ]
  },
  {
    template: "Shoes_",
    children: [{ template: "Shoes_01_R" }, { template: "Shoes_01_L" }]
  },
  { template: "Shorts_Back_" },
  { template: "Dress_Back_" },
  { template: "Outfits_Back_" },
  {
    template: "Hair_Back_",
    children: [{ template: "Hair_Back_01_1" }, { template: "Hair_Back_01_2" }]
  }
];
var STANDARD_PRESET_ID_PREFIX = "std:";
function withStandardIds(seeds) {
  return seeds.map((seed) => {
    const preset = {
      id: STANDARD_PRESET_ID_PREFIX + seed.template,
      template: seed.template
    };
    if (seed.children && seed.children.length > 0) {
      preset.children = withStandardIds(seed.children);
    }
    return preset;
  });
}
var DEFAULT_LAYER_NAME_PRESETS = withStandardIds(DEFAULT_PRESET_SEEDS);
function formatCounter(index) {
  const value = index + 1;
  return value < 10 ? "0" + value : String(value);
}
function buildNameForIndex(template, index) {
  const counter = formatCounter(index);
  if (template.length > 0 && template.slice(-1) === SEPARATOR) {
    return template + counter;
  }
  const segments = template.split(SEPARATOR);
  const counterAt = segments.indexOf(COUNTER_SEGMENT);
  if (counterAt === -1) {
    return template + SEPARATOR + counter;
  }
  segments[counterAt] = counter;
  return segments.join(SEPARATOR);
}
function buildNamesForSelection(template, count) {
  const names = [];
  for (let index = 0; index < count; index++) {
    names.push(buildNameForIndex(template, index));
  }
  return names;
}

// src/domain/presetTreeOps.ts
var PRESET_STORAGE_VERSION = 1;
var generatedIdCounter = 0;
function createPresetId() {
  generatedIdCounter++;
  return "u:" + Date.now().toString(36) + "-" + generatedIdCounter.toString(36);
}
function cloneNode(node) {
  const copy = { id: node.id, template: node.template };
  if (node.children && node.children.length > 0) {
    copy.children = node.children.map(cloneNode);
  }
  return copy;
}
function cloneTree(tree) {
  return tree.map(cloneNode);
}
function findPreset(tree, id) {
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
function countPresets(tree) {
  let total = 0;
  for (const node of tree) {
    total++;
    if (node.children) {
      total += countPresets(node.children);
    }
  }
  return total;
}
function normalizePresetTree(raw) {
  const presets = Array.isArray(raw) ? raw : raw && typeof raw === "object" && Array.isArray(raw.presets) ? raw.presets : null;
  if (!presets) {
    return cloneTree(DEFAULT_LAYER_NAME_PRESETS);
  }
  const seenIds = {};
  const normalized = normalizeNodes(presets, seenIds);
  if (normalized.length === 0) {
    return cloneTree(DEFAULT_LAYER_NAME_PRESETS);
  }
  return normalized;
}
function normalizeNodes(raw, seenIds) {
  const result = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const candidate = item;
    const template = typeof candidate.template === "string" ? candidate.template.trim() : "";
    if (template.length === 0) {
      continue;
    }
    const rawId = typeof candidate.id === "string" ? candidate.id : "";
    const id = rawId.length > 0 && !seenIds[rawId] ? rawId : createPresetId();
    seenIds[id] = true;
    const node = { id, template };
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
function defaultPresetTree() {
  return cloneTree(DEFAULT_LAYER_NAME_PRESETS);
}
function renamePreset(tree, id, nextTemplate) {
  const template = nextTemplate.trim();
  const target = findPreset(tree, id);
  if (!target || template.length === 0) {
    return { tree: cloneTree(tree), affected: 0, found: Boolean(target) };
  }
  const previousTemplate = target.template;
  let affected = 0;
  const rewriteDescendants = (nodes) => nodes.map((node) => {
    const copy = cloneNode(node);
    if (previousTemplate.length > 0 && copy.template.indexOf(previousTemplate) === 0) {
      copy.template = template + copy.template.slice(previousTemplate.length);
      affected++;
    }
    if (copy.children) {
      copy.children = rewriteDescendants(copy.children);
    }
    return copy;
  });
  const walk = (nodes) => nodes.map((node) => {
    if (node.id === id) {
      const copy2 = cloneNode(node);
      copy2.template = template;
      if (copy2.children) {
        copy2.children = rewriteDescendants(copy2.children);
      }
      return copy2;
    }
    const copy = cloneNode(node);
    if (copy.children) {
      copy.children = walk(copy.children);
    }
    return copy;
  });
  return { tree: walk(tree), affected, found: true };
}
function addPreset(tree, parentId, template) {
  const cleaned = template.trim();
  if (cleaned.length === 0) {
    return { tree: cloneTree(tree), addedId: "" };
  }
  const added = { id: createPresetId(), template: cleaned };
  if (!parentId) {
    return { tree: cloneTree(tree).concat([added]), addedId: added.id };
  }
  const walk = (nodes) => nodes.map((node) => {
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
function removePreset(tree, id) {
  const target = findPreset(tree, id);
  if (!target) {
    return { tree: cloneTree(tree), removed: 0 };
  }
  const removed = 1 + (target.children ? countPresets(target.children) : 0);
  const walk = (nodes) => {
    const result = [];
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
function movePreset(tree, id, direction) {
  let done = false;
  const reorder = (nodes) => {
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

// src/domain/multipleOfFour.ts
var PIXEL_EPS = 0.01;
function pixelSizeFromLength(length) {
  const rounded = Math.round(length);
  if (Math.abs(length - rounded) < PIXEL_EPS) {
    return rounded;
  }
  return Math.ceil(length);
}
function isMultipleOfFour(value) {
  return value % 4 === 0;
}
function ceilToMultipleOfFour(value) {
  return Math.ceil(value / 4) * 4;
}
function analyzePixelDimensions(width, height) {
  const w = pixelSizeFromLength(width);
  const h = pixelSizeFromLength(height);
  const targetWidth = ceilToMultipleOfFour(w);
  const targetHeight = ceilToMultipleOfFour(h);
  const ok = isMultipleOfFour(w) && isMultipleOfFour(h);
  return {
    ok,
    width: w,
    height: h,
    targetWidth,
    targetHeight,
    deltaWidth: targetWidth - w,
    deltaHeight: targetHeight - h
  };
}

// src/figma/nodeQueries.ts
function parentHasAutoLayout(parent) {
  return "layoutMode" in parent && parent.layoutMode !== "NONE";
}
function getAbsoluteRenderBounds(node) {
  if (!("absoluteRenderBounds" in node)) {
    return null;
  }
  return node.absoluteRenderBounds;
}
function canInsertIntoParent(parent) {
  return Boolean(parent && "insertChild" in parent);
}
function layerOrderPath(node) {
  const path = [];
  let current = node;
  while (current.parent) {
    const parent = current.parent;
    if (!("children" in parent)) {
      break;
    }
    path.unshift(parent.children.indexOf(current));
    current = parent;
  }
  return path;
}
function sortNodesTopToBottom(nodes) {
  const decorated = nodes.map((node) => ({ node, path: layerOrderPath(node) }));
  decorated.sort((a, b) => {
    const shared = Math.min(a.path.length, b.path.length);
    for (let level = 0; level < shared; level++) {
      if (a.path[level] !== b.path[level]) {
        return b.path[level] - a.path[level];
      }
    }
    return a.path.length - b.path.length;
  });
  return decorated.map((item) => item.node);
}

// src/features/multipleOfFourCheck.ts
function runMultipleOfFourCheck() {
  const selection = [...figma.currentPage.selection];
  const violations = [];
  const violationPayloads = [];
  const skipped = [];
  if (selection.length === 0) {
    figma.notify("\u041D\u0435\u0442 \u0432\u044B\u0434\u0435\u043B\u0435\u043D\u0438\u044F");
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
          renderBounds
        })
      );
    } catch (e) {
      console.log("[mo4 check]", node.name, { renderBounds, absBox });
    }
    if (!renderBounds) {
      skipped.push({
        nodeId: node.id,
        name: node.name,
        reason: "\u041D\u0435\u0442 absoluteRenderBounds (\u0441\u043B\u043E\u0439 \u043D\u0435\u0432\u0438\u0434\u0438\u043C \u0438\u043B\u0438 \u043D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044F)."
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
    } catch (e) {
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
      targetHeight: analysis.targetHeight
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
    skipped
  };
}

// src/figma/geometry.ts
function worldVectorToLocal(transform, worldDx, worldDy) {
  const [[a, b], [c, d]] = transform;
  const det = a * d - b * c;
  if (Math.abs(det) < 1e-10) {
    return { x: worldDx, y: worldDy };
  }
  return {
    x: (d * worldDx - b * worldDy) / det,
    y: (a * worldDy - c * worldDx) / det
  };
}
var ALIGN_EPS = 1e-3;
function alignNodeToWorldPoint(node, worldX, worldY, passes = 3) {
  const report = {
    measured: false,
    passes: 0,
    from: null,
    to: null,
    target: { x: worldX, y: worldY },
    residual: null
  };
  for (let pass = 0; pass < passes; pass++) {
    const box = node.absoluteBoundingBox;
    if (!box) {
      return report;
    }
    report.measured = true;
    if (!report.from) {
      report.from = { x: box.x, y: box.y };
    }
    report.to = { x: box.x, y: box.y };
    const worldDx = worldX - box.x;
    const worldDy = worldY - box.y;
    report.residual = { x: worldDx, y: worldDy };
    if (Math.abs(worldDx) < ALIGN_EPS && Math.abs(worldDy) < ALIGN_EPS) {
      return report;
    }
    const parent = node.parent;
    const transform = parent && "absoluteTransform" in parent ? parent.absoluteTransform : null;
    const local = transform ? worldVectorToLocal(transform, worldDx, worldDy) : { x: worldDx, y: worldDy };
    node.x += local.x;
    node.y += local.y;
    report.passes++;
  }
  const finalBox = node.absoluteBoundingBox;
  if (finalBox) {
    report.to = { x: finalBox.x, y: finalBox.y };
    report.residual = { x: worldX - finalBox.x, y: worldY - finalBox.y };
  }
  return report;
}
function placeRectangleAtDocumentBox(rectangle, parent, documentBox) {
  const parentBox = "absoluteBoundingBox" in parent ? parent.absoluteBoundingBox : null;
  if (parentBox) {
    rectangle.x = documentBox.x - parentBox.x;
    rectangle.y = documentBox.y - parentBox.y;
  } else {
    rectangle.x = documentBox.x;
    rectangle.y = documentBox.y;
  }
  rectangle.resize(documentBox.width, documentBox.height);
}

// src/features/multipleOfFourPadding.ts
var NO4_CHILD_NAME_PREFIX = "[no4] ";
var MO4_WRAPPER_PLUGIN_KEY = "mo4Wrapper";
var MO4_WRAPPER_PLUGIN_VALUE = "v1";

// src/features/multipleOfFourFix.ts
var DEBUG_LOG_LIMIT = 400;
var debugLog = [];
function resetDebugLog() {
  debugLog = [];
}
function logJSON(label, payload) {
  let text;
  try {
    text = `${label} ${JSON.stringify(payload)}`;
  } catch (e) {
    text = `${label} <\u043D\u0435 \u0441\u0435\u0440\u0438\u0430\u043B\u0438\u0437\u0443\u0435\u0442\u0441\u044F>`;
  }
  if (debugLog.length < DEBUG_LOG_LIMIT) {
    debugLog.push(text);
  }
  console.log(text);
}
function isMo4WrapperFrame(node) {
  return node.type === "FRAME" && node.getPluginData(MO4_WRAPPER_PLUGIN_KEY) === MO4_WRAPPER_PLUGIN_VALUE;
}
function getExistingMo4WrapperForNode(node) {
  if (node.type === "FRAME" && isMo4WrapperFrame(node)) {
    return node;
  }
  const parent = node.parent;
  if (parent && isMo4WrapperFrame(parent)) {
    return parent;
  }
  return null;
}
function worldDimsToLocalDims(parentTransform, worldWidth, worldHeight) {
  if (!parentTransform) {
    return { width: worldWidth, height: worldHeight, exact: true };
  }
  const [[a, b], [c, d]] = parentTransform;
  const p = Math.abs(a);
  const q = Math.abs(b);
  const r = Math.abs(c);
  const s = Math.abs(d);
  const det = p * s - q * r;
  const sx = Math.sqrt(a * a + c * c);
  const sy = Math.sqrt(b * b + d * d);
  if (Math.abs(det) < 1e-6 * Math.max(1e-12, sx * sy)) {
    return {
      width: sx < 1e-10 ? worldWidth : worldWidth / sx,
      height: sy < 1e-10 ? worldHeight : worldHeight / sy,
      exact: false
    };
  }
  return {
    width: (s * worldWidth - q * worldHeight) / det,
    height: (p * worldHeight - r * worldWidth) / det,
    exact: true
  };
}
function copyLayoutSlotFromNodeToWrapper(source, wrapper, outerParent) {
  if (!parentHasAutoLayout(outerParent)) {
    return;
  }
  if ("layoutSizingHorizontal" in source && "layoutSizingHorizontal" in wrapper) {
    wrapper.layoutSizingHorizontal = source.layoutSizingHorizontal;
    wrapper.layoutSizingVertical = source.layoutSizingVertical;
  }
  if ("layoutAlign" in source && "layoutAlign" in wrapper) {
    wrapper.layoutAlign = source.layoutAlign;
  }
  if ("layoutGrow" in source && "layoutGrow" in wrapper) {
    wrapper.layoutGrow = source.layoutGrow;
  }
  if ("layoutPositioning" in source && "layoutPositioning" in wrapper) {
    wrapper.layoutPositioning = source.layoutPositioning;
  }
}
function wrapSceneNodeInFixFrame(node, sourceBox) {
  const parent = node.parent;
  if (!canInsertIntoParent(parent)) {
    throw new Error("\u041D\u0435\u043B\u044C\u0437\u044F \u0432\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u043E\u0431\u0451\u0440\u0442\u043A\u0443 \u0432 \u0440\u043E\u0434\u0438\u0442\u0435\u043B\u044F");
  }
  if (parent.type === "COMPONENT") {
    throw new Error("\u0420\u043E\u0434\u0438\u0442\u0435\u043B\u044C \u2014 \u0433\u043B\u0430\u0432\u043D\u044B\u0439 \u043A\u043E\u043C\u043F\u043E\u043D\u0435\u043D\u0442");
  }
  const outerParent = parent;
  const index = parent.children.indexOf(node);
  const localWidth = node.width;
  const localHeight = node.height;
  const originalNodeName = node.name;
  const baseNameForWrapper = originalNodeName.startsWith(NO4_CHILD_NAME_PREFIX) ? originalNodeName.slice(NO4_CHILD_NAME_PREFIX.length) : originalNodeName;
  const wrapper = figma.createFrame();
  wrapper.name = baseNameForWrapper;
  wrapper.clipsContent = false;
  wrapper.fills = [];
  wrapper.strokes = [];
  wrapper.layoutMode = "NONE";
  wrapper.setPluginData(MO4_WRAPPER_PLUGIN_KEY, MO4_WRAPPER_PLUGIN_VALUE);
  parent.insertChild(index, wrapper);
  wrapper.resizeWithoutConstraints(
    Math.max(1, localWidth),
    Math.max(1, localHeight)
  );
  copyLayoutSlotFromNodeToWrapper(node, wrapper, outerParent);
  if (!parentHasAutoLayout(outerParent)) {
    const wrapperBefore = wrapper.absoluteBoundingBox;
    const report = alignNodeToWorldPoint(wrapper, sourceBox.x, sourceBox.y);
    logJSON("[mo4] wrap: align wrapper to source", {
      sourceBox,
      wrapperBefore,
      report
    });
  }
  const nodeBoxBeforeAppend = node.absoluteBoundingBox;
  wrapper.appendChild(node);
  node.name = `${NO4_CHILD_NAME_PREFIX}${baseNameForWrapper}`;
  const nodeBoxAfterAppend = node.absoluteBoundingBox;
  const restoreReport = nodeBoxBeforeAppend ? alignNodeToWorldPoint(node, nodeBoxBeforeAppend.x, nodeBoxBeforeAppend.y) : null;
  logJSON("[mo4] wrap: after appendChild", {
    nodeBoxBeforeAppend,
    nodeBoxAfterAppend,
    restoreReport,
    nodeBoxRestored: node.absoluteBoundingBox,
    nodeLocal: { x: node.x, y: node.y, w: node.width, h: node.height },
    wrapperBox: wrapper.absoluteBoundingBox,
    wrapperLocal: { x: wrapper.x, y: wrapper.y, w: wrapper.width, h: wrapper.height }
  });
  return wrapper;
}
function applyPaddingToWrapperFrame(wrapper, originalRenderBounds) {
  const renderBounds = originalRenderBounds != null ? originalRenderBounds : getAbsoluteRenderBounds(wrapper);
  logJSON("[mo4] applyPadding: input", {
    wrapperName: wrapper.name,
    fromOriginal: Boolean(originalRenderBounds),
    renderBounds,
    wrapperBefore: { x: wrapper.x, y: wrapper.y, w: wrapper.width, h: wrapper.height }
  });
  if (!renderBounds) {
    logJSON("[mo4] applyPadding: no renderBounds, skip", {});
    return false;
  }
  const analysis = analyzePixelDimensions(
    renderBounds.width,
    renderBounds.height
  );
  logJSON("[mo4] applyPadding: analysis", analysis);
  const totalDeltaW = analysis.targetWidth - renderBounds.width;
  const totalDeltaH = analysis.targetHeight - renderBounds.height;
  const padLeft = totalDeltaW / 2;
  const padTop = totalDeltaH / 2;
  const expandedDocumentRect = {
    x: renderBounds.x - padLeft,
    y: renderBounds.y - padTop,
    width: analysis.targetWidth,
    height: analysis.targetHeight
  };
  const outer = wrapper.parent;
  if (!canInsertIntoParent(outer)) {
    logJSON("[mo4] applyPadding: bad outer parent, skip", {});
    return false;
  }
  const outerScene = outer;
  const autoLayoutParent = parentHasAutoLayout(outerScene);
  const childSnap = [];
  for (const child of wrapper.children) {
    const scene = child;
    const box = scene.absoluteBoundingBox;
    childSnap.push({
      node: scene,
      worldX: box ? box.x : Number.NaN,
      worldY: box ? box.y : Number.NaN
    });
  }
  const wrapperBoxBefore = wrapper.absoluteBoundingBox;
  logJSON("[mo4] applyPadding: plan", {
    expandedDocumentRect,
    padLeft,
    padTop,
    parentType: outerScene.type,
    parentAutolayout: autoLayoutParent,
    wrapperBoxBefore,
    childSnap: childSnap.map((c) => ({ name: c.node.name, worldX: c.worldX, worldY: c.worldY }))
  });
  const parentTransform = "absoluteTransform" in outerScene ? outerScene.absoluteTransform : null;
  const localDims = worldDimsToLocalDims(
    parentTransform,
    expandedDocumentRect.width,
    expandedDocumentRect.height
  );
  wrapper.resizeWithoutConstraints(
    Math.max(0.01, localDims.width),
    Math.max(0.01, localDims.height)
  );
  const measured = localDims.exact ? wrapper.absoluteBoundingBox : null;
  if (measured) {
    const residualW = expandedDocumentRect.width - measured.width;
    const residualH = expandedDocumentRect.height - measured.height;
    if (Math.abs(residualW) > 0.01 || Math.abs(residualH) > 0.01) {
      const freshTransform = "absoluteTransform" in outerScene ? outerScene.absoluteTransform : null;
      const correction = worldDimsToLocalDims(
        freshTransform,
        residualW,
        residualH
      );
      logJSON("[mo4] applyPadding: size correction", {
        measured: { w: measured.width, h: measured.height },
        residualW,
        residualH,
        correction
      });
      if (correction.exact) {
        wrapper.resizeWithoutConstraints(
          Math.max(0.01, wrapper.width + correction.width),
          Math.max(0.01, wrapper.height + correction.height)
        );
      }
    }
  }
  if (!autoLayoutParent) {
    const wrapperBoxAfterResize = wrapper.absoluteBoundingBox;
    const wrapperReport = alignNodeToWorldPoint(
      wrapper,
      expandedDocumentRect.x,
      expandedDocumentRect.y
    );
    logJSON("[mo4] applyPadding: align wrapper", {
      wrapperBoxAfterResize,
      report: wrapperReport
    });
    for (const { node, worldX, worldY } of childSnap) {
      if (Number.isNaN(worldX) || Number.isNaN(worldY)) {
        logJSON("[mo4] applyPadding: child \u0431\u0435\u0437 bbox, \u043D\u0435 \u0434\u0432\u0438\u0433\u0430\u0435\u043C", { name: node.name });
        continue;
      }
      const boxBeforeRestore = node.absoluteBoundingBox;
      const localBeforeRestore = { x: node.x, y: node.y };
      const childReport = alignNodeToWorldPoint(node, worldX, worldY);
      logJSON("[mo4] applyPadding: restore child", {
        name: node.name,
        type: node.type,
        boxBeforeRestore,
        localBeforeRestore,
        report: childReport,
        localAfterRestore: { x: node.x, y: node.y }
      });
    }
  } else {
    const anchorX = wrapperBoxBefore ? wrapperBoxBefore.x : renderBounds.x;
    const anchorY = wrapperBoxBefore ? wrapperBoxBefore.y : renderBounds.y;
    const shift = worldVectorToLocal(
      wrapper.absoluteTransform,
      padLeft - (renderBounds.x - anchorX),
      padTop - (renderBounds.y - anchorY)
    );
    logJSON("[mo4] applyPadding: autolayout shift", shift);
    for (const { node } of childSnap) {
      node.x += shift.x;
      node.y += shift.y;
    }
  }
  logJSON("[mo4] applyPadding: AFTER", {
    wrapper: { x: wrapper.x, y: wrapper.y, w: wrapper.width, h: wrapper.height },
    wrapperAbs: wrapper.absoluteBoundingBox,
    wrapperRender: wrapper.absoluteRenderBounds,
    children: wrapper.children.map((c) => ({
      name: c.name,
      local: { x: c.x, y: c.y, w: c.width, h: c.height },
      abs: "absoluteBoundingBox" in c ? c.absoluteBoundingBox : null
    }))
  });
  return true;
}
function sortNodesForStableWrap(nodes) {
  return [...nodes].sort((a, b) => {
    const parentA = a.parent;
    const parentB = b.parent;
    if (!parentA || !parentB || parentA.id !== parentB.id) {
      return 0;
    }
    const children = parentA.children;
    return children.indexOf(b) - children.indexOf(a);
  });
}
function runMultipleOfFourFix() {
  resetDebugLog();
  const selection = sortNodesForStableWrap([...figma.currentPage.selection]);
  const errors = [];
  let fixedParents = 0;
  let skipped = 0;
  const wrappersToSelect = [];
  if (selection.length === 0) {
    figma.notify("\u041D\u0435\u0442 \u0432\u044B\u0434\u0435\u043B\u0435\u043D\u0438\u044F");
    return {
      type: "multipleOfFourFixResult",
      ok: true,
      fixedParents: 0,
      skipped: 0,
      errors: [],
      debug: debugLog.slice()
    };
  }
  const wrappersSeen = /* @__PURE__ */ new Set();
  for (const node of selection) {
    const parent = node.parent;
    if (!canInsertIntoParent(parent)) {
      errors.push(`${node.name}: \u043D\u0435\u043B\u044C\u0437\u044F \u0432\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u0441\u043B\u043E\u0439 \u0432 \u0440\u043E\u0434\u0438\u0442\u0435\u043B\u044F`);
      continue;
    }
    if (parent.type === "COMPONENT") {
      errors.push(
        `${node.name}: \u0440\u043E\u0434\u0438\u0442\u0435\u043B\u044C \u2014 \u0433\u043B\u0430\u0432\u043D\u044B\u0439 \u043A\u043E\u043C\u043F\u043E\u043D\u0435\u043D\u0442; \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0435 \u0437\u0430\u0442\u0440\u043E\u043D\u0435\u0442 \u0432\u0441\u0435 \u0438\u043D\u0441\u0442\u0430\u043D\u0441\u044B, \u043F\u0440\u043E\u043F\u0443\u0441\u043A.`
      );
      continue;
    }
    try {
      const existing = getExistingMo4WrapperForNode(node);
      let wrapper;
      let originalRenderBounds;
      if (existing) {
        wrapper = existing;
        originalRenderBounds = null;
        logJSON("[mo4] reuse existing wrapper", {
          name: existing.name,
          rect: { x: existing.x, y: existing.y, w: existing.width, h: existing.height },
          abs: existing.absoluteBoundingBox,
          render: existing.absoluteRenderBounds
        });
      } else {
        const absBox = "absoluteBoundingBox" in node ? node.absoluteBoundingBox : null;
        originalRenderBounds = getAbsoluteRenderBounds(node);
        logJSON("[mo4] BEFORE wrap", {
          name: node.name,
          type: node.type,
          local: { x: node.x, y: node.y, w: node.width, h: node.height },
          absBox,
          renderBounds: originalRenderBounds,
          parentType: parent.type,
          parentName: "name" in parent ? parent.name : "(no name)"
        });
        if (!originalRenderBounds || !absBox) {
          logJSON("[mo4] skip: \u043D\u0435\u0442 bbox, \u043D\u0435 \u043E\u0431\u043E\u0440\u0430\u0447\u0438\u0432\u0430\u0435\u043C", { name: node.name });
          skipped++;
          continue;
        }
        wrapper = wrapSceneNodeInFixFrame(node, absBox);
        logJSON("[mo4] AFTER wrap", {
          wrapper: { x: wrapper.x, y: wrapper.y, w: wrapper.width, h: wrapper.height },
          wrapperAbs: wrapper.absoluteBoundingBox,
          wrapperRender: wrapper.absoluteRenderBounds,
          children: wrapper.children.map((c) => ({
            name: c.name,
            local: { x: c.x, y: c.y, w: c.width, h: c.height },
            abs: "absoluteBoundingBox" in c ? c.absoluteBoundingBox : null
          }))
        });
      }
      if (wrappersSeen.has(wrapper.id)) {
        continue;
      }
      wrappersSeen.add(wrapper.id);
      wrappersToSelect.push(wrapper);
      const changed = applyPaddingToWrapperFrame(wrapper, originalRenderBounds);
      if (changed) {
        fixedParents++;
      } else {
        skipped++;
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      errors.push(`${node.name}: ${text}`);
    }
  }
  if (wrappersToSelect.length > 0) {
    figma.currentPage.selection = wrappersToSelect;
  }
  const ok = errors.length === 0;
  if (fixedParents > 0) {
    figma.notify(`\u0413\u043E\u0442\u043E\u0432\u043E: \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u043E \u043A\u043E\u043D\u0442\u0435\u0439\u043D\u0435\u0440\u043E\u0432: ${fixedParents}`);
  }
  return {
    type: "multipleOfFourFixResult",
    ok,
    fixedParents,
    skipped,
    errors,
    debug: debugLog.slice()
  };
}

// src/features/rasterize.ts
async function runRasterize(message) {
  const selection = [...figma.currentPage.selection];
  if (selection.length === 0) {
    figma.notify("\u041D\u0435\u0442 \u0432\u044B\u0434\u0435\u043B\u0435\u043D\u0438\u044F");
    return {
      type: "done",
      ok: false,
      done: 0,
      errors: [],
      error: "\u0412\u044B\u0434\u0435\u043B\u0438\u0442\u0435 \u0441\u043B\u043E\u0439(\u0438) \u043D\u0430 \u043A\u0430\u043D\u0432\u0430\u0441\u0435."
    };
  }
  const requestedScale = message.scale;
  const scale = Number.isFinite(requestedScale) ? Math.min(4, Math.max(1, requestedScale)) : 1;
  const disposition = message.originalDisposition;
  const replaceOriginal = disposition === "replace";
  const hideOriginal = disposition === "hide";
  let doneCount = 0;
  const errors = [];
  const createdRasters = [];
  for (const node of selection) {
    const parent = node.parent;
    if (!parent || !("insertChild" in parent)) {
      errors.push(`${node.name}: \u043D\u0435\u043B\u044C\u0437\u044F \u0432\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u0441\u043B\u043E\u0439 \u0432 \u0440\u043E\u0434\u0438\u0442\u0435\u043B\u044F`);
      continue;
    }
    const parentForPlacement = parent;
    try {
      const documentBox = node.absoluteBoundingBox;
      if (!documentBox) {
        errors.push(`${node.name}: \u043D\u0435\u0442 absoluteBoundingBox`);
        continue;
      }
      const bytes = await node.exportAsync({
        format: "PNG",
        constraint: { type: "SCALE", value: scale }
      });
      const image = figma.createImage(bytes);
      const raster = figma.createRectangle();
      raster.name = node.name;
      raster.fills = [
        {
          type: "IMAGE",
          imageHash: image.hash,
          scaleMode: "FILL",
          scalingFactor: 1
        }
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
  const payload = {
    type: "done",
    ok: errors.length === 0,
    done: doneCount,
    errors
  };
  if (doneCount === 0 && errors.length > 0) {
    payload.error = errors.join("\n");
  }
  if (doneCount > 0) {
    figma.notify(`\u0420\u0430\u0441\u0442\u0435\u0440\u0438\u0437\u043E\u0432\u0430\u043D\u043E: ${doneCount}`);
  }
  return payload;
}

// src/features/renameLayers.ts
function runRenameLayers(message) {
  const template = typeof message.template === "string" ? message.template.trim() : "";
  if (template.length === 0) {
    return {
      type: "renameLayersResult",
      ok: false,
      renamed: 0,
      names: [],
      error: "\u041F\u0443\u0441\u0442\u043E\u0439 \u0448\u0430\u0431\u043B\u043E\u043D \u0438\u043C\u0435\u043D\u0438."
    };
  }
  const selection = figma.currentPage.selection;
  if (selection.length === 0) {
    figma.notify("\u041D\u0435\u0442 \u0432\u044B\u0434\u0435\u043B\u0435\u043D\u0438\u044F");
    return {
      type: "renameLayersResult",
      ok: false,
      renamed: 0,
      names: [],
      error: "\u0412\u044B\u0434\u0435\u043B\u0438\u0442\u0435 \u0441\u043B\u043E\u0439(\u0438) \u043D\u0430 \u043A\u0430\u043D\u0432\u0430\u0441\u0435."
    };
  }
  const ordered = sortNodesTopToBottom(selection);
  const names = buildNamesForSelection(template, ordered.length);
  const applied = [];
  const errors = [];
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
    figma.notify(`\u041F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u043D\u043E: ${applied.length}`);
  }
  const payload = {
    type: "renameLayersResult",
    ok: errors.length === 0,
    renamed: applied.length,
    names: applied
  };
  if (errors.length > 0) {
    payload.error = errors.join("\n");
  }
  return payload;
}

// src/messages.ts
function isPluginMessageFromUi(raw) {
  if (!raw || typeof raw !== "object" || !("type" in raw)) {
    return false;
  }
  const type = raw.type;
  return type === "rasterize" || type === "multipleOfFourCheck" || type === "multipleOfFourFix" || type === "renameLayers" || type === "getRecentNamePresets" || type === "setRecentNamePresets" || type === "renamePreset" || type === "addPreset" || type === "removePreset" || type === "movePreset" || type === "resetPresets" || type === "undoPresetEdit" || type === "focusNode" || type === "selectNodes" || type === "requestPluginVersion" || type === "getUpdateBannerDismissed" || type === "setUpdateBannerDismissed";
}

// src/main.ts
var UPDATE_BANNER_DISMISSED_KEY = "updateBannerDismissedForVersion";
var RECENT_NAME_PRESETS_KEY = "recentNamePresets";
var RECENT_NAME_PRESETS_LIMIT = 5;
var PRESET_TREE_KEY = "layerNamePresetsTree";
figma.showUI(`<!DOCTYPE html>\r
<html lang="ru">\r
  <head>\r
    <meta charset="utf-8" />\r
    <title>\u{1F60A} Kids Games Plugin \u{1F60A}</title>\r
    <style>\r
      :root {\r
        --accent: #8b5cf6;\r
        --accent-hover: #7c3aed;\r
        --accent-soft: rgba(139, 92, 246, 0.12);\r
        --radius-sm: 6px;\r
        --radius-md: 10px;\r
        --radius-lg: 14px;\r
        --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.06);\r
      }\r
\r
      * {\r
        box-sizing: border-box;\r
      }\r
\r
      body {\r
        font: 12px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", system-ui,\r
          sans-serif;\r
        margin: 0;\r
        padding: 14px;\r
        color: var(--figma-color-text);\r
        background: var(--figma-color-bg);\r
      }\r
\r
      /* \u0421\u0435\u0433\u043C\u0435\u043D\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0435 \u0432\u043A\u043B\u0430\u0434\u043A\u0438 */\r
      .tabs {\r
        display: flex;\r
        gap: 4px;\r
        padding: 3px;\r
        margin-bottom: 14px;\r
        border-radius: var(--radius-md);\r
        background: var(--figma-color-bg-secondary);\r
      }\r
      .tabs button {\r
        flex: 1;\r
        margin: 0;\r
        padding: 7px 4px;\r
        font-size: 11px;\r
        white-space: nowrap;\r
        border: none;\r
        background: transparent;\r
        color: var(--figma-color-text-secondary);\r
        cursor: pointer;\r
        font: inherit;\r
        font-weight: 500;\r
        border-radius: calc(var(--radius-md) - 3px);\r
        transition: background 0.15s ease, color 0.15s ease;\r
      }\r
      .tabs button:hover {\r
        color: var(--figma-color-text);\r
      }\r
      .tabs button[aria-selected="true"] {\r
        background: var(--figma-color-bg);\r
        color: var(--figma-color-text);\r
        box-shadow: var(--shadow-sm);\r
      }\r
\r
      /* \u0421\u0435\u0433\u043C\u0435\u043D\u0442 \xAB\u041E\u0440\u0438\u0433\u0438\u043D\u0430\u043B\xBB */\r
      .segmented {\r
        display: flex;\r
        gap: 2px;\r
        padding: 3px;\r
        margin-top: 2px;\r
        border-radius: var(--radius-md);\r
        background: var(--figma-color-bg-secondary);\r
      }\r
      .segmented button {\r
        flex: 1;\r
        margin: 0;\r
        padding: 7px 6px;\r
        border: none;\r
        background: transparent;\r
        color: var(--figma-color-text-secondary);\r
        cursor: pointer;\r
        font: inherit;\r
        font-size: 11px;\r
        font-weight: 500;\r
        border-radius: calc(var(--radius-md) - 3px);\r
        transition: background 0.15s ease, color 0.15s ease;\r
      }\r
      .segmented button:hover {\r
        color: var(--figma-color-text);\r
      }\r
      .segmented button[aria-checked="true"] {\r
        background: var(--figma-color-bg);\r
        color: var(--figma-color-text);\r
        box-shadow: var(--shadow-sm);\r
      }\r
\r
      .panel {\r
        display: none;\r
      }\r
      .panel.is-active {\r
        display: block;\r
      }\r
\r
      /* \u041F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0438 */\r
      .hint {\r
        font-size: 11px;\r
        color: var(--figma-color-text-secondary);\r
        margin: 0 0 4px;\r
        line-height: 1.5;\r
      }\r
      .hint code {\r
        font-size: 10.5px;\r
        padding: 1px 5px;\r
        border-radius: 4px;\r
        background: var(--figma-color-bg-secondary);\r
        font-family: "SFMono-Regular", "Consolas", "Menlo", monospace;\r
      }\r
\r
      /* \u041F\u043E\u043B\u044F */\r
      .field {\r
        display: block;\r
        margin: 14px 0 6px;\r
        font-weight: 500;\r
      }\r
\r
      select {\r
        width: 100%;\r
        padding: 8px 10px;\r
        border: 1px solid var(--figma-color-border);\r
        border-radius: var(--radius-sm);\r
        background: var(--figma-color-bg);\r
        color: var(--figma-color-text);\r
        font: inherit;\r
        cursor: pointer;\r
      }\r
      select:focus {\r
        outline: none;\r
        border-color: var(--accent);\r
        box-shadow: 0 0 0 3px var(--accent-soft);\r
      }\r
\r
      /* \u041A\u043D\u043E\u043F\u043A\u0438 */\r
      .actions-row {\r
        display: flex;\r
        gap: 8px;\r
        margin-top: 12px;\r
      }\r
      .actions-row button {\r
        flex: 1;\r
      }\r
\r
      button.primary,\r
      button.secondary {\r
        margin: 0;\r
        padding: 9px 12px;\r
        border-radius: var(--radius-sm);\r
        border: none;\r
        cursor: pointer;\r
        font: inherit;\r
        font-weight: 500;\r
        transition: background 0.15s ease, transform 0.05s ease;\r
      }\r
      button.primary {\r
        background: var(--accent);\r
        color: #fff;\r
      }\r
      button.primary:hover:not(:disabled) {\r
        background: var(--accent-hover);\r
      }\r
      button.primary:active:not(:disabled) {\r
        transform: translateY(0.5px);\r
      }\r
      button.secondary {\r
        background: var(--figma-color-bg-secondary);\r
        color: var(--figma-color-text);\r
      }\r
      button.secondary:hover:not(:disabled) {\r
        background:\r
          linear-gradient(var(--accent-soft), var(--accent-soft)),\r
          var(--figma-color-bg-hover);\r
      }\r
      button.action-full {\r
        width: 100%;\r
        margin-top: 14px;\r
      }\r
      button:disabled {\r
        opacity: 0.5;\r
        cursor: not-allowed;\r
      }\r
\r
      /* \u0421\u0442\u0430\u0442\u0443\u0441 */\r
      .status {\r
        margin-top: 12px;\r
        padding: 8px 10px;\r
        border-radius: var(--radius-sm);\r
        background: var(--figma-color-bg-secondary);\r
        color: var(--figma-color-text-secondary);\r
        font-size: 11px;\r
        white-space: pre-wrap;\r
        max-height: 92px;\r
        overflow-y: auto;\r
      }\r
      .status:empty {\r
        display: none;\r
      }\r
\r
      /* \u041B\u043E\u0433 \u0434\u0438\u0430\u0433\u043D\u043E\u0441\u0442\u0438\u043A\u0438 */\r
      .debug-text {\r
        width: 100%;\r
        box-sizing: border-box;\r
        margin-bottom: 8px;\r
        padding: 8px 10px;\r
        border: 1px solid var(--figma-color-border);\r
        border-radius: var(--radius-sm);\r
        background: var(--figma-color-bg-secondary);\r
        color: var(--figma-color-text-secondary);\r
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;\r
        font-size: 10px;\r
        line-height: 1.45;\r
        white-space: pre;\r
        resize: vertical;\r
      }\r
\r
      /* \u0421\u043F\u0438\u0441\u043E\u043A \u043D\u0430\u0440\u0443\u0448\u0435\u043D\u0438\u0439 */\r
      .list-wrap {\r
        margin-top: 12px;\r
        border-radius: var(--radius-sm);\r
        background: var(--figma-color-bg-secondary);\r
        overflow: hidden;\r
      }\r
      .list-header {\r
        display: flex;\r
        align-items: center;\r
        justify-content: space-between;\r
        gap: 8px;\r
        padding: 6px 10px;\r
        font-size: 10px;\r
        font-weight: 600;\r
        color: var(--figma-color-text-secondary);\r
        text-transform: uppercase;\r
        letter-spacing: 0.5px;\r
      }\r
      .list-header button.linkish {\r
        margin: 0;\r
        padding: 4px 8px;\r
        border: none;\r
        background: transparent;\r
        color: var(--accent);\r
        cursor: pointer;\r
        font: inherit;\r
        font-size: 11px;\r
        font-weight: 500;\r
        text-transform: none;\r
        letter-spacing: 0;\r
        border-radius: 4px;\r
        transition: background 0.15s ease, opacity 0.15s ease;\r
      }\r
      .list-header button.linkish:hover:not(:disabled) {\r
        background: var(--accent-soft);\r
      }\r
      .list-header button.linkish:disabled {\r
        opacity: 0.4;\r
        cursor: not-allowed;\r
      }\r
      .list-body {\r
        max-height: 160px;\r
        overflow-y: auto;\r
        background: var(--figma-color-bg);\r
      }\r
      .list-empty {\r
        padding: 16px 10px;\r
        color: var(--figma-color-text-secondary);\r
        font-size: 11px;\r
        text-align: center;\r
        line-height: 1.5;\r
      }\r
      .list-item {\r
        display: flex;\r
        align-items: center;\r
        gap: 8px;\r
        padding: 8px 10px;\r
        border-bottom: 1px solid var(--figma-color-border);\r
        cursor: pointer;\r
        transition: background 0.15s ease;\r
      }\r
      .list-item:hover {\r
        background: var(--figma-color-bg-hover);\r
      }\r
      .list-item:last-child {\r
        border-bottom: none;\r
      }\r
      .list-item-main {\r
        flex: 1;\r
        min-width: 0;\r
      }\r
      .list-item-name {\r
        font-weight: 500;\r
        overflow: hidden;\r
        text-overflow: ellipsis;\r
        white-space: nowrap;\r
      }\r
      .list-item-meta {\r
        font-size: 11px;\r
        color: var(--figma-color-text-secondary);\r
        margin-top: 2px;\r
      }\r
      .list-item button.linkish {\r
        flex-shrink: 0;\r
        margin: 0;\r
        padding: 4px 8px;\r
        border: none;\r
        background: transparent;\r
        color: var(--accent);\r
        cursor: pointer;\r
        font: inherit;\r
        font-weight: 500;\r
        border-radius: 4px;\r
        transition: background 0.15s ease;\r
      }\r
      .list-item button.linkish:hover {\r
        background: var(--accent-soft);\r
      }\r
\r
      /* \u0412\u043A\u043B\u0430\u0434\u043A\u0430 \xAB\u0420\u0435\u043D\u0435\u0439\u043C\u0438\u043D\u0433\xBB: \u043F\u043E\u0438\u0441\u043A, \u043D\u0435\u0434\u0430\u0432\u043D\u0438\u0435, \u0434\u0435\u0440\u0435\u0432\u043E \u043F\u0440\u0435\u0441\u0435\u0442\u043E\u0432 */\r
      .search-input.names-search-first {\r
        margin-top: 0;\r
      }\r
      .search-input {\r
        width: 100%;\r
        margin-top: 10px;\r
        padding: 7px 10px;\r
        border: 1px solid var(--figma-color-border);\r
        border-radius: var(--radius-sm);\r
        background: var(--figma-color-bg);\r
        color: var(--figma-color-text);\r
        font: inherit;\r
      }\r
      .search-input::placeholder {\r
        color: var(--figma-color-text-secondary);\r
      }\r
      .search-input:focus {\r
        outline: none;\r
        border-color: var(--accent);\r
        box-shadow: 0 0 0 3px var(--accent-soft);\r
      }\r
\r
      .recent {\r
        display: none;\r
        margin-top: 8px;\r
      }\r
      .recent.is-visible {\r
        display: block;\r
      }\r
      .recent-title {\r
        font-size: 10px;\r
        font-weight: 600;\r
        color: var(--figma-color-text-secondary);\r
        text-transform: uppercase;\r
        letter-spacing: 0.5px;\r
      }\r
      .chips {\r
        display: flex;\r
        flex-wrap: wrap;\r
        gap: 4px;\r
        margin-top: 5px;\r
      }\r
      .chip {\r
        margin: 0;\r
        padding: 3px 9px;\r
        border: 1px solid var(--figma-color-border);\r
        border-radius: 999px;\r
        background: var(--figma-color-bg);\r
        color: var(--figma-color-text);\r
        cursor: pointer;\r
        font-family: "SFMono-Regular", "Consolas", "Menlo", monospace;\r
        font-size: 10.5px;\r
        transition: background 0.15s ease, border-color 0.15s ease;\r
      }\r
      .chip:hover {\r
        border-color: var(--accent);\r
        background: var(--accent-soft);\r
      }\r
\r
      .tree {\r
        margin-top: 10px;\r
        border-radius: var(--radius-sm);\r
        background: var(--figma-color-bg-secondary);\r
        overflow: hidden;\r
      }\r
      .tree-count {\r
        font-weight: 500;\r
        text-transform: none;\r
        letter-spacing: 0;\r
        color: var(--figma-color-text-secondary);\r
      }\r
      .tree-count.is-ready {\r
        color: var(--accent);\r
      }\r
      .tree-body {\r
        max-height: 270px;\r
        padding: 4px 0;\r
        overflow-y: auto;\r
        background: var(--figma-color-bg);\r
      }\r
      .tree-row {\r
        display: flex;\r
        align-items: center;\r
        gap: 2px;\r
        padding-right: 6px;\r
        padding-left: calc(4px + var(--depth) * 12px);\r
        /* \u041D\u0430\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u0449\u0438\u0435 \u0432\u043B\u043E\u0436\u0435\u043D\u043D\u043E\u0441\u0442\u0438: \u043F\u043E 1px \u043B\u0438\u043D\u0438\u0438 \u043D\u0430 \u043A\u0430\u0436\u0434\u044B\u0439 \u0443\u0440\u043E\u0432\u0435\u043D\u044C \u043E\u0442\u0441\u0442\u0443\u043F\u0430. */\r
        background-image: repeating-linear-gradient(\r
          to right,\r
          var(--figma-color-border) 0 1px,\r
          transparent 1px 12px\r
        );\r
        background-repeat: no-repeat;\r
        background-position: 11px 0;\r
        background-size: calc(var(--depth) * 12px) 100%;\r
        transition: background-color 0.12s ease;\r
      }\r
      .tree-row:hover,\r
      .tree-row:focus-within {\r
        background-color: var(--figma-color-bg-hover);\r
      }\r
      .tree-toggle {\r
        flex: 0 0 20px;\r
        width: 20px;\r
        height: 26px;\r
        margin: 0;\r
        padding: 0;\r
        display: flex;\r
        align-items: center;\r
        justify-content: center;\r
        border: none;\r
        border-radius: 4px;\r
        background: transparent;\r
        color: var(--figma-color-text-secondary);\r
        cursor: pointer;\r
        font: inherit;\r
      }\r
      .tree-toggle svg {\r
        transition: transform 0.12s ease;\r
      }\r
      .tree-toggle[aria-expanded="true"] svg {\r
        transform: rotate(90deg);\r
      }\r
      .tree-toggle:hover {\r
        color: var(--figma-color-text);\r
      }\r
      .tree-toggle.is-leaf {\r
        visibility: hidden;\r
        pointer-events: none;\r
      }\r
      .tree-apply {\r
        flex: 1;\r
        min-width: 0;\r
        margin: 0;\r
        padding: 5px 7px;\r
        border: none;\r
        border-radius: 5px;\r
        background: transparent;\r
        color: var(--figma-color-text);\r
        cursor: pointer;\r
        text-align: left;\r
        font-family: "SFMono-Regular", "Consolas", "Menlo", monospace;\r
        font-size: 11px;\r
        white-space: nowrap;\r
        overflow: hidden;\r
        text-overflow: ellipsis;\r
      }\r
      .tree-apply.is-group {\r
        font-weight: 600;\r
      }\r
      .tree-apply.is-leaf {\r
        color: var(--figma-color-text-secondary);\r
      }\r
      .tree-apply:focus-visible {\r
        outline: none;\r
        box-shadow: inset 0 0 0 1px var(--accent);\r
      }\r
      /* \u0421\u0432\u043E\u0439 \u0442\u0438\u043F: \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D \u0438\u043B\u0438 \u043F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u043D \u043E\u0442\u043D\u043E\u0441\u0438\u0442\u0435\u043B\u044C\u043D\u043E \u0441\u0442\u0430\u043D\u0434\u0430\u0440\u0442\u043D\u043E\u0433\u043E \u043D\u0430\u0431\u043E\u0440\u0430. */\r
      .tree-apply.is-custom::after {\r
        content: "";\r
        display: inline-block;\r
        width: 4px;\r
        height: 4px;\r
        margin-left: 6px;\r
        border-radius: 50%;\r
        vertical-align: middle;\r
        background: var(--accent);\r
      }\r
      .tree-empty {\r
        padding: 16px 10px;\r
        color: var(--figma-color-text-secondary);\r
        font-size: 11px;\r
        text-align: center;\r
      }\r
\r
      /* \u0420\u0435\u0436\u0438\u043C \u043F\u0440\u0430\u0432\u043A\u0438 \u0434\u0435\u0440\u0435\u0432\u0430 */\r
      .tree-header-right {\r
        display: flex;\r
        align-items: center;\r
        gap: 8px;\r
      }\r
      .tree-editbar {\r
        display: none;\r
        gap: 4px;\r
        align-items: center;\r
        padding: 0 6px 6px;\r
        background: var(--figma-color-bg-secondary);\r
      }\r
      .tree.is-editing .tree-editbar {\r
        display: flex;\r
      }\r
      .tree-editbar .confirm-text {\r
        font-size: 10.5px;\r
        color: var(--figma-color-text-secondary);\r
        margin-left: auto;\r
      }\r
      .tree-actions {\r
        display: none;\r
        flex: 0 0 auto;\r
        gap: 1px;\r
        /* \u041F\u0440\u0438\u0433\u043B\u0443\u0448\u0435\u043D\u044B, \u043F\u043E\u043A\u0430 \u0441\u0442\u0440\u043E\u043A\u0430 \u043D\u0435 \u043F\u043E\u0434 \u043A\u0443\u0440\u0441\u043E\u0440\u043E\u043C: 71 \u0441\u0442\u0440\u043E\u043A\u0430 \u0438\u043D\u0430\u0447\u0435 \u0440\u044F\u0431\u0438\u0442. */\r
        opacity: 0.4;\r
        transition: opacity 0.12s ease;\r
      }\r
      .tree.is-editing .tree-actions {\r
        display: flex;\r
      }\r
      .tree-row:hover .tree-actions,\r
      .tree-row:focus-within .tree-actions {\r
        opacity: 1;\r
      }\r
      .icon-btn {\r
        display: flex;\r
        align-items: center;\r
        justify-content: center;\r
        width: 24px;\r
        height: 24px;\r
        margin: 0;\r
        padding: 0;\r
        border: none;\r
        border-radius: 5px;\r
        background: transparent;\r
        color: var(--figma-color-text-secondary);\r
        cursor: pointer;\r
        font: inherit;\r
        transition: background 0.12s ease, color 0.12s ease;\r
      }\r
      .icon-btn:hover {\r
        background: var(--figma-color-bg-secondary);\r
        color: var(--figma-color-text);\r
      }\r
      .icon-btn:focus-visible {\r
        outline: none;\r
        box-shadow: 0 0 0 2px var(--accent-soft);\r
        color: var(--figma-color-text);\r
      }\r
      .icon-btn.is-danger:hover {\r
        background: rgba(239, 68, 68, 0.16);\r
        color: #ef4444;\r
      }\r
      .tree-confirm {\r
        display: flex;\r
        align-items: center;\r
        gap: 6px;\r
        flex: 1;\r
        min-width: 0;\r
        padding: 3px 6px;\r
        font-size: 10.5px;\r
        color: var(--figma-color-text-secondary);\r
      }\r
      .tree-confirm span {\r
        overflow: hidden;\r
        text-overflow: ellipsis;\r
        white-space: nowrap;\r
      }\r
      .tree-confirm button {\r
        flex: 0 0 auto;\r
        margin: 0;\r
        padding: 2px 7px;\r
        border: none;\r
        border-radius: 4px;\r
        background: var(--figma-color-bg-secondary);\r
        color: var(--figma-color-text);\r
        cursor: pointer;\r
        font: inherit;\r
        font-size: 10.5px;\r
      }\r
      .tree-confirm button.is-danger {\r
        background: rgba(239, 68, 68, 0.16);\r
        color: #ef4444;\r
      }\r
      .tree-input {\r
        flex: 1;\r
        min-width: 0;\r
        padding: 3px 6px;\r
        border: 1px solid var(--accent);\r
        border-radius: 5px;\r
        background: var(--figma-color-bg);\r
        color: var(--figma-color-text);\r
        font-family: "SFMono-Regular", "Consolas", "Menlo", monospace;\r
        font-size: 11px;\r
      }\r
      .tree-input:focus {\r
        outline: none;\r
        box-shadow: 0 0 0 3px var(--accent-soft);\r
      }\r
\r
      /* \u041F\u0440\u0435\u0434\u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440 \u2014 \u0440\u0430\u043C\u043A\u0430 \u0431\u0435\u0437 \u0437\u0430\u043B\u0438\u0432\u043A\u0438, \u0441\u0442\u0430\u0442\u0443\u0441 \u2014 \u0437\u0430\u043B\u0438\u0432\u043A\u0430. \u0420\u0430\u043D\u044C\u0448\u0435 \u0443 \u043E\u0431\u043E\u0438\u0445 \u0431\u044B\u043B\r
         \u043E\u0434\u0438\u043D\u0430\u043A\u043E\u0432\u044B\u0439 \u0444\u043E\u043D, \u0438 \u043E\u043D\u0438 \u0447\u0438\u0442\u0430\u043B\u0438\u0441\u044C \u043A\u0430\u043A \u043E\u0434\u043D\u0430 \u0441\u0435\u0440\u0430\u044F \u043F\u043B\u0438\u0442\u0430. */\r
      .preview {\r
        margin-top: 8px;\r
        padding: 6px 10px;\r
        border: 1px solid var(--figma-color-border);\r
        border-radius: var(--radius-sm);\r
        background: transparent;\r
        color: var(--figma-color-text-secondary);\r
        font-family: "SFMono-Regular", "Consolas", "Menlo", monospace;\r
        font-size: 10.5px;\r
        line-height: 16px;\r
        min-height: 30px;\r
        white-space: nowrap;\r
        overflow: hidden;\r
        text-overflow: ellipsis;\r
      }\r
      .preview.is-active {\r
        border-color: var(--accent);\r
        background: var(--accent-soft);\r
        color: var(--figma-color-text);\r
      }\r
\r
      /* \u0421\u0442\u0440\u043E\u043A\u0430 \u0441\u0442\u0430\u0442\u0443\u0441\u0430 \u0441 \u0441\u0441\u044B\u043B\u043A\u043E\u0439 \xAB\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C\xBB \u0441\u043F\u0440\u0430\u0432\u0430. */\r
      .status-row {\r
        display: flex;\r
        align-items: flex-start;\r
        gap: 8px;\r
        margin-top: 10px;\r
        min-height: 34px;\r
      }\r
      .status-row .status {\r
        flex: 1;\r
        min-width: 0;\r
        margin-top: 0;\r
      }\r
      .status-row .status:empty {\r
        display: block;\r
        background: transparent;\r
      }\r
      #namesUndo {\r
        display: none;\r
        flex: 0 0 auto;\r
        margin: 0;\r
        padding: 8px 10px;\r
        border: 1px solid var(--figma-color-border);\r
        border-radius: var(--radius-sm);\r
        background: var(--figma-color-bg);\r
        color: var(--accent);\r
        cursor: pointer;\r
        font: inherit;\r
        font-size: 11px;\r
        font-weight: 500;\r
      }\r
      #namesUndo.is-visible {\r
        display: block;\r
      }\r
      #namesUndo:hover {\r
        background: var(--accent-soft);\r
        border-color: var(--accent);\r
      }\r
\r
      /* \xAB\u041A\u0430\u043A \u044D\u0442\u043E \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442\xBB */\r
      details {\r
        margin-top: 14px;\r
        font-size: 11px;\r
        color: var(--figma-color-text-secondary);\r
      }\r
      details summary {\r
        cursor: pointer;\r
        color: var(--figma-color-text);\r
        padding: 6px 0;\r
        list-style: none;\r
        font-weight: 500;\r
        user-select: none;\r
      }\r
      details summary::-webkit-details-marker {\r
        display: none;\r
      }\r
      details summary::before {\r
        content: "\u203A";\r
        display: inline-block;\r
        width: 12px;\r
        margin-right: 4px;\r
        color: var(--figma-color-text-secondary);\r
        transition: transform 0.15s ease;\r
      }\r
      details[open] summary::before {\r
        transform: rotate(90deg);\r
      }\r
      details ul {\r
        margin: 4px 0 0;\r
        padding-left: 18px;\r
      }\r
      details li {\r
        margin: 4px 0;\r
        line-height: 1.5;\r
      }\r
      details code {\r
        font-size: 10.5px;\r
        padding: 1px 5px;\r
        border-radius: 4px;\r
        background: var(--figma-color-bg-secondary);\r
        font-family: "SFMono-Regular", "Consolas", "Menlo", monospace;\r
      }\r
\r
      /* \u0411\u0430\u043D\u043D\u0435\u0440 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F */\r
      .update-banner {\r
        display: none;\r
        margin: 0 0 12px;\r
        padding: 10px 10px 10px 12px;\r
        border-radius: var(--radius-md);\r
        border: 1px solid var(--figma-color-border);\r
        background: var(--figma-color-bg-secondary);\r
        font-size: 11px;\r
        line-height: 1.5;\r
        color: var(--figma-color-text);\r
      }\r
      .update-banner.is-visible {\r
        display: block;\r
      }\r
      .update-banner p {\r
        margin: 0 0 8px;\r
      }\r
      .update-banner code {\r
        font-size: 10.5px;\r
        padding: 1px 5px;\r
        border-radius: 4px;\r
        background: var(--figma-color-bg);\r
        font-family: "SFMono-Regular", "Consolas", "Menlo", monospace;\r
      }\r
      .update-banner-actions {\r
        display: flex;\r
        align-items: center;\r
        justify-content: flex-end;\r
        gap: 8px;\r
        margin-top: 2px;\r
      }\r
      .update-banner-actions button.linkish {\r
        margin: 0;\r
        padding: 4px 8px;\r
        border: none;\r
        background: transparent;\r
        color: var(--figma-color-text-secondary);\r
        cursor: pointer;\r
        font: inherit;\r
        font-size: 11px;\r
        font-weight: 500;\r
        border-radius: 4px;\r
      }\r
      .update-banner-actions button.linkish:hover {\r
        background: var(--figma-color-bg-hover);\r
        color: var(--figma-color-text);\r
      }\r
\r
      .plugin-version-footer {\r
        margin: 14px 0 0;\r
        padding-top: 10px;\r
        border-top: 1px solid var(--figma-color-border);\r
        font-size: 10px;\r
        color: var(--figma-color-text-secondary);\r
        font-family: "SFMono-Regular", "Consolas", "Menlo", monospace;\r
      }\r
    </style>\r
  </head>\r
  <body>\r
    <div\r
      id="updateBanner"\r
      class="update-banner"\r
      role="status"\r
      aria-live="polite"\r
    >\r
      <p id="updateBannerBody"></p>\r
      <div class="update-banner-actions">\r
        <button type="button" class="linkish" id="updateBannerDismiss">\u0421\u043A\u0440\u044B\u0442\u044C</button>\r
      </div>\r
    </div>\r
\r
    <div class="tabs" role="tablist" aria-label="\u0420\u0430\u0437\u0434\u0435\u043B\u044B \u043F\u043B\u0430\u0433\u0438\u043D\u0430">\r
      <button\r
        type="button"\r
        role="tab"\r
        id="tabRaster"\r
        aria-selected="true"\r
        aria-controls="panelRaster"\r
      >\r
        \u0420\u0430\u0441\u0442\u0440\r
      </button>\r
      <button\r
        type="button"\r
        role="tab"\r
        id="tabMo4"\r
        aria-selected="false"\r
        aria-controls="panelMo4"\r
      >\r
        \u041A\u0440\u0430\u0442\u043D\u043E\u0441\u0442\u044C 4\r
      </button>\r
      <button\r
        type="button"\r
        role="tab"\r
        id="tabNames"\r
        aria-selected="false"\r
        aria-controls="panelNames"\r
      >\r
        \u0420\u0435\u043D\u0435\u0439\u043C\u0438\u043D\u0433\r
      </button>\r
    </div>\r
\r
    <div\r
      id="panelRaster"\r
      class="panel is-active"\r
      role="tabpanel"\r
      aria-labelledby="tabRaster"\r
    >\r
      <p class="hint">\r
        \u041F\u0440\u0435\u0432\u0440\u0430\u0449\u0430\u0435\u0442 \u0432\u044B\u0434\u0435\u043B\u0435\u043D\u043D\u044B\u0439 \u0441\u043B\u043E\u0439 \u0432 PNG \u043F\u0440\u044F\u043C\u043E \u043D\u0430 \u043A\u0430\u043D\u0432\u0430\u0441\u0435 \u2014 \u043F\u0440\u044F\u043C\u043E\u0443\u0433\u043E\u043B\u044C\u043D\u0438\u043A\r
        \u0441 \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u043E\u0439-\u0437\u0430\u043B\u0438\u0432\u043A\u043E\u0439.\r
      </p>\r
\r
      <label class="field" for="scale">\u041C\u0430\u0441\u0448\u0442\u0430\u0431</label>\r
      <select id="scale" aria-label="\u041C\u0430\u0441\u0448\u0442\u0430\u0431 \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0430">\r
        <option value="1">1\xD7</option>\r
        <option value="2">2\xD7</option>\r
        <option value="3">3\xD7</option>\r
        <option value="4">4\xD7</option>\r
      </select>\r
\r
      <div class="field" id="originalDispositionLabel">\u041E\u0440\u0438\u0433\u0438\u043D\u0430\u043B</div>\r
      <div\r
        class="segmented"\r
        id="originalDisposition"\r
        role="radiogroup"\r
        aria-labelledby="originalDispositionLabel"\r
      >\r
        <button type="button" role="radio" aria-checked="true" data-value="keep" tabindex="0">\r
          \u041E\u0441\u0442\u0430\u0432\u0438\u0442\u044C\r
        </button>\r
        <button type="button" role="radio" aria-checked="false" data-value="replace" tabindex="-1">\r
          \u0417\u0430\u043C\u0435\u043D\u0438\u0442\u044C\r
        </button>\r
        <button type="button" role="radio" aria-checked="false" data-value="hide" tabindex="-1">\r
          \u0421\u043A\u0440\u044B\u0442\u044C\r
        </button>\r
      </div>\r
\r
      <button type="button" class="primary action-full" id="goRaster">\u0412 \u0440\u0430\u0441\u0442\u0440</button>\r
      <div class="status" id="rasterStatus" role="status"></div>\r
    </div>\r
\r
    <div id="panelMo4" class="panel" role="tabpanel" aria-labelledby="tabMo4">\r
      <p class="hint">\r
        \u041F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u0442, \u0447\u0442\u043E \u0448\u0438\u0440\u0438\u043D\u0430 \u0438 \u0432\u044B\u0441\u043E\u0442\u0430 \u0441\u043B\u043E\u044F \u043A\u0440\u0430\u0442\u043D\u044B 4. \u0421\u0447\u0438\u0442\u0430\u0435\u0442 \u043F\u043E \u0432\u0438\u0437\u0443\u0430\u043B\u044C\u043D\u043E\u043C\u0443\r
        \u0431\u043E\u043A\u0441\u0443 \u2014 \u0441 \u0443\u0447\u0451\u0442\u043E\u043C \u0442\u0435\u043D\u0435\u0439, \u043E\u0431\u0432\u043E\u0434\u043E\u043A \u0438 \u0440\u0430\u0437\u043C\u044B\u0442\u0438\u0439.\r
      </p>\r
\r
      <div class="actions-row">\r
        <button type="button" class="secondary" id="mo4Check">\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C</button>\r
        <button type="button" class="primary" id="mo4Fix">\u041F\u043E\u043F\u0440\u0430\u0432\u0438\u0442\u044C</button>\r
      </div>\r
\r
      <div class="list-wrap" aria-label="\u0421\u043F\u0438\u0441\u043E\u043A \u043D\u0430\u0440\u0443\u0448\u0435\u043D\u0438\u0439">\r
        <div class="list-header">\r
          <span id="mo4ListTitle">\u0421\u043B\u043E\u0438 \u0441 \u043D\u0430\u0440\u0443\u0448\u0435\u043D\u0438\u0435\u043C</span>\r
          <button\r
            type="button"\r
            class="linkish"\r
            id="mo4SelectAll"\r
            disabled\r
            aria-label="\u0412\u044B\u0434\u0435\u043B\u0438\u0442\u044C \u0432\u0441\u0435 \u0441\u043B\u043E\u0438 \u0441 \u043D\u0430\u0440\u0443\u0448\u0435\u043D\u0438\u0435\u043C"\r
          >\r
            \u0412\u044B\u0434\u0435\u043B\u0438\u0442\u044C \u0432\u0441\u0435\r
          </button>\r
        </div>\r
        <div class="list-body" id="mo4ListBody"></div>\r
      </div>\r
\r
      <div class="status" id="mo4Status" role="status"></div>\r
\r
      <details>\r
        <summary>\u041A\u0430\u043A \u044D\u0442\u043E \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442</summary>\r
        <ul>\r
          <li>\r
            <b>\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C</b> \u043E\u0441\u0442\u0430\u0432\u0438\u0442 \u0432 \u0432\u044B\u0434\u0435\u043B\u0435\u043D\u0438\u0438 \u0442\u043E\u043B\u044C\u043A\u043E \u0442\u0435 \u0441\u043B\u043E\u0438, \u0447\u044C\u0438 \u0440\u0430\u0437\u043C\u0435\u0440\u044B\r
            \u043D\u0435 \u043A\u0440\u0430\u0442\u043D\u044B 4, \u0438 \u043F\u043E\u043A\u0430\u0436\u0435\u0442 \u0438\u0445 \u0441\u043F\u0438\u0441\u043A\u043E\u043C.\r
          </li>\r
          <li>\r
            <b>\u041F\u043E\u043F\u0440\u0430\u0432\u0438\u0442\u044C</b> \u043E\u0431\u043E\u0440\u0430\u0447\u0438\u0432\u0430\u0435\u0442 \u0441\u043B\u043E\u0439 \u0444\u0440\u0435\u0439\u043C\u043E\u043C \u043D\u0443\u0436\u043D\u043E\u0433\u043E \u0440\u0430\u0437\u043C\u0435\u0440\u0430. \u0421\u0430\u043C\u0430\r
            \u0433\u0440\u0430\u0444\u0438\u043A\u0430 \u043D\u0435 \u0440\u0430\u0441\u0442\u044F\u0433\u0438\u0432\u0430\u0435\u0442\u0441\u044F: \u043C\u0435\u043D\u044F\u0435\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u043A\u043E\u043D\u0442\u0435\u0439\u043D\u0435\u0440, \u0430\r
            \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u043C\u043E\u0435 \u0441\u0434\u0432\u0438\u0433\u0430\u0435\u0442\u0441\u044F \u0432\u043D\u0443\u0442\u0440\u0438 \u0442\u0430\u043A, \u0447\u0442\u043E\u0431\u044B \u0432\u0438\u0437\u0443\u0430\u043B\u044C\u043D\u043E \u043E\u0441\u0442\u0430\u0442\u044C\u0441\u044F \u043D\u0430 \u043C\u0435\u0441\u0442\u0435.\r
          </li>\r
          <li>\r
            \u041F\u043E\u0441\u043B\u0435 \u041F\u043E\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u0432\u044B\u0434\u0435\u043B\u0435\u043D\u044B \u043E\u0431\u0451\u0440\u0442\u043A\u0438. \u0418\u0441\u0445\u043E\u0434\u043D\u044B\u0439 \u0441\u043B\u043E\u0439 \u043F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u043D\r
            \u0432 <code>[no4] \u0438\u043C\u044F</code> \u2014 \u0447\u0442\u043E\u0431\u044B \u0432\u0438\u0434\u043D\u043E \u0431\u044B\u043B\u043E, \u043A\u0430\u043A\u0438\u0435 \u0441\u043B\u043E\u0438 \u0438\u0437\u043D\u0430\u0447\u0430\u043B\u044C\u043D\u043E\r
            \u043D\u0435 \u043F\u0440\u043E\u0445\u043E\u0434\u0438\u043B\u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443.\r
          </li>\r
        </ul>\r
      </details>\r
\r
      <details id="mo4DebugWrap" hidden>\r
        <summary>\u0414\u0438\u0430\u0433\u043D\u043E\u0441\u0442\u0438\u043A\u0430</summary>\r
        <p class="hint">\r
          \u041B\u043E\u0433 \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0435\u0433\u043E \u0437\u0430\u043F\u0443\u0441\u043A\u0430 \u041F\u043E\u043F\u0440\u0430\u0432\u0438\u0442\u044C. \u0415\u0441\u043B\u0438 \u043E\u0431\u0451\u0440\u0442\u043A\u0430 \u0432\u0441\u0442\u0430\u043B\u0430 \u043D\u0435 \u0442\u0443\u0434\u0430 \u2014\r
          \u0441\u043A\u043E\u043F\u0438\u0440\u0443\u0439\u0442\u0435 \u0438 \u043F\u0440\u0438\u0448\u043B\u0438\u0442\u0435.\r
        </p>\r
        <textarea\r
          id="mo4DebugText"\r
          class="debug-text"\r
          readonly\r
          rows="8"\r
          aria-label="\u041B\u043E\u0433 \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0435\u0433\u043E \u0437\u0430\u043F\u0443\u0441\u043A\u0430"\r
        ></textarea>\r
        <button type="button" class="secondary action-full" id="mo4DebugCopy">\r
          \u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C\r
        </button>\r
      </details>\r
    </div>\r
\r
    <div id="panelNames" class="panel" role="tabpanel" aria-labelledby="tabNames">\r
      <!-- \u041E\u0442\u0434\u0435\u043B\u044C\u043D\u043E\u0439 \u043F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0438 \u043D\u0435\u0442: \u043F\u043E\u043B\u043E\u0441\u0430 \u043F\u0440\u0435\u0434\u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0430 \u043D\u0430\u0434 \u0441\u0442\u0430\u0442\u0443\u0441\u043E\u043C \u0433\u043E\u0432\u043E\u0440\u0438\u0442\r
           \u0442\u043E \u0436\u0435 \u0441\u0430\u043C\u043E\u0435 \u0438 \u0432\u0441\u0435\u0433\u0434\u0430 \u0430\u043A\u0442\u0443\u0430\u043B\u044C\u043D\u044B\u043C \u0447\u0438\u0441\u043B\u043E\u043C \u0432\u044B\u0434\u0435\u043B\u0435\u043D\u043D\u044B\u0445 \u0441\u043B\u043E\u0451\u0432. -->\r
      <input\r
        type="search"\r
        class="search-input names-search-first"\r
        id="namesSearch"\r
        placeholder="\u041F\u043E\u0438\u0441\u043A \u043F\u043E \u0442\u0438\u043F\u0430\u043C \u2014 Eyes, Hair, Dress\u2026"\r
        aria-label="\u041F\u043E\u0438\u0441\u043A \u043F\u043E \u0442\u0438\u043F\u0430\u043C"\r
        autocomplete="off"\r
      />\r
\r
      <div class="recent" id="namesRecent">\r
        <div class="recent-title">\u041D\u0435\u0434\u0430\u0432\u043D\u0438\u0435</div>\r
        <div class="chips" id="namesRecentChips"></div>\r
      </div>\r
\r
      <div class="tree" id="namesTree" aria-label="\u0422\u0438\u043F\u044B \u0441\u043B\u043E\u0451\u0432">\r
        <div class="list-header">\r
          <span>\u0422\u0438\u043F\u044B \u0441\u043B\u043E\u0451\u0432</span>\r
          <span class="tree-header-right">\r
            <button\r
              type="button"\r
              class="linkish"\r
              id="namesEditToggle"\r
              aria-pressed="false"\r
            >\r
              \u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C\r
            </button>\r
          </span>\r
        </div>\r
        <div class="tree-editbar" id="namesEditBar">\r
          <button type="button" class="linkish" id="namesAddRoot">+ \u0422\u0438\u043F</button>\r
          <button type="button" class="linkish" id="namesReset">\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C</button>\r
          <span class="confirm-text" id="namesEditHint">\u043A\u043B\u0438\u043A \u043F\u043E \u0441\u0442\u0440\u043E\u043A\u0435 \u2014 \u043F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u0442\u044C</span>\r
        </div>\r
        <div class="tree-body" id="namesTreeBody" role="tree"></div>\r
      </div>\r
\r
      <div class="preview" id="namesPreview" aria-live="polite"></div>\r
      <div class="status-row">\r
        <div class="status" id="namesStatus" role="status"></div>\r
        <button type="button" id="namesUndo">\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C</button>\r
      </div>\r
\r
      <details>\r
        <summary>\u041A\u0430\u043A \u044D\u0442\u043E \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442</summary>\r
        <ul>\r
          <li>\r
            \u041F\u043E\u0440\u044F\u0434\u043E\u043A \u2014 <b>\u0441\u0432\u0435\u0440\u0445\u0443 \u0432\u043D\u0438\u0437</b> \u043F\u043E \u043F\u0430\u043D\u0435\u043B\u0438 Layers, \u0430 \u043D\u0435 \u043F\u043E \u043F\u043E\u0440\u044F\u0434\u043A\u0443\r
            \u0432\u044B\u0434\u0435\u043B\u0435\u043D\u0438\u044F. \u0421\u0447\u0451\u0442\u0447\u0438\u043A \u0432\u0441\u0435\u0433\u0434\u0430 \u043D\u0430\u0447\u0438\u043D\u0430\u0435\u0442\u0441\u044F \u0441 <code>01</code> \u0438 \u0441\u0447\u0438\u0442\u0430\u0435\u0442\r
            \u0442\u043E\u043B\u044C\u043A\u043E \u0442\u0435\u043A\u0443\u0449\u0435\u0435 \u0432\u044B\u0434\u0435\u043B\u0435\u043D\u0438\u0435.\r
          </li>\r
          <li>\r
            \u0422\u0438\u043F-<b>\u0433\u0440\u0443\u043F\u043F\u0430</b> (<code>Eyes_</code>) \u0434\u0430\u0451\u0442\r
            <code>Eyes_01</code>, <code>Eyes_02</code>\u2026\r
          </li>\r
          <li>\r
            \u0422\u0438\u043F-<b>\u043B\u0438\u0441\u0442</b> (<code>Eyes_01_R_TopLash</code>) \u2014 \u044D\u0442\u043E \u0448\u0430\u0431\u043B\u043E\u043D:\r
            \u0440\u0430\u0441\u0442\u0451\u0442 \u0441\u0435\u0433\u043C\u0435\u043D\u0442 <code>01</code> \u2192\r
            <code>Eyes_02_R_TopLash</code>. \u041E\u0434\u0438\u043D \u0432\u044B\u0434\u0435\u043B\u0435\u043D\u043D\u044B\u0439 \u0441\u043B\u043E\u0439 \u043F\u043E\u043B\u0443\u0447\u0438\u0442\r
            \u0438\u043C\u044F \u0440\u043E\u0432\u043D\u043E \u043A\u0430\u043A \u0432 \u0441\u043F\u0438\u0441\u043A\u0435.\r
          </li>\r
          <li>\r
            \u041D\u0430\u0432\u0435\u0434\u0438\u0442\u0435 \u043D\u0430 \u0441\u0442\u0440\u043E\u043A\u0443 \u2014 \u0432 \u043F\u043E\u043B\u043E\u0441\u0435 \u043F\u043E\u0434 \u0441\u043F\u0438\u0441\u043A\u043E\u043C \u0432\u0438\u0434\u043D\u043E, \u043A\u0430\u043A\u0438\u0435 \u0438\u043C\u0435\u043D\u0430\r
            \u043F\u043E\u043B\u0443\u0447\u0430\u0442\u0441\u044F. \u0421\u0442\u0440\u0435\u043B\u043A\u0430 \u0441\u043B\u0435\u0432\u0430 \u0440\u0430\u0441\u043A\u0440\u044B\u0432\u0430\u0435\u0442 \u0432\u043B\u043E\u0436\u0435\u043D\u043D\u044B\u0435 \u0442\u0438\u043F\u044B.\r
          </li>\r
        </ul>\r
      </details>\r
    </div>\r
\r
    <p id="pluginVersionFooter" class="plugin-version-footer" aria-live="polite">\r
      \u0412\u0435\u0440\u0441\u0438\u044F: \u2026\r
    </p>\r
\r
    <script>\r
      const tabRaster = document.getElementById("tabRaster");\r
      const tabMo4 = document.getElementById("tabMo4");\r
      const tabNames = document.getElementById("tabNames");\r
      const panelRaster = document.getElementById("panelRaster");\r
      const panelMo4 = document.getElementById("panelMo4");\r
      const panelNames = document.getElementById("panelNames");\r
      const rasterStatusEl = document.getElementById("rasterStatus");\r
      const mo4StatusEl = document.getElementById("mo4Status");\r
      const namesStatusEl = document.getElementById("namesStatus");\r
      const scaleEl = document.getElementById("scale");\r
      const originalDispositionEl = document.getElementById("originalDisposition");\r
      const goRasterEl = document.getElementById("goRaster");\r
      const mo4CheckEl = document.getElementById("mo4Check");\r
      const mo4FixEl = document.getElementById("mo4Fix");\r
      const mo4ListTitleEl = document.getElementById("mo4ListTitle");\r
      const mo4ListBodyEl = document.getElementById("mo4ListBody");\r
      const mo4SelectAllEl = document.getElementById("mo4SelectAll");\r
      const mo4DebugWrapEl = document.getElementById("mo4DebugWrap");\r
      const mo4DebugTextEl = document.getElementById("mo4DebugText");\r
      const mo4DebugCopyEl = document.getElementById("mo4DebugCopy");\r
      let mo4ViolationIds = [];\r
\r
      function pluralLayers(n) {\r
        const mod10 = n % 10;\r
        const mod100 = n % 100;\r
        if (mod100 >= 11 && mod100 <= 14) return n + " \u0441\u043B\u043E\u0451\u0432";\r
        if (mod10 === 1) return n + " \u0441\u043B\u043E\u0439";\r
        if (mod10 >= 2 && mod10 <= 4) return n + " \u0441\u043B\u043E\u044F";\r
        return n + " \u0441\u043B\u043E\u0451\u0432";\r
      }\r
\r
      const TABS = [\r
        { name: "raster", tab: tabRaster, panel: panelRaster, status: rasterStatusEl },\r
        { name: "mo4", tab: tabMo4, panel: panelMo4, status: mo4StatusEl },\r
        { name: "names", tab: tabNames, panel: panelNames, status: namesStatusEl },\r
      ];\r
\r
      function setTab(which) {\r
        for (const entry of TABS) {\r
          const active = entry.name === which;\r
          entry.tab.setAttribute("aria-selected", active ? "true" : "false");\r
          entry.panel.classList.toggle("is-active", active);\r
          if (!active) {\r
            entry.status.textContent = "";\r
          }\r
        }\r
        if (which === "names") {\r
          namesSearchEl.focus();\r
        }\r
      }\r
\r
      for (const entry of TABS) {\r
        entry.tab.addEventListener("click", () => setTab(entry.name));\r
      }\r
\r
      let originalDisposition = "keep";\r
      const dispositionRadios = originalDispositionEl.querySelectorAll('[role="radio"]');\r
      dispositionRadios.forEach((button) => {\r
        button.addEventListener("click", () => {\r
          const value = button.getAttribute("data-value");\r
          if (!value) {\r
            return;\r
          }\r
          originalDisposition = value;\r
          dispositionRadios.forEach((other) => {\r
            const selected = other === button;\r
            other.setAttribute("aria-checked", selected ? "true" : "false");\r
            other.tabIndex = selected ? 0 : -1;\r
          });\r
        });\r
      });\r
\r
      function postToPlugin(message) {\r
        parent.postMessage({ pluginMessage: message }, "*");\r
      }\r
\r
      const REMOTE_PACKAGE_JSON =\r
        "https://raw.githubusercontent.com/MaxMaryev/Kids-Games-Figma-Plugin/main/package.json";\r
\r
      const updateBannerEl = document.getElementById("updateBanner");\r
      const updateBannerBodyEl = document.getElementById("updateBannerBody");\r
      const updateBannerDismissEl = document.getElementById("updateBannerDismiss");\r
      const pluginVersionFooterEl = document.getElementById("pluginVersionFooter");\r
\r
      function setPluginVersionFooterLabel(version) {\r
        const value = typeof version === "string" && version.length > 0 ? version : "\u2014";\r
        pluginVersionFooterEl.textContent = "\u0412\u0435\u0440\u0441\u0438\u044F: " + value;\r
      }\r
\r
      let pluginCurrentVersion = "";\r
      let dismissedRemoteVersion = null;\r
      let pendingUpdateRemoteVersion = "";\r
\r
      function parseSemverCore(version) {\r
        const match = /^(\\d+)\\.(\\d+)\\.(\\d+)/.exec(String(version).trim());\r
        if (!match) {\r
          return null;\r
        }\r
        return {\r
          major: parseInt(match[1], 10),\r
          minor: parseInt(match[2], 10),\r
          patch: parseInt(match[3], 10),\r
        };\r
      }\r
\r
      function isRemoteVersionNewer(currentVersion, remoteVersion) {\r
        const current = parseSemverCore(currentVersion);\r
        const remote = parseSemverCore(remoteVersion);\r
        if (!current || !remote) {\r
          return false;\r
        }\r
        if (remote.major !== current.major) {\r
          return remote.major > current.major;\r
        }\r
        if (remote.minor !== current.minor) {\r
          return remote.minor > current.minor;\r
        }\r
        return remote.patch > current.patch;\r
      }\r
\r
      function isSafeSemverDisplay(value) {\r
        return /^\\d+\\.\\d+\\.\\d+([+a-zA-Z0-9.-]*)?$/.test(String(value).trim());\r
      }\r
\r
      async function runUpdateCheck() {\r
        if (!pluginCurrentVersion) {\r
          return;\r
        }\r
        let remoteVersion = "";\r
        try {\r
          const response = await fetch(REMOTE_PACKAGE_JSON, { method: "GET" });\r
          if (!response.ok) {\r
            return;\r
          }\r
          const data = await response.json();\r
          if (!data || typeof data.version !== "string") {\r
            return;\r
          }\r
          remoteVersion = data.version.trim();\r
        } catch {\r
          return;\r
        }\r
        if (!remoteVersion || !isSafeSemverDisplay(remoteVersion)) {\r
          return;\r
        }\r
        if (!isRemoteVersionNewer(pluginCurrentVersion, remoteVersion)) {\r
          return;\r
        }\r
        if (dismissedRemoteVersion === remoteVersion) {\r
          return;\r
        }\r
        pendingUpdateRemoteVersion = remoteVersion;\r
        updateBannerBodyEl.innerHTML =\r
          "\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u0430 \u0432\u0435\u0440\u0441\u0438\u044F <strong>" +\r
          remoteVersion +\r
          "</strong>, \u0443 \u0432\u0430\u0441 " +\r
          pluginCurrentVersion +\r
          ".<br />1. \u0417\u0430\u043A\u0440\u043E\u0439\u0442\u0435 \u043F\u043B\u0430\u0433\u0438\u043D." +\r
          "<br />2. \u0412 \u043F\u0430\u043F\u043A\u0435 \u043F\u043B\u0430\u0433\u0438\u043D\u0430 \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0435 <code>UPDATE.bat</code>." +\r
          "<br />3. \u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u043F\u043B\u0430\u0433\u0438\u043D \u0437\u0430\u043D\u043E\u0432\u043E \u2014 \u0432\u043D\u0438\u0437\u0443 \u0434\u043E\u043B\u0436\u043D\u0430 \u0431\u044B\u0442\u044C " +\r
          remoteVersion +\r
          ".";\r
        updateBannerEl.classList.add("is-visible");\r
      }\r
\r
      updateBannerDismissEl.addEventListener("click", () => {\r
        if (pendingUpdateRemoteVersion) {\r
          postToPlugin({\r
            type: "setUpdateBannerDismissed",\r
            remoteVersion: pendingUpdateRemoteVersion,\r
          });\r
        }\r
        updateBannerEl.classList.remove("is-visible");\r
        updateBannerBodyEl.textContent = "";\r
        pendingUpdateRemoteVersion = "";\r
      });\r
\r
      function setMo4Busy(busy, label) {\r
        mo4CheckEl.disabled = busy;\r
        mo4FixEl.disabled = busy;\r
        if (busy) {\r
          mo4CheckEl.textContent = label || "\u041E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0430\u2026";\r
          mo4FixEl.textContent = label || "\u041E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0430\u2026";\r
        } else {\r
          mo4CheckEl.textContent = "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C";\r
          mo4FixEl.textContent = "\u041F\u043E\u043F\u0440\u0430\u0432\u0438\u0442\u044C";\r
        }\r
      }\r
\r
      function renderMo4List(violations) {\r
        mo4ListBodyEl.innerHTML = "";\r
        mo4ViolationIds = (violations || []).map((v) => v.nodeId);\r
        mo4SelectAllEl.disabled = mo4ViolationIds.length === 0;\r
        if (!violations || violations.length === 0) {\r
          mo4ListTitleEl.textContent = "\u0421\u043B\u043E\u0438 \u0441 \u043D\u0430\u0440\u0443\u0448\u0435\u043D\u0438\u0435\u043C (0)";\r
          const empty = document.createElement("div");\r
          empty.className = "list-empty";\r
          empty.textContent =\r
            "\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C\xBB, \u0447\u0442\u043E\u0431\u044B \u043F\u043E\u0441\u043C\u043E\u0442\u0440\u0435\u0442\u044C \u0432\u044B\u0434\u0435\u043B\u0435\u043D\u0438\u0435.";\r
          mo4ListBodyEl.appendChild(empty);\r
          return;\r
        }\r
        mo4ListTitleEl.textContent =\r
          "\u0421\u043B\u043E\u0438 \u0441 \u043D\u0430\u0440\u0443\u0448\u0435\u043D\u0438\u0435\u043C (" + violations.length + ")";\r
        for (const item of violations) {\r
          const row = document.createElement("div");\r
          row.className = "list-item";\r
          const main = document.createElement("div");\r
          main.className = "list-item-main";\r
          const nameEl = document.createElement("div");\r
          nameEl.className = "list-item-name";\r
          nameEl.textContent = item.name;\r
          nameEl.title = item.name;\r
          const meta = document.createElement("div");\r
          meta.className = "list-item-meta";\r
          meta.textContent =\r
            item.width +\r
            "\xD7" +\r
            item.height +\r
            " \u2192 " +\r
            item.targetWidth +\r
            "\xD7" +\r
            item.targetHeight;\r
          main.appendChild(nameEl);\r
          main.appendChild(meta);\r
          const showBtn = document.createElement("button");\r
          showBtn.type = "button";\r
          showBtn.className = "linkish";\r
          showBtn.textContent = "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C";\r
          showBtn.addEventListener("click", (event) => {\r
            event.stopPropagation();\r
            postToPlugin({ type: "focusNode", nodeId: item.nodeId });\r
          });\r
          row.addEventListener("click", () => {\r
            postToPlugin({ type: "focusNode", nodeId: item.nodeId });\r
          });\r
          row.appendChild(main);\r
          row.appendChild(showBtn);\r
          mo4ListBodyEl.appendChild(row);\r
        }\r
      }\r
\r
      renderMo4List([]);\r
\r
      /* ---- \u0412\u043A\u043B\u0430\u0434\u043A\u0430 \xAB\u0420\u0435\u043D\u0435\u0439\u043C\u0438\u043D\u0433\xBB ---- */\r
\r
      const namesSearchEl = document.getElementById("namesSearch");\r
      const namesRecentEl = document.getElementById("namesRecent");\r
      const namesRecentChipsEl = document.getElementById("namesRecentChips");\r
      const namesTreeEl = document.getElementById("namesTree");\r
      const namesTreeBodyEl = document.getElementById("namesTreeBody");\r
      const namesPreviewEl = document.getElementById("namesPreview");\r
      const namesUndoEl = document.getElementById("namesUndo");\r
      const namesEditToggleEl = document.getElementById("namesEditToggle");\r
      const namesEditBarEl = document.getElementById("namesEditBar");\r
      const namesAddRootEl = document.getElementById("namesAddRoot");\r
      const namesResetEl = document.getElementById("namesReset");\r
      const namesEditHintEl = document.getElementById("namesEditHint");\r
\r
      const RECENT_LIMIT = 5;\r
      const PREVIEW_EDIT =\r
        "\u041F\u0440\u0430\u0432\u043A\u0430 \u0441\u043F\u0438\u0441\u043A\u0430: \u043A\u043B\u0438\u043A \u043F\u043E \u0441\u0442\u0440\u043E\u043A\u0435 \u2014 \u043F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u0442\u044C, + \u2014 \u0432\u043B\u043E\u0436\u0435\u043D\u043D\u044B\u0439 \u0442\u0438\u043F.";\r
\r
      /* \u0418\u043D\u043B\u0430\u0439\u043D\u043E\u0432\u044B\u0435 \u0438\u043A\u043E\u043D\u043A\u0438: \u0442\u0435\u043A\u0441\u0442\u043E\u0432\u044B\u0435 \u0433\u043B\u0438\u0444\u044B \xAB+ \u2191 \u2193 \xD7\xBB \u0432\u0441\u0442\u0430\u0432\u0430\u043B\u0438 \u043F\u043E-\u0440\u0430\u0437\u043D\u043E\u043C\u0443\r
         \u043F\u043E \u0431\u0430\u0437\u043E\u0432\u043E\u0439 \u043B\u0438\u043D\u0438\u0438 \u0438 \u043F\u043B\u043E\u0442\u043D\u043E\u0441\u0442\u0438. */\r
      const ICON_PATHS = {\r
        chevron: "M4.5 2.5 L8 6 L4.5 9.5",\r
        plus: "M6 2.5 V9.5 M2.5 6 H9.5",\r
        up: "M6 9.5 V2.5 M3 5.5 L6 2.5 L9 5.5",\r
        down: "M6 2.5 V9.5 M3 6.5 L6 9.5 L9 6.5",\r
        close: "M3.2 3.2 L8.8 8.8 M8.8 3.2 L3.2 8.8",\r
      };\r
\r
      function createIcon(name) {\r
        const NS = "http://www.w3.org/2000/svg";\r
        const svg = document.createElementNS(NS, "svg");\r
        svg.setAttribute("viewBox", "0 0 12 12");\r
        svg.setAttribute("width", "12");\r
        svg.setAttribute("height", "12");\r
        svg.setAttribute("fill", "none");\r
        svg.setAttribute("aria-hidden", "true");\r
        const path = document.createElementNS(NS, "path");\r
        path.setAttribute("d", ICON_PATHS[name]);\r
        path.setAttribute("stroke", "currentColor");\r
        path.setAttribute("stroke-width", "1.5");\r
        path.setAttribute("stroke-linecap", "round");\r
        path.setAttribute("stroke-linejoin", "round");\r
        svg.appendChild(path);\r
        return svg;\r
      }\r
\r
      let namePresets = [];\r
      let recentTemplates = [];\r
      let expandedIds = {};\r
      let customIds = {};\r
      let namesFilter = "";\r
      let selectionCount = 0;\r
      let hoveredTemplate = "";\r
      let focusedRowIndex = 0;\r
\r
      // \u0420\u0435\u0436\u0438\u043C \u043F\u0440\u0430\u0432\u043A\u0438 \u0434\u0435\u0440\u0435\u0432\u0430. \u041E\u0431\u044B\u0447\u043D\u044B\u0439 \u043A\u043B\u0438\u043A \u043F\u043E \u0441\u0442\u0440\u043E\u043A\u0435 \u043F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u044B\u0432\u0430\u0435\u0442 \u0441\u043B\u043E\u0438,\r
      // \u043F\u043E\u044D\u0442\u043E\u043C\u0443 \u0440\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u0436\u0438\u0432\u0451\u0442 \u0432 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E\u043C \u0440\u0435\u0436\u0438\u043C\u0435 \u2014 \u043C\u0435\u043D\u044C\u0448\u0435 \u043F\u0440\u043E\u043C\u0430\u0445\u043E\u0432.\r
      let isEditingPresets = false;\r
      let editingNodeId = null;\r
      let pendingAddParentId = undefined;\r
      let confirmingDeleteId = null;\r
      let confirmingReset = false;\r
      let focusAfterRender = null;\r
\r
      // \u0417\u0435\u0440\u043A\u0430\u043B\u043E buildNameForIndex \u0438\u0437 src/domain/layerNamePresets.ts \u2014\r
      // \u043F\u0440\u0430\u0432\u043A\u0438 \u043D\u0443\u0436\u043D\u043E \u0432\u043D\u043E\u0441\u0438\u0442\u044C \u0432 \u043E\u0431\u043E\u0438\u0445 \u043C\u0435\u0441\u0442\u0430\u0445.\r
      function previewName(template, index) {\r
        const value = index + 1;\r
        const counter = value < 10 ? "0" + value : String(value);\r
        if (template.slice(-1) === "_") {\r
          return template + counter;\r
        }\r
        const segments = template.split("_");\r
        const counterAt = segments.indexOf("01");\r
        if (counterAt === -1) {\r
          return template + "_" + counter;\r
        }\r
        segments[counterAt] = counter;\r
        return segments.join("_");\r
      }\r
\r
      function namesForCount(template, count) {\r
        if (count === 1) {\r
          return previewName(template, 0);\r
        }\r
        if (count === 2) {\r
          return previewName(template, 0) + ", " + previewName(template, 1);\r
        }\r
        return (\r
          previewName(template, 0) +\r
          ", " +\r
          previewName(template, 1) +\r
          " \u2026 " +\r
          previewName(template, count - 1)\r
        );\r
      }\r
\r
      /**\r
       * \u041F\u043E\u043B\u043E\u0441\u0430 \u043F\u0440\u0435\u0434\u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0430 \u2014 \u0435\u0434\u0438\u043D\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0435 \u043C\u0435\u0441\u0442\u043E, \u0433\u0434\u0435 \u0432\u0438\u0434\u043D\u043E \u0438 \u0441\u043A\u043E\u043B\u044C\u043A\u043E \u0441\u043B\u043E\u0451\u0432\r
       * \u0432\u044B\u0434\u0435\u043B\u0435\u043D\u043E, \u0438 \u0447\u0442\u043E \u0441 \u043D\u0438\u043C\u0438 \u0441\u0442\u0430\u043D\u0435\u0442. \u0420\u0430\u043D\u044C\u0448\u0435 \u0441\u0447\u0451\u0442\u0447\u0438\u043A \u0436\u0438\u043B \u0432 \u0448\u0430\u043F\u043A\u0435 \u0434\u0435\u0440\u0435\u0432\u0430,\r
       * \u0432 235px \u043E\u0442 \u0431\u0443\u0434\u0443\u0449\u0438\u0445 \u0438\u043C\u0451\u043D.\r
       */\r
      function setPreview(template) {\r
        hoveredTemplate = template || "";\r
        if (isEditingPresets) {\r
          namesPreviewEl.textContent = PREVIEW_EDIT;\r
          namesPreviewEl.classList.remove("is-active");\r
          return;\r
        }\r
        if (selectionCount === 0) {\r
          namesPreviewEl.textContent = "\u0412\u044B\u0434\u0435\u043B\u0438\u0442\u0435 \u0441\u043B\u043E\u0438 \u043D\u0430 \u043A\u0430\u043D\u0432\u0430\u0441\u0435";\r
          namesPreviewEl.classList.remove("is-active");\r
          return;\r
        }\r
        if (!template) {\r
          namesPreviewEl.textContent =\r
            pluralLayers(selectionCount) + " \u2014 \u043D\u0430\u0432\u0435\u0434\u0438\u0442\u0435 \u043D\u0430 \u0442\u0438\u043F";\r
          namesPreviewEl.classList.remove("is-active");\r
          return;\r
        }\r
        namesPreviewEl.textContent =\r
          selectionCount + " \u2192 " + namesForCount(template, selectionCount);\r
        namesPreviewEl.classList.add("is-active");\r
      }\r
\r
      /** \u0427\u0442\u043E \u043F\u0440\u043E\u0438\u0437\u043E\u0439\u0434\u0451\u0442 \u0441 \u0432\u043B\u043E\u0436\u0435\u043D\u043D\u044B\u043C\u0438 \u043F\u0440\u0438 \u043F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u043D\u0438\u0438 \u0432\u0435\u0442\u043A\u0438. */\r
      function setCascadePreview(node, nextTemplate) {\r
        const template = nextTemplate.trim();\r
        const affected = [];\r
        const walk = (nodes) => {\r
          for (const child of nodes) {\r
            if (child.template.indexOf(node.template) === 0) {\r
              affected.push(child);\r
            }\r
            walk(child.children || []);\r
          }\r
        };\r
        walk(node.children || []);\r
\r
        if (template.length === 0) {\r
          namesPreviewEl.textContent = "\u041F\u0443\u0441\u0442\u043E\u0435 \u0438\u043C\u044F \u2014 Enter \u043D\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442";\r
          namesPreviewEl.classList.remove("is-active");\r
          return;\r
        }\r
        if (template === node.template) {\r
          namesPreviewEl.textContent =\r
            affected.length > 0\r
              ? "\u0412\u043B\u043E\u0436\u0435\u043D\u043D\u044B\u0445 \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u0441\u044F \u0432\u043C\u0435\u0441\u0442\u0435: " + affected.length\r
              : "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043D\u043E\u0432\u043E\u0435 \u0438\u043C\u044F   \xB7   Esc \u2014 \u043E\u0442\u043C\u0435\u043D\u0430";\r
          namesPreviewEl.classList.remove("is-active");\r
          return;\r
        }\r
        if (affected.length === 0) {\r
          namesPreviewEl.textContent =\r
            node.template + " \u2192 " + template + "   \xB7   Enter, Esc \u2014 \u043E\u0442\u043C\u0435\u043D\u0430";\r
          namesPreviewEl.classList.add("is-active");\r
          return;\r
        }\r
        const sample =\r
          template + affected[0].template.slice(node.template.length);\r
        namesPreviewEl.textContent =\r
          affected[0].template +\r
          " \u2192 " +\r
          sample +\r
          (affected.length > 1 ? ", \u0438 \u0435\u0449\u0451 " + (affected.length - 1) : "");\r
        namesPreviewEl.classList.add("is-active");\r
      }\r
\r
      function setSelectionCount(count) {\r
        selectionCount = count;\r
        if (!isEditingPresets) {\r
          setPreview(hoveredTemplate);\r
        }\r
      }\r
\r
      function matchesFilter(node, query) {\r
        if (node.template.toLowerCase().indexOf(query) !== -1) {\r
          return true;\r
        }\r
        const children = node.children || [];\r
        for (const child of children) {\r
          if (matchesFilter(child, query)) {\r
            return true;\r
          }\r
        }\r
        return false;\r
      }\r
\r
      function createRowShell(depth) {\r
        const row = document.createElement("div");\r
        row.className = "tree-row";\r
        row.style.setProperty("--depth", String(depth));\r
        return row;\r
      }\r
\r
      function createSpacer() {\r
        const spacer = document.createElement("button");\r
        spacer.type = "button";\r
        spacer.className = "tree-toggle is-leaf";\r
        spacer.tabIndex = -1;\r
        spacer.setAttribute("aria-hidden", "true");\r
        return spacer;\r
      }\r
\r
      function createIconButton(icon, label, onClick, danger) {\r
        const button = document.createElement("button");\r
        button.type = "button";\r
        button.className = "icon-btn" + (danger ? " is-danger" : "");\r
        button.appendChild(createIcon(icon));\r
        button.title = label;\r
        button.tabIndex = -1;\r
        button.setAttribute("aria-label", label);\r
        button.addEventListener("click", (event) => {\r
          event.stopPropagation();\r
          onClick();\r
        });\r
        return button;\r
      }\r
\r
      /** \u0421\u0442\u0440\u043E\u043A\u0430-\u0438\u043D\u043F\u0443\u0442: \u0438\u043D\u043B\u0430\u0439\u043D-\u043F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u043D\u0438\u0435 \u0438 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u043D\u043E\u0432\u043E\u0433\u043E \u0442\u0438\u043F\u0430. */\r
      function createInputRow(depth, value, onCommit, onCancel, onInput) {\r
        const row = createRowShell(depth);\r
        row.appendChild(createSpacer());\r
\r
        const input = document.createElement("input");\r
        input.type = "text";\r
        input.className = "tree-input";\r
        input.value = value;\r
        input.spellcheck = false;\r
        input.autocomplete = "off";\r
\r
        let settled = false;\r
        const commit = () => {\r
          if (settled) return;\r
          settled = true;\r
          onCommit(input.value);\r
        };\r
        const cancel = () => {\r
          if (settled) return;\r
          settled = true;\r
          onCancel();\r
        };\r
\r
        input.addEventListener("keydown", (event) => {\r
          if (event.key === "Enter") {\r
            event.preventDefault();\r
            commit();\r
          } else if (event.key === "Escape") {\r
            event.preventDefault();\r
            cancel();\r
          }\r
        });\r
        input.addEventListener("blur", commit);\r
        if (onInput) {\r
          input.addEventListener("input", () => onInput(input.value));\r
          onInput(input.value);\r
        }\r
\r
        row.appendChild(input);\r
        focusAfterRender = input;\r
        return row;\r
      }\r
\r
      function createDeleteConfirmRow(node, depth) {\r
        const row = createRowShell(depth);\r
        row.appendChild(createSpacer());\r
\r
        const wrap = document.createElement("div");\r
        wrap.className = "tree-confirm";\r
        const label = document.createElement("span");\r
        const nested = countPresetNodes(node.children || []);\r
        // \u0418\u043C\u044F \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E: \u0438\u043D\u0430\u0447\u0435 \u043F\u043E\u0441\u043B\u0435 \u0441\u043A\u0440\u043E\u043B\u043B\u0430 \u043D\u0435\u043F\u043E\u043D\u044F\u0442\u043D\u043E, \u0447\u0442\u043E \u0443\u0434\u0430\u043B\u044F\u0435\u0448\u044C.\r
        label.textContent = nested > 0\r
          ? "\u0423\u0434\u0430\u043B\u0438\u0442\u044C " + node.template + " \u0438 " + nested + " \u0432\u043B\u043E\u0436\u0435\u043D\u043D\u044B\u0445?"\r
          : "\u0423\u0434\u0430\u043B\u0438\u0442\u044C " + node.template + "?";\r
        label.title = label.textContent;\r
        wrap.appendChild(label);\r
\r
        const yes = document.createElement("button");\r
        yes.type = "button";\r
        yes.className = "is-danger";\r
        yes.textContent = "\u0423\u0434\u0430\u043B\u0438\u0442\u044C";\r
        yes.addEventListener("click", () => {\r
          confirmingDeleteId = null;\r
          postToPlugin({ type: "removePreset", id: node.id });\r
        });\r
\r
        const no = document.createElement("button");\r
        no.type = "button";\r
        no.textContent = "\u041E\u0442\u043C\u0435\u043D\u0430";\r
        no.addEventListener("click", () => {\r
          confirmingDeleteId = null;\r
          renderNamesTree();\r
        });\r
\r
        wrap.appendChild(yes);\r
        wrap.appendChild(no);\r
        row.appendChild(wrap);\r
        return row;\r
      }\r
\r
      function createTreeRow(node, depth, expanded) {\r
        const children = node.children || [];\r
        const hasChildren = children.length > 0;\r
        const row = createRowShell(depth);\r
        row.setAttribute("role", "treeitem");\r
        row.dataset.id = node.id;\r
        if (hasChildren) {\r
          row.setAttribute("aria-expanded", expanded ? "true" : "false");\r
        }\r
\r
        const toggle = document.createElement("button");\r
        toggle.type = "button";\r
        toggle.className = hasChildren ? "tree-toggle" : "tree-toggle is-leaf";\r
        toggle.tabIndex = -1;\r
        toggle.appendChild(createIcon("chevron"));\r
        if (hasChildren) {\r
          toggle.setAttribute("aria-expanded", expanded ? "true" : "false");\r
          toggle.setAttribute(\r
            "aria-label",\r
            (expanded ? "\u0421\u0432\u0435\u0440\u043D\u0443\u0442\u044C " : "\u0420\u0430\u0441\u043A\u0440\u044B\u0442\u044C ") + node.template\r
          );\r
          toggle.addEventListener("click", () => {\r
            expandedIds[node.id] = !expanded;\r
            renderNamesTree();\r
          });\r
        } else {\r
          toggle.setAttribute("aria-hidden", "true");\r
        }\r
\r
        const isGroup = node.template.slice(-1) === "_";\r
        const apply = document.createElement("button");\r
        apply.type = "button";\r
        apply.className =\r
          "tree-apply " +\r
          (isGroup ? "is-group" : "is-leaf") +\r
          (isEditingPresets && customIds[node.id] ? " is-custom" : "");\r
        apply.textContent = node.template;\r
        apply.tabIndex = -1;\r
        if (isEditingPresets) {\r
          apply.title = "\u041F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u0442\u044C \u0442\u0438\u043F";\r
          apply.addEventListener("click", () => startRenamePreset(node.id));\r
        } else {\r
          apply.title =\r
            "\u041F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u0442\u044C \u0432\u044B\u0434\u0435\u043B\u0435\u043D\u0438\u0435 \u2192 " + previewName(node.template, 0);\r
          apply.addEventListener("click", () => applyNamePreset(node.template));\r
          apply.addEventListener("mouseenter", () => setPreview(node.template));\r
          apply.addEventListener("focus", () => setPreview(node.template));\r
          apply.addEventListener("mouseleave", () => setPreview(""));\r
          apply.addEventListener("blur", () => setPreview(""));\r
        }\r
\r
        row.appendChild(toggle);\r
        row.appendChild(apply);\r
\r
        const actions = document.createElement("div");\r
        actions.className = "tree-actions";\r
        actions.appendChild(\r
          createIconButton("plus", "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0432\u043B\u043E\u0436\u0435\u043D\u043D\u044B\u0439 \u0442\u0438\u043F", () =>\r
            startAddPreset(node.id)\r
          )\r
        );\r
        actions.appendChild(\r
          createIconButton("up", "\u041F\u0435\u0440\u0435\u043C\u0435\u0441\u0442\u0438\u0442\u044C \u0432\u0432\u0435\u0440\u0445", () =>\r
            postToPlugin({ type: "movePreset", id: node.id, direction: "up" })\r
          )\r
        );\r
        actions.appendChild(\r
          createIconButton("down", "\u041F\u0435\u0440\u0435\u043C\u0435\u0441\u0442\u0438\u0442\u044C \u0432\u043D\u0438\u0437", () =>\r
            postToPlugin({ type: "movePreset", id: node.id, direction: "down" })\r
          )\r
        );\r
        actions.appendChild(\r
          createIconButton(\r
            "close",\r
            "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0442\u0438\u043F",\r
            () => {\r
              confirmingDeleteId = node.id;\r
              renderNamesTree();\r
            },\r
            true\r
          )\r
        );\r
        row.appendChild(actions);\r
        return row;\r
      }\r
\r
      function countPresetNodes(nodes) {\r
        let total = 0;\r
        for (const node of nodes) {\r
          total++;\r
          total += countPresetNodes(node.children || []);\r
        }\r
        return total;\r
      }\r
\r
      function renderNamesTree() {\r
        const query = namesFilter.trim().toLowerCase();\r
        namesTreeBodyEl.innerHTML = "";\r
        focusAfterRender = null;\r
        let rendered = 0;\r
\r
        const walk = (nodes, depth) => {\r
          for (const node of nodes) {\r
            if (query && !matchesFilter(node, query)) {\r
              continue;\r
            }\r
            const children = node.children || [];\r
            const expanded = query ? true : Boolean(expandedIds[node.id]);\r
\r
            if (editingNodeId === node.id) {\r
              namesTreeBodyEl.appendChild(\r
                createInputRow(\r
                  depth,\r
                  node.template,\r
                  (value) => commitRenamePreset(node.id, value),\r
                  () => {\r
                    editingNodeId = null;\r
                    renderNamesTree();\r
                    setPreview("");\r
                  },\r
                  (value) => setCascadePreview(node, value)\r
                )\r
              );\r
            } else if (confirmingDeleteId === node.id) {\r
              namesTreeBodyEl.appendChild(createDeleteConfirmRow(node, depth));\r
            } else {\r
              namesTreeBodyEl.appendChild(createTreeRow(node, depth, expanded));\r
            }\r
            rendered++;\r
\r
            if (pendingAddParentId === node.id) {\r
              namesTreeBodyEl.appendChild(\r
                createInputRow(\r
                  depth + 1,\r
                  "",\r
                  (value) => commitAddPreset(node.id, value),\r
                  cancelAddPreset,\r
                  setAddPreview\r
                )\r
              );\r
            }\r
            if (children.length > 0 && expanded) {\r
              walk(children, depth + 1);\r
            }\r
          }\r
        };\r
        walk(namePresets, 0);\r
\r
        if (pendingAddParentId === null) {\r
          namesTreeBodyEl.appendChild(\r
            createInputRow(\r
              0,\r
              "",\r
              (value) => commitAddPreset(null, value),\r
              cancelAddPreset,\r
              setAddPreview\r
            )\r
          );\r
          rendered++;\r
        }\r
\r
        if (rendered === 0) {\r
          const empty = document.createElement("div");\r
          empty.className = "tree-empty";\r
          empty.textContent = namePresets.length === 0\r
            ? "\u0417\u0430\u0433\u0440\u0443\u0436\u0430\u044E \u0442\u0438\u043F\u044B\u2026"\r
            : "\u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043D\u0430\u0448\u043B\u043E\u0441\u044C.";\r
          namesTreeBodyEl.appendChild(empty);\r
        }\r
\r
        applyRovingTabindex();\r
\r
        if (focusAfterRender) {\r
          const input = focusAfterRender;\r
          focusAfterRender = null;\r
          input.focus();\r
          input.select();\r
        }\r
      }\r
\r
      function setAddPreview(value) {\r
        const template = value.trim();\r
        namesPreviewEl.textContent = template\r
          ? "\u041D\u043E\u0432\u044B\u0439 \u0442\u0438\u043F " + template + "   \xB7   Enter, Esc \u2014 \u043E\u0442\u043C\u0435\u043D\u0430"\r
          : "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0438\u043C\u044F \u0442\u0438\u043F\u0430   \xB7   Esc \u2014 \u043E\u0442\u043C\u0435\u043D\u0430";\r
        namesPreviewEl.classList.toggle("is-active", template.length > 0);\r
      }\r
\r
      /* \u041A\u043B\u0430\u0432\u0438\u0430\u0442\u0443\u0440\u0430: \u0442\u0430\u0431\u0431\u0435\u043B\u044C\u043D\u0430 \u0442\u043E\u043B\u044C\u043A\u043E \u043E\u0434\u043D\u0430 \u0441\u0442\u0440\u043E\u043A\u0430 \u0434\u0435\u0440\u0435\u0432\u0430, \u0432\u043D\u0443\u0442\u0440\u0438 \u0445\u043E\u0434\u0438\u043C\r
         \u0441\u0442\u0440\u0435\u043B\u043A\u0430\u043C\u0438. \u0418\u043D\u0430\u0447\u0435 \u043D\u0430 71 \u0441\u0442\u0440\u043E\u043A\u0435 \u043F\u043E\u043B\u0443\u0447\u0430\u0435\u0442\u0441\u044F \u0431\u043E\u043B\u044C\u0448\u0435 \u0441\u043E\u0442\u043D\u0438 \u0442\u0430\u0431\u0441\u0442\u043E\u043F\u043E\u0432. */\r
      function treeRows() {\r
        return [...namesTreeBodyEl.querySelectorAll('[role="treeitem"]')];\r
      }\r
\r
      function applyRovingTabindex() {\r
        const rows = treeRows();\r
        if (rows.length === 0) return;\r
        if (focusedRowIndex >= rows.length) focusedRowIndex = rows.length - 1;\r
        if (focusedRowIndex < 0) focusedRowIndex = 0;\r
        rows.forEach((row, index) => {\r
          row.tabIndex = index === focusedRowIndex ? 0 : -1;\r
        });\r
      }\r
\r
      function focusRow(index, rows) {\r
        const all = rows || treeRows();\r
        if (all.length === 0) return;\r
        focusedRowIndex = Math.max(0, Math.min(index, all.length - 1));\r
        applyRovingTabindex();\r
        all[focusedRowIndex].focus();\r
      }\r
\r
      function nodeForRow(row) {\r
        return row ? findPresetNode(namePresets, row.dataset.id) : null;\r
      }\r
\r
      namesTreeBodyEl.addEventListener("focusin", (event) => {\r
        const row = event.target.closest('[role="treeitem"]');\r
        if (!row) return;\r
        const rows = treeRows();\r
        const index = rows.indexOf(row);\r
        if (index !== -1) {\r
          focusedRowIndex = index;\r
          applyRovingTabindex();\r
        }\r
        const node = nodeForRow(row);\r
        if (node && !isEditingPresets) {\r
          setPreview(node.template);\r
        }\r
      });\r
\r
      namesTreeBodyEl.addEventListener("keydown", (event) => {\r
        const row = event.target.closest('[role="treeitem"]');\r
        if (!row) return;\r
        const rows = treeRows();\r
        const index = rows.indexOf(row);\r
        const node = nodeForRow(row);\r
        if (!node) return;\r
        const hasChildren = (node.children || []).length > 0;\r
        const expanded = Boolean(expandedIds[node.id]);\r
\r
        if (event.key === "ArrowDown") {\r
          event.preventDefault();\r
          focusRow(index + 1, rows);\r
        } else if (event.key === "ArrowUp") {\r
          event.preventDefault();\r
          focusRow(index - 1, rows);\r
        } else if (event.key === "ArrowRight") {\r
          event.preventDefault();\r
          if (hasChildren && !expanded) {\r
            expandedIds[node.id] = true;\r
            renderNamesTree();\r
            focusRow(index, treeRows());\r
          } else {\r
            focusRow(index + 1, rows);\r
          }\r
        } else if (event.key === "ArrowLeft") {\r
          event.preventDefault();\r
          if (hasChildren && expanded) {\r
            expandedIds[node.id] = false;\r
            renderNamesTree();\r
            focusRow(index, treeRows());\r
          } else {\r
            focusRow(index - 1, rows);\r
          }\r
        } else if (event.key === "Enter" || event.key === " ") {\r
          event.preventDefault();\r
          if (isEditingPresets) {\r
            startRenamePreset(node.id);\r
          } else {\r
            applyNamePreset(node.template);\r
          }\r
        } else if (event.key === "Delete" && isEditingPresets) {\r
          event.preventDefault();\r
          confirmingDeleteId = node.id;\r
          renderNamesTree();\r
        }\r
      });\r
\r
      /* \u041F\u0440\u0430\u0432\u043A\u0430 \u0434\u0435\u0440\u0435\u0432\u0430: \u043D\u0430\u043C\u0435\u0440\u0435\u043D\u0438\u0435 \u0443\u0445\u043E\u0434\u0438\u0442 \u0432 main, \u043E\u0442\u0442\u0443\u0434\u0430 \u043F\u0440\u0438\u0445\u043E\u0434\u0438\u0442 \u043D\u043E\u0432\u043E\u0435 \u0434\u0435\u0440\u0435\u0432\u043E. */\r
\r
      function setEditingPresets(editing) {\r
        isEditingPresets = editing;\r
        editingNodeId = null;\r
        pendingAddParentId = undefined;\r
        confirmingDeleteId = null;\r
        confirmingReset = false;\r
        namesTreeEl.classList.toggle("is-editing", editing);\r
        namesEditToggleEl.textContent = editing ? "\u0413\u043E\u0442\u043E\u0432\u043E" : "\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C";\r
        namesEditToggleEl.setAttribute("aria-pressed", editing ? "true" : "false");\r
        renderResetControl();\r
        renderRecent();\r
        setSelectionCount(selectionCount);\r
        setPreview("");\r
        renderNamesTree();\r
      }\r
\r
      function startRenamePreset(id) {\r
        editingNodeId = id;\r
        pendingAddParentId = undefined;\r
        confirmingDeleteId = null;\r
        renderNamesTree();\r
      }\r
\r
      function findPresetNode(nodes, id) {\r
        for (const node of nodes) {\r
          if (node.id === id) {\r
            return node;\r
          }\r
          const found = findPresetNode(node.children || [], id);\r
          if (found) {\r
            return found;\r
          }\r
        }\r
        return null;\r
      }\r
\r
      function commitRenamePreset(id, value) {\r
        const template = value.trim();\r
        const current = findPresetNode(namePresets, id);\r
        editingNodeId = null;\r
        if (template.length === 0) {\r
          namesStatusEl.textContent = "\u041F\u0443\u0441\u0442\u043E\u0435 \u0438\u043C\u044F \u2014 \u043E\u0441\u0442\u0430\u0432\u0438\u043B \u043A\u0430\u043A \u0431\u044B\u043B\u043E.";\r
          renderNamesTree();\r
          return;\r
        }\r
        // \u0418\u043D\u043F\u0443\u0442 \u0437\u0430\u043A\u0440\u044B\u0432\u0430\u0435\u0442\u0441\u044F \u0438 \u043F\u043E blur \u2014 \xAB\u043F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u043D\u0438\u0435\xBB \u0432 \u0442\u043E \u0436\u0435 \u0438\u043C\u044F \u043D\u0435 \u0448\u043B\u0451\u043C.\r
        if (current && current.template === template) {\r
          renderNamesTree();\r
          return;\r
        }\r
        postToPlugin({ type: "renamePreset", id, template });\r
      }\r
\r
      function startAddPreset(parentId) {\r
        // \u041D\u043E\u0432\u044B\u0439 \u0442\u0438\u043F \u043C\u043E\u0436\u0435\u0442 \u043D\u0435 \u043F\u043E\u043F\u0430\u0441\u0442\u044C \u043F\u043E\u0434 \u0444\u0438\u043B\u044C\u0442\u0440 \u2014 \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u043C \u0432\u0435\u0441\u044C \u0441\u043F\u0438\u0441\u043E\u043A.\r
        namesFilter = "";\r
        namesSearchEl.value = "";\r
        pendingAddParentId = parentId;\r
        editingNodeId = null;\r
        confirmingDeleteId = null;\r
        if (parentId) {\r
          expandedIds[parentId] = true;\r
        }\r
        renderNamesTree();\r
      }\r
\r
      function cancelAddPreset() {\r
        pendingAddParentId = undefined;\r
        renderNamesTree();\r
      }\r
\r
      function commitAddPreset(parentId, value) {\r
        const template = value.trim();\r
        pendingAddParentId = undefined;\r
        if (template.length === 0) {\r
          renderNamesTree();\r
          return;\r
        }\r
        postToPlugin({ type: "addPreset", parentId, template });\r
      }\r
\r
      function renderResetControl() {\r
        const customCount = Object.keys(customIds).length;\r
        namesResetEl.textContent = confirmingReset\r
          ? "\u0422\u043E\u0447\u043D\u043E \u0441\u0431\u0440\u043E\u0441\u0438\u0442\u044C?"\r
          : customCount > 0\r
            ? "\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C (" + customCount + ")"\r
            : "\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C";\r
        namesEditHintEl.textContent = confirmingReset\r
          ? "\u0441\u0432\u043E\u0438 \u043F\u0440\u0430\u0432\u043A\u0438 \u0431\u0443\u0434\u0443\u0442 \u043F\u043E\u0442\u0435\u0440\u044F\u043D\u044B"\r
          : "\u043A\u043B\u0438\u043A \u043F\u043E \u0441\u0442\u0440\u043E\u043A\u0435 \u2014 \u043F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u0442\u044C";\r
      }\r
\r
      namesEditToggleEl.addEventListener("click", () => {\r
        setEditingPresets(!isEditingPresets);\r
      });\r
\r
      namesAddRootEl.addEventListener("click", () => {\r
        confirmingReset = false;\r
        renderResetControl();\r
        startAddPreset(null);\r
      });\r
\r
      namesUndoEl.addEventListener("click", () => {\r
        postToPlugin({ type: "undoPresetEdit" });\r
      });\r
\r
      namesResetEl.addEventListener("click", () => {\r
        if (!confirmingReset) {\r
          confirmingReset = true;\r
          renderResetControl();\r
          return;\r
        }\r
        confirmingReset = false;\r
        renderResetControl();\r
        postToPlugin({ type: "resetPresets" });\r
      });\r
\r
      function renderRecent() {\r
        namesRecentChipsEl.innerHTML = "";\r
        // \u0412 \u0440\u0435\u0436\u0438\u043C\u0435 \u043F\u0440\u0430\u0432\u043A\u0438 \u0447\u0438\u043F\u0441\u044B \u043F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u044B\u0432\u0430\u043B\u0438 \u0431\u044B \u0441\u043B\u043E\u0438 \u2014 \u043F\u0440\u044F\u0447\u0435\u043C \u0438\u0445.\r
        namesRecentEl.classList.toggle(\r
          "is-visible",\r
          recentTemplates.length > 0 && !isEditingPresets\r
        );\r
        for (const template of recentTemplates) {\r
          const chip = document.createElement("button");\r
          chip.type = "button";\r
          chip.className = "chip";\r
          chip.textContent = template;\r
          chip.title = "\u041F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u0442\u044C \u0432\u044B\u0434\u0435\u043B\u0435\u043D\u0438\u0435 \u2192 " + previewName(template, 0);\r
          chip.addEventListener("click", () => applyNamePreset(template));\r
          chip.addEventListener("mouseenter", () => setPreview(template));\r
          chip.addEventListener("focus", () => setPreview(template));\r
          chip.addEventListener("mouseleave", () => setPreview(""));\r
          chip.addEventListener("blur", () => setPreview(""));\r
          namesRecentChipsEl.appendChild(chip);\r
        }\r
      }\r
\r
      function rememberTemplate(template) {\r
        recentTemplates = [template].concat(\r
          recentTemplates.filter((item) => item !== template)\r
        );\r
        if (recentTemplates.length > RECENT_LIMIT) {\r
          recentTemplates = recentTemplates.slice(0, RECENT_LIMIT);\r
        }\r
        renderRecent();\r
        postToPlugin({\r
          type: "setRecentNamePresets",\r
          templates: recentTemplates,\r
        });\r
      }\r
\r
      function applyNamePreset(template) {\r
        if (isEditingPresets) {\r
          return;\r
        }\r
        if (selectionCount === 0) {\r
          namesStatusEl.textContent =\r
            "\u0412\u044B\u0434\u0435\u043B\u0438\u0442\u0435 \u0441\u043B\u043E\u0438 \u043D\u0430 \u043A\u0430\u043D\u0432\u0430\u0441\u0435 \u2014 \u043F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u0443\u044E \u0438\u0445 \u0441\u0432\u0435\u0440\u0445\u0443 \u0432\u043D\u0438\u0437.";\r
          return;\r
        }\r
        namesStatusEl.textContent = "\u041F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u043D\u0438\u0435\u2026";\r
        rememberTemplate(template);\r
        postToPlugin({ type: "renameLayers", template });\r
      }\r
\r
      namesSearchEl.addEventListener("input", () => {\r
        namesFilter = namesSearchEl.value;\r
        renderNamesTree();\r
      });\r
\r
      renderResetControl();\r
      setPreview("");\r
      setSelectionCount(0);\r
      renderNamesTree();\r
      renderRecent();\r
      postToPlugin({ type: "getRecentNamePresets" });\r
\r
      goRasterEl.addEventListener("click", () => {\r
        rasterStatusEl.textContent = "\u041E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0430\u2026";\r
        goRasterEl.disabled = true;\r
        postToPlugin({\r
          type: "rasterize",\r
          scale: parseFloat(scaleEl.value),\r
          originalDisposition,\r
        });\r
      });\r
\r
      mo4CheckEl.addEventListener("click", () => {\r
        mo4StatusEl.textContent = "";\r
        setMo4Busy(true);\r
        postToPlugin({ type: "multipleOfFourCheck" });\r
      });\r
\r
      mo4SelectAllEl.addEventListener("click", () => {\r
        if (mo4ViolationIds.length === 0) return;\r
        postToPlugin({ type: "selectNodes", nodeIds: mo4ViolationIds });\r
      });\r
\r
      mo4FixEl.addEventListener("click", () => {\r
        mo4StatusEl.textContent = "";\r
        setMo4Busy(true);\r
        postToPlugin({ type: "multipleOfFourFix" });\r
      });\r
\r
      function renderMo4Debug(lines) {\r
        const text = Array.isArray(lines) ? lines.join("\\n") : "";\r
        mo4DebugTextEl.value = text;\r
        mo4DebugWrapEl.hidden = text === "";\r
        mo4DebugWrapEl.open = text !== "";\r
      }\r
\r
      mo4DebugCopyEl.addEventListener("click", () => {\r
        if (!mo4DebugTextEl.value) return;\r
        // \u0412 iframe \u043F\u043B\u0430\u0433\u0438\u043D\u0430 navigator.clipboard \u0447\u0430\u0441\u0442\u043E \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D, \u043F\u043E\u044D\u0442\u043E\u043C\u0443 \u043A\u043E\u043F\u0438\u0440\u0443\u0435\u043C\r
        // \u0432\u044B\u0434\u0435\u043B\u0435\u043D\u0438\u0435\u043C \u0441\u0430\u043C\u043E\u0433\u043E textarea \u2014 \u043E\u043D \u0438 \u0442\u0430\u043A \u043D\u0430 \u044D\u043A\u0440\u0430\u043D\u0435.\r
        mo4DebugTextEl.focus();\r
        mo4DebugTextEl.select();\r
        let copied = false;\r
        try {\r
          copied = document.execCommand("copy");\r
        } catch (error) {\r
          copied = false;\r
        }\r
        mo4DebugCopyEl.textContent = copied\r
          ? "\u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u043E"\r
          : "\u041D\u0435 \u0432\u044B\u0448\u043B\u043E \u2014 \u0432\u044B\u0434\u0435\u043B\u0438\u0442\u0435 \u0438 Ctrl+C";\r
        setTimeout(() => {\r
          mo4DebugCopyEl.textContent = "\u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C";\r
        }, 2000);\r
      });\r
\r
      window.onmessage = (event) => {\r
        const msg = event.data.pluginMessage;\r
        if (!msg || !msg.type) {\r
          return;\r
        }\r
        if (msg.type === "pluginVersion") {\r
          const nextVersion =\r
            typeof msg.version === "string" ? msg.version : "";\r
          const previousVersion = pluginCurrentVersion;\r
          pluginCurrentVersion = nextVersion;\r
          setPluginVersionFooterLabel(nextVersion);\r
          if (nextVersion.length > 0 && nextVersion !== previousVersion) {\r
            postToPlugin({ type: "getUpdateBannerDismissed" });\r
          }\r
          return;\r
        }\r
        if (msg.type === "layerNamePresets") {\r
          if (Array.isArray(msg.presets) && msg.presets.length > 0) {\r
            namePresets = msg.presets;\r
            customIds = {};\r
            for (const id of msg.customIds || []) {\r
              customIds[id] = true;\r
            }\r
            editingNodeId = null;\r
            pendingAddParentId = undefined;\r
            confirmingDeleteId = null;\r
            renderNamesTree();\r
            renderResetControl();\r
            if (isEditingPresets) {\r
              setPreview("");\r
            }\r
          }\r
          namesUndoEl.classList.toggle("is-visible", Boolean(msg.canUndo));\r
          if (msg.notice) {\r
            namesStatusEl.textContent = msg.notice;\r
          }\r
          return;\r
        }\r
        if (msg.type === "selectionChanged") {\r
          setSelectionCount(\r
            typeof msg.count === "number" && msg.count > 0 ? msg.count : 0\r
          );\r
          return;\r
        }\r
        if (msg.type === "recentNamePresets") {\r
          recentTemplates = Array.isArray(msg.templates)\r
            ? msg.templates.slice(0, RECENT_LIMIT)\r
            : [];\r
          renderRecent();\r
          return;\r
        }\r
        if (msg.type === "renameLayersResult") {\r
          const names = Array.isArray(msg.names) ? msg.names : [];\r
          if (!msg.ok && names.length === 0) {\r
            namesStatusEl.textContent = msg.error || "\u0427\u0442\u043E-\u0442\u043E \u043F\u043E\u0448\u043B\u043E \u043D\u0435 \u0442\u0430\u043A.";\r
            return;\r
          }\r
          let text = "\u0413\u043E\u0442\u043E\u0432\u043E \u2014 \u043F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u043D\u043E " + pluralLayers(msg.renamed) + ".";\r
          if (names.length === 1) {\r
            text += "\\n" + names[0];\r
          } else if (names.length > 1) {\r
            text += "\\n" + names[0] + " \u2026 " + names[names.length - 1];\r
          }\r
          if (msg.error) {\r
            text += "\\n" + msg.error;\r
          }\r
          namesStatusEl.textContent = text;\r
          return;\r
        }\r
        if (msg.type === "updateBannerDismissed") {\r
          dismissedRemoteVersion =\r
            msg.dismissedRemoteVersion === null ||\r
            msg.dismissedRemoteVersion === undefined\r
              ? null\r
              : String(msg.dismissedRemoteVersion);\r
          runUpdateCheck();\r
          return;\r
        }\r
        if (msg.type === "done") {\r
          goRasterEl.disabled = false;\r
          if (msg.ok) {\r
            rasterStatusEl.textContent =\r
              "\u0413\u043E\u0442\u043E\u0432\u043E \u2014 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u0430\u043D\u043E " + pluralLayers(msg.done) + ".";\r
            return;\r
          }\r
          let text = "";\r
          if (msg.done > 0) {\r
            text += "\u041E\u0431\u0440\u0430\u0431\u043E\u0442\u0430\u043D\u043E: " + pluralLayers(msg.done) + ".\\n";\r
          }\r
          if (msg.errors && msg.errors.length) {\r
            text += msg.errors.join("\\n");\r
          } else if (msg.error) {\r
            text += msg.error;\r
          } else {\r
            text += "\u0427\u0442\u043E-\u0442\u043E \u043F\u043E\u0448\u043B\u043E \u043D\u0435 \u0442\u0430\u043A.";\r
          }\r
          rasterStatusEl.textContent = text;\r
          return;\r
        }\r
        if (msg.type === "multipleOfFourCheckResult") {\r
          setMo4Busy(false);\r
          renderMo4List(msg.violations || []);\r
          const parts = [];\r
          if (msg.violations && msg.violations.length) {\r
            parts.push(\r
              "\u041D\u0430\u0448\u043B\u043E\u0441\u044C " +\r
                pluralLayers(msg.violations.length) +\r
                " \u0441 \u043D\u0430\u0440\u0443\u0448\u0435\u043D\u0438\u0435\u043C \u2014 \u043E\u0441\u0442\u0430\u0432\u0438\u043B \u0438\u0445 \u0432 \u0432\u044B\u0434\u0435\u043B\u0435\u043D\u0438\u0438."\r
            );\r
          } else {\r
            parts.push("\u0412\u0441\u0435 \u0441\u043B\u043E\u0438 \u043A\u0440\u0430\u0442\u043D\u044B 4 \u2014 \u043D\u0430\u0440\u0443\u0448\u0435\u043D\u0438\u0439 \u043D\u0435\u0442.");\r
          }\r
          if (msg.skipped && msg.skipped.length) {\r
            parts.push("\u041F\u0440\u043E\u043F\u0443\u0449\u0435\u043D\u043E: " + msg.skipped.length + ".");\r
          }\r
          mo4StatusEl.textContent = parts.join(" ");\r
          return;\r
        }\r
        if (msg.type === "multipleOfFourFixResult") {\r
          setMo4Busy(false);\r
          renderMo4Debug(msg.debug);\r
          let text = "";\r
          if (msg.fixedParents > 0) {\r
            text +=\r
              "\u041E\u0431\u0435\u0440\u043D\u0443\u0442\u043E: " + pluralLayers(msg.fixedParents) + ".";\r
          }\r
          if (msg.skipped > 0) {\r
            text +=\r
              (text ? " " : "") +\r
              "\u041F\u0440\u043E\u043F\u0443\u0449\u0435\u043D\u043E: " +\r
              msg.skipped +\r
              " (\u043D\u0435\u0442 absoluteRenderBounds \u0438\u043B\u0438 \u043D\u0435\u043B\u044C\u0437\u044F \u043F\u043E\u0434\u043E\u0433\u043D\u0430\u0442\u044C \u0440\u043E\u0434\u0438\u0442\u0435\u043B\u044F).";\r
          }\r
          if (msg.errors && msg.errors.length) {\r
            text += (text ? "\\n" : "") + msg.errors.join("\\n");\r
          }\r
          if (!text) {\r
            text = msg.ok ? "\u0413\u043E\u0442\u043E\u0432\u043E." : "\u0427\u0442\u043E-\u0442\u043E \u043F\u043E\u0448\u043B\u043E \u043D\u0435 \u0442\u0430\u043A.";\r
          }\r
          mo4StatusEl.textContent = text;\r
        }\r
      };\r
\r
      function requestPluginVersionFromMain() {\r
        postToPlugin({ type: "requestPluginVersion" });\r
      }\r
\r
      requestPluginVersionFromMain();\r
      if (document.readyState !== "complete") {\r
        window.addEventListener("load", requestPluginVersionFromMain);\r
      }\r
      setTimeout(requestPluginVersionFromMain, 200);\r
      setTimeout(requestPluginVersionFromMain, 800);\r
    </script>\r
  </body>\r
</html>\r
`, {
  width: 320,
  height: 560,
  themeColors: true,
  title: "\u{1F60A} Kids Games Plugin \u{1F60A}"
});
var presetTree = defaultPresetTree();
var presetTreeLoaded = false;
async function loadPresetTree() {
  if (presetTreeLoaded) {
    return presetTree;
  }
  try {
    const stored = await figma.clientStorage.getAsync(PRESET_TREE_KEY);
    presetTree = normalizePresetTree(stored);
  } catch (e) {
    presetTree = defaultPresetTree();
  }
  presetTreeLoaded = true;
  return presetTree;
}
var presetTreeHistory = [];
var PRESET_HISTORY_LIMIT = 10;
function pushPresetHistory(tree) {
  presetTreeHistory.push(tree);
  if (presetTreeHistory.length > PRESET_HISTORY_LIMIT) {
    presetTreeHistory.shift();
  }
}
async function savePresetTree(tree) {
  presetTree = tree;
  presetTreeLoaded = true;
  await figma.clientStorage.setAsync(PRESET_TREE_KEY, {
    version: PRESET_STORAGE_VERSION,
    presets: tree
  });
}
function postPresetTreeToUi(notice) {
  figma.ui.postMessage({
    type: "layerNamePresets",
    presets: presetTree,
    notice,
    canUndo: presetTreeHistory.length > 0,
    customIds: collectCustomIds(presetTree)
  });
}
function collectCustomIds(tree) {
  const standard = {};
  const collect = (nodes) => {
    for (const node of nodes) {
      standard[node.id] = node.template;
      if (node.children) collect(node.children);
    }
  };
  collect(defaultPresetTree());
  const ids = [];
  const walk = (nodes) => {
    for (const node of nodes) {
      if (standard[node.id] !== node.template) {
        ids.push(node.id);
      }
      if (node.children) walk(node.children);
    }
  };
  walk(tree);
  return ids;
}
function postSelectionToUi() {
  figma.ui.postMessage({
    type: "selectionChanged",
    count: figma.currentPage.selection.length
  });
}
function postBootstrapToUi() {
  figma.ui.postMessage({ type: "pluginVersion", version: "1.3.2" });
  postSelectionToUi();
  if (presetTreeLoaded) {
    postPresetTreeToUi();
  }
}
postBootstrapToUi();
setTimeout(postBootstrapToUi, 120);
setTimeout(postBootstrapToUi, 400);
loadPresetTree().then(() => {
  postPresetTreeToUi();
  setTimeout(() => postPresetTreeToUi(), 200);
});
figma.on("selectionchange", postSelectionToUi);
async function rewriteRecentTemplate(previousTemplate, nextTemplate) {
  if (previousTemplate === nextTemplate) {
    return;
  }
  const stored = await figma.clientStorage.getAsync(RECENT_NAME_PRESETS_KEY);
  if (!Array.isArray(stored)) {
    return;
  }
  let changed = false;
  const templates = [];
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
function focusSceneNodeById(nodeId) {
  const node = figma.getNodeById(nodeId);
  if (!node || !("type" in node)) {
    return;
  }
  if (node.type === "DOCUMENT" || node.type === "PAGE") {
    return;
  }
  const sceneNode = node;
  figma.currentPage.selection = [sceneNode];
  figma.viewport.scrollAndZoomIntoView([sceneNode]);
}
figma.ui.onmessage = async (raw) => {
  if (!isPluginMessageFromUi(raw)) {
    return;
  }
  if (raw.type === "requestPluginVersion") {
    postBootstrapToUi();
    return;
  }
  if (raw.type === "getUpdateBannerDismissed") {
    const stored = await figma.clientStorage.getAsync(UPDATE_BANNER_DISMISSED_KEY);
    const dismissed = typeof stored === "string" && stored.length > 0 ? stored : null;
    figma.ui.postMessage({
      type: "updateBannerDismissed",
      dismissedRemoteVersion: dismissed
    });
    return;
  }
  if (raw.type === "setUpdateBannerDismissed") {
    if (typeof raw.remoteVersion === "string" && raw.remoteVersion.length > 0) {
      await figma.clientStorage.setAsync(
        UPDATE_BANNER_DISMISSED_KEY,
        raw.remoteVersion
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
      const payload = {
        type: "multipleOfFourCheckResult",
        violations: [],
        skipped: [
          {
            nodeId: "",
            name: "\u041E\u0448\u0438\u0431\u043A\u0430",
            reason: text
          }
        ]
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
      const payload = {
        type: "multipleOfFourFixResult",
        ok: false,
        fixedParents: 0,
        skipped: 0,
        errors: [text]
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
        error: text
      });
    }
    return;
  }
  if (raw.type === "getRecentNamePresets") {
    const stored = await figma.clientStorage.getAsync(RECENT_NAME_PRESETS_KEY);
    const templates = Array.isArray(stored) ? stored.filter((item) => typeof item === "string") : [];
    figma.ui.postMessage({ type: "recentNamePresets", templates });
    return;
  }
  if (raw.type === "setRecentNamePresets") {
    const templates = Array.isArray(raw.templates) ? raw.templates.filter((item) => typeof item === "string").slice(0, RECENT_NAME_PRESETS_LIMIT) : [];
    await figma.clientStorage.setAsync(RECENT_NAME_PRESETS_KEY, templates);
    return;
  }
  if (raw.type === "renamePreset") {
    const tree = await loadPresetTree();
    const target = findPreset(tree, raw.id);
    const previousTemplate = target ? target.template : "";
    const result = renamePreset(tree, raw.id, raw.template);
    if (!result.found) {
      postPresetTreeToUi("\u0422\u0438\u043F \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D \u2014 \u0441\u043F\u0438\u0441\u043E\u043A \u043E\u0431\u043D\u043E\u0432\u043B\u0451\u043D.");
      return;
    }
    pushPresetHistory(tree);
    await savePresetTree(result.tree);
    if (previousTemplate.length > 0) {
      await rewriteRecentTemplate(previousTemplate, raw.template.trim());
    }
    const notice = result.affected > 0 ? `\u041F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u043D\u043E. \u041E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u043E \u0432\u043B\u043E\u0436\u0435\u043D\u043D\u044B\u0445: ${result.affected}.` : "\u041F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u043D\u043E.";
    postPresetTreeToUi(notice);
    return;
  }
  if (raw.type === "addPreset") {
    const tree = await loadPresetTree();
    const result = addPreset(tree, raw.parentId, raw.template);
    if (result.addedId.length === 0) {
      postPresetTreeToUi("\u041F\u0443\u0441\u0442\u043E\u0435 \u0438\u043C\u044F \u2014 \u0442\u0438\u043F \u043D\u0435 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D.");
      return;
    }
    pushPresetHistory(tree);
    await savePresetTree(result.tree);
    postPresetTreeToUi(`\u0414\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u043E: ${raw.template.trim()}`);
    return;
  }
  if (raw.type === "removePreset") {
    const tree = await loadPresetTree();
    const result = removePreset(tree, raw.id);
    if (result.removed === 0) {
      postPresetTreeToUi("\u0422\u0438\u043F \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D \u2014 \u0441\u043F\u0438\u0441\u043E\u043A \u043E\u0431\u043D\u043E\u0432\u043B\u0451\u043D.");
      return;
    }
    pushPresetHistory(tree);
    await savePresetTree(result.tree);
    postPresetTreeToUi(`\u0423\u0434\u0430\u043B\u0435\u043D\u043E \u0442\u0438\u043F\u043E\u0432: ${result.removed}.`);
    return;
  }
  if (raw.type === "movePreset") {
    const tree = await loadPresetTree();
    pushPresetHistory(tree);
    await savePresetTree(movePreset(tree, raw.id, raw.direction));
    postPresetTreeToUi();
    return;
  }
  if (raw.type === "resetPresets") {
    const previous = await loadPresetTree();
    const tree = defaultPresetTree();
    pushPresetHistory(previous);
    await savePresetTree(tree);
    postPresetTreeToUi(`\u0421\u043F\u0438\u0441\u043E\u043A \u0441\u0431\u0440\u043E\u0448\u0435\u043D \u043A \u0441\u0442\u0430\u043D\u0434\u0430\u0440\u0442\u043D\u043E\u043C\u0443 (${countPresets(tree)}).`);
    return;
  }
  if (raw.type === "undoPresetEdit") {
    await loadPresetTree();
    const previous = presetTreeHistory.pop();
    if (!previous) {
      postPresetTreeToUi();
      return;
    }
    await savePresetTree(previous);
    postPresetTreeToUi("\u041E\u0442\u043C\u0435\u043D\u0435\u043D\u043E.");
    return;
  }
  if (raw.type === "focusNode") {
    focusSceneNodeById(raw.nodeId);
    return;
  }
  if (raw.type === "selectNodes") {
    const nodes = [];
    for (const id of raw.nodeIds) {
      const node = figma.getNodeById(id);
      if (!node || !("type" in node)) continue;
      if (node.type === "DOCUMENT" || node.type === "PAGE") continue;
      nodes.push(node);
    }
    figma.currentPage.selection = nodes;
    if (nodes.length > 0) {
      figma.viewport.scrollAndZoomIntoView(nodes);
    }
  }
};
