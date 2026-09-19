import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/.next/**', '**/coverage/**', 'specs/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Money and quantities are exact. Nothing in this codebase may coerce them
      // through a float, and nothing may reach for Math.round to "fix" a total.
      // See CLAUDE.md non-negotiable #3.
      'no-restricted-globals': [
        'error',
        {
          name: 'parseFloat',
          message: 'Decimal is a string at the boundary. Never parse it as a float.',
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'Number',
          property: 'parseFloat',
          message: 'Decimal is a string at the boundary.',
        },
        {
          object: 'Math',
          property: 'round',
          message: 'Rounding comes from reviewed policy, never from Math.round.',
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // NestJS resolves injected dependencies from `design:paramtypes`, which TypeScript
    // emits from the constructor's parameter types. A type-only import is erased before
    // that metadata is written, so the provider becomes undefined at runtime and the
    // failure appears as an inscrutable DI error, not a compile error.
    files: ['apps/api/**/*.ts'],
    rules: { '@typescript-eslint/consistent-type-imports': 'off' },
  },
);
