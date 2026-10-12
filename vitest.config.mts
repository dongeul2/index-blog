import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * 단위 테스트 — 순수 함수와 동기 컴포넌트만.
 * async 서버 컴포넌트와 DB·RLS가 얽힌 흐름은 Vitest가 다루지 못하므로 `e2e/`(Playwright)가 맡습니다.
 * 기본 환경은 node이고, DOM이 필요한 파일만 첫 줄에 `@vitest-environment jsdom`을 적습니다.
 */
export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/components/**"],
      reporter: ["text-summary", "json-summary", "html"],
    },
  },
});
