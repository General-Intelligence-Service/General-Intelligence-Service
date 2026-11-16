/** تحقق من magic bytes لـ JPEG / PNG / WEBP فقط (رفض SVG وGIF وغيرها) */

export type AllowedImageKind = "jpeg" | "png" | "webp";

export function detectImageKind(buf: Buffer): AllowedImageKind | null {
  if (buf.length < 12) return null;

  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";

  // PNG
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return "png";
  }

  // WEBP: RIFF....WEBP
  if (
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "webp";
  }

  return null;
}

export function extensionForKind(kind: AllowedImageKind): string {
  if (kind === "jpeg") return "jpg";
  if (kind === "png") return "png";
  return "webp";
}

export function mimeForKind(kind: AllowedImageKind): string {
  if (kind === "jpeg") return "image/jpeg";
  if (kind === "png") return "image/png";
  return "image/webp";
}
