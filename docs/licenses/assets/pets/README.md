# 동물 정거장 원본·라이선스

2026-09-28 확인. 웹의 `frontend/src/assets/shop/pets/`에 들어간 14종, 대기/다른 동작 PNG 28개는 아래 제작자 팩의 원본이다. 파일명만 통일했고 이미지 바이트는 변경하지 않았다. [manifest.json](manifest.json)에 원본 ZIP·ZIP 내부 경로·각 파일 SHA-256·셀 크기·프레임 수·전체 프레임의 투명 여백을 제외한 경계를 기록했다.

| 작품 | 제작자·배포 | 라이선스 근거 |
|---|---|---|
| Pet Cats Pack — 6색 | [LuizMelo](https://luizmelo.itch.io/pet-cat-pack) | ZIP 동봉 [cats-LICENSE.txt](cats-LICENSE.txt): CC0, 상업·비상업 사용 허용 |
| Pet Dogs Pack — 6견종 | [LuizMelo](https://luizmelo.itch.io/pet-dogs-pack) | ZIP 동봉 [dogs-LICENSE.txt](dogs-LICENSE.txt): CC0, 상업·비상업 사용 허용 |
| Bunny — 회색 토끼 | [Duckhive](https://duckhive.itch.io/bunny) | 제작자 페이지의 CC0 명시. [확인 기록](duckhive-LICENSE-SOURCE.txt) |
| Squirrel — 다람쥐 | [Duckhive](https://duckhive.itch.io/squirrel) | 제작자 페이지의 CC0 명시. [확인 기록](duckhive-LICENSE-SOURCE.txt) |

[CC0 1.0 원문](../CC0-1.0.txt)을 보존한다. Duckhive ZIP에는 별도 라이선스 파일이 없어서 제작자 페이지를 확인한 기록과 원본 ZIP 해시를 함께 남겼다.

화면에서는 CSS로 프레임을 잘라 순환하며 투명 여백을 제외한 본체 크기에 맞춰 표시한다. 원본의 색·픽셀·프레임 순서·알파를 수정하지 않았다. 확대할 때 정수 배율을 우선하고 슬롯보다 큰 동물만 축소한다. 생성 스크립트는 이 디렉터리의 원본을 생성하거나 덮어쓰지 않는다. `station.hamster`는 기존 구매 호환을 위해 유지한 상품 코드이며 새 웹 표시 이미지는 토끼다.

모바일은 이번 변경에 포함하지 않는다. 별도 참고 후보 Last tick/ToffeeCraft의 파일은 포함하지 않는다. CC0 자료에는 DumpIt 자체 라이선스의 이용 제한을 적용하지 않는다.
