import { defineConfig } from "eslint/config";

import { baseConfig } from "@trycompai/eslint-config/base";
import { nextjsConfig } from "@trycompai/eslint-config/nextjs";
import { reactConfig } from "@trycompai/eslint-config/react";

export default defineConfig(
  {
    ignores: [".next/**"],
  },
  baseConfig,
  reactConfig,
  nextjsConfig
);
