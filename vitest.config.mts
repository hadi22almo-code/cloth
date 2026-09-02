import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // اختبارات دوال خالصة فقط — لا DOM ولا three
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
