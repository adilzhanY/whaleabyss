import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  // No @vitejs/plugin-react: its current release peer-depends on Babel 8 while
  // the app tree is on Babel 7. Tests don't need fast-refresh - vitest's own
  // transformer compiles TSX with the automatic runtime just fine.
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/__tests__/**/*.test.{ts,tsx}"],
    globals: false,
  },
});
