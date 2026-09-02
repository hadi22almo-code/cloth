/** مخزن إيصالات التحويل — خاص، لا قراءة عامّة له. */
export const RECEIPT_BUCKET = "receipts";

export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

export interface SniffedType {
  mime: string;
  ext: string;
}

function startsWith(bytes: Uint8Array, sig: number[], offset = 0): boolean {
  if (bytes.length < offset + sig.length) return false;
  return sig.every((b, i) => bytes[offset + i] === b);
}

/**
 * يستنتج النوع من بايتات الملف نفسه.
 *
 * ترويسة `Content-Type` داخل الطلب يكتبها المرسِل، فالوثوق بها يعني تخزين أي
 * بايتات باسم صورة، ثم إعادة تقديمها للمدير بنفس الترويسة المزوّرة حين يفتح
 * الرابط الموقّع. لذا نقرأ التوقيع الفعلي ونتجاهل ما ادّعاه العميل.
 */
export function sniffReceipt(bytes: Uint8Array): SniffedType | null {
  // JPEG: FF D8 FF
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { mime: "image/png", ext: "png" };
  }
  // WEBP: "RIFF" ???? "WEBP"
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return { mime: "image/webp", ext: "webp" };
  }
  // PDF: "%PDF-"
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return { mime: "application/pdf", ext: "pdf" };
  }
  return null;
}
