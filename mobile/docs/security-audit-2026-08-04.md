# 모바일 앱 보안 감사 리포트 (2026-08-04)

- **대상**: `mobile/` — React Native 0.86 + Expo SDK 57, Android, `kr.dumpit.mobile`
- **기준 커밋**: mobile 브랜치 `eeeaf27`
- **범위**: 앱단 전체(빌드 설정·매니페스트, JS/TS 애플리케이션 계층, 네이티브 위젯 모듈).
  백엔드·웹 프론트엔드·데스크탑 앱은 별도 감사 완료분이라 이번 범위에서 제외.
- **목적**: 구글 플레이 스토어 제출 전 보안 게이트

## 방법

3개 축으로 병렬 정적 분석을 돌린 뒤, 도출된 후보 전건을 별도 검증자에게 **반증(refute) 과제**로
넘겨 교차 검증했다. 신뢰도 8/10 이상으로 살아남은 것만 취약점으로 채택하는 기준을 적용했다.

| 축 | 검사 대상 |
| --- | --- |
| A. 빌드·설정·매니페스트 | `app.config.ts`, `eas.json`, `scripts/`, prebuild 산출 매니페스트, gradle 설정, 권한·exported 컴포넌트·cleartext·debuggable |
| B. JS/TS 계층 | `src/`, `app/` 전체 — 토큰 저장·전송, 로깅, WebView, 딥링크, 푸시 페이로드, 동적 실행, TLS |
| C. 네이티브 위젯 모듈 | `modules/dumpit-widget/` Kotlin 전체 — 인텐트·PendingIntent, 리시버/서비스 노출, 위젯 저장소, JS 브리지 |

## 결론

**확정 취약점 0건.** 후보 3건이 나왔으나 검증 결과 모두 "실제 공격 경로 없음 = 취약점 아님"
(하드닝 또는 스토어 정책 항목)으로 판정됐다. 세 건 모두 선제 보완을 마쳤다.

## 통과 항목

| 영역 | 확인 내용 |
| --- | --- |
| 토큰 저장 | JS가 JWT·리프레시 토큰을 저장하지 않음. 인증은 서버 세션 쿠키(`withCredentials`)로만 유지되고 플랫폼 쿠키 저장소(앱 전용)에 머문다. 구글 `idToken`은 로그인 중 메모리에만 존재한 뒤 `/auth/mobile/google`로 1회 전송 |
| AsyncStorage | 테마·장비, 도움말 확인 플래그, 뽀모도로 세션/설정, 아이디어 초안만 저장. 자격증명 없음 |
| 로깅 | `src/`·`app/` 통틀어 `console.*` 5곳, 토큰·PII 로깅 없음. API 클라이언트 로그는 `__DEV__` 게이트 |
| WebView·동적 실행 | 코드베이스에 WebView 없음. `dangerouslySetInnerHTML`·`eval`·`new Function`·원격 코드 require 없음 |
| 푸시 페이로드 | `data.link`은 `home`/`notices` 화이트리스트로만 매핑(`src/push/links.ts`). 페이로드로 URL·API 호출을 구성하지 않음 |
| 딥링크 | 라우터 파라미터는 자사 백엔드로 가는 리소스 ID뿐. 외부 `openURL` 호출은 컴파일 타임 상수 1건 |
| 위젯 네이티브 | `WidgetTickReceiver`·`PomodoroCommandService`는 `exported="false"`, PendingIntent는 전부 explicit + `FLAG_IMMUTABLE`, SharedPreferences는 `MODE_PRIVATE`, 위젯 미러에 토큰 미기록, 로그아웃 시 `clearWidgetMirrors()`로 삭제 |
| 위젯 API | 세션 쿠키를 저장하지 않고 요청 시점에 쿠키 저장소에서 읽어 자사 API 베이스 URL로만 전송 |
| TLS | 운영 베이스 URL은 HTTPS. cleartext 허용은 debug 소스셋 한정이고 릴리스는 targetSdk 기본 차단. 인증서 검증 우회 코드 없음 |
| 시크릿 | 커밋된 시크릿 없음. `.env`·`google-services.json`은 gitignore. 번들에 들어가는 값은 공개용 식별자(구글 OAuth 클라이언트 ID, Firebase 안드로이드 API 키)뿐 |
| 릴리스 매니페스트 | `debuggable` 없음, `usesCleartextTraffic` 없음. exported 컴포넌트는 MainActivity, 위젯 프로바이더 2개, 그리고 시스템 권한(`c2dm.permission.SEND`, `BIND_REMOTEVIEWS`, `BIND_JOB_SERVICE`, `DUMP`)으로 보호되는 라이브러리 컴포넌트뿐 |

## 보완 내역

취약점은 아니지만 제출 전에 정리하는 편이 나은 3건을 반영했다.

### 1. 미사용 권한 제거 (스토어 심사 리스크)

prebuild 템플릿과 RN debug 오버레이가 넣던 `SYSTEM_ALERT_WINDOW`,
`READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`가 릴리스 매니페스트에 남아 있었다.
릴리스 코드·의존성 중 사용처가 전혀 없으며, 특히 `SYSTEM_ALERT_WINDOW`는 특별 접근 권한이라
생산성 앱에서 심사 가중 검토를 부른다.

