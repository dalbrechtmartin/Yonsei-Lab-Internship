import pluginVue from "eslint-plugin-vue";
import { withVueTs, vueTsConfigs } from "@vue/eslint-config-typescript";
import eslintConfigPrettier from "eslint-config-prettier";

export default withVueTs(
  { ignores: ["dist/**", "dist-ssr/**", "node_modules/**"] },
  pluginVue.configs["flat/essential"],
  vueTsConfigs.recommended,
  eslintConfigPrettier,
  {
    rules: {
      // A leading underscore is this codebase's existing convention for a
      // deliberately-unused binding (e.g. a stub function kept for its
      // signature) -- recognize it instead of forcing awkward renames.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // `any` shows up mainly at real type-system boundaries (ECharts'
      // untyped internals, third-party API responses) -- worth tightening
      // over time, but not a correctness bug, so it doesn't block `lint`.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    // shadcn-vue's own CLI (`npx shadcn-vue add <component>`) scaffolds
    // these single-word names -- renaming them would fight the tool every
    // time a component is re-added or updated.
    files: ["src/components/ui/**/*.vue"],
    rules: {
      "vue/multi-word-component-names": "off",
    },
  },
);
