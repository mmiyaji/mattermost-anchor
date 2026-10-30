// Generates src/icons/icon{16,32,48,128}.png (white anchor on a blue rounded square). No dependencies.
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const BG = [0x2b, 0x57, 0x97];
const FG = [255, 255, 255];

const dist = (x, y, cx, cy) => Math.hypot(x - cx, y - cy);
const rect = (x, y, x0, y0, x1, y1) => x >= x0 && x <= x1 && y >= y0 && y <= y1;

// Coordinates are in the unit square.
function isAnchor(x, y) {
  const ring = dist(x, y, 0.5, 0.24);
  if (ring <= 0.085 && ring >= 0.045) return true;
  if (rect(x, y, 0.465, 0.3, 0.535, 0.8)) return true; // shaft
  if (rect(x, y, 0.36, 0.38, 0.64, 0.44)) return true; // stock
  const arc = dist(x, y, 0.5, 0.52);
  if (y >= 0.52 && arc <= 0.29 && arc >= 0.23) return true; // bottom arc
  if (dist(x, y, 0.21, 0.52) <= 0.055 || dist(x, y, 0.79, 0.52) <= 0.055) return true; // flukes
  return false;
}

function inRoundedSquare(x, y, r = 0.22) {
  const cx = Math.min(Math.max(x, r), 1 - r);
  const cy = Math.min(Math.max(y, r), 1 - r);
  return dist(x, y, cx, cy) <= r;
}

function render(size) {
  const SS = 4;
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = (px + (sx + 0.5) / SS) / size;
          const y = (py + (sy + 0.5) / SS) / size;
          if (!inRoundedSquare(x, y)) continue;
          const c = isAnchor(x, y) ? FG : BG;
          r += c[0]; g += c[1]; b += c[2]; a++;
        }
      }
      const o = py * stride + 1 + px * 4;
      raw[o] = a ? Math.round(r / a) : 0;
      raw[o + 1] = a ? Math.round(g / a) : 0;
      raw[o + 2] = a ? Math.round(b / a) : 0;
      raw[o + 3] = Math.round((a / (SS * SS)) * 255);
    }
  }
  return raw;
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

function png(size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(render(size))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const out = path.join(__dirname, "..", "src", "icons");
fs.mkdirSync(out, { recursive: true });
for (const s of [16, 32, 48, 128]) fs.writeFileSync(path.join(out, `icon${s}.png`), png(s));
console.log("icons written to", out);
