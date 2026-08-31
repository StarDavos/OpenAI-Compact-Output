import tseslint from "typescript-eslint";

export default [
  {
    ignores: ["node_modules/**", "dist/**", "web/dist/**", "coverage/**", ".wrangler/**"],
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      "no-debugger": "error",
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "child_process", message: "Compact Code Viewer must never execute user code." },
            { name: "node:child_process", message: "Compact Code Viewer must never execute user code." },
            { name: "vm", message: "Compact Code Viewer must never execute user code." },
            { name: "node:vm", message: "Compact Code Viewer must never execute user code." },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "ImportExpression",
          message: "Dynamic imports are not needed by Compact Code Viewer runtime code.",
        },
      ],
    },
  },
  {
    files: ["worker/**/*.ts"],
    rules: {
      "no-console": "error",
      "no-restricted-globals": [
        "error",
        {
          name: "fetch",
          message: "Compact Code Viewer Worker must not make outbound network requests.",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "fs", message: "Cloudflare Worker runtime must not use filesystem APIs." },
            { name: "path", message: "Cloudflare Worker runtime must not depend on OS path APIs." },
            { name: "child_process", message: "Compact Code Viewer must never execute user code." },
            { name: "vm", message: "Compact Code Viewer must never execute user code." },
          ],
          patterns: [
            {
              group: ["node:*"],
              message: "Cloudflare Worker runtime intentionally disables Node compatibility APIs.",
            },
          ],
        },
      ],
    },
  },
];
