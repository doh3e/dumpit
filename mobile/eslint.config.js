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
      // 힌트는 라벨만으로 동작이 불분명할 때만 — 라벨마다 힌트를 강제하면 TalkBack 발화만 길어진다
      'react-native-a11y/has-accessibility-hint': 'off',
      'react-native-a11y/has-valid-accessibility-descriptors': 'error',
      // TODO(react-compiler): 기존 코드 4+3+3건 정리 후 error로 복귀 — 접근성 계획 범위 밖
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',
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
