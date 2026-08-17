const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

const htmlPath = path.join(__dirname, "ui.html");
const srcDir = path.join(__dirname, "src");
const uiEntry = path.join(srcDir, "ui", "psdExport.ts");

// Плейсхолдер внутри ui.html, куда уезжает собранный UI-бандл (ag-psd).
// В репозитории на этом месте пусто: ui.html читают люди, бандл — машины.
const UI_MARKER = "/* __KGP_PSD_BUNDLE__ */";

const packageJsonPath = path.join(__dirname, "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const pluginVersion =
  typeof packageJson.version === "string" ? packageJson.version : "0.0.0";

// Переопределение нужно verify.cjs: собрать во временный файл и сравнить
// с закоммиченным code.js, не трогая рабочую копию.
const outfile = process.env.KGP_BUILD_OUTFILE || "code.js";

/**
 * UI-бандл. write:false обязателен: verify.cjs подменяет только основной
 * outfile, и запись этого прохода на диск нарушила бы его контракт
 * «проверка не трогает рабочую копию».
 */
function buildUiBundle() {
  return esbuild
    .build({
      entryPoints: [uiEntry],
      bundle: true,
      write: false,
      format: "iife",
      globalName: "KGP_PSD",
      target: "es2017",
      platform: "browser",
      minify: true,
      legalComments: "eof",
    })
    .then((result) => result.outputFiles[0].text);
}

function injectUiBundle(html, bundle) {
  if (html.indexOf(UI_MARKER) === -1) {
    throw new Error("В ui.html нет плейсхолдера " + UI_MARKER);
  }
  // Закрывающий тег внутри JS оборвал бы <script> раньше времени.
  const safe = bundle.replace(/<\/script/gi, "<\\/script");
  // Функция вместо строки: иначе $&, $` и $' внутри минифицированного ag-psd
  // подставятся как спецпоследовательности String.replace и бандл молча испортится.
  return html.replace(UI_MARKER, () => safe);
}

async function buildOnce() {
  const bundle = await buildUiBundle();
  const html = injectUiBundle(fs.readFileSync(htmlPath, "utf8"), bundle);
  await esbuild.build({
    entryPoints: [path.join(srcDir, "main.ts")],
    bundle: true,
    outfile,
    target: "es2017",
    platform: "neutral",
    define: {
      __html__: JSON.stringify(html),
      __PLUGIN_VERSION__: JSON.stringify(pluginVersion),
    },
  });
}

/**
 * Своё слежение вместо esbuild.context().watch(): ui.html не входит в граф
 * импортов main.ts, поэтому esbuild его не видел и правки вёрстки молча
 * давали устаревший code.js. Полная пересборка занимает доли секунды.
 */
function watch() {
  let timer = null;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      buildOnce()
        .then(() => console.log("собрано " + new Date().toLocaleTimeString()))
        .catch((error) => console.error(error.message));
    }, 80);
  };
  fs.watch(srcDir, { recursive: true }, schedule);
  fs.watch(htmlPath, schedule);
  // Редакторы с atomic save подменяют файл целиком и рвут fs.watch по иноду.
  fs.watchFile(htmlPath, { interval: 400 }, schedule);
  return buildOnce();
}

async function main() {
  if (process.argv.includes("--watch")) {
    await watch();
    return;
  }
  await buildOnce();
}

main().catch((error) => {
  console.error(error && error.message ? error.message : error);
  process.exit(1);
});
