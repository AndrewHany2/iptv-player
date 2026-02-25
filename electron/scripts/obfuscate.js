/**
 * Obfuscation build script
 * Processes main.js and preload.js → dist-electron/
 * Run via: npm run build:obfuscate
 */

const JavaScriptObfuscator = require("javascript-obfuscator");
const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const outDir = path.join(rootDir, "dist-electron");

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Conservative obfuscation options safe for Node.js / Electron main process
// Aggressive options (selfDefending, controlFlowFlattening) can break async code
const obfuscatorOptions = {
  compact: true,
  controlFlowFlattening: false,
  deadCodeInjection: false,
  debugProtection: false,
  disableConsoleOutput: false,
  identifierNamesGenerator: "hexadecimal",
  log: false,
  numbersToExpressions: true,
  renameGlobals: false,
  selfDefending: false,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 10,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayEncoding: ["base64"],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 4,
  stringArrayWrappersType: "function",
  stringArrayThreshold: 0.75,
  unicodeEscapeSequence: false,
};

const files = ["main.js", "preload.js"];

let hasError = false;

files.forEach((file) => {
  const srcPath = path.join(rootDir, file);
  const destPath = path.join(outDir, file);

  if (!fs.existsSync(srcPath)) {
    console.error(`  ERROR: ${file} not found at ${srcPath}`);
    hasError = true;
    return;
  }

  try {
    const source = fs.readFileSync(srcPath, "utf-8");
    const result = JavaScriptObfuscator.obfuscate(source, obfuscatorOptions);
    fs.writeFileSync(destPath, result.getObfuscatedCode(), "utf-8");
    const srcSize = (fs.statSync(srcPath).size / 1024).toFixed(1);
    const destSize = (fs.statSync(destPath).size / 1024).toFixed(1);
    console.log(`  OK  ${file}  (${srcSize} KB → ${destSize} KB)`);
  } catch (err) {
    console.error(`  ERROR obfuscating ${file}:`, err.message);
    hasError = true;
  }
});

if (hasError) {
  console.error("\nObfuscation failed.");
  process.exit(1);
} else {
  console.log(`\nObfuscated files written to dist-electron/`);
}
