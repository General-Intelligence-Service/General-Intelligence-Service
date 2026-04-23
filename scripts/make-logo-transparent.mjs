import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

/**
 * Remove near-black background from a PNG and write transparent PNGs used by the app.
 *
 * Usage:
 *   node scripts/make-logo-transparent.mjs "D:\\Gift_GIS\\logo.png"
 *
 * Output:
 *   public/new-logo.png
 *   public/logo_pdf.png
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function luma(r, g, b) {
  // Rec.709 luma
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

async function main() {
  const input = process.argv[2] ?? path.resolve(__dirname, "..", "logo.png");
  if (!fs.existsSync(input)) {
    console.error(`Input image not found: ${input}`);
    process.exit(2);
  }

  const repoRoot = path.resolve(__dirname, "..");
  const publicDir = path.join(repoRoot, "public");
  const outSite = path.join(publicDir, "new-logo.png");
  const outPdf = path.join(publicDir, "logo_pdf.png");

  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (info.channels !== 4) {
    throw new Error(`Expected RGBA input, got channels=${info.channels}`);
  }

  const w = info.width;
  const h = info.height;

  // Thresholds tuned for solid #000 backgrounds while avoiding dark-green text.
  const hardLuma = 22;
  const softLuma = 55;
  const hardChroma = 10;
  const softChroma = 18;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r = data[idx + 0];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];
      if (a === 0) continue;

      const lum = luma(r, g, b);
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const chroma = max - min;

      // Only treat near-gray/near-black pixels as background.
      const isBgCandidate = chroma <= softChroma;
      if (!isBgCandidate) continue;

      if (lum <= hardLuma && chroma <= hardChroma) {
        data[idx + 3] = 0;
        continue;
      }

      if (lum < softLuma) {
        const t = clamp((lum - hardLuma) / (softLuma - hardLuma), 0, 1);
        data[idx + 3] = Math.round(a * t);
      }
    }
  }

  const png = await sharp(data, {
    raw: { width: w, height: h, channels: 4 },
  })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();

  fs.mkdirSync(publicDir, { recursive: true });
  fs.writeFileSync(outSite, png);
  fs.writeFileSync(outPdf, png);

  console.log("Updated with transparent background:");
  console.log(`- ${outSite}`);
  console.log(`- ${outPdf}`);
}

await main();
