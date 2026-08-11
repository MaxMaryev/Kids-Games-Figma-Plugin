/**
 * Проверка, что закоммиченный code.js собран из текущих исходников.
 *
 * code.js раздаётся пользователям как есть (UPDATE.bat только копирует файлы),
 * поэтому устаревший code.js в репозитории = сломанный релиз. Скрипт собирает
 * во временный файл и сравнивает побайтово, рабочую копию не трогает.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

const root = __dirname;
const codePath = path.join(root, "code.js");
const tempOut = path.join(
  os.tmpdir(),
  "kgp-verify-" + process.pid + "-code.js",
);

function sha(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function cleanup() {
  fs.rmSync(tempOut, { force: true });
}

if (!fs.existsSync(codePath)) {
  console.error("\n  ОШИБКА: code.js отсутствует. Соберите: npm run release\n");
  process.exit(1);
}

try {
  execFileSync(process.execPath, [path.join(root, "build.cjs")], {
    stdio: "inherit",
    cwd: root,
    env: Object.assign({}, process.env, { KGP_BUILD_OUTFILE: tempOut }),
  });

  const committed = fs.readFileSync(codePath);
  const fresh = fs.readFileSync(tempOut);

  if (sha(committed) !== sha(fresh)) {
    console.error("");
    console.error("  code.js УСТАРЕЛ — он не совпадает со сборкой из src/ и ui.html.");
    console.error("  Пользователи получат старый плагин. Выполните: npm run release");
    console.error("");
    process.exit(1);
  }

  console.log("\n  code.js актуален — собран из текущих исходников.\n");
} finally {
  cleanup();
}
