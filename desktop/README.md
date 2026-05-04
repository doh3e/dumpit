# Dumpit Desktop

기존 Dumpit React 프론트엔드를 감싸는 데스크탑 앱입니다.

## 구조

```text
Electron desktop app
  -> 앱 안에 포함된 frontend/dist 파일
  -> https://api.dumpit.kr/api
  -> 기존 Spring Boot 백엔드
  -> 기존 PostgreSQL/Redis
```

데스크탑 앱은 DB에 직접 연결하지 않습니다. DB 계정/비밀번호를 사용자 PC에
노출하지 않고, 기존 백엔드를 유일한 데이터 통로로 유지하기 위해서입니다.

## 브랜치 안전장치

이 폴더는 데스크탑 앱 개발 중에는 `desktop` 브랜치에서 관리하는 것을
기본으로 합니다.

실제 기능 작업은 `desktop`에서 바로 하지 않고, `feat/desktop-*` 같은
작업 브랜치를 따서 진행합니다.

나중에 `main`에 머지하더라도, 웹 배포 워크플로우는 데스크탑 전용 변경을
무시하도록 설정되어 있습니다. 그래서 `desktop/**` 또는
`.github/workflows/desktop.yml`만 바뀐 커밋은 운영 웹서비스 배포를
트리거하지 않습니다.

## 공통 코드 변경 원칙

데스크탑 지원 때문에 `backend/` 또는 `frontend/` 공통 코드를 바꿔야 한다면
그 변경은 운영 웹서비스에도 영향을 줄 수 있습니다.

이 경우 `desktop` 작업에 섞지 않고 별도 브랜치에서 작업합니다.

```text
desktop/ 전용 변경
  -> feat/desktop-* 브랜치

backend/frontend 공통 변경
  -> 별도 브랜치
  -> 웹서비스 영향 검토
  -> main 반영 후 desktop 브랜치가 다시 가져오기
```

## 명령어

```bash
cd desktop
npm install
npm run build:frontend
npm start
```

Windows 설치 파일을 만들 때:

```bash
cd desktop
npm run package:win
```
