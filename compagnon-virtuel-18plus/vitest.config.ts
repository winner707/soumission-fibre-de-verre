import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Tests unitaires : aucune base, aucun appel réseau.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    env: {
      ANTHROPIC_API_KEY: "test-unitaire",
      ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
      DATABASE_URL: "postgresql://test@localhost/test",
    },
  },
});
