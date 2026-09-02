"use client";

import { Suspense, forwardRef, useEffect, useMemo } from "react";
import { useGLTF, useTexture } from "@react-three/drei";
import {
  DoubleSide,
  ExtrudeGeometry,
  SRGBColorSpace,
  Shape,
  TorusGeometry,
  type BufferGeometry,
  type Group,
  type Material,
  type Mesh,
  type MeshStandardMaterial,
  type Object3D,
} from "three";
import { SkeletonUtils } from "three/examples/jsm/Addons.js";
import { fitToCanonical } from "@/lib/normalize-object";

/* ══════════════════ الواجهة العامة — مجمّدة ══════════════════
 *
 * هذا الملف هو المكان **الوحيد** الذي يعرف إن كان القميص مولّداً بالكود أو
 * محمّلاً من ملف GLB. تبديل المصدر لاحقاً لا يغيّر أي ملف آخر.
 *
 * الإطار المرجعي المتّفق عليه: القدمان على y = 0، الوجه نحو +Z، الارتفاع
 * يساوي TEE_HEIGHT، ومركز X و Z على الصفر.
 */

/** ارتفاع القميص بوحدات العالم بعد التطبيع. */
export const TEE_HEIGHT = 1;

/** الجهة التي يواجهها الموديل بعد التطبيع. */
export const TEE_FACING = "+Z" as const;

export interface TShirtModelProps {
  /** لون القماش بصيغة hex. */
  color: string;
  roughness?: number;
  castShadow?: boolean;
  /**
   * صورة حقيقية لهذا اللون. عند وجودها تحلّ محلّ المجسّم في خانته على الحلقة —
   * الزبون يشتري القماش الذي رآه لا تقريباً مولّداً له.
   */
  image?: string;
  /**
   * "auto" يتبع علم NEXT_PUBLIC_USE_GLB. "placeholder" يفرض المجسّم المولّد —
   * تستخدمه حدود الخطأ بعد فشل تحميل الملف حتى يبقى المشهد حيّاً.
   */
  source?: "auto" | "placeholder";
}

/**
 * شروط ملف الـGLB حتى يعمل بلا تعديل كود:
 * - محور Y للأعلى، والوجه نحو +Z.
 * - لون أساس أبيض أو رمادي بلا نسيج ملوّن مخبوز، وإلا لن يتغيّر اللون.
 * - يفضّل بلا ضغط Draco (وإلا يلزم نسخ ملفات فكّ الضغط إلى public/draco).
 */
const GLB_URL = "/models/tshirt.glb";
const USE_GLB = process.env.NEXT_PUBLIC_USE_GLB === "1";

/**
 * التحميل المسبق محجوب خلف العلم: استدعاؤه والملف غير موجود يعطي 404
 * يُخزَّن في كاش suspend-react ويعطّل هذا الرابط لبقية الجلسة.
 */
export function preloadTee(): void {
  if (USE_GLB) useGLTF.preload(GLB_URL);
}

/* ══════════════════ الداخل: المجسّم المولّد بالكود ══════════════════ */

/**
 * الشكل الظلّي الكامل للقميص كمخطّط ثنائي الأبعاد واحد: الجذع، الكمّان،
 * ميل الكتفين، وفتحة الرقبة. الحواف المائلة (bevel) في البثق هي ما يحوّل
 * القصاصة المسطّحة إلى شيء يمسك الضوء فيُقرأ كقماش لا كورق مقوّى.
 */
function buildTeeShape(): Shape {
  const s = new Shape();

  const hem = 0;
  const bodyHalf = 0.26;
  const armpitY = 0.54;
  const sleeveOuterHalf = 0.46;
  const shoulderY = 0.86;
  const neckHalf = 0.12;
  const neckY = 0.9;

  // الجهة اليمنى صعوداً
  s.moveTo(bodyHalf, hem);
  s.quadraticCurveTo(bodyHalf + 0.02, 0.28, bodyHalf + 0.01, armpitY);
  // إبط مقعّر ثم خروج إلى طرف الكمّ
  s.quadraticCurveTo(bodyHalf + 0.05, armpitY + 0.06, sleeveOuterHalf, 0.62);
  s.lineTo(sleeveOuterHalf - 0.02, 0.76);
  // ميل الكتف نحو الرقبة
  s.quadraticCurveTo(0.36, shoulderY, 0.3, shoulderY + 0.02);
  s.lineTo(neckHalf, neckY);
  // فتحة الرقبة تنزل للأسفل
  s.quadraticCurveTo(0, neckY - 0.09, -neckHalf, neckY);
  // مرآة الجهة اليسرى نزولاً
  s.lineTo(-0.3, shoulderY + 0.02);
  s.quadraticCurveTo(-0.36, shoulderY, -(sleeveOuterHalf - 0.02), 0.76);
  s.lineTo(-sleeveOuterHalf, 0.62);
  s.quadraticCurveTo(
    -(bodyHalf + 0.05),
    armpitY + 0.06,
    -(bodyHalf + 0.01),
    armpitY,
  );
  s.quadraticCurveTo(-(bodyHalf + 0.02), 0.28, -bodyHalf, hem);
  // ذيل منحنٍ قليلاً بدل خط مستقيم
  s.quadraticCurveTo(0, hem - 0.04, bodyHalf, hem);

  return s;
}

