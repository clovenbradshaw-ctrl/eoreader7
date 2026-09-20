// mnemonic-pipeline-fixtures.js — a real PNG with a known circle, written
// by the test itself (zlib + CRC, node's own zlib — no image library), so
// the parent-teaches-once scenario runs on real bytes.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";

const PW = 384;
const PH = 288;

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = -1;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

// scenePixels(variant): writes a real PNG with a mid-gray circle and
// returns its path. Several variants = several HANDS of the same class (the
// parent teaches the circle at a few positions and sizes — measured: one
// lesson leaves the bound at the quantization floor and nothing but the
// exact same bytes is recognized).
export function scenePixels(variant = 0) {
  const px = new Float64Array(PW * PH).fill(0.95);
  const cx = 160 + variant * 32;
  const cy = 128 + variant * 16;
  const r = 28 + variant * 4;
  for (let y = 0; y < PH; y += 1) {
    for (let x = 0; x < PW; x += 1) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) px[y * PW + x] = 0.35;
    }
  }
  const p = path.join(os.tmpdir(), `mnemonic-pipeline-circle-${process.pid}-${variant}.png`);
  const raw = Buffer.alloc((PW + 1) * PH);
  for (let y = 0; y < PH; y += 1) {
    raw[y * (PW + 1)] = 0;
    for (let x = 0; x < PW; x += 1) raw[y * (PW + 1) + 1 + x] = Math.round(px[y * PW + x] * 255);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(PW, 0);
  ihdr.writeUInt32BE(PH, 4);
  ihdr[8] = 8;
  ihdr[9] = 0;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  fs.writeFileSync(p, png);
  return p;
}