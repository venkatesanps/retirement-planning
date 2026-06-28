import next from 'eslint-config-next';
import nextCWV from 'eslint-config-next/core-web-vitals';
import nextTS from 'eslint-config-next/typescript';

const config = [
  ...next,
  ...nextCWV,
  ...nextTS,
  {
    ignores: ['.next/**', 'out/**', 'node_modules/**'],
  },
];

export default config;
