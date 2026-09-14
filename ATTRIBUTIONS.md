# 에셋 출처 및 라이선스

2026-09-14 기준 저장소에 포함된 이미지·폰트의 출처와 변경 사항을 기록한다. 오픈소스 코드 의존성은 [라이선스 안내](LICENSING.md)의 별도 목록을 따른다. 이 문서는 제3자 자료를 DumpIt의 라이선스로 다시 허가하지 않는다.

## 상점 픽셀 아트

웹의 `frontend/src/assets/shop/`와 모바일의 `mobile/assets/shop/`에 같은 계열의 에셋이 있다. 데스크톱은 웹 번들을 포함한다. 모바일의 `@2x`·`@3x` 파일은 [확대 스크립트](mobile/scripts/upscale_sprites.py)로 만든 파생본이며 원본의 출처·라이선스를 유지한다.

| 파일명 / 계열 | 작품·원작자 | 라이선스 | DumpIt에서 변경한 내용 |
|---|---|---|---|
| `celeb_rocket_default.png` | Space - Pixel Art / peony, RocketWhite | CC BY 4.0 | 원래 스프라이트 사용 |
| `celeb_shooting_star.png` | Space - Pixel Art / peony, YellowShootingStar | CC BY 4.0 | 원래 스프라이트 사용 |
| `celeb_ufo.png` | Space - Pixel Art / peony, UfoBlue | CC BY 4.0 | 원래 스프라이트 사용 |
| `celeb_golden_rocket.png` | Space - Pixel Art / peony, RocketGrey | CC BY 4.0 | 무채색 픽셀을 금색으로 변경 |
| `pattern_galaxy_light.png`, `pattern_galaxy_dark.png` 및 모바일 배율별 파생본 | Space - Pixel Art / peony, 별 스프라이트 | CC BY 4.0 | 별을 추출해 반복 배경 타일로 합성·확대 |
| `pattern_sprout_light.png`, `pattern_sprout_dark.png` 및 모바일 배율별 파생본 | 16x16 RPG Icon Pack / stealthix, 잎 스프라이트 | CC0 1.0 | 추출·확대·반복 타일 합성 |

