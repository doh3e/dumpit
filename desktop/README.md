# 덤핏 데스크톱

덤핏 데스크톱은 Windows에서 실행하는 Electron 앱입니다. 웹 클라이언트를 별도로
호스팅하지 않고, 빌드된 `frontend/dist`를 앱에 포함해 실행합니다.

```text
Electron 데스크톱 앱
  -> 포함된 frontend/dist
  -> https://api.dumpit.kr/api
  -> Spring Boot 백엔드
  -> PostgreSQL / Redis
```

데스크톱 앱은 데이터베이스에 직접 연결하지 않습니다. 모든 데이터와 인증 요청은 기존
API를 거치므로 DB 자격 증명이 사용자 PC에 들어가지 않습니다.

## 지원 범위와 설치

- 현재 패키지 버전은 `0.1.10`이며 Electron 30 계열과 electron-builder 24 계열을
  사용합니다.
- 배포 대상은 Windows 설치 파일입니다. 최신 설치 파일은
  [GitHub Releases](https://github.com/doh3e/dumpit/releases/latest)에서 받을 수 있습니다.
- 현재 공개된 macOS 패키지는 제공하지 않습니다.

앱에는 다음 데스크톱 전용 기능이 있습니다.

- 트레이 메뉴에서 앱, 대시보드, 루틴, 설정을 열고 종료
- 사용자가 선택한 Windows 로그인 시 자동 시작
- 패키지 앱에서 새 버전을 확인하고 다운로드한 뒤 재시작으로 적용하는 자동 업데이트
- 트레이 메뉴로 여는 별도 뽀모도로 위젯 창

## 개발 환경 준비

`frontend`와 `desktop`은 각각 의존성을 설치해야 합니다. 이 설치 절차는 저장소
루트에서 실행하며, 끝나면 현재 디렉터리는 `desktop/`입니다. 아래의 실행·패키징·로컬
API 명령도 모두 이 `desktop/` 디렉터리에서 실행합니다.

```powershell
cd frontend
npm ci

cd ../desktop
npm ci
```

## 실행과 패키징

프런트엔드를 먼저 빌드한 뒤 Electron을 실행합니다.

```powershell
npm run build:frontend
npm start
```

Windows 설치 파일은 다음 명령으로 만듭니다. 이 명령은 프런트엔드 빌드도 함께
실행하며 결과물을 `desktop/release`에 만듭니다.

```powershell
npm run package:win
```

## 제한된 로컬 API 확인 (선택)

프런트엔드 번들의 기본 API는 `https://api.dumpit.kr/api`입니다. 로컬 API 모드는
일반 개발 절차가 아니며 기본적으로 꺼져 있습니다. 로그인과 쿠키 흐름을 포함한 모든
동작이 완전히 지원되는 경로가 아니므로, 필요할 때만 제한적으로 사용합니다.

로컬 백엔드를 대상으로 확인하려면 프런트엔드를 해당 API 주소로 다시 빌드한 다음,
Electron의 로컬 API 모드를 켭니다.

```powershell
$env:VITE_API_URL = 'http://localhost:8080/api'
npm run build:frontend
$env:DUMPIT_DESKTOP_LOCAL_API = '1'
npm start
```

`DUMPIT_DESKTOP_LOCAL_API=1`은 Electron의 API 대상도 `http://localhost:8080`으로
맞춥니다.

## 브랜치와 릴리즈

데스크톱 전용 작업은 `desktop` 브랜치에서 `desktop/`만 변경합니다. 공통
`frontend/` 또는 `backend/` 변경은 웹 서비스에도 영향을 주므로 `dev` 흐름에서
검증합니다. `main`은 통합 기준입니다.

`v*` 형식의 태그를 원격에 푸시하면 Desktop Build & Release 워크플로우가 Windows
패키지를 만들고 GitHub 릴리즈 업로드를 시작합니다. 릴리즈 초안의 공개는 별도
단계입니다. 초안 상태에서는 자동 업데이트 클라이언트가 새 릴리즈를 받을 수 없습니다.

## 라이선스

Electron·업데이트 라이브러리와 웹 번들의 고지는 [라이선스 안내](../LICENSING.md),
폰트·이미지의 출처는 [에셋 출처 문서](../ATTRIBUTIONS.md)를 확인합니다.
DumpIt 자체 코드는 [PolyForm Noncommercial License 1.0.0](../LICENSE)을 따릅니다.
비상업적 사용·수정·재배포를 허용하며, 원문에서 허용한 목적 외의 상업적 코드 재사용에는 별도 허락이 필요합니다.
