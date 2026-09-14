# 라이선스 안내와 DumpIt 자체 정책 검토

2026-09-14 기준. 제3자 오픈소스·에셋에는 각각의 원래 라이선스가 적용된다. DumpIt 자체 코드의 새 라이선스는 아직 채택하지 않았으며, 아래 검토안은 이용 허락을 새로 부여하는 문서가 아니다.

## 제3자 오픈소스·에셋 고지

| 자료 | 목록·원문 | 조사 기준 |
|---|---|---|
| 웹·데스크톱·모바일 npm 패키지 | [npm 의존성 고지](docs/licenses/NPM_DEPENDENCIES.md) | 세 클라이언트의 lockfile 확정 버전, 설치 패키지 메타데이터와 LICENSE/NOTICE |
| 백엔드 및 Android JVM 의존성 | [JVM 의존성 고지](docs/licenses/JVM_DEPENDENCIES.md) | Gradle 선언, BOM, 확인 가능한 POM·JAR의 고지. 정확한 해석 범위는 해당 문서에 기재 |
| 이미지·픽셀 아트·폰트 | [에셋 출처와 라이선스](ATTRIBUTIONS.md) | 실제 파일, 생성 스크립트, 폰트 메타데이터, 원작자의 배포 페이지 |
| Expo에서 도입한 모바일 템플릿 | [기존 Expo MIT 고지](mobile/LICENSE) | Copyright (c) 2015-present 650 Industries, Inc. (aka Expo) |
| 이미지·폰트 제작용 Python 도구 | [Pillow·fontTools 고지](docs/licenses/python/README.md) | 생성 스크립트의 import와 조사 환경의 설치 배포물. 프로젝트 고정 버전과 구분 |

의존성 목록의 라이선스 이름은 원문을 찾기 위한 색인이다. 원문에 있는 저작권, 예외, NOTICE, 다중 라이선스 조건을 함께 읽어야 한다. 개발·테스트 도구까지 목록에 포함된 경우 실제 앱에 전부 번들된다는 뜻은 아니다. 반대로 npm 목록만으로 Electron/Chromium 및 Android 네이티브 바이너리의 모든 구성 요소를 설명할 수는 없다.

PostgreSQL·Redis 서버와 Docker 베이스 이미지, JDK·Android SDK 등 실행·빌드 환경은 앱 패키지 의존성과 별도다. 특히 Redis는 버전별 라이선스가 달라질 수 있으므로 실제 배포 이미지의 버전·원문을 확인해야 한다. 운영 인프라의 실제 설치 버전까지 확인했다는 의미로 이 문서를 사용하지 않는다.

배포 시에는 포함된 구성 요소의 고지를 보존하고 사용자가 열람할 수 있도록 제공한다. 이 저장소의 목록 수집과 설치 파일 내부 고지 검증은 구분한다. 각 목록의 미확인 항목과 [에셋의 남은 확인 사항](ATTRIBUTIONS.md)을 함께 확인한다.

## 현재 DumpIt 자체 라이선스 상태

