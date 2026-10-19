import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Datumlogica hangt af van de lokale tijdzone; vastzetten op die van de school
// zodat de tests overal hetzelfde resultaat geven.
process.env.TZ = "Europe/Brussels";

export default defineConfig({
  resolve: {
    alias: [
      {
        // In de browser komt ical.js uit public/vendor (gekopieerd door
        // scripts/copy-vendor.js); in de tests rechtstreeks uit node_modules.
        find: /^\.\.\/vendor\/ical\.min\.js$/,
        replacement: fileURLToPath(new URL("node_modules/ical.js/dist/ical.js", import.meta.url)),
      },
    ],
  },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.js"],
    restoreMocks: true,
    unstubGlobals: true,
    coverage: {
      include: ["public/js/**/*.js", "netlify/functions/**/*.js"],
    },
  },
});
