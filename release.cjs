/**
 * Релизная сборка. code.js лежит в репозитории — это и есть то, что грузит
 * Figma и что забирает UPDATE.bat у художника. Поэтому забыть пересобрать
 * перед коммитом нельзя: скрипт проверяет, что версия внутри code.js
 * действительно совпадает с package.json, и падает, если нет.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = __dirname;
const packageJsonPath = path.join(root, "package.json");
const codePath = path.join(root, "code.js");

function fail(message) {
  console.error("\n  ОШИБКА: " + message + "\n");
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const version = packageJson.version;
if (typeof version !== "string" || version.length === 0) {
  fail("в package.json нет version");
}

console.log("Сборка " + version + "…");
execFileSync(process.execPath, [path.join(root, "build.cjs")], {
  stdio: "inherit",
  cwd: root,
});

if (!fs.existsSync(codePath)) {
  fail("после сборки нет code.js");
}

const code = fs.readFileSync(codePath, "utf8");
if (code.indexOf(JSON.stringify(version)) === -1) {
  fail(
    "в code.js нет версии " +
      version +
      " — сборка не подхватила package.json"
  );
}

const sizeKb = Math.round(fs.statSync(codePath).size / 1024);
console.log("\n  Готово: code.js " + sizeKb + " КБ, версия " + version);
console.log("  Дальше: git add code.js package.json && git commit && git push\n");
