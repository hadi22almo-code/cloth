import { Box3, Vector3, type Object3D } from "three";

export interface CanonicalFit {
  /** معامل التحجيم الموحّد. */
  scale: number;
  /** الإزاحة **بعد** التحجيم: تضع القدمين على y = 0 وتمركز X و Z. */
  offset: Vector3;
}

/**
 * يجعل أي ملف GLB "يشتغل كما هو".
 *
 * الملفات المصدَّرة من برامج النمذجة تصل بمقاييس عشوائية (سنتيمترات أو
 * بوصات)، وبنقطة أصل عند الرقبة أو عند مركز الشبكة. بدون هذه الدالة يتحوّل
 * تركيب موديل جديد إلى معايرة أرقام سحرية يدوياً.
 */
export function fitToCanonical(
  root: Object3D,
  targetHeight: number,
): CanonicalFit {
  const box = new Box3().setFromObject(root);
  if (box.isEmpty()) {
    return { scale: 1, offset: new Vector3(0, 0, 0) };
  }

  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  const scale = size.y > 1e-6 ? targetHeight / size.y : 1;

  return {
    scale,
    offset: new Vector3(
      -center.x * scale,
      -box.min.y * scale,
      -center.z * scale,
    ),
  };
}
