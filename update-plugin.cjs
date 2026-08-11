const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");

/**
 * Обновление плагина без Git и без сборки: скачиваем zip ветки main, проверяем
 * его на полноту и копируем поверх папки плагина. code.js лежит в репозитории
 * готовым, поэтому npm и esbuild на машине художника не нужны.
 */

const DEFAULT_REPO_ZIP_URL =
  "https://github.com/MaxMaryev/Kids-Games-Figma-Plugin/archive/refs/heads/main.zip";
/** Переопределение для проверки обновления на локальном zip. */
const REPO_ZIP_URL = process.env.KGP_UPDATE_ZIP_URL || DEFAULT_REPO_ZIP_URL;
const ARCHIVE_ROOT_DIR = "Kids-Games-Figma-Plugin-main";

/** Без этих файлов плагин не запустится — копировать половину нельзя. */
const REQUIRED_FILES = ["manifest.json", "ui.html", "code.js", "package.json"];

/** Здесь зеркалим удаления: файл пропал в репозитории — убираем и у себя. */
const MIRRORED_DIRS = ["src"];

const pluginRoot = path.resolve(__dirname);
const workDir = path.join(
  os.tmpdir(),
  "kids-games-figma-plugin-update-" + process.pid,
);
const zipPath = path.join(workDir, "repo.zip");
const extractDir = path.join(workDir, "extracted");
const extractedRepo = path.join(extractDir, ARCHIVE_ROOT_DIR);

/** Do not overwrite: cmd.exe re-reads UPDATE.bat from disk after node exits; zip may ship an old bat with git pull. */
const COPY_SKIP_NAMES = new Set(["UPDATE.bat"]);

function rmRecursive(targetPath) {
  fs.rmSync(targetPath, { recursive: true, force: true });
}

function readVersion(packageJsonPath) {
  try {
    const raw = fs.readFileSync(packageJsonPath, "utf8");
    const version = JSON.parse(raw).version;
    return typeof version === "string" && version.length > 0 ? version : "?";
  } catch {
    return "?";
  }
}

function copyTreeSkipNames(sourceDir, destinationDir, skipNames) {
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    if (skipNames.has(entry.name)) {
      continue;
    }
    const from = path.join(sourceDir, entry.name);
    const to = path.join(destinationDir, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(to, { recursive: true });
      copyTreeSkipNames(from, to, skipNames);
    } else {
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(from, to);
    }
  }
}

/** Удалить у пользователя то, чего больше нет в архиве. Только внутри dirName. */
function mirrorDeletions(sourceDir, destinationDir) {
  if (!fs.existsSync(destinationDir)) {
    return 0;
  }
  let removed = 0;
  for (const entry of fs.readdirSync(destinationDir, { withFileTypes: true })) {
    const from = path.join(sourceDir, entry.name);
    const to = path.join(destinationDir, entry.name);
    if (entry.isDirectory()) {
      if (!fs.existsSync(from)) {
        rmRecursive(to);
        removed++;
        continue;
      }
      removed += mirrorDeletions(from, to);
      continue;
    }
    if (!fs.existsSync(from)) {
      fs.rmSync(to, { force: true });
      removed++;
    }
  }
  return removed;
}

function assertArchiveIsComplete() {
  if (!fs.existsSync(extractedRepo)) {
    throw new Error(
      "В архиве нет папки " +
        ARCHIVE_ROOT_DIR +
        ". Похоже, скачался не тот файл — проверьте интернет и попробуйте ещё раз.",
    );
  }
  const missing = REQUIRED_FILES.filter(
    (name) => !fs.existsSync(path.join(extractedRepo, name)),
  );
  if (missing.length > 0) {
    throw new Error(
      "В скачанном архиве не хватает файлов: " +
        missing.join(", ") +
        ".\nПапка плагина НЕ изменена. Скорее всего, релиз собран неправильно — сообщите об этом.",
    );
  }
}

function main() {
  const versionBefore = readVersion(path.join(pluginRoot, "package.json"));

  rmRecursive(workDir);
  fs.mkdirSync(workDir, { recursive: true });
  fs.mkdirSync(extractDir, { recursive: true });

  console.log("Скачиваю свежую версию с GitHub…");
  execFileSync("curl", ["-sSL", "-o", zipPath, REPO_ZIP_URL], {
    stdio: "inherit",
    cwd: pluginRoot,
  });

  console.log("Распаковываю…");
  execFileSync("tar", ["-xf", zipPath, "-C", extractDir], {
    stdio: "inherit",
    cwd: pluginRoot,
  });

  // Проверяем ДО того, как трогать папку плагина: иначе можно оставить
  // пользователя с полуобновлённой папкой.
  assertArchiveIsComplete();

  const versionAfter = readVersion(path.join(extractedRepo, "package.json"));

  console.log("Обновляю файлы плагина…");
  let removed = 0;
  for (const dirName of MIRRORED_DIRS) {
    removed += mirrorDeletions(
      path.join(extractedRepo, dirName),
      path.join(pluginRoot, dirName),
    );
  }
  copyTreeSkipNames(extractedRepo, pluginRoot, COPY_SKIP_NAMES);

  rmRecursive(workDir);

  console.log("");
  console.log("========================================");
  console.log("  ГОТОВО: " + versionBefore + " -> " + versionAfter);
  console.log("========================================");
  if (removed > 0) {
    console.log("  Удалено устаревших файлов: " + removed);
  }
  console.log("  Откройте плагин в Figma заново.");
  console.log("  Версия видна внизу окна плагина.");
  console.log("");
  console.log("  Если ниже появятся сообщения про npm — их можно");
  console.log("  игнорировать, плагин уже обновлён.");
  console.log("");
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error("");
  console.error("  ОБНОВЛЕНИЕ НЕ ВЫПОЛНЕНО");
  console.error("  " + message);
  console.error("");
  try {
    rmRecursive(workDir);
  } catch {
    // ignore
  }
  process.exit(1);
}
