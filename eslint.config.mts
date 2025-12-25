import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
    plugins: { js },
    extends: ['js/recommended'],
    languageOptions: { globals: globals.browser },
  },
  { files: ['**/*.js'], languageOptions: { sourceType: 'commonjs' } },
  tseslint.configs.recommended,
  {
    files: ['**/*.{ts,mts,cts}'], // Target only TypeScript files
    rules: {
      // Your new rules:
      'max-lines-per-function': ['error', 80],
      'max-params': ['error', 5],
      'max-classes-per-file': ['error', 4],
      complexity: 'off',
    },
  },
]);
