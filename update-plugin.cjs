const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");

const REPO_ZIP_URL =
  "https://github.com/MaxMaryev/Kids-Games-Figma-Plugin/archive/refs/heads/main.zip";
const ARCHIVE_ROOT_DIR = "Kids-Games-Figma-Plugin-main";

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

function main() {
  rmRecursive(workDir);
  fs.mkdirSync(workDir, { recursive: true });
  fs.mkdirSync(extractDir, { recursive: true });

  console.log("Downloading latest main from GitHub…");
  execFileSync(
    "curl",
    ["-sSL", "-o", zipPath, REPO_ZIP_URL],
    { stdio: "inherit", cwd: pluginRoot },
  );

  console.log("Extracting…");
  execFileSync("tar", ["-xf", zipPath, "-C", extractDir], {
    stdio: "inherit",
    cwd: pluginRoot,
  });

  if (!fs.existsSync(extractedRepo)) {
    throw new Error(
      "Expected folder not found after extract: " + ARCHIVE_ROOT_DIR,
    );
  }

  console.log("Copying files into plugin folder…");
  copyTreeSkipNames(extractedRepo, pluginRoot, COPY_SKIP_NAMES);

  rmRecursive(workDir);
  console.log("Sources updated from GitHub (no Git).");
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  try {
    rmRecursive(workDir);
  } catch {
    // ignore
  }
  process.exit(1);
}