- **Space - Pixel Art — peony:** [원작 배포 페이지](https://opengameart.org/content/space-pixel-art), [CC BY 4.0 조건](https://creativecommons.org/licenses/by/4.0/), [보존한 라이선스 전문](docs/licenses/assets/CC-BY-4.0.txt).
- **16x16 RPG Icon Pack — stealthix:** [원작 배포 페이지](https://opengameart.org/content/16x16-rpg-icon-pack), [CC0 1.0 조건](https://creativecommons.org/publicdomain/zero/1.0/), [보존한 라이선스 전문](docs/licenses/assets/CC0-1.0.txt).

CC BY 4.0 자료를 공유할 때에는 작가·원작·라이선스 링크와 개작 사실을 함께 보존한다. 원작자가 DumpIt을 보증하거나 후원한다는 의미로 사용하지 않는다. CC0 자료는 출처를 추적할 수 있도록 자발적으로 기록했다. 원작 링크와 라이선스는 2026-09-14에 배포 페이지에서 재확인했다.

## 저장소 내 생성 스크립트가 있는 이미지

아래 목록은 제작 과정을 소스로 확인한 항목이다. 자체 제작물에 적용할 재사용 조건은 [DumpIt 자체 라이선스 검토](LICENSING.md)를 따른다. 별도의 CC0·MIT 허가를 의미하지 않는다.

| 파일명 / 계열 | 제작 근거 |
|---|---|
| `planet_*.png` 15종 | [gen_planets.py](frontend/scripts/sprites/gen_planets.py) |
| `station_*.png` 11종 | [gen_stations.py](frontend/scripts/sprites/gen_stations.py); 동물 우주정거장은 프레임 시트 |
| `sticker_*.png` 8종 | [gen_stickers.py](frontend/scripts/sprites/gen_stickers.py) |
| `pattern_wood_*.png`, `pattern_candy_*.png`, `deco_*.png` | [gen_patterns.py](frontend/scripts/sprites/gen_patterns.py); sprout/galaxy **배경 패턴**은 위 제3자 표에 별도로 기재 |
| peony의 4종을 제외한 `celeb_*.png` 20종 | [gen_celebs.py](frontend/scripts/sprites/gen_celebs.py); 불꽃·유성·꽃잎·새싹·사탕·모닥불 파티클 |
| `frontend/src/assets/ui_*.png`, 모바일 `assets/icons/ui_*.png` | [gen_ui_icons.py](frontend/scripts/sprites/gen_ui_icons.py) |
| `coin_image.png`, `remain_ai_token.png`, `setting_image.png`, `arrowheads.png` | [gen_chrome_icons.py](frontend/scripts/sprites/gen_chrome_icons.py); 설정·화살촉은 저장소 내 logical 마스터 사용 |
| `deadline_alarm.png` | [gen_deadline_icon.py](frontend/scripts/sprites/gen_deadline_icon.py) |
| `frontend/src/assets/icons/*_<크기>.png` | [gen_icon_sizes.py](frontend/scripts/gen_icon_sizes.py)로 원본에서 크기별 파생. 원본별 출처를 승계하며, `menu`·`download`의 원출처는 아래 확인 항목 참조 |
| Android 위젯 문자·도트 이미지 | [gen_widget_assets.py](mobile/scripts/gen_widget_assets.py); 문자 렌더링에 Galmuri와 DungGeunMo 사용 |

행성·우주정거장·스티커를 자체 제작으로 교체한 기존 이력을 유지한다. 현재 스티커에는 과거 KerteX_의 Fire/Flame, stealthix의 하트, peony의 별을 사용하지 않는다. 새싹 배경에 남아 있는 stealthix 자료는 위 표에 계속 표시한다.

## 폰트

폰트 파일의 내장 이름·버전·저작권·라이선스 메타데이터를 직접 읽어 확인했다. [파일별 메타데이터와 SHA-256](docs/licenses/fonts/font-metadata.json)을 함께 보존한다.

| 폰트 | 실제 사용 위치·형태 | 저작권 / 출처 | 조건·원문 |
|---|---|---|---|
| DungGeunMo (내장 버전 1.301) | 웹 `public/fonts/DungGeunMo.subset.woff2`, 모바일 `assets/fonts/DungGeunMo.ttf` | 둥근모꼴: 김중태; Fixedsys Excelsior: Darien Gavin Valentine; 둥근모꼴+Fixedsys 배포·수정: 길형진(CACTUS) | 배포자가 **Public Domain**으로 명시. [공식 배포·사용권](https://cactus.tistory.com/193), [확인 기록](docs/licenses/fonts/DungGeunMo-NOTICE.md) |
| Galmuri11 Regular/Bold (내장 버전 2.403) | 웹 `public/fonts/Galmuri11*.subset.woff2`, 모바일 `assets/fonts/Galmuri11*.ttf`, 데스크톱 `electron/fonts/Galmuri11.woff2` | Copyright (c) 2019–2025 Lee Minseo (quiple). [공식 프로젝트](https://github.com/quiple/galmuri) | SIL Open Font License 1.1. [보존한 저작권·라이선스 전문](docs/licenses/fonts/Galmuri-OFL.md) |
| Pretendard 1.3.9 (모바일 내장 버전 1.309) | 웹 `pretendard` npm 패키지의 variable dynamic subset, 모바일 `Pretendard-Regular.otf`·`Pretendard-Bold.otf` | Kil Hyung-jin. 모바일 파일에는 Copyright © 2023 고지. [공식 프로젝트](https://github.com/orioncactus/pretendard) | SIL Open Font License 1.1, Reserved Font Name **Pretendard**. [v1.3.9 배포 원문](docs/licenses/fonts/Pretendard-OFL.txt) |

Pretendard의 원형 글리프 크레딧은 Inter(Rasmus Andersson), Source Han Sans/Noto Sans CJK(Adobe·Google·Sandoll Communications, 장수영·강주연), M PLUS 1p(UNDERFOREST DESIGN, Coji Morishita)이며 길형진이 결합·재설계했다. [공식 크레딧](https://github.com/orioncactus/pretendard/tree/v1.3.9)

웹 픽셀 폰트에는 한글·ASCII 등 선택 글리프만 담은 WOFF2 서브셋을 사용한다. 모바일 DungGeunMo에도 [서브셋 생성 스크립트](mobile/scripts/subset_dunggeunmo.py)가 있다. 파일 형식 변환·서브셋은 변경 사항으로 기록하며 원래 라이선스와 저작권을 유지한다. OFL 폰트는 폰트 자체만 단독 판매할 수 없고, 번들에 저작권·OFL 고지를 포함해야 한다. 수정본에 예약된 폰트 이름을 사용하는 조건도 확인해야 한다. 폰트로 렌더링한 일반 이미지·문서 자체에 OFL이 자동 적용되는 것은 아니다. [OFL 원문](https://openfontlicense.org/open-font-license-official-text/)

DungGeunMo를 이름이 비슷한 **NeoDunggeunmo**의 OFL과 혼동하지 않는다. 현재 파일은 내장 저작권이 Public Domain이며 CACTUS 배포본 계열이다.

## 템플릿·브랜드·출처 확인 항목

| 자료 | 확인한 사실 | 남은 확인 |
|---|---|---|
| `mobile/LICENSE` | Expo(650 Industries)의 MIT 전문이 템플릿 도입 커밋부터 존재 | [원문](mobile/LICENSE)을 유지한다. DumpIt 전체의 MIT 채택 여부를 이 파일 하나로 확정하지 않는다 |
| `mobile/assets/expo.icon/`의 Expo 심벌·grid | Expo 템플릿 흔적이며 현재 iOS 아이콘 설정이 가리킴 | 저장소 보존 자료로 기록. Expo 상표·브랜드 사용 조건 및 향후 iOS 배포 전 아이콘 교체 여부를 별도로 확인 |
| DumpIt 로고·문자 로고·favicon, 데스크톱 앱/트레이 ICO, 모바일 앱·스플래시 이미지 | 관리자가 로고를 AI로 자체 생성했다고 확인. 저장소의 리사이즈·변환 파일은 그 파생본 | 새 재사용 조건은 자체 라이선스의 적용 범위를 정할 때 명시. Flaticon 출처로 표시하지 않음 |
| `frontend/src/assets/menu.png`, `download.png` 및 크기별 파생본 | 관리자가 [Flaticon](https://www.flaticon.com/) **무료 계정으로 다운로드**한 외부 자료라고 확인 | 개별 제작자·원본 URL·다운로드 당시 고지 문구 확인 필요 |

원출처를 확인하지 못한 항목에 무료·CC0·자체 제작 표시를 임의로 붙이지 않는다. 새 자료를 추가할 때에는 파일, 제작자, 원작 URL, 라이선스 원문과 개작 여부를 함께 갱신한다.

### Flaticon 자료

Flaticon 자료는 오픈소스 코드나 CC0 에셋으로 분류하지 않는다. 현재 확인한 자료는 무료 다운로드이므로 제작자와 Flaticon 출처 표기가 필요하며 Premium의 표기 면제를 적용하지 않는다. 개별 제작자를 아직 확인하지 못했으므로 위 사이트 링크만으로 고지를 완료했다고 보지 않는다. [공식 라이선스 안내](https://media.flaticon.com/license/license.pdf), [이용약관](https://www.flaticon.com/legal)

현재 약관에는 원본 자료의 독립적인 재배포·재허락 등에 관한 제한이 있다. 앱에 포함한 이용과 원본 PNG를 공개 저장소에서 배포하는 이용은 각각 해당 조건을 확인한다. 다운로드 시점의 개별 증빙을 확인하기 전에는 새 DumpIt 라이선스로 이 자료의 재사용 권한을 부여하지 않는다.

## 배포본의 고지

이 문서는 저장소의 출처 기록이다. 현재 웹 상점에는 `peony (CC-BY 4.0) · stealthix`라는 짧은 크레딧이 있지만 원작·라이선스 링크와 개작 내역 전체를 담고 있지는 않다. 모바일 화면 및 Windows/Android 설치물에 이 문서와 모든 제3자 고지가 포함되는지는 별도의 배포본 확인이 필요하다.

배포할 때에는 실제 포함된 자료의 LICENSE/NOTICE와 OFL 고지, CC BY 출처·개작 기록을 사용자가 열람할 수 있도록 함께 제공한다. 저장소 문서 갱신만으로 기존 설치물의 고지가 변경되지는 않는다.
