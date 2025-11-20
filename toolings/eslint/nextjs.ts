import nextVitals from "eslint-config-next/core-web-vitals";
import { defineConfig } from "eslint/config";

export const nextjsConfig = defineConfig({
  files: ["**/*.ts", "**/*.tsx"],
  ...nextVitals,
  rules: {
    "@next/next/no-duplicate-head": "off",
  },
});
