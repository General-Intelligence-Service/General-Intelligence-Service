const path = require("path");
const fs = require("fs");
const pdf = require("pdf-poppler");

/**
 * Convert the provided PDF logo (page 1) into PNG files used by the app:
 * - public/new-logo.png       (site header)
 * - public/logo_pdf.png       (PDF exports)
 *
 * Usage (PowerShell):
 *   node scripts/convert-logo-from-pdf.cjs "C:\\path\\to\\logo.pdf"
 */

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error('Missing input PDF path. Example: node scripts/convert-logo-from-pdf.cjs "C:\\\\tmp\\\\logo.pdf"');
    process.exit(2);
  }
  if (!fs.existsSync(input)) {
    console.error(`Input PDF not found: ${input}`);
    process.exit(2);
  }

  const repoRoot = path.resolve(__dirname, "..");
  const publicDir = path.join(repoRoot, "public");
  const tmpOutPrefix = "___cursor_logo_tmp";

  const opts = {
    format: "png",
    out_dir: publicDir,
    out_prefix: tmpOutPrefix,
    page: 1,
  };

  await pdf.convert(input, opts);

  const tmpPng = path.join(publicDir, `${tmpOutPrefix}-1.png`);
  if (!fs.existsSync(tmpPng)) {
    console.error(`Conversion succeeded but output not found: ${tmpPng}`);
    process.exit(2);
  }

  const outSite = path.join(publicDir, "new-logo.png");
  const outPdf = path.join(publicDir, "logo_pdf.png");

  fs.copyFileSync(tmpPng, outSite);
  fs.copyFileSync(tmpPng, outPdf);
  fs.unlinkSync(tmpPng);

  console.log("Updated:");
  console.log(`- ${outSite}`);
  console.log(`- ${outPdf}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