- 저장소 루트에는 DumpIt 전체에 적용할 LICENSE가 없다.
- `mobile/LICENSE`는 Expo의 MIT 전문이다. 이 고지를 삭제하거나 Expo의 권리를 DumpIt 소유자의 권리로 바꾸지 않는다. 모바일 템플릿과 이후 자체 작성 코드의 적용 범위는 정식 라이선스 도입 시 명시해야 한다.
- 공개 저장소라는 사실만으로 모든 목적의 이용·수정·재배포 권한이 생기지는 않는다. 기존 파일에 별도로 부여된 권리와 GitHub 약관상의 열람·포크 권한은 보존한다. [GitHub의 라이선스 부재 안내](https://choosealicense.com/no-permission/)

## 검토 방향: 학습·참고 공개, 상업적 복제 제한

코드를 읽고 학습·실험할 수 있게 공개하면서, 이를 복제한 상업 제품·서비스에는 별도 허락을 요구하는 방향을 검토한다. 상업 이용에 제한을 두는 정책은 OSI 정의의 오픈소스가 아닌 **소스 공개형(source-available)**으로 설명한다. [OSI 정의 6항](https://opensource.org/osd)

| 후보 | 학습·수정·공유 | 제한 범위 | 이 프로젝트에서 판단할 점 |
|---|---|---|---|
| **PolyForm Noncommercial 1.0.0** | 허용된 비상업 목적의 학습·수정·재배포 허용 | 원문이 허용하는 목적 이외의 상업 이용에는 별도 허락 필요 | 상업적 복제뿐 아니라 회사의 업무용 코드 재사용도 제한할 수 있다. 비상업적 공개 파생본 자체를 막는 조건은 아니다 |
| **PolyForm Shield 1.0.0** | 경쟁 제품 제공에 해당하지 않는 이용·수정·공유 허용 | 소프트웨어 또는 이를 이용한 권리자·관계사의 제품과 경쟁하는 제품·서비스 제공 제한 | 경쟁하지 않는 상업적 이용을 허용하지만, 무료로 제공하는 경쟁 서비스까지 제한한다 |

근거: [Noncommercial 공식 원문](https://github.com/polyformproject/polyform-licenses/blob/1.0.0/PolyForm-Noncommercial-1.0.0.md), [Shield 공식 원문](https://github.com/polyformproject/polyform-licenses/blob/1.0.0/PolyForm-Shield-1.0.0.md). [비교용으로 보존한 Noncommercial 원문](docs/licenses/proposals/PolyForm-Noncommercial-1.0.0.md)은 채택 선언이 아니다.

학습·개인 실험 중심으로 넓게 공개하고 상업적 재사용을 별도 협의하려면 **Noncommercial**이 유력하다. 상업적 복제 서비스만 막고 일반 기업의 비경쟁 재사용은 허용하려면 **Shield**가 더 가깝다. 두 후보의 제한은 동일하지 않으므로 이 차이를 정한 뒤 원문을 선택한다. Noncommercial은 교육·연구·자선 등 원문에 열거된 기관의 사용도 허용하며, 그 예외를 요약에서 지우지 않는다.

MIT·Apache-2.0은 상업적 재사용을 허용하고, AGPL-3.0도 소스 제공 조건을 지키는 상업 서비스 자체를 금지하지 않는다. 따라서 상업적 복제를 제한하려는 목적의 대체안으로 제시하지 않는다. [MIT](https://choosealicense.com/licenses/mit/), [Apache-2.0](https://choosealicense.com/licenses/apache-2.0/), [AGPL-3.0](https://choosealicense.com/licenses/agpl-3.0/)

## 정식 채택 시 적용 범위

| 대상 | 도입할 때 명시할 내용 |
|---|---|
| DumpIt이 권리를 보유한 웹·백엔드·데스크톱·모바일 자체 소스 | 선택한 라이선스의 대상 경로, 저작권자, Required Notice 및 문의 경로. 기존 기여자의 허락 범위도 확인 |
| 제3자 라이브러리·Expo 템플릿·외부 에셋·폰트 | 각 원래 라이선스를 유지하고 DumpIt의 비상업/경쟁 제한에서 제외 |
| 자체 제작 로고·브랜드명·도트 이미지·문서 | 코드와 같은 조건을 줄지, 별도 조건을 둘지 명시. 출처 미확인 자료는 권리 보유를 추정하지 않음 |
| 공식 DumpIt 서비스와 설치 앱의 일반 이용 | 코드 재사용 정책과 사용자 이용약관의 관계를 명시. 사용자가 업무용 할 일을 관리하는 것까지 잘못 제한하지 않도록 범위를 확정 |

정식 채택은 루트 LICENSE와 적용 범위 고지, README 안내를 함께 확정하는 작업이다. 이미 부여된 제3자 라이선스나 과거 배포본의 권리를 새 정책으로 소급 변경하지 않는다. 소스 라이선스만으로 서비스 계정·API 이용권이나 브랜드 사용권이 생기는 것으로 안내하지 않는다.