/**
 * تُبنى مرة واحدة على مستوى الوحدة، لا داخل hook: بناؤها في useMemo يعني
 * نسخة في ذاكرة كرت الشاشة لكل قميص على الحلقة.
 */
const TORSO_GEOMETRY: BufferGeometry = (() => {
  const geo = new ExtrudeGeometry(buildTeeShape(), {
    depth: 0.24,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.06,
    bevelSegments: 4,
    curveSegments: 20,
  });
  geo.center();
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const height = bb.max.y - bb.min.y;
  const k = TEE_HEIGHT / height;
  geo.scale(k, k, k);
  geo.translate(0, TEE_HEIGHT / 2, 0);
  geo.computeVertexNormals();
  return geo;
})();

/** الياقة المضلّعة: حلقة واحدة تُقرأ فوراً كرقبة قميص. */
const COLLAR_GEOMETRY = new TorusGeometry(0.132, 0.032, 10, 32);
const COLLAR_Y = 0.955 * TEE_HEIGHT;

function PlaceholderTee({
  color,
  roughness = 0.85,
  castShadow = true,
}: TShirtModelProps) {
  return (
    <>
      <mesh geometry={TORSO_GEOMETRY} castShadow={castShadow} receiveShadow>
        <meshStandardMaterial
          color={color}
          roughness={roughness}
          metalness={0}
          transparent
        />
      </mesh>
      <mesh
        geometry={COLLAR_GEOMETRY}
        position={[0, COLLAR_Y, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        castShadow={castShadow}
      >
        <meshStandardMaterial
          color={color}
          roughness={Math.min(1, roughness + 0.08)}
          metalness={0}
          transparent
        />
      </mesh>
    </>
  );
}

/* ══════════════════ الداخل: الموديل المحمّل من GLB ══════════════════ */

interface TeePart {
  key: string;
  geometry: BufferGeometry;
  roughness: number;
  metalness: number;
}

function extractParts(root: Object3D): {
  parts: TeePart[];
  skinned: boolean;
} {
  const parts: TeePart[] = [];
  let skinned = false;
  let i = 0;

  root.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh) return;
    if ((obj as unknown as { isSkinnedMesh?: boolean }).isSkinnedMesh) {
      skinned = true;
    }
    const src = mesh.material as MeshStandardMaterial | undefined;
    parts.push({
      key: `${mesh.name || "part"}-${i++}`,
      geometry: mesh.geometry,
      roughness: src?.roughness ?? 0.85,
      metalness: src?.metalness ?? 0,
    });
  });

  return { parts, skinned };
}

/**
 * المسار المفضّل: نستخرج الهندسة مرة واحدة ونرسمها إعلانياً.
 *
 * لماذا لا نستنسخ المشهد؟ لأن للكائن أباً واحداً فقط — تكرار
 * `<primitive object={scene}/>` يعيد ربط نفس الكائن فيظهر قميص واحد لا عشرة.
 * ولأن clone(true) يشارك **المادة** بالمرجع، فتلوين نسخة يلوّث بقية النسخ
 * ويلوّث كاش useGLTF العالمي الذي يبقى بعد إزالة المكوّن.
 *
 * بهذا المسار: الهندسة (الثقيلة) مشتركة، والمواد يُنشئها R3F لكل نسخة
 * ويتخلّص منها تلقائياً.
 */