- 조치: `app.config.ts`의 `android.blockedPermissions`에 3종 등록
- 검증: 릴리스 병합 매니페스트의 `uses-permission` 목록에서 3종 모두 사라짐.
  남은 권한은 `INTERNET`, `VIBRATE`, `ACCESS_NETWORK_STATE`, `FOREGROUND_SERVICE`,
  `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`, `SCHEDULE_EXACT_ALARM`, `WAKE_LOCK`,
  `c2dm.permission.RECEIVE`, 자체 동적 리시버 권한으로 전부 실사용분
- 참고: debug 소스셋 선언은 우선순위가 높아 유지되므로 dev-client 오버레이는 그대로 동작

**정정(2026-08-04 오후)**: 위 "남은 권한" 목록은 로컬 gradle 병합 결과 기준이며, 실제 EAS
빌드 산출 APK(5c7167d5)를 `aapt2 dump permissions`로 확인하니 `ACCESS_NOTIFICATION_POLICY`가
하나 더 들어 있었다(notify-kit 기여분, 로컬 병합에는 나타나지 않음 — 의존성 해석 차이).
앱에는 방해금지(DND) 정책을 읽거나 바꾸는 코드가 0건이고, 활동시간 밖 알림 억제는 서버가
판단하므로 이 권한이 필요한 경로가 없다. `blockedPermissions`에 추가해 제거했다.
로컬 병합 매니페스트에서 `tools:node="remove"` 적용을 확인했으며, 최종 확인은 다음 빌드의
APK에서 이뤄진다.

### 2. `allowBackup=false`

`android:allowBackup="true"` 상태에서는 세션 쿠키 DB(`app_webview`)와 AsyncStorage가
구글 백업·기기 이전 경로에 포함됐다. targetSdk 34+라 `adb backup`은 이미 앱 데이터를 제외하고
클라우드 백업은 E2E 암호화 + 구글 계정 게이트(그 계정이 곧 이 앱의 로그인 수단)라 실질적
공격 이득은 없다고 판정됐으나, MASVS-STORAGE 준수와 기기 이전 시 stale 쿠키 복원 문제 회피
목적으로 차단했다.

- 조치: `app.config.ts`에 `android.allowBackup: false`
- 검증: 릴리스 병합 매니페스트 `android:allowBackup="false"`
- 부수 효과: 기기 이전 시 재로그인이 필요하다(의도된 동작)

### 3. 위젯 딥링크 인텐트를 자사 패키지로 고정

`deepLinkIntent()`가 `setPackage` 없는 암시적 `ACTION_VIEW`라, `dumpit` 스킴을 선언한
다른 앱이 위젯 탭의 후보로 끼어들 수 있었다. 실제로는 시스템 선택 다이얼로그가 뜨고(비시스템
앱은 인텐트 필터 우선순위가 0으로 고정되어 무음 탈취 불가), 전달 URL에 파라미터·비밀값이 없어
취약점 판정은 받지 못했다. 다만 안드로이드 권고(PendingIntent에는 명시적 인텐트)에 맞춰 고정했다.

- 조치: `modules/dumpit-widget/.../TodayTasksWidget.kt`의 `deepLinkIntent()`를 `@Composable`로
  바꾸고 `setPackage(LocalContext.current.packageName)` 추가. 호출부 8곳은 전부 컴포저블
  스코프라 수정 불필요
- 검증: `:dumpit-widget:compileReleaseKotlin` 성공(해당 파일 경고 0건)

## 검증 근거 (재현 명령)

```bash
# 매니페스트 재생성 및 확인
cd mobile && npx expo prebuild -p android --no-install

# 릴리스 병합 매니페스트 + 위젯 모듈 컴파일 (JDK 21 필요)
cd mobile/android && ./gradlew :dumpit-widget:compileReleaseKotlin :app:processReleaseManifest
# 결과 확인: app/build/intermediates/merged_manifests/release/processReleaseManifest/AndroidManifest.xml

# 타입 체크
cd mobile && ./node_modules/.bin/tsc --noEmit
```

기록 시점 결과: `BUILD SUCCESSFUL` (2m 12s), `tsc --noEmit` 에러 0건.

`mobile/android/`는 gitignore 대상 생성물이다. 매니페스트의 진짜 소스는 `app.config.ts`이며,
EAS 빌드는 prebuild를 다시 돌리므로 위 두 설정이 그대로 반영된다.

## 재감사 트리거

다음 변경이 생기면 이 리포트의 결론은 무효이며 해당 영역을 다시 봐야 한다.

- 위젯 미러 저장소나 SharedPreferences에 토큰·자격증명을 저장하는 변경
- WebView 도입, 또는 서버가 준 문자열을 HTML로 렌더링하는 경로 추가
- 딥링크 URL에 ID·토큰 등 파라미터를 싣기 시작하는 변경
- 위젯 리시버에 커스텀 액션을 추가하거나 `exported` 설정을 바꾸는 변경
- 푸시 페이로드로 임의 URL·화면을 여는 기능 추가(현재는 화이트리스트)
