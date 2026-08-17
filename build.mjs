// build.mjs — production-сборка виджета.
//
// Исходный прототип компилировал JSX прямо в браузере через @babel/standalone
// и тянул development-сборки React: ~2.5 МБ загрузки и заметная пауза до
// первой отрисовки. Здесь JSX компилируется заранее, React берётся в
// production-варианте, всё складывается в два файла в dist/.

import * as esbuild from "esbuild";
import { rm, mkdir, cp } from "node:fs/promises";

const watch = process.argv.includes("--watch");
const check = process.argv.includes("--check");

const options = {
  entryPoints: ["src/index.jsx"],
  outdir: "dist",
  entryNames: "skin-test",
  assetNames: "[name]",
  bundle: true,
  format: "iife",
  target: ["es2019", "chrome90", "firefox90", "safari15", "edge90"],
  minify: !check,
  sourcemap: true,
  jsx: "automatic",
  loader: { ".jsx": "jsx" },
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "info",
  metafile: true,
};

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log("watching src/…");
} else {
  const result = await esbuild.build(options);
  await cp("public", "dist", { recursive: true });

  const sizes = Object.entries(result.metafile.outputs)
    .filter(([f]) => !f.endsWith(".map"))
    .map(([f, o]) => `${f}  ${(o.bytes / 1024).toFixed(1)} КБ`);
  console.log("\n" + sizes.join("\n"));
}
