/** مخزن صور المنتجات — عام، تُقرأ صوره مباشرةً في متصفّح الزبون. */
export const PRODUCT_BUCKET = "products";

/** ٥ ميغابايت: صورة منتج معالَجة لا تتجاوز مئات الكيلوبايتات عادةً. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const ALLOWED_IMAGE_EXT = ["jpg", "png", "webp"] as const;