function GltfTee({
  color,
  roughness,
  castShadow = true,
}: TShirtModelProps) {
  const { scene } = useGLTF(GLB_URL);
  const { parts, skinned } = useMemo(() => extractParts(scene), [scene]);
  const fit = useMemo(() => fitToCanonical(scene, TEE_HEIGHT), [scene]);

  if (skinned) return <SkinnedTee color={color} roughness={roughness} castShadow={castShadow} />;

  return (
    <group scale={fit.scale} position={fit.offset}>
      {parts.map((p) => (
        <mesh
          key={p.key}
          geometry={p.geometry}
          castShadow={castShadow}
          receiveShadow
        >
          <meshStandardMaterial
            color={color}
            roughness={roughness ?? p.roughness}
            metalness={p.metalness}
            transparent
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * فرع الموديل ذي الهيكل العظمي (قميص مُلبَس على رِج مخفي).
 * المسار الإعلاني يُسقط التشويه الهيكلي، ونسخة clone العادية تُبقي عظام
 * كل النسخ مرتبطة بالهيكل الأصلي — لذا SkeletonUtils.clone هنا تحديداً،
 * مع استنساخ المواد يدوياً والتخلّص منها عند الإزالة.
 */
function SkinnedTee({ color, roughness, castShadow = true }: TShirtModelProps) {
  const { scene } = useGLTF(GLB_URL);

  const { object, materials } = useMemo(() => {
    const clone = SkeletonUtils.clone(scene);
    const mats: MeshStandardMaterial[] = [];
    clone.traverse((obj) => {
      const mesh = obj as Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = castShadow;
      mesh.receiveShadow = true;
      const cloned = (mesh.material as Material).clone() as MeshStandardMaterial;
      cloned.transparent = true;
      mesh.material = cloned;
      mats.push(cloned);
    });
    return { object: clone, materials: mats };
  }, [scene, castShadow]);

  useEffect(() => () => materials.forEach((m) => m.dispose()), [materials]);

  useEffect(() => {
    materials.forEach((m) => {
      m.color.set(color);
      if (roughness !== undefined) m.roughness = roughness;
    });
  }, [materials, color, roughness]);

  const fit = useMemo(() => fitToCanonical(object, TEE_HEIGHT), [object]);

  return (
    <group scale={fit.scale} position={fit.offset}>
      <primitive object={object} />
    </group>
  );
}

/* ══════════════════ الداخل: صورة حقيقية ══════════════════ */

/**
 * لوحة مسطّحة تحمل صورة المنتج، بارتفاع القميص نفسه وبعرض يتبع نسبة الصورة.
 *
 * `meshBasicMaterial` لا `standard`: الصورة تحمل إضاءتها المصوَّرة أصلاً،
 * وإعادة إضاءتها في المشهد تُفسد ألوانها. و`DoubleSide` ليظهر ظهرها حين تدور
 * الخانة إلى الخلف بدل أن تختفي.
 */
function PhotoTee({ image }: { image: string }) {
  const texture = useTexture(image);
  texture.colorSpace = SRGBColorSpace;

  const source = texture.image as { width?: number; height?: number } | undefined;
  const ratio =
    source?.width && source?.height ? source.width / source.height : 0.8;

  const height = TEE_HEIGHT * 1.08;
  const width = height * ratio;

  return (
    <mesh position={[0, height / 2, 0]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        map={texture}
        transparent
        // الصور المفرّغة (PNG بخلفية شفافة) لا تُرسم حوافها كمستطيل
        alphaTest={0.04}
        toneMapped={false}
        side={DoubleSide}
      />
    </mesh>
  );
}

/* ══════════════════ المكوّن المُصدَّر ══════════════════ */

const TeeInternal = USE_GLB ? GltfTee : PlaceholderTee;

export const TShirtModel = forwardRef<Group, TShirtModelProps>(
  function TShirtModel({ source = "auto", image, ...rest }, ref) {
    const Internal = source === "placeholder" ? PlaceholderTee : TeeInternal;
    return (
      <group ref={ref}>
        {image ? (
          // المجسّم يظهر ريثما تصل الصورة، فلا تفرغ الخانة أثناء التحميل
          <Suspense fallback={<Internal {...rest} />}>
            <PhotoTee image={image} />
          </Suspense>
        ) : (
          <Internal {...rest} />
        )}
      </group>
    );
  },
);

/** أداة مساعدة: يجمع مواد قميص واحد لتحريك الشفافية بالطفرة داخل useFrame. */
export function collectMaterials(root: Object3D): MeshStandardMaterial[] {
  const out: MeshStandardMaterial[] = [];
  root.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const mat = mesh.material as MeshStandardMaterial | MeshStandardMaterial[];
    if (Array.isArray(mat)) out.push(...mat);
    else out.push(mat);
  });
  return out;
}
