import eslint from "@eslint/js";
import boundaries from "eslint-plugin-boundaries";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/.next/**",
      "**/coverage/**",
      "**/node_modules/**",
      "**/playwright-report/**",
      "**/test-results/**",
      "**/.turbo/**",
      "pnpm-lock.yaml",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,mjs,ts,tsx}"],
    plugins: {
      boundaries,
    },
    settings: {
      "boundaries/elements": [
        { type: "web", pattern: "apps/web/src/**" },
        { type: "e2e", pattern: "apps/e2e/**" },
        { type: "contracts", pattern: "packages/contracts/src/**" },
        { type: "ui", pattern: "packages/ui/src/**" },
        { type: "db-types", pattern: "packages/db-types/src/**" },
        { type: "config", pattern: "packages/config/**" },
      ],
      "boundaries/include": ["apps/**", "packages/**"],
    },
    rules: {
      "boundaries/element-types": [
        "error",
        {
          default: "disallow",
          rules: [
            { from: "web", allow: ["contracts", "ui", "db-types"] },
            { from: "e2e", allow: [] },
            { from: "contracts", allow: [] },
            { from: "ui", allow: ["contracts"] },
            { from: "db-types", allow: [] },
            { from: "config", allow: [] },
          ],
        },
      ],
    },
  },
);
