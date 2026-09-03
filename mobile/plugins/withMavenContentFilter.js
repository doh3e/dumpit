const { withProjectBuildGradle } = require('expo/config-plugins');

// Expo SDK 57 프리컴파일 모듈(expo.modules.*, host.exp.exponent)은 node_modules 로컬 maven에만 있다.
// 원격 저장소가 429(레이트리밋)를 돌려주면 404와 달리 gradle 해석이 중단되므로 조회 자체를 차단한다.
// EAS는 prebuild로 android/를 재생성하니 반드시 이 플러그인으로 주입해야 한다
// (2026-09-04 EAS production 빌드 2연속 실패 — docs/superpowers/plans/2026-09-04-eas-maven-429-fix.md).
const EXCLUDES = [
  '      content {',
  '        excludeGroupByRegex "expo\\\\.modules\\\\..*"',
  '        excludeGroup "host.exp.exponent"',
  '      }',
].join('\n');

function addContentFilters(gradle) {
  if (gradle.includes('excludeGroupByRegex "expo')) return gradle; // 이미 적용됨
  return gradle
    .replace(/mavenCentral\(\)/g, `mavenCentral {\n${EXCLUDES}\n    }`)
    .replace(/maven \{ url 'https:\/\/www\.jitpack\.io' \}/g,
      `maven {\n      url 'https://www.jitpack.io'\n${EXCLUDES}\n    }`);
}

module.exports = function withMavenContentFilter(config) {
  return withProjectBuildGradle(config, (c) => {
    c.modResults.contents = addContentFilters(c.modResults.contents);
    return c;
  });
};
