// mobile/eslint.config.js
const expoConfig = require('eslint-config-expo/flat');
const a11y = require('eslint-plugin-react-native-a11y');

module.exports = [
  ...expoConfig,
  { ignores: ['node_modules', 'android', 'release', '.expo'] },
  {
    files: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
    plugins: { 'react-native-a11y': a11y },
    rules: {
      ...a11y.configs.basic.rules,
      'react-native-a11y/has-valid-accessibility-descriptors': 'error',
      'no-restricted-imports': ['error', {
        patterns: [{ group: ['**/theme/typography'], message: '화면 코드는 useTheme().fonts를 쓴다' }],
      }],
    },
  },
  {
    files: ['src/theme/**', 'src/widget/**'],
    rules: { 'no-restricted-imports': 'off' },
  },
];
