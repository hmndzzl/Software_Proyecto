import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-useless-assignment': 'off',
      'react-hooks/rules-of-hooks': 'error',
    },
  },
  // DT-10: el estado de autenticación se lee solo con useAuth(); sessionStore.ts es el único
  // módulo que toca localStorage (las pruebas pueden sembrarlo para preparar escenarios).
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/auth/sessionStore.ts', 'src/**/*.test.{ts,tsx}', 'src/**/__tests__/**'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'localStorage', message: 'Usa useAuth() (o sessionStore en código fuera de React). Ver DT-10.' },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'window', property: 'localStorage', message: 'Usa useAuth() (o sessionStore en código fuera de React). Ver DT-10.' },
      ],
    },
  },
);
