# 덤핏 모바일

덤핏 모바일은 Android를 중심으로 개발하는 Expo Router 기반 React Native 앱입니다.
현재 앱 버전은 `1.2.0`이고, React Native `0.86.3`, Expo SDK 57, React `19.2.3`을
사용합니다.

이 앱에는 네이티브 구성이 필요한 Google 로그인, Firebase FCM 알림, Kotlin Glance
홈 화면 위젯이 포함됩니다. 따라서 Expo Go만으로 모든 기능을 실행하거나 검증할 수
없습니다. 개발·배포용 네이티브 빌드를 사용하세요.

`ios`와 `web` 실행 스크립트가 있어도 이 문서는 Android 이외의 지원 또는 배포 완료를
의미하지 않습니다.

## 구조

```text
app/                    Expo Router 화면과 레이아웃
src/                    API, 인증, 할 일, 루틴, 알림, 테마와 공용 UI
modules/dumpit-widget/  Kotlin Glance 기반 Android 홈 화면 위젯
plugins/                Expo prebuild에 적용하는 로컬 설정 플러그인
```

모바일 전용 변경은 `mobile` 브랜치에서 `mobile/` 범위로 작업합니다. 백엔드나 웹의
공통 동작 변경은 별도의 `dev` 흐름에서 다룹니다.

## 개발 환경 준비

`package-lock.json`의 React Native engine은
`^20.19.4 || ^22.13.0 || ^24.3.0 || >=25.0.0`입니다. 이 조건을 만족하는 Node.js를
사용한 뒤, 저장소 루트에서 `mobile` 디렉터리로 이동해 lockfile 기준으로 의존성을
설치합니다. 이 설치 절차가 끝나면 현재 디렉터리는 `mobile/`입니다.

```powershell
cd mobile
npm ci
```

Android 네이티브 기능을 쓰려면 Android Studio와 Android SDK, 연결한 Android 기기 또는
에뮬레이터가 필요합니다. `npm run android`는 Expo의 네이티브 Android 실행 경로를
사용하므로 이 준비가 된 개발 환경에서 실행합니다.

첫 번째 터미널은 설치를 마친 `mobile/` 디렉터리에서 Metro 개발 서버를 시작한 뒤 계속
실행해 둡니다.

```powershell
npm start
```

두 번째 터미널은 저장소 루트에서 시작해 같은 `mobile/` 디렉터리로 이동한 뒤 Android
앱을 실행합니다.

```powershell
cd mobile
npm run android
```

Google 로그인, FCM 알림, 홈 화면 위젯은 개발 빌드 또는 배포 빌드에서 확인합니다.

## 환경과 Google 서비스 설정

앱 설정은 `app.config.ts`와 `eas.json`에 있습니다. 앱은 기본적으로 운영 API
`https://api.dumpit.kr/api`를 사용하며, 로컬 개발 시 `mobile/.env`에 다음 공개 환경
변수를 설정할 수 있습니다.

```dotenv
EXPO_PUBLIC_API_URL=http://<개발-PC의-LAN-IP>:8080/api
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<Google 웹 클라이언트 ID>
```

`EXPO_PUBLIC_API_URL`을 설정하지 않으면 운영 API를 사용합니다. 사설망 주소를 사용한
개발 실행에서는 Metro 호스트를 기준으로 주소를 보정합니다.

Firebase Android 설정 파일은 저장소에 넣지 않습니다. 로컬 개발에서는
`mobile/google-services.json`을 제공하고, 빌드 환경에서는 `GOOGLE_SERVICES_JSON`에
해당 파일 경로를 제공합니다. `app.config.ts`는 이 환경 변수가 없을 때
`./google-services.json`을 사용합니다. 실제 설정 파일과 환경 변수 값은 커밋하거나
문서에 기록하지 마세요.

`eas.json`에는 development, preview, production 빌드 프로필이 정의되어 있습니다.
네이티브 빌드와 배포에 필요한 서명·Google/Firebase 설정은 사용하는 빌드 환경에 맞게
안전하게 제공해야 합니다.

## 검사

변경 범위에 맞춰 저장소 루트에서 다음 검사를 실행합니다.

```powershell
cd mobile
npm run lint
npx tsc --noEmit
npm test
```

Expo 관련 API나 설정을 확인해야 한다면 이 프로젝트의 기준 버전인
[Expo SDK 57 문서](https://docs.expo.dev/versions/v57.0.0/)를 사용합니다.

## 라이선스

React Native·Expo 및 네이티브 의존성은 [라이선스 안내](../docs/LICENSING.md),
폰트·이미지는 [에셋 출처 문서](../docs/ATTRIBUTIONS.md)를 확인합니다.
[LICENSE](LICENSE)는 Expo 템플릿의 MIT 고지이며 그대로 보존합니다.
DumpIt 자체 코드의 새 라이선스는 아직 검토 중입니다.
