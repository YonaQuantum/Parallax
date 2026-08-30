import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    settings: {
      next: {
        rootDir: "apps/web/"
      }
    }
  },
  {
    ignores: [".next/**", "apps/web/.next/**", "node_modules/**", ".tools/**", ".cache/**", ".runtime/**"]
  }
];

export default eslintConfig;
