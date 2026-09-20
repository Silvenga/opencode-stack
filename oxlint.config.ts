import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["typescript"],
  env: {
    node: true,
    es2020: true,
  },
  categories: {
    correctness: "warn",
  },
  ignorePatterns: ["dist", "coverage"],
  rules: {
    curly: ["warn", "all", "consistent"],
  },
});
