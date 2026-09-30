import { FlatCompat } from "@eslint/eslintrc";
import { createRequire } from "node:module";
import { dirname } from "node:path";

const require = createRequire(import.meta.url);
const compat = new FlatCompat({ baseDirectory: import.meta.dirname, resolvePluginsRelativeTo: dirname(require.resolve("eslint-config-next")) });

const config = [
  { ignores: [".next/**", "node_modules/**", "public/sw.js", ".android-tools/**", "android-driver/**", "artifacts/**"] },
  ...compat.extends("next/core-web-vitals"),
  { rules: { "@next/next/no-img-element": "off", "react-hooks/exhaustive-deps": "off" } },
];

export default config;
