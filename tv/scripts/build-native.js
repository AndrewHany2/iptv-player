import { execSync } from "child_process";
import { cpSync, mkdirSync, rmSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dist = join(root, "dist");
const packaging = join(root, "packaging");

// Files that must not be overwritten in each platform folder
const SAMSUNG_KEEP = new Set(["config.xml", "icon.png"]);
const LG_KEEP = new Set(["appinfo.json", "icon.png", "largeIcon.png"]);

function copyDist(src, dest, keepFiles) {
  cpSync(src, dest, {
    recursive: true,
    filter: (srcPath) => {
      const name = srcPath.split("/").pop();
      return !keepFiles.has(name);
    },
  });
}

// 1. Build
console.log("Building TV app...\n");
execSync("npm run build", { cwd: root, stdio: "inherit" });

// 2. Samsung (.wgt)
console.log("\nCopying to Samsung package...");
copyDist(dist, join(packaging, "samsung"), SAMSUNG_KEEP);
console.log("  → packaging/samsung/ ready");

// 3. LG (.ipk)
console.log("Copying to LG package...");
copyDist(dist, join(packaging, "lg"), LG_KEEP);
console.log("  → packaging/lg/ ready");

// 4. Android TV (assets/dist/)
console.log("Copying to Android assets...");
const androidDist = join(packaging, "android", "assets", "dist");
if (existsSync(androidDist)) rmSync(androidDist, { recursive: true });
mkdirSync(androidDist, { recursive: true });
cpSync(dist, androidDist, { recursive: true });
console.log("  → packaging/android/assets/dist/ ready");

console.log(`
All native packages are ready:

  Samsung  →  tv/packaging/samsung/   (open in Tizen Studio → build .wgt)
  LG       →  tv/packaging/lg/        (run: ares-package packaging/lg)
  Android  →  tv/packaging/android/   (copy assets/ into your Android project)
`);
