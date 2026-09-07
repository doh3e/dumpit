const { withProjectBuildGradle } = require('expo/config-plugins');

// Expo SDK 57 프리컴파일 모듈(expo.modules.*, host.exp.exponent)은 node_modules 로컬 maven에만 있다.
// 원격 저장소가 429(레이트리밋)를 돌려주면 404와 달리 gradle 해석이 중단된다.
// RN gradle 플러그인(DependencyUtils)이 루트 build.gradle과 별개로 자기 mavenCentral 선언을
// 프로젝트마다 주입하므로, 선언부 수정이 아니라 repositories.all 후킹으로 원격(http) 저장소
// 전부에 content filter를 건다 — 로컬 file:// 저장소(local-maven-repo)는 건드리지 않는다.
// EAS는 prebuild로 android/를 재생성하니 반드시 이 플러그인으로 주입해야 한다
// (2026-09-04 EAS production 빌드 3연속 429 실패 — docs/superpowers/plans/2026-09-04-eas-maven-429-fix.md).
const BLOCK = `
// 프리컴파일 Expo 모듈 그룹은 원격 조회 금지 — plugins/withMavenContentFilter.js가 주입
allprojects {
  repositories.all { repo ->
    if (repo instanceof org.gradle.api.artifacts.repositories.MavenArtifactRepository) {
      def repoUrl = repo.url?.toString() ?: ''
      if (repoUrl.startsWith('http')) {
        repo.content {
          excludeGroupByRegex "expo\\\\.modules\\\\..*"
          excludeGroup "host.exp.exponent"
        }
      }
    }
  }
}
`;

module.exports = function withMavenContentFilter(config) {
  return withProjectBuildGradle(config, (c) => {
    if (!c.modResults.contents.includes('withMavenContentFilter.js가 주입')) {
      c.modResults.contents += BLOCK;
    }
    return c;
  });
};
