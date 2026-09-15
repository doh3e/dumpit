const { withAppBuildGradle, withGradleProperties } = require('expo/config-plugins');

const AUTH_VERSION_KEY = 'googlePlayServicesAuthVersion';
const AUTH_VERSION = '21.5.1';

function findBlock(contents, name, from = 0, to = contents.length) {
  const match = new RegExp(`\\b${name}\\s*\\{`, 'g');
  match.lastIndex = from;
  const found = match.exec(contents);
  if (!found || found.index >= to) {
    return null;
  }

  const start = contents.indexOf('{', found.index);
  let depth = 1;
  for (let index = start + 1; index < to; index += 1) {
    if (contents[index] === '{') depth += 1;
    if (contents[index] === '}') depth -= 1;
    if (depth === 0) return { start, end: index };
  }
  return null;
}

module.exports = function withR8Optimization(config) {
  const configWithAuthVersion = withGradleProperties(config, (gradleConfig) => {
    gradleConfig.modResults = gradleConfig.modResults.filter(
      (property) => property.type !== 'property' || property.key !== AUTH_VERSION_KEY,
    );
    // Google 2026-02-18 notes: play-services-auth 21.5.1 fixes ProGuard build/runtime failures.
    // https://developers.google.com/android/guides/releases#february_18_2026
    gradleConfig.modResults.push({
      type: 'property',
      key: AUTH_VERSION_KEY,
      value: AUTH_VERSION,
    });
    return gradleConfig;
  });

  return withAppBuildGradle(configWithAuthVersion, (appConfig) => {
    if (appConfig.modResults.language !== 'groovy') {
      throw new Error('withR8Optimization supports only Groovy app build.gradle files');
    }

    const contents = appConfig.modResults.contents;
    const buildTypes = findBlock(contents, 'buildTypes');
    const release = buildTypes && findBlock(contents, 'release', buildTypes.start + 1, buildTypes.end);
    if (!release) {
      throw new Error(
        'withR8Optimization could not find a supported default ProGuard file in the release build type',
      );
    }

    const releaseContents = contents.slice(release.start + 1, release.end);
    const defaultRule = /getDefaultProguardFile\(\s*(['"])proguard-android\.txt\1\s*\)/g;
    const optimizeRule = /getDefaultProguardFile\(\s*(['"])proguard-android-optimize\.txt\1\s*\)/;
    const hasDefaultRule = defaultRule.test(releaseContents);
    defaultRule.lastIndex = 0;
    if (!hasDefaultRule) {
      if (optimizeRule.test(releaseContents)) {
        return appConfig;
      }
      throw new Error(
        'withR8Optimization could not find a supported default ProGuard file in the release build type',
      );
    }

    const optimizedRelease = releaseContents.replace(
      defaultRule,
      (_match, quote) => `getDefaultProguardFile(${quote}proguard-android-optimize.txt${quote})`,
    );
    appConfig.modResults.contents =
      contents.slice(0, release.start + 1) + optimizedRelease + contents.slice(release.end);
    return appConfig;
  });
};
