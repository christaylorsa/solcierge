import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FlatCompat } from '@eslint/eslintrc'

// Flat config so `npm run lint` runs non-interactively. next/core-web-vitals plus the
// TypeScript rules Next ships.
const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) })

export default [
  { ignores: ['.next/**', '.next-check/**', '.next-preview/**', 'node_modules/**', 'public/**', 'next-env.d.ts'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      // Stylistic only: React escapes text children, and the copy uses real apostrophes.
      'react/no-unescaped-entities': 'off',
      // One plain <a> to a legal page; a full navigation there is harmless.
      '@next/next/no-html-link-for-pages': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
]
