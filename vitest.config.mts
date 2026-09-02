import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // نفس الاسم المستعار في tsconfig، ليعمل استيراد "@/lib/..." داخل الاختبارات
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      // انظر التعليق داخل الملف: الحزمة الأصلية ترمي خطأً خارج سياق الخادم
      "server-only": fileURLToPath(
        new URL("./test/stubs/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    // منطق خالص وطبقة طلبات بعملاء مُقلَّدين — لا DOM ولا three
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
