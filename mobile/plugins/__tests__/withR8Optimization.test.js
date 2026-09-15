const { withAppBuildGradle, withGradleProperties } = require('expo/config-plugins');
const withR8Optimization = require('../withR8Optimization');

jest.mock('expo/config-plugins', () => ({
  withAppBuildGradle: jest.fn((config, action) =>
    action({
      ...config,
      modResults: {
        language: config.language ?? 'groovy',
        contents: config.contents,
      },
    }),
  ),
  withGradleProperties: jest.fn((config, action) => {
    const result = action({
      ...config,
      modResults: config.gradleProperties ?? [],
    });
    return { ...config, gradleProperties: result.modResults };
  }),
}));

function runConfig(contents, language = 'groovy', gradleProperties = []) {
  return withR8Optimization({ contents, language, gradleProperties });
}

function run(contents, language = 'groovy') {
  return runConfig(contents, language).modResults.contents;
}

beforeEach(() => {
  withAppBuildGradle.mockClear();
  withGradleProperties.mockClear();
});

test('release 기본 규칙만 optimize 규칙으로 바꾸고 다른 빌드 타입과 규칙은 보존한다', () => {
  const source = `android {
    buildTypes {
        debug {
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "debug-rules.pro"
        }
        release {
            signingConfig signingConfigs.debug
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
        }
    }
}`;

  const result = run(source);

  expect(result).toContain(
    'debug {\n            proguardFiles getDefaultProguardFile("proguard-android.txt"), "debug-rules.pro"',
  );
  expect(result).toContain(
    'release {\n            signingConfig signingConfigs.debug\n            proguardFiles getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro"',
  );
  expect(withAppBuildGradle).toHaveBeenCalledTimes(1);
});

test('작은따옴표 Gradle 호출도 release 블록에서 교체한다', () => {
  const source = `android {
    buildTypes {
        release {
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}`;

  expect(run(source)).toContain(
    "getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'",
  );
});

test('이미 optimize 규칙을 쓰면 결과가 동일하다', () => {
  const source = `android {
    buildTypes {
        release {
            proguardFiles getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro"
        }
    }
}`;

  expect(run(source)).toBe(source);
});

test('release에 optimize와 legacy 호출이 함께 있으면 legacy 호출도 교체한다', () => {
  const source = `android {
    buildTypes {
        release {
            proguardFiles getDefaultProguardFile("proguard-android-optimize.txt"), "first.pro"
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "second.pro"
        }
    }
}`;

  const result = run(source);

  expect(result).not.toContain('getDefaultProguardFile("proguard-android.txt")');
  expect(result.match(/getDefaultProguardFile\("proguard-android-optimize\.txt"\)/g)).toHaveLength(2);
});

test('release의 중복 legacy 호출을 모두 교체한다', () => {
  const source = `android {
    buildTypes {
        release {
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'first.pro'
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "second.pro"
        }
    }
}`;

  const result = run(source);

  expect(result).not.toMatch(/getDefaultProguardFile\(['"]proguard-android\.txt['"]\)/);
  expect(result.match(/proguard-android-optimize\.txt/g)).toHaveLength(2);
});

test('지원하지 않는 Gradle 언어는 설명 가능한 오류로 실패한다', () => {
  expect(() => run('android {}', 'kotlin')).toThrow(
    'withR8Optimization supports only Groovy app build.gradle files',
  );
});

test('release 블록에 기본 또는 optimize 호출이 없으면 설명 가능한 오류로 실패한다', () => {
  const source = `android {
    buildTypes {
        release {
            minifyEnabled true
        }
    }
}`;

  expect(() => run(source)).toThrow(
    'withR8Optimization could not find a supported default ProGuard file in the release build type',
  );
});

test('Google Play Services Auth 버전 속성이 없으면 R8 호환 버전을 추가한다', () => {
  const source = `android {
    buildTypes {
        release {
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
        }
    }
}`;

  const result = runConfig(source);

  expect(result.gradleProperties).toEqual([
    { type: 'property', key: 'googlePlayServicesAuthVersion', value: '21.5.1' },
  ]);
  expect(withGradleProperties).toHaveBeenCalledTimes(1);
});

test('stale·중복 Auth override만 하나로 정리하고 unrelated 속성과 재실행 결과를 보존한다', () => {
  const source = `android {
    buildTypes {
        release {
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
        }
    }
}`;
  const properties = [
    { type: 'property', key: 'org.gradle.jvmargs', value: '-Xmx4g' },
    { type: 'property', key: 'googlePlayServicesAuthVersion', value: '21.5.0' },
    { type: 'comment', value: 'keep this comment' },
    { type: 'property', key: 'googlePlayServicesAuthVersion', value: '20.7.0' },
  ];

  const first = runConfig(source, 'groovy', properties);
  const second = runConfig(first.modResults.contents, 'groovy', first.gradleProperties);

  expect(first.gradleProperties).toEqual([
    { type: 'property', key: 'org.gradle.jvmargs', value: '-Xmx4g' },
    { type: 'comment', value: 'keep this comment' },
    { type: 'property', key: 'googlePlayServicesAuthVersion', value: '21.5.1' },
  ]);
  expect(second.gradleProperties).toEqual(first.gradleProperties);
  expect(second.modResults.contents).toBe(first.modResults.contents);
});
