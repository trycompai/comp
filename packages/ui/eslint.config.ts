import { defineConfig } from "eslint/config";

import { baseConfig } from "@trycompai/eslint-config/base";
import { reactConfig } from "@trycompai/eslint-config/react";

export default defineConfig(
  {
    ignores: ["dist/**"],
  },
  baseConfig,
  reactConfig,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
    },
  }
);
