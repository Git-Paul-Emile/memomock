import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

/**
 * Configuration Vitest minimale pour le frontend Next.js (App Router).
 *
 * On réutilise l'alias `@/*` défini dans tsconfig.json (voir `resolve.alias` ci-dessous) pour
 * que les tests puissent importer le code applicatif exactement comme le fait l'application
 * (`@/lib/utils`, `@/hooks/...`), sans dupliquer la configuration des chemins.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    css: false,
    exclude: ["node_modules/**", ".next/**"],
  },
});
