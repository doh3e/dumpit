# 에셋 제작에 쓰는 Python 도구

픽셀 이미지·스토어 이미지 생성 스크립트는 Pillow를, 폰트 서브셋 스크립트는 fontTools를 사용한다. 저장소에는 이 도구들의 버전을 고정한 Python lockfile이 없으므로 아래 버전은 2026-09-14 조사 환경에서 확인한 설치본이다. 과거 모든 에셋이 이 버전으로 생성됐다는 의미는 아니다.

| 도구 | 조사 환경의 버전 | 라이선스 | 보존한 원문 |
|---|---|---|---|
| Pillow | 11.3.0 | MIT-CMU 및 배포물 내 개별 고지 | [LICENSE](Pillow-11.3.0-LICENSE.txt) |
| fontTools | 4.63.0 | MIT 및 외부 코드별 고지 | [LICENSE](fonttools-4.63.0-LICENSE.txt), [LICENSE.external](fonttools-4.63.0-LICENSE.external.txt) |

원문은 설치 배포물의 `dist-info/licenses/`에서 그대로 복사했다. [파일·SHA-256 기록](sources.json)으로 확인할 수 있다. 공식 출처: [Pillow 라이선스 안내](https://pillow.readthedocs.io/en/stable/about.html#license), [fontTools 저장소](https://github.com/fonttools/fonttools).

이 도구는 에셋 제작·점검용이며 생성된 PNG만으로 Python이나 해당 라이브러리 전체가 앱에 포함되는 것은 아니다. Python 실행 환경과 선택적 라이브러리까지 이 표가 모두 열거하지는 않는다.
