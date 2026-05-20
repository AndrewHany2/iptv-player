import { deflateSync } from "zlib";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const lgDir = join(__dirname, "..", "packaging", "lg");
mkdirSync(lgDir, { recursive: true });

// CRC32 implementation (required by PNG format)
function crc32(buf) {
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

// Generates a solid-color PNG with a rounded TV-screen look:
//   dark border (#1a1a2e) + blue center (#3b82f6) + white "▶" dot
function createIcon(size) {
  const border = Math.round(size * 0.1);

  // Build raw pixel data row by row
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3);
    row[0] = 0; // PNG filter: None
    for (let x = 0; x < size; x++) {
      let r, g, b;
      const onBorder = x < border || x >= size - border || y < border || y >= size - border;

      // Small white circle in the center (play indicator)
      const cx = size / 2, cy = size / 2;
      const radius = size * 0.12;
      const inDot = Math.hypot(x - cx, y - cy) <= radius;

      if (onBorder) {
        [r, g, b] = [26, 26, 46];   // dark navy border
      } else if (inDot) {
        [r, g, b] = [255, 255, 255]; // white dot
      } else {
        [r, g, b] = [59, 130, 246];  // app blue
      }

      row[1 + x * 3] = r;
      row[1 + x * 3 + 1] = g;
      row[1 + x * 3 + 2] = b;
    }
    rows.push(row);
  }

  const imgData = Buffer.concat(rows);
  const compressed = deflateSync(imgData);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  // bytes 10–12 stay 0 (compression/filter/interlace)

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    makeChunk("IHDR", ihdr),
    makeChunk("IDAT", compressed),
    makeChunk("IEND", Buffer.alloc(0)),
  ]);
}

writeFileSync(join(lgDir, "icon.png"), createIcon(80));
console.log("  icon.png       (80×80)  → packaging/lg/");

writeFileSync(join(lgDir, "largeIcon.png"), createIcon(130));
console.log("  largeIcon.png  (130×130) → packaging/lg/");

console.log("Icons created.");
