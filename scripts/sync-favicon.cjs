const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const src = path.join(root, "LOGO-Miniature.png");

const targets = [
  path.join(root, "app", "icon.png"),
  path.join(root, "app", "apple-icon.png"),
  path.join(root, "public", "LOGO-Miniature.png"),
];

function createIco(pngBuffers, sizes) {
  const count = pngBuffers.length;
  const headerSize = 6 + count * 16;
  let offset = headerSize;
  const entries = pngBuffers.map((buf, i) => {
    const size = sizes[i];
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size === 256 ? 0 : size, 0);
    entry.writeUInt8(size === 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(buf.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += buf.length;
    return entry;
  });
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);
  return Buffer.concat([header, ...entries, ...pngBuffers]);
}

async function main() {
  for (const target of targets) {
    await sharp(src).png().toFile(target);
    console.log("updated", path.relative(root, target));
  }

  const sizes = [16, 32, 48];
  const pngBuffers = await Promise.all(
    sizes.map((s) =>
      sharp(src)
        .resize(s, s, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer()
    )
  );

  const ico = createIco(pngBuffers, sizes);
  for (const icoPath of [
    path.join(root, "app", "icon.ico"),
    path.join(root, "public", "new-logo-icon.ico"),
  ]) {
    fs.writeFileSync(icoPath, ico);
    console.log("updated", path.relative(root, icoPath));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
