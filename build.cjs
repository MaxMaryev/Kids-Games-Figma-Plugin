const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

const htmlPath = path.join(__dirname, "ui.html");
const html = JSON.stringify(fs.readFileSync(htmlPath, "utf8"));

const packageJsonPath = path.join(__dirname, "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const pluginVersion =
  typeof packageJson.version === "string" ? packageJson.version : "0.0.0";

const config = {
  entryPoints: [path.join(__dirname, "src", "main.ts")],
  bundle: true,
  outfile: "code.js",
  target: "es2017",
  platform: "neutral",
  define: {
    __html__: html,
    __PLUGIN_VERSION__: JSON.stringify(pluginVersion),
  },
};

async function main() {
  const watch = process.argv.includes("--watch");
  if (watch) {
    const context = await esbuild.context(config);
    await context.watch();
    return;
  }
  await esbuild.build(config);
}

main().catch(() => process.exit(1));
