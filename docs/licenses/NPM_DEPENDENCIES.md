# npm 의존성 및 라이선스 인벤토리

생성일: 2026-09-14T12:24:24.810Z

이 문서는 frontend/, desktop/, mobile/의 커밋된 package-lock.json을 기준으로 한 npm 의존성 인벤토리입니다. 버전·무결성·배포 위치는 lockfile을 기준으로 하고, 라이선스 선언·저장소 주소·원문 고지는 설치된 node_modules의 package.json과 최상위 LICENSE/LICENCE/COPYING/NOTICE 파일을 대조했습니다.

상세 목록은 [npm-dependencies.json](./npm-dependencies.json)에 있습니다. JSON에는 직접·간접 의존성 각각의 lockfile 경로, 확정 버전, 런타임/개발 도달 범위, 선언 라이선스, 공식 저장소 또는 홈페이지, npm registry 메타데이터 URL, 원문 고지 파일 연결을 기록합니다.

## 재생성

같은 checkout에서 재생성할 때는 저장소 루트에서 실행합니다. 현재 설치되지 않은 직접 의존성과 플랫폼 조건이 없는 런타임 의존성은 npm 공식 registry의 해당 버전 tarball을 최대 1 MiB까지만 읽어 LICENSE/NOTICE를 보완합니다.

~~~powershell
node docs/licenses/collect-npm-licenses.cjs . .
~~~

별도 checkout의 lockfile과 설치 메타데이터를 사용할 때는 상대 경로를 지정합니다.

~~~powershell
node docs/licenses/collect-npm-licenses.cjs ..\lockfile-checkout ..\installed-checkout
~~~

네트워크를 쓰지 않는 수집은 마지막 인수로 --offline을 넣습니다. 스크립트는 docs/licenses/npm/의 SHA-256 이름 생성물만 정리하며, 대상 경로와 기존 파일명을 검증한 뒤에만 정리합니다. 앱 패키지나 lockfile은 수정하지 않습니다.

## 수집 결과

- lockfile 의존성 항목: 2165개
- 직접 런타임 / 개발 의존성: 43개 / 25개
- 런타임 도달 / 개발 전용 / 분류 불가: 1348개 / 761개 / 56개
- 원문 고지 추출 항목 / 고유 파일: 1897개 / 594개
- 플랫폼 선택형 / 선택 의존성 미설치: 90개 / 9개
- 원문 미동봉 / 실제 수동 확인 필요: 165개 / 5개
- 정확한 패키지 메타데이터 미발견 / lockfile 버전 불일치: 103개 / 0개

## 클라이언트 핵심 직접 의존성

| 클라이언트 | 패키지 | 확정 버전 | 용도 | 선언 라이선스 | 확인 상태 | 원문 고지 | 공식 소스 |
| --- | --- | ---: | --- | --- | --- | --- | --- |
| frontend | <code>@eslint/js</code> | 9.39.5 | 개발 | MIT | <code>text-extracted</code> | [원문](./npm/3b6be04f862a077a4b97929dbf247299360824d9365f8603c263769303ace18c.txt) | [저장소](https://github.com/eslint/eslint) / [registry](https://registry.npmjs.org/%40eslint%2Fjs/9.39.5) |
| frontend | <code>@playwright/test</code> | 1.63.0 | 개발 | Apache-2.0 | <code>text-extracted</code> | [원문](./npm/45873d00a0dd243596deb4aa23b2493b3d1f0671921bf2538ea431d7380220eb.txt), [원문](./npm/6d602191187b35b9b01d2cffa01c8469c2c8d9de8a96f1bf868e0f264f51c81d.txt) | [저장소](https://github.com/microsoft/playwright) / [registry](https://registry.npmjs.org/%40playwright%2Ftest/1.63.0) |
| frontend | <code>@sentry/react</code> | 10.51.0 | 런타임 | MIT | <code>text-extracted</code> | [원문](./npm/f3df0b92efcd9d8cc0de5a36c151569a12a647d65b851abbb696ef7b13dee10b.txt) | [저장소](https://github.com/getsentry/sentry-javascript) / [registry](https://registry.npmjs.org/%40sentry%2Freact/10.51.0) |
| frontend | <code>@sentry/vite-plugin</code> | 5.2.1 | 개발 | MIT | <code>text-extracted</code> | [원문](./npm/bf3c970fd0a59e110dbadd142283a6844e20652277ea676172d7b426648f7eef.txt) | [저장소](https://github.com/getsentry/sentry-javascript-bundler-plugins) / [registry](https://registry.npmjs.org/%40sentry%2Fvite-plugin/5.2.1) |
| frontend | <code>@testing-library/jest-dom</code> | 7.0.1 | 개발 | MIT | <code>text-extracted</code> | [원문](./npm/bf8fd38056b7606deccfcadb4d8ca1c210082d8ef5513426d2650daedc30bed3.txt) | [저장소](https://github.com/testing-library/jest-dom) / [registry](https://registry.npmjs.org/%40testing-library%2Fjest-dom/7.0.1) |
| frontend | <code>@testing-library/react</code> | 16.3.2 | 개발 | MIT | <code>text-extracted</code> | [원문](./npm/9680978280d509520d2a7b51e93ffbf7d9ec2b9de4411a6989daba5b659048e0.txt) | [저장소](https://github.com/testing-library/react-testing-library) / [registry](https://registry.npmjs.org/%40testing-library%2Freact/16.3.2) |
| frontend | <code>@vitejs/plugin-react</code> | 4.7.0 | 개발 | MIT | <code>text-extracted</code> | [원문](./npm/29b68325fe026047d13e187b44c33b2acacf7dc647dec4583702e59f235e13b5.txt) | [저장소](https://github.com/vitejs/vite-plugin-react) / [registry](https://registry.npmjs.org/%40vitejs%2Fplugin-react/4.7.0) |
| frontend | <code>autoprefixer</code> | 10.5.0 | 개발 | MIT | <code>text-extracted</code> | [원문](./npm/5be1f3465bba68a626777f984878814aaf35e7ef8e9fd314d469bcf887050fb8.txt) | [저장소](https://github.com/postcss/autoprefixer) / [registry](https://registry.npmjs.org/autoprefixer/10.5.0) |
| frontend | <code>axios</code> | 1.15.0 | 런타임 | MIT | <code>text-extracted</code> | [원문](./npm/82761059eaedacb3356803aea8a170d8298609f91b14fc32ee1bfb40d690183c.txt) | [저장소](https://github.com/axios/axios) / [registry](https://registry.npmjs.org/axios/1.15.0) |
| frontend | <code>eslint</code> | 9.39.4 | 개발 | MIT | <code>text-extracted</code> | [원문](./npm/3b6be04f862a077a4b97929dbf247299360824d9365f8603c263769303ace18c.txt) | [저장소](https://github.com/eslint/eslint) / [registry](https://registry.npmjs.org/eslint/9.39.4) |
| frontend | <code>eslint-plugin-jsx-a11y</code> | 6.10.2 | 개발 | MIT | <code>text-extracted</code> | [원문](./npm/82b19019e25e266a310ef46800b3af726136a3cee79af8812dc83ca0b045afae.txt) | [저장소](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y) / [registry](https://registry.npmjs.org/eslint-plugin-jsx-a11y/6.10.2) |
| frontend | <code>eslint-plugin-react</code> | 7.37.5 | 개발 | MIT | <code>text-extracted</code> | [원문](./npm/d500a9547fec26f52544f5f2fe52dec4b0c9bdf78177c79f202c98bd13d7c37c.txt) | [저장소](https://github.com/jsx-eslint/eslint-plugin-react) / [registry](https://registry.npmjs.org/eslint-plugin-react/7.37.5) |
| frontend | <code>eslint-plugin-react-hooks</code> | 5.2.0 | 개발 | MIT | <code>text-extracted</code> | [원문](./npm/da6d3703ed11cbe42bd212c725957c98da23cbff1998c05fa4b3d976d1a58e93.txt) | [저장소](https://github.com/facebook/react) / [registry](https://registry.npmjs.org/eslint-plugin-react-hooks/5.2.0) |
| frontend | <code>eslint-plugin-react-refresh</code> | 0.4.26 | 개발 | MIT | <code>text-extracted</code> | [원문](./npm/fba570176c68f716676e04cad6c39fb56b763e44fc11be22fe6863ff19092a9b.txt) | [저장소](https://github.com/ArnaudBarre/eslint-plugin-react-refresh) / [registry](https://registry.npmjs.org/eslint-plugin-react-refresh/0.4.26) |
| frontend | <code>globals</code> | 15.15.0 | 개발 | MIT | <code>text-extracted</code> | [원문](./npm/5c932d88256b4ab958f64a856fa48e8bd1f55bc1d96b8149c65689e0c61789d3.txt) | [저장소](https://github.com/sindresorhus/globals) / [registry](https://registry.npmjs.org/globals/15.15.0) |
| frontend | <code>jsdom</code> | 29.1.1 | 개발 | MIT | <code>text-extracted</code> | [원문](./npm/242d37e7cab25cbafc36cc973ee88f9345fddf066afe4f72b7ac3d9ad4e24cce.txt) | [저장소](https://github.com/jsdom/jsdom) / [registry](https://registry.npmjs.org/jsdom/29.1.1) |
| frontend | <code>postcss</code> | 8.5.12 | 개발 | MIT | <code>text-extracted</code> | [원문](./npm/5be1f3465bba68a626777f984878814aaf35e7ef8e9fd314d469bcf887050fb8.txt) | [저장소](https://github.com/postcss/postcss) / [registry](https://registry.npmjs.org/postcss/8.5.12) |
| frontend | <code>pretendard</code> | 1.3.9 | 런타임 | OFL-1.1 | <code>text-extracted</code> | [원문](./fonts/Pretendard-OFL.txt) | [저장소](https://github.com/orioncactus/pretendard) / [registry](https://registry.npmjs.org/pretendard/1.3.9) |
| frontend | <code>react</code> | 19.2.5 | 런타임 | MIT | <code>text-extracted</code> | [원문](./npm/da6d3703ed11cbe42bd212c725957c98da23cbff1998c05fa4b3d976d1a58e93.txt) | [저장소](https://github.com/facebook/react) / [registry](https://registry.npmjs.org/react/19.2.5) |
| frontend | <code>react-dom</code> | 19.2.5 | 런타임 | MIT | <code>text-extracted</code> | [원문](./npm/da6d3703ed11cbe42bd212c725957c98da23cbff1998c05fa4b3d976d1a58e93.txt) | [저장소](https://github.com/facebook/react) / [registry](https://registry.npmjs.org/react-dom/19.2.5) |
| frontend | <code>react-markdown</code> | 10.1.0 | 런타임 | MIT | <code>text-extracted</code> | [원문](./npm/f6196c64e144f9a6fa9154c3a80bc8b89615a9567934b83a8951879f06ba2aef.txt) | [저장소](https://github.com/remarkjs/react-markdown) / [registry](https://registry.npmjs.org/react-markdown/10.1.0) |
| frontend | <code>react-router-dom</code> | 7.14.1 | 런타임 | MIT | <code>text-extracted</code> | [원문](./npm/77c9ee6a9c5d5782fb0c50b50d101189116314c14f7df0a1b0d385fc96a7ba49.txt) | [저장소](https://github.com/remix-run/react-router) / [registry](https://registry.npmjs.org/react-router-dom/7.14.1) |
| frontend | <code>remark-gfm</code> | 4.0.1 | 런타임 | MIT | <code>text-extracted</code> | [원문](./npm/dd1081884a92952802f4803110a6bb543acea9a814c786d58605b4c1219b5ebb.txt) | [저장소](https://github.com/remarkjs/remark-gfm) / [registry](https://registry.npmjs.org/remark-gfm/4.0.1) |
| frontend | <code>tailwindcss</code> | 3.4.19 | 개발 | MIT | <code>text-extracted</code> | [원문](./npm/60e0b68c0f35c078eef3a5d29419d0b03ff84ec1df9c3f9d6e39a519a5ae7985.txt) | [저장소](https://github.com/tailwindlabs/tailwindcss#v3) / [registry](https://registry.npmjs.org/tailwindcss/3.4.19) |
| frontend | <code>vite</code> | 6.4.2 | 개발 | MIT | <code>text-extracted</code> | [원문](./npm/c6bfec08b0e78a198c5ec0c579e699d2843fd1bf81243f648620731d03f43593.txt) | [저장소](https://github.com/vitejs/vite) / [registry](https://registry.npmjs.org/vite/6.4.2) |
| frontend | <code>vitest</code> | 4.1.10 | 개발 | MIT | <code>text-extracted</code> | [원문](./npm/881d660c26831481b697e39724d4a35c9f86e07b67156d4aeb693a0b39910435.txt) | [저장소](https://github.com/vitest-dev/vitest) / [registry](https://registry.npmjs.org/vitest/4.1.10) |
| frontend | <code>vitest-axe</code> | 0.1.0 | 개발 | MIT | <code>text-extracted</code> | [원문](./npm/dcef9df4e5e6d8d278b930b8a947f172207272c9d36ae0197c7cfae2a05af007.txt) | [저장소](https://github.com/chaance/vitest-axe) / [registry](https://registry.npmjs.org/vitest-axe/0.1.0) |
| desktop | <code>electron</code> | 30.5.1 | 개발 | MIT | <code>text-extracted</code> | [원문](./npm/5154e165bd6c2cc0cfbcd8916498c7abab0497923bafcd5cb07673fe8480087d.txt) | [저장소](https://github.com/electron/electron) / [registry](https://registry.npmjs.org/electron/30.5.1) |
| desktop | <code>electron-builder</code> | 24.13.3 | 개발 | MIT | <code>text-extracted</code> | [원문](./npm/bed8d0ab3e6031817f775a641ff37313b0f5591bc8ba0ed79b978dafbd4231ce.txt) | [저장소](https://github.com/electron-userland/electron-builder) / [registry](https://registry.npmjs.org/electron-builder/24.13.3) |
| desktop | <code>electron-updater</code> | 6.8.3 | 런타임 | MIT | <code>text-extracted</code> | [원문](./npm/bed8d0ab3e6031817f775a641ff37313b0f5591bc8ba0ed79b978dafbd4231ce.txt) | [저장소](https://github.com/electron-userland/electron-builder) / [registry](https://registry.npmjs.org/electron-updater/6.8.3) |
| mobile | <code>@gorhom/bottom-sheet</code> | 5.2.14 | 런타임 | MIT | <code>text-extracted</code> | [원문](./npm/4446bf7e04d5e620b0b2c958935317f61028fe446844cf9a6205e3878e13b934.txt) | [저장소](https://github.com/gorhom/react-native-bottom-sheet) / [registry](https://registry.npmjs.org/%40gorhom%2Fbottom-sheet/5.2.14) |
| mobile | <code>@react-native-async-storage/async-storage</code> | 2.2.0 | 런타임 | MIT | <code>text-extracted</code> | [원문](./npm/212dbf14b113759356207347826f21ac3c81151943fdb89ce25da5dc6214831c.txt) | [저장소](https://github.com/react-native-async-storage/async-storage) / [registry](https://registry.npmjs.org/%40react-native-async-storage%2Fasync-storage/2.2.0) |
| mobile | <code>@react-native-community/datetimepicker</code> | 9.1.0 | 런타임 | MIT | <code>text-extracted</code> | [원문](./npm/3f4b86b90801dc5ebeef0e70533241805502f7496bfe5dba2d131eaed837b0a3.txt) | [저장소](https://github.com/react-native-datetimepicker/datetimepicker) / [registry](https://registry.npmjs.org/%40react-native-community%2Fdatetimepicker/9.1.0) |
| mobile | <code>@react-native-community/slider</code> | 5.2.0 | 런타임 | MIT | <code>text-extracted</code> | [원문](./npm/7d060af61ae5e95c26d620ce2d40fec91ff3175824e516905e8a61b4d94b07af.txt) | [저장소](https://github.com/callstack/react-native-slider) / [registry](https://registry.npmjs.org/%40react-native-community%2Fslider/5.2.0) |
| mobile | <code>@react-native-firebase/app</code> | 25.1.0 | 런타임 | Apache-2.0 | <code>text-extracted</code> | [원문](./npm/ee8eb9aaab62cc99d7ab756a29d3016f3b80ae56be8cc25ae30af43515032f54.txt) | [저장소](https://github.com/invertase/react-native-firebase/tree/main/packages/app) / [registry](https://registry.npmjs.org/%40react-native-firebase%2Fapp/25.1.0) |
| mobile | <code>@react-native-firebase/messaging</code> | 25.1.0 | 런타임 | Apache-2.0 | <code>text-extracted</code> | [원문](./npm/9d1200165d417ce68417864b4f62ae7196686f4ca205975f8fe4cf311742b99a.txt) | [저장소](https://github.com/invertase/react-native-firebase/tree/main/packages/messaging) / [registry](https://registry.npmjs.org/%40react-native-firebase%2Fmessaging/25.1.0) |
| mobile | <code>@react-native-google-signin/google-signin</code> | 16.1.5 | 런타임 | MIT | <code>text-extracted</code> | [원문](./npm/3680a16525f40f4115c71d7f229ed134afb6946e31ae2af83aa35ce0bc58d539.txt) | [저장소](https://github.com/react-native-google-signin/google-signin) / [registry](https://registry.npmjs.org/%40react-native-google-signin%2Fgoogle-signin/16.1.5) |
| mobile | <code>@tanstack/react-query</code> | 5.102.8 | 런타임 | MIT | <code>text-extracted</code> | [원문](./npm/a405ee70c632bb938acb7ac5f210e814409b3760ea9d2329d8ed8ffcfd11a0e7.txt) | [저장소](https://github.com/TanStack/query) / [registry](https://registry.npmjs.org/%40tanstack%2Freact-query/5.102.8) |
| mobile | <code>@types/jest</code> | 29.5.14 | 개발 | MIT | <code>text-extracted</code> | [원문](./npm/c2cfccb812fe482101a8f04597dfc5a9991a6b2748266c47ac91b6a5aae15383.txt) | [저장소](https://github.com/DefinitelyTyped/DefinitelyTyped) / [registry](https://registry.npmjs.org/%40types%2Fjest/29.5.14) |
| mobile | <code>@types/react</code> | 19.2.18 | 개발 | MIT | <code>text-extracted</code> | [원문](./npm/c2cfccb812fe482101a8f04597dfc5a9991a6b2748266c47ac91b6a5aae15383.txt) | [저장소](https://github.com/DefinitelyTyped/DefinitelyTyped) / [registry](https://registry.npmjs.org/%40types%2Freact/19.2.18) |
| mobile | <code>axios</code> | 1.20.0 | 런타임 | MIT | <code>text-extracted</code> | [원문](./npm/82761059eaedacb3356803aea8a170d8298609f91b14fc32ee1bfb40d690183c.txt) | [저장소](https://github.com/axios/axios) / [registry](https://registry.npmjs.org/axios/1.20.0) |
| mobile | <code>eslint</code> | 9.39.5 | 런타임 | MIT | <code>text-extracted</code> | [원문](./npm/3b6be04f862a077a4b97929dbf247299360824d9365f8603c263769303ace18c.txt) | [저장소](https://github.com/eslint/eslint) / [registry](https://registry.npmjs.org/eslint/9.39.5) |
| mobile | <code>eslint-config-expo</code> | 57.0.2 | 런타임 | MIT | <code>text-extracted</code> | [원문](./npm/acbfa926c94dd5f7e51cc34e690b25cce1cec979560988473139cd5081356dcd.txt) | [저장소](https://github.com/expo/expo) / [registry](https://registry.npmjs.org/eslint-config-expo/57.0.2) |
| mobile | <code>eslint-plugin-react-native-a11y</code> | 3.5.1 | 개발 | MIT | <code>text-extracted</code> | [원문](./npm/3777bcd6258db85aae7a4a7efd54d350aa9e0ac55e2ecb810565ca8d4f2e7dfb.txt) | [저장소](https://github.com/FormidableLabs/eslint-plugin-react-native-a11y) / [registry](https://registry.npmjs.org/eslint-plugin-react-native-a11y/3.5.1) |
| mobile | <code>expo</code> | 57.0.20 | 런타임 | MIT | <code>text-extracted</code> | [원문](./npm/fb3ca4a837f5779e83cef89b78253a8949cfb9429c340309f62d0465ec6610b4.txt) | [저장소](https://github.com/expo/expo) / [registry](https://registry.npmjs.org/expo/57.0.20) |
| mobile | <code>expo-constants</code> | 57.0.17 | 런타임 | MIT | <code>text-extracted</code> | [원문](./npm/fb3ca4a837f5779e83cef89b78253a8949cfb9429c340309f62d0465ec6610b4.txt) | [저장소](https://github.com/expo/expo) / [registry](https://registry.npmjs.org/expo-constants/57.0.17) |
| mobile | <code>expo-dev-client</code> | 57.0.18 | 런타임 | MIT | <code>text-extracted</code> | [원문](./npm/fb3ca4a837f5779e83cef89b78253a8949cfb9429c340309f62d0465ec6610b4.txt) | [저장소](https://github.com/expo/expo) / [registry](https://registry.npmjs.org/expo-dev-client/57.0.18) |
| mobile | <code>expo-font</code> | 57.0.3 | 런타임 | MIT | <code>text-extracted</code> | [원문](./npm/fb3ca4a837f5779e83cef89b78253a8949cfb9429c340309f62d0465ec6610b4.txt) | [저장소](https://github.com/expo/expo) / [registry](https://registry.npmjs.org/expo-font/57.0.3) |
| mobile | <code>expo-linking</code> | 57.0.9 | 런타임 | MIT | <code>text-extracted</code> | [원문](./npm/fb3ca4a837f5779e83cef89b78253a8949cfb9429c340309f62d0465ec6610b4.txt) | [저장소](https://github.com/expo/expo) / [registry](https://registry.npmjs.org/expo-linking/57.0.9) |
| mobile | <code>expo-router</code> | 57.0.19 | 런타임 | MIT | <code>text-extracted</code> | [원문](./npm/fb3ca4a837f5779e83cef89b78253a8949cfb9429c340309f62d0465ec6610b4.txt) | [저장소](https://github.com/expo/expo) / [registry](https://registry.npmjs.org/expo-router/57.0.19) |
| mobile | <code>expo-splash-screen</code> | 57.0.8 | 런타임 | MIT | <code>text-extracted</code> | [원문](./npm/fb3ca4a837f5779e83cef89b78253a8949cfb9429c340309f62d0465ec6610b4.txt) | [저장소](https://github.com/expo/expo) / [registry](https://registry.npmjs.org/expo-splash-screen/57.0.8) |
| mobile | <code>expo-status-bar</code> | 57.0.1 | 런타임 | MIT | <code>text-extracted</code> | [원문](./npm/fb3ca4a837f5779e83cef89b78253a8949cfb9429c340309f62d0465ec6610b4.txt) | [저장소](https://github.com/expo/expo) / [registry](https://registry.npmjs.org/expo-status-bar/57.0.1) |
| mobile | <code>expo-system-ui</code> | 57.0.3 | 런타임 | MIT | <code>text-extracted</code> | [원문](./npm/fb3ca4a837f5779e83cef89b78253a8949cfb9429c340309f62d0465ec6610b4.txt) | [저장소](https://github.com/expo/expo) / [registry](https://registry.npmjs.org/expo-system-ui/57.0.3) |
| mobile | <code>jest</code> | 29.7.0 | 런타임 | MIT | <code>text-extracted</code> | [원문](./npm/da6d3703ed11cbe42bd212c725957c98da23cbff1998c05fa4b3d976d1a58e93.txt) | [저장소](https://github.com/jestjs/jest) / [registry](https://registry.npmjs.org/jest/29.7.0) |
| mobile | <code>jest-expo</code> | 57.0.5 | 런타임 | MIT | <code>text-extracted</code> | [원문](./npm/fb3ca4a837f5779e83cef89b78253a8949cfb9429c340309f62d0465ec6610b4.txt) | [저장소](https://github.com/expo/expo) / [registry](https://registry.npmjs.org/jest-expo/57.0.5) |
| mobile | <code>react</code> | 19.2.3 | 런타임 | MIT | <code>text-extracted</code> | [원문](./npm/da6d3703ed11cbe42bd212c725957c98da23cbff1998c05fa4b3d976d1a58e93.txt) | [저장소](https://github.com/facebook/react) / [registry](https://registry.npmjs.org/react/19.2.3) |
| mobile | <code>react-dom</code> | 19.2.3 | 런타임 | MIT | <code>text-extracted</code> | [원문](./npm/da6d3703ed11cbe42bd212c725957c98da23cbff1998c05fa4b3d976d1a58e93.txt) | [저장소](https://github.com/facebook/react) / [registry](https://registry.npmjs.org/react-dom/19.2.3) |
| mobile | <code>react-native</code> | 0.86.3 | 런타임 | MIT | <code>text-extracted</code> | [원문](./npm/da6d3703ed11cbe42bd212c725957c98da23cbff1998c05fa4b3d976d1a58e93.txt) | [저장소](https://github.com/react/react-native) / [registry](https://registry.npmjs.org/react-native/0.86.3) |
| mobile | <code>react-native-gesture-handler</code> | 2.32.0 | 런타임 | MIT | <code>text-extracted</code> | [원문](./npm/f1ae22eddd3a96c3b7b8a494ef03749ae6a1e19574bacc9c195d83c916de09e2.txt) | [저장소](https://github.com/software-mansion/react-native-gesture-handler) / [registry](https://registry.npmjs.org/react-native-gesture-handler/2.32.0) |
| mobile | <code>react-native-markdown-display</code> | 7.0.2 | 런타임 | MIT | <code>text-extracted</code> | [원문](./npm/34c10ee9d3253968d8bec304cf910c4c6cc29f3be4ad602bec41eca674021268.txt) | [저장소](https://github.com/iamacup/react-native-markdown-display) / [registry](https://registry.npmjs.org/react-native-markdown-display/7.0.2) |
| mobile | <code>react-native-notify-kit</code> | 10.7.0 | 런타임 | Apache-2.0 | <code>text-extracted</code> | [원문](./npm/6da058a052e0700887d012271ef92a7fb34fbaddff78fdb321c8a5ae2d01e69e.txt) | [저장소](https://github.com/marcocrupi/react-native-notify-kit) / [registry](https://registry.npmjs.org/react-native-notify-kit/10.7.0) |
| mobile | <code>react-native-reanimated</code> | 4.5.1 | 런타임 | MIT | <code>text-extracted</code> | [원문](./npm/f1ae22eddd3a96c3b7b8a494ef03749ae6a1e19574bacc9c195d83c916de09e2.txt) | [저장소](https://github.com/software-mansion/react-native-reanimated) / [registry](https://registry.npmjs.org/react-native-reanimated/4.5.1) |
| mobile | <code>react-native-safe-area-context</code> | 5.7.0 | 런타임 | MIT | <code>text-extracted</code> | [원문](./npm/f5c7a4d527258e11fdfe3d84eb73cd14fe6d64224ef051e59f6ee21fe378800c.txt) | [저장소](https://github.com/AppAndFlow/react-native-safe-area-context) / [registry](https://registry.npmjs.org/react-native-safe-area-context/5.7.0) |
| mobile | <code>react-native-screens</code> | 4.26.2 | 런타임 | MIT | <code>text-extracted</code> | [원문](./npm/95b52e497653b738fd50e4bd3a8197dc41593c63129acb4f8069dbf49530ef82.txt) | [저장소](https://github.com/software-mansion/react-native-screens) / [registry](https://registry.npmjs.org/react-native-screens/4.26.2) |
| mobile | <code>react-native-svg</code> | 15.15.4 | 런타임 | MIT | <code>text-extracted</code> | [원문](./npm/1bc2aa7dad15097cd71308d9ae013ff14d11a84357b170c1554f4035fb8a3acb.txt) | [저장소](https://github.com/react-native-community/react-native-svg) / [registry](https://registry.npmjs.org/react-native-svg/15.15.4) |
| mobile | <code>react-native-web</code> | 0.21.2 | 런타임 | MIT | <code>text-extracted</code> | [원문](./npm/f961d81b4027c179ccd9200e72fa141f8c0575c1f3c93593f36645dc72bf5216.txt) | [저장소](https://github.com/necolas/react-native-web) / [registry](https://registry.npmjs.org/react-native-web/0.21.2) |
| mobile | <code>react-native-worklets</code> | 0.10.1 | 런타임 | MIT | <code>text-extracted</code> | [원문](./npm/92c22d327a6644efda43527bfa6f136f4382359f40bc288eda0764f67be9c269.txt) | [저장소](https://github.com/software-mansion/react-native-reanimated) / [registry](https://registry.npmjs.org/react-native-worklets/0.10.1) |
| mobile | <code>typescript</code> | 6.0.3 | 개발 | Apache-2.0 | <code>text-extracted</code> | [원문](./npm/a7d00bfd54525bc694b6e32f64c7ebcf5e6b7ae3657be5cc12767bce74654a47.txt) | [저장소](https://github.com/microsoft/TypeScript) / [registry](https://registry.npmjs.org/typescript/6.0.3) |

## 라이선스 원문과 미확인 항목

추출 가능한 원문 고지는 각 상세 항목의 license.originalTexts[].file에서 npm/<SHA-256>.txt로 연결됩니다. text-extracted는 원문 파일을 확보했다는 뜻이며, 법적 호환성이나 재배포 의무가 자동으로 판정되었다는 뜻은 아닙니다.

플랫폼 선택형과 선택 의존성 미설치는 현재 머신에 없는 패키지라는 설치 상태이며, 실제 라이선스 미확인과 구분합니다. 원문 미동봉은 같은 버전의 선언을 확인했지만 npm 배포물에서 LICENSE/NOTICE를 찾지 못한 경우입니다. 실제 수동 확인 항목만 앱 자체 라이선스 결정 전에 검토합니다.

### 플랫폼 선택형으로 현재 설치되지 않은 패키지

- <code>desktop:node_modules/dmg-license</code> — dmg-license@1.0.11: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>desktop:node_modules/iconv-corefoundation</code> — iconv-corefoundation@1.1.7: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@esbuild/aix-ppc64</code> — @esbuild/aix-ppc64@0.25.12: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@esbuild/android-arm</code> — @esbuild/android-arm@0.25.12: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@esbuild/android-arm64</code> — @esbuild/android-arm64@0.25.12: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@esbuild/android-x64</code> — @esbuild/android-x64@0.25.12: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@esbuild/darwin-arm64</code> — @esbuild/darwin-arm64@0.25.12: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@esbuild/darwin-x64</code> — @esbuild/darwin-x64@0.25.12: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@esbuild/freebsd-arm64</code> — @esbuild/freebsd-arm64@0.25.12: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@esbuild/freebsd-x64</code> — @esbuild/freebsd-x64@0.25.12: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@esbuild/linux-arm</code> — @esbuild/linux-arm@0.25.12: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@esbuild/linux-arm64</code> — @esbuild/linux-arm64@0.25.12: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@esbuild/linux-ia32</code> — @esbuild/linux-ia32@0.25.12: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@esbuild/linux-loong64</code> — @esbuild/linux-loong64@0.25.12: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@esbuild/linux-mips64el</code> — @esbuild/linux-mips64el@0.25.12: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@esbuild/linux-ppc64</code> — @esbuild/linux-ppc64@0.25.12: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@esbuild/linux-riscv64</code> — @esbuild/linux-riscv64@0.25.12: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@esbuild/linux-s390x</code> — @esbuild/linux-s390x@0.25.12: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@esbuild/linux-x64</code> — @esbuild/linux-x64@0.25.12: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@esbuild/netbsd-arm64</code> — @esbuild/netbsd-arm64@0.25.12: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@esbuild/netbsd-x64</code> — @esbuild/netbsd-x64@0.25.12: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@esbuild/openbsd-arm64</code> — @esbuild/openbsd-arm64@0.25.12: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@esbuild/openbsd-x64</code> — @esbuild/openbsd-x64@0.25.12: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@esbuild/openharmony-arm64</code> — @esbuild/openharmony-arm64@0.25.12: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@esbuild/sunos-x64</code> — @esbuild/sunos-x64@0.25.12: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@esbuild/win32-arm64</code> — @esbuild/win32-arm64@0.25.12: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@esbuild/win32-ia32</code> — @esbuild/win32-ia32@0.25.12: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@rollup/rollup-android-arm-eabi</code> — @rollup/rollup-android-arm-eabi@4.60.1: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@rollup/rollup-android-arm64</code> — @rollup/rollup-android-arm64@4.60.1: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@rollup/rollup-darwin-arm64</code> — @rollup/rollup-darwin-arm64@4.60.1: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@rollup/rollup-darwin-x64</code> — @rollup/rollup-darwin-x64@4.60.1: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@rollup/rollup-freebsd-arm64</code> — @rollup/rollup-freebsd-arm64@4.60.1: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@rollup/rollup-freebsd-x64</code> — @rollup/rollup-freebsd-x64@4.60.1: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@rollup/rollup-linux-arm-gnueabihf</code> — @rollup/rollup-linux-arm-gnueabihf@4.60.1: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@rollup/rollup-linux-arm-musleabihf</code> — @rollup/rollup-linux-arm-musleabihf@4.60.1: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@rollup/rollup-linux-arm64-gnu</code> — @rollup/rollup-linux-arm64-gnu@4.60.1: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@rollup/rollup-linux-arm64-musl</code> — @rollup/rollup-linux-arm64-musl@4.60.1: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@rollup/rollup-linux-loong64-gnu</code> — @rollup/rollup-linux-loong64-gnu@4.60.1: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@rollup/rollup-linux-loong64-musl</code> — @rollup/rollup-linux-loong64-musl@4.60.1: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@rollup/rollup-linux-ppc64-gnu</code> — @rollup/rollup-linux-ppc64-gnu@4.60.1: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@rollup/rollup-linux-ppc64-musl</code> — @rollup/rollup-linux-ppc64-musl@4.60.1: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@rollup/rollup-linux-riscv64-gnu</code> — @rollup/rollup-linux-riscv64-gnu@4.60.1: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@rollup/rollup-linux-riscv64-musl</code> — @rollup/rollup-linux-riscv64-musl@4.60.1: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@rollup/rollup-linux-s390x-gnu</code> — @rollup/rollup-linux-s390x-gnu@4.60.1: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@rollup/rollup-linux-x64-gnu</code> — @rollup/rollup-linux-x64-gnu@4.60.1: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@rollup/rollup-linux-x64-musl</code> — @rollup/rollup-linux-x64-musl@4.60.1: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@rollup/rollup-openbsd-x64</code> — @rollup/rollup-openbsd-x64@4.60.1: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@rollup/rollup-openharmony-arm64</code> — @rollup/rollup-openharmony-arm64@4.60.1: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@rollup/rollup-win32-arm64-msvc</code> — @rollup/rollup-win32-arm64-msvc@4.60.1: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@rollup/rollup-win32-ia32-msvc</code> — @rollup/rollup-win32-ia32-msvc@4.60.1: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>frontend:node_modules/@sentry/cli-darwin</code> — @sentry/cli-darwin@2.58.5: <code>platform-selectable-metadata-unavailable</code> (FSL-1.1-MIT)
- <code>frontend:node_modules/@sentry/cli-linux-arm</code> — @sentry/cli-linux-arm@2.58.5: <code>platform-selectable-metadata-unavailable</code> (FSL-1.1-MIT)
- <code>frontend:node_modules/@sentry/cli-linux-arm64</code> — @sentry/cli-linux-arm64@2.58.5: <code>platform-selectable-metadata-unavailable</code> (FSL-1.1-MIT)
- <code>frontend:node_modules/@sentry/cli-linux-i686</code> — @sentry/cli-linux-i686@2.58.5: <code>platform-selectable-metadata-unavailable</code> (FSL-1.1-MIT)
- <code>frontend:node_modules/@sentry/cli-linux-x64</code> — @sentry/cli-linux-x64@2.58.5: <code>platform-selectable-metadata-unavailable</code> (FSL-1.1-MIT)
- <code>frontend:node_modules/@sentry/cli-win32-arm64</code> — @sentry/cli-win32-arm64@2.58.5: <code>platform-selectable-metadata-unavailable</code> (FSL-1.1-MIT)
- <code>frontend:node_modules/@sentry/cli-win32-i686</code> — @sentry/cli-win32-i686@2.58.5: <code>platform-selectable-metadata-unavailable</code> (FSL-1.1-MIT)
- <code>frontend:node_modules/fsevents</code> — fsevents@2.3.3: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>mobile:node_modules/@unrs/resolver-binding-android-arm-eabi</code> — @unrs/resolver-binding-android-arm-eabi@1.12.2: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>mobile:node_modules/@unrs/resolver-binding-android-arm64</code> — @unrs/resolver-binding-android-arm64@1.12.2: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>mobile:node_modules/@unrs/resolver-binding-darwin-arm64</code> — @unrs/resolver-binding-darwin-arm64@1.12.2: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>mobile:node_modules/@unrs/resolver-binding-darwin-x64</code> — @unrs/resolver-binding-darwin-x64@1.12.2: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>mobile:node_modules/@unrs/resolver-binding-freebsd-x64</code> — @unrs/resolver-binding-freebsd-x64@1.12.2: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>mobile:node_modules/@unrs/resolver-binding-linux-arm-gnueabihf</code> — @unrs/resolver-binding-linux-arm-gnueabihf@1.12.2: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>mobile:node_modules/@unrs/resolver-binding-linux-arm-musleabihf</code> — @unrs/resolver-binding-linux-arm-musleabihf@1.12.2: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>mobile:node_modules/@unrs/resolver-binding-linux-arm64-gnu</code> — @unrs/resolver-binding-linux-arm64-gnu@1.12.2: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>mobile:node_modules/@unrs/resolver-binding-linux-arm64-musl</code> — @unrs/resolver-binding-linux-arm64-musl@1.12.2: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>mobile:node_modules/@unrs/resolver-binding-linux-loong64-gnu</code> — @unrs/resolver-binding-linux-loong64-gnu@1.12.2: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>mobile:node_modules/@unrs/resolver-binding-linux-loong64-musl</code> — @unrs/resolver-binding-linux-loong64-musl@1.12.2: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>mobile:node_modules/@unrs/resolver-binding-linux-ppc64-gnu</code> — @unrs/resolver-binding-linux-ppc64-gnu@1.12.2: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>mobile:node_modules/@unrs/resolver-binding-linux-riscv64-gnu</code> — @unrs/resolver-binding-linux-riscv64-gnu@1.12.2: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>mobile:node_modules/@unrs/resolver-binding-linux-riscv64-musl</code> — @unrs/resolver-binding-linux-riscv64-musl@1.12.2: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>mobile:node_modules/@unrs/resolver-binding-linux-s390x-gnu</code> — @unrs/resolver-binding-linux-s390x-gnu@1.12.2: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>mobile:node_modules/@unrs/resolver-binding-linux-x64-gnu</code> — @unrs/resolver-binding-linux-x64-gnu@1.12.2: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>mobile:node_modules/@unrs/resolver-binding-linux-x64-musl</code> — @unrs/resolver-binding-linux-x64-musl@1.12.2: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>mobile:node_modules/@unrs/resolver-binding-openharmony-arm64</code> — @unrs/resolver-binding-openharmony-arm64@1.12.2: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>mobile:node_modules/@unrs/resolver-binding-wasm32-wasi</code> — @unrs/resolver-binding-wasm32-wasi@1.12.2: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>mobile:node_modules/@unrs/resolver-binding-win32-arm64-msvc</code> — @unrs/resolver-binding-win32-arm64-msvc@1.12.2: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>mobile:node_modules/@unrs/resolver-binding-win32-ia32-msvc</code> — @unrs/resolver-binding-win32-ia32-msvc@1.12.2: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>mobile:node_modules/fsevents</code> — fsevents@2.3.3: <code>platform-selectable-metadata-unavailable</code> (MIT)
- <code>mobile:node_modules/lightningcss-android-arm64</code> — lightningcss-android-arm64@1.33.0: <code>platform-selectable-metadata-unavailable</code> (MPL-2.0)
- <code>mobile:node_modules/lightningcss-darwin-arm64</code> — lightningcss-darwin-arm64@1.33.0: <code>platform-selectable-metadata-unavailable</code> (MPL-2.0)
- <code>mobile:node_modules/lightningcss-darwin-x64</code> — lightningcss-darwin-x64@1.33.0: <code>platform-selectable-metadata-unavailable</code> (MPL-2.0)
- <code>mobile:node_modules/lightningcss-freebsd-x64</code> — lightningcss-freebsd-x64@1.33.0: <code>platform-selectable-metadata-unavailable</code> (MPL-2.0)
- <code>mobile:node_modules/lightningcss-linux-arm-gnueabihf</code> — lightningcss-linux-arm-gnueabihf@1.33.0: <code>platform-selectable-metadata-unavailable</code> (MPL-2.0)
- <code>mobile:node_modules/lightningcss-linux-arm64-gnu</code> — lightningcss-linux-arm64-gnu@1.33.0: <code>platform-selectable-metadata-unavailable</code> (MPL-2.0)
- <code>mobile:node_modules/lightningcss-linux-arm64-musl</code> — lightningcss-linux-arm64-musl@1.33.0: <code>platform-selectable-metadata-unavailable</code> (MPL-2.0)
- <code>mobile:node_modules/lightningcss-linux-x64-gnu</code> — lightningcss-linux-x64-gnu@1.33.0: <code>platform-selectable-metadata-unavailable</code> (MPL-2.0)
- <code>mobile:node_modules/lightningcss-linux-x64-musl</code> — lightningcss-linux-x64-musl@1.33.0: <code>platform-selectable-metadata-unavailable</code> (MPL-2.0)
- <code>mobile:node_modules/lightningcss-win32-arm64-msvc</code> — lightningcss-win32-arm64-msvc@1.33.0: <code>platform-selectable-metadata-unavailable</code> (MPL-2.0)

### 선택 의존성으로 현재 설치되지 않은 패키지

- <code>desktop:node_modules/@types/plist</code> — @types/plist@3.0.5: <code>optional-package-metadata-unavailable</code> (MIT)
- <code>desktop:node_modules/@types/verror</code> — @types/verror@1.10.11: <code>optional-package-metadata-unavailable</code> (MIT)
- <code>desktop:node_modules/assert-plus</code> — assert-plus@1.0.0: <code>optional-package-metadata-unavailable</code> (MIT)
- <code>desktop:node_modules/cli-truncate</code> — cli-truncate@2.1.0: <code>optional-package-metadata-unavailable</code> (MIT)
- <code>desktop:node_modules/crc</code> — crc@3.8.0: <code>optional-package-metadata-unavailable</code> (MIT)
- <code>desktop:node_modules/extsprintf</code> — extsprintf@1.4.1: <code>optional-package-metadata-unavailable</code> (MIT)
- <code>desktop:node_modules/node-addon-api</code> — node-addon-api@1.7.2: <code>optional-package-metadata-unavailable</code> (MIT)
- <code>desktop:node_modules/slice-ansi</code> — slice-ansi@3.0.0: <code>optional-package-metadata-unavailable</code> (MIT)
- <code>desktop:node_modules/verror</code> — verror@1.10.1: <code>optional-package-metadata-unavailable</code> (MIT)

### 원문이 npm 배포물에 동봉되지 않은 패키지

- <code>desktop:node_modules/agent-base</code> — agent-base@6.0.2: <code>license-text-not-packaged</code> (MIT)
- <code>desktop:node_modules/app-builder-bin</code> — app-builder-bin@4.0.0: <code>license-text-not-packaged</code> (MIT)
- <code>desktop:node_modules/app-builder-lib</code> — app-builder-lib@24.13.3: <code>license-text-not-packaged</code> (MIT)
- <code>desktop:node_modules/bluebird-lst</code> — bluebird-lst@1.0.9: <code>license-text-not-packaged</code> (MIT)
- <code>desktop:node_modules/chromium-pickle-js</code> — chromium-pickle-js@0.2.0: <code>license-text-not-packaged</code> (MIT)
- <code>desktop:node_modules/compare-version</code> — compare-version@0.1.2: <code>license-text-not-packaged</code> (MIT)
- <code>desktop:node_modules/dmg-builder</code> — dmg-builder@24.13.3: <code>license-text-not-packaged</code> (MIT)
- <code>desktop:node_modules/eastasianwidth</code> — eastasianwidth@0.2.0: <code>license-text-not-packaged</code> (MIT)
- <code>desktop:node_modules/err-code</code> — err-code@2.0.3: <code>license-text-not-packaged</code> (MIT)
- <code>desktop:node_modules/filelist</code> — filelist@1.0.6: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>desktop:node_modules/http-proxy-agent</code> — http-proxy-agent@5.0.0: <code>license-text-not-packaged</code> (MIT)
- <code>desktop:node_modules/https-proxy-agent</code> — https-proxy-agent@5.0.1: <code>license-text-not-packaged</code> (MIT)
- <code>desktop:node_modules/isarray</code> — isarray@1.0.0: <code>license-text-not-packaged</code> (MIT)
- <code>desktop:node_modules/jake</code> — jake@10.9.4: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>desktop:node_modules/keyv</code> — keyv@4.5.4: <code>license-text-not-packaged</code> (MIT)
- <code>desktop:node_modules/lazy-val</code> — lazy-val@1.0.5: <code>license-text-not-packaged</code> (MIT)
- <code>desktop:node_modules/temp-file</code> — temp-file@3.4.0: <code>license-text-not-packaged</code> (MIT)
- <code>desktop:node_modules/tmp-promise</code> — tmp-promise@3.0.3: <code>license-text-not-packaged</code> (MIT)
- <code>desktop:node_modules/truncate-utf8-bytes</code> — truncate-utf8-bytes@1.0.2: <code>license-text-not-packaged</code> (WTFPL)
- <code>frontend:node_modules/@esbuild/win32-x64</code> — @esbuild/win32-x64@0.25.12: <code>license-text-not-packaged</code> (MIT)
- <code>frontend:node_modules/@rollup/rollup-win32-x64-gnu</code> — @rollup/rollup-win32-x64-gnu@4.60.1: <code>license-text-not-packaged</code> (MIT)
- <code>frontend:node_modules/@rollup/rollup-win32-x64-msvc</code> — @rollup/rollup-win32-x64-msvc@4.60.1: <code>license-text-not-packaged</code> (MIT)
- <code>frontend:node_modules/@sentry/cli-win32-x64</code> — @sentry/cli-win32-x64@2.58.5: <code>license-text-not-packaged</code> (FSL-1.1-MIT)
- <code>frontend:node_modules/agent-base</code> — agent-base@6.0.2: <code>license-text-not-packaged</code> (MIT)
- <code>frontend:node_modules/dlv</code> — dlv@1.1.3: <code>license-text-not-packaged</code> (MIT)
- <code>frontend:node_modules/esrecurse</code> — esrecurse@4.3.0: <code>license-text-not-packaged</code> (BSD-2-Clause)
- <code>frontend:node_modules/https-proxy-agent</code> — https-proxy-agent@5.0.1: <code>license-text-not-packaged</code> (MIT)
- <code>frontend:node_modules/imurmurhash</code> — imurmurhash@0.1.4: <code>license-text-not-packaged</code> (MIT)
- <code>frontend:node_modules/keyv</code> — keyv@4.5.4: <code>license-text-not-packaged</code> (MIT)
- <code>frontend:node_modules/language-subtag-registry</code> — language-subtag-registry@0.3.23: <code>license-text-not-packaged</code> (CC0-1.0)
- <code>frontend:node_modules/language-tags</code> — language-tags@1.0.9: <code>license-text-not-packaged</code> (MIT)
- <code>frontend:node_modules/natural-compare</code> — natural-compare@1.4.0: <code>license-text-not-packaged</code> (MIT)
- <code>frontend:node_modules/saxes</code> — saxes@6.0.0: <code>license-text-not-packaged</code> (ISC)
- <code>frontend:node_modules/stackback</code> — stackback@0.0.2: <code>license-text-not-packaged</code> (MIT)
- <code>frontend:node_modules/tr46</code> — tr46@0.0.3: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/@expo/devcert</code> — @expo/devcert@1.2.1: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/@expo/sdk-runtime-versions</code> — @expo/sdk-runtime-versions@1.0.0: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/@expo/ui</code> — @expo/ui@57.0.16: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/@expo/ws-tunnel</code> — @expo/ws-tunnel@2.0.0: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/@expo/xcpretty</code> — @expo/xcpretty@4.4.4: <code>license-text-not-packaged</code> (BSD-3-Clause)
- <code>mobile:node_modules/@firebase/ai</code> — @firebase/ai@2.13.1: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/@firebase/analytics</code> — @firebase/analytics@0.10.22: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/@firebase/analytics-compat</code> — @firebase/analytics-compat@0.2.28: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/@firebase/analytics-types</code> — @firebase/analytics-types@0.8.4: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/@firebase/app</code> — @firebase/app@0.15.0: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/@firebase/app-check</code> — @firebase/app-check@0.12.0: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/@firebase/app-check-compat</code> — @firebase/app-check-compat@0.4.5: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/@firebase/app-check-interop-types</code> — @firebase/app-check-interop-types@0.3.4: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/@firebase/app-check-types</code> — @firebase/app-check-types@0.5.4: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/@firebase/app-compat</code> — @firebase/app-compat@0.5.14: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/@firebase/app-types</code> — @firebase/app-types@0.9.5: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/@firebase/auth</code> — @firebase/auth@1.13.3: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/@firebase/auth-compat</code> — @firebase/auth-compat@0.6.8: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/@firebase/auth-interop-types</code> — @firebase/auth-interop-types@0.2.5: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/@firebase/auth-types</code> — @firebase/auth-types@0.13.1: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/@firebase/component</code> — @firebase/component@0.7.3: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/@firebase/data-connect</code> — @firebase/data-connect@0.7.1: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/@firebase/database</code> — @firebase/database@1.1.3: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/@firebase/database-compat</code> — @firebase/database-compat@2.1.4: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/@firebase/database-types</code> — @firebase/database-types@1.0.20: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/@firebase/firestore</code> — @firebase/firestore@4.16.0: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/@firebase/firestore-compat</code> — @firebase/firestore-compat@0.4.11: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/@firebase/firestore-types</code> — @firebase/firestore-types@3.0.4: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/@firebase/functions</code> — @firebase/functions@0.13.5: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/@firebase/functions-compat</code> — @firebase/functions-compat@0.4.5: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/@firebase/functions-types</code> — @firebase/functions-types@0.6.4: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/@firebase/installations</code> — @firebase/installations@0.6.22: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/@firebase/installations-compat</code> — @firebase/installations-compat@0.2.22: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/@firebase/installations-types</code> — @firebase/installations-types@0.5.4: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/@firebase/logger</code> — @firebase/logger@0.5.1: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/@firebase/messaging</code> — @firebase/messaging@0.13.0: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/@firebase/messaging-compat</code> — @firebase/messaging-compat@0.2.27: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/@firebase/messaging-interop-types</code> — @firebase/messaging-interop-types@0.2.5: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/@firebase/performance</code> — @firebase/performance@0.7.12: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/@firebase/performance-compat</code> — @firebase/performance-compat@0.2.25: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/@firebase/performance-types</code> — @firebase/performance-types@0.2.4: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/@firebase/remote-config</code> — @firebase/remote-config@0.8.5: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/@firebase/remote-config-compat</code> — @firebase/remote-config-compat@0.2.26: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/@firebase/remote-config-types</code> — @firebase/remote-config-types@0.5.1: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/@firebase/storage</code> — @firebase/storage@0.14.3: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/@firebase/storage-compat</code> — @firebase/storage-compat@0.4.3: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/@firebase/storage-types</code> — @firebase/storage-types@0.8.4: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/@firebase/util</code> — @firebase/util@1.15.1: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/@firebase/webchannel-wrapper</code> — @firebase/webchannel-wrapper@1.0.6: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/@humanfs/types</code> — @humanfs/types@0.15.0: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/@napi-rs/wasm-runtime</code> — @napi-rs/wasm-runtime@1.2.3: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/@react-native/assets-registry</code> — @react-native/assets-registry@0.86.3: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/@react-native/babel-plugin-codegen</code> — @react-native/babel-plugin-codegen@0.86.3: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/@react-native/babel-preset</code> — @react-native/babel-preset@0.86.3: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/@react-native/codegen</code> — @react-native/codegen@0.86.3: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/@react-native/community-cli-plugin</code> — @react-native/community-cli-plugin@0.86.3: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/@react-native/debugger-frontend</code> — @react-native/debugger-frontend@0.86.3: <code>license-text-not-packaged</code> (BSD-3-Clause)
- <code>mobile:node_modules/@react-native/debugger-shell</code> — @react-native/debugger-shell@0.86.3: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/@react-native/dev-middleware</code> — @react-native/dev-middleware@0.86.3: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/@react-native/gradle-plugin</code> — @react-native/gradle-plugin@0.86.3: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/@react-native/jest-preset</code> — @react-native/jest-preset@0.86.3: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/@react-native/js-polyfills</code> — @react-native/js-polyfills@0.86.3: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/@react-native/metro-babel-transformer</code> — @react-native/metro-babel-transformer@0.86.3: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/@react-native/metro-config</code> — @react-native/metro-config@0.86.3: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/@react-native/normalize-colors</code> — @react-native/normalize-colors@0.86.3: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/react-native-web/node_modules/@react-native/normalize-colors</code> — @react-native/normalize-colors@0.74.89: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/@react-native/virtualized-lists</code> — @react-native/virtualized-lists@0.86.3: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/@tybys/wasm-util</code> — @tybys/wasm-util@0.10.3: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/@types/json5</code> — @types/json5@0.0.29: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/@unrs/resolver-binding-win32-x64-msvc</code> — @unrs/resolver-binding-win32-x64-msvc@1.12.2: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/agent-base</code> — agent-base@6.0.2: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/babel-plugin-react-compiler</code> — babel-plugin-react-compiler@1.0.0: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/boolbase</code> — boolbase@1.0.0: <code>license-text-not-packaged</code> (ISC)
- <code>mobile:node_modules/bplist-parser</code> — bplist-parser@0.3.1: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/bser</code> — bser@2.1.1: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/client-only</code> — client-only@0.0.1: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/esrecurse</code> — esrecurse@4.3.0: <code>license-text-not-packaged</code> (BSD-2-Clause)
- <code>mobile:node_modules/fb-dotslash</code> — fb-dotslash@0.5.8: <code>license-text-not-packaged</code> ((MIT OR Apache-2.0))
- <code>mobile:node_modules/fb-watchman</code> — fb-watchman@2.0.2: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/firebase</code> — firebase@12.15.0: <code>license-text-not-packaged</code> (Apache-2.0)
- <code>mobile:node_modules/hermes-compiler</code> — hermes-compiler@250829098.0.17: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/http-proxy-agent</code> — http-proxy-agent@5.0.0: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/https-proxy-agent</code> — https-proxy-agent@5.0.1: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/imurmurhash</code> — imurmurhash@0.1.4: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/jest-pnp-resolver</code> — jest-pnp-resolver@1.2.3: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/jimp-compact</code> — jimp-compact@0.16.1: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/keyv</code> — keyv@4.5.4: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/metro</code> — metro@0.84.5: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/metro-config/node_modules/metro</code> — metro@0.84.6: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/metro-babel-transformer</code> — metro-babel-transformer@0.84.5: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/metro-config/node_modules/metro-babel-transformer</code> — metro-babel-transformer@0.84.6: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/metro-cache</code> — metro-cache@0.84.5: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/metro-config/node_modules/metro-cache</code> — metro-cache@0.84.6: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/metro-cache-key</code> — metro-cache-key@0.84.5: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/metro-config/node_modules/metro-cache-key</code> — metro-cache-key@0.84.6: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/@expo/metro/node_modules/metro-config</code> — metro-config@0.84.5: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/metro-config</code> — metro-config@0.84.6: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/metro/node_modules/metro-config</code> — metro-config@0.84.5: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/metro-config/node_modules/metro-core</code> — metro-core@0.84.6: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/metro-core</code> — metro-core@0.84.5: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/metro-config/node_modules/metro-file-map</code> — metro-file-map@0.84.6: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/metro-file-map</code> — metro-file-map@0.84.5: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/metro-config/node_modules/metro-minify-terser</code> — metro-minify-terser@0.84.6: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/metro-minify-terser</code> — metro-minify-terser@0.84.5: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/metro-config/node_modules/metro-resolver</code> — metro-resolver@0.84.6: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/metro-resolver</code> — metro-resolver@0.84.5: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/@expo/metro/node_modules/metro-runtime</code> — metro-runtime@0.84.5: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/metro-runtime</code> — metro-runtime@0.84.6: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/metro/node_modules/metro-runtime</code> — metro-runtime@0.84.5: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/metro-config/node_modules/metro-source-map</code> — metro-source-map@0.84.6: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/metro-source-map</code> — metro-source-map@0.84.5: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/metro-config/node_modules/metro-symbolicate</code> — metro-symbolicate@0.84.6: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/metro-symbolicate</code> — metro-symbolicate@0.84.5: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/metro-config/node_modules/metro-transform-plugins</code> — metro-transform-plugins@0.84.6: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/metro-transform-plugins</code> — metro-transform-plugins@0.84.5: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/metro-config/node_modules/metro-transform-worker</code> — metro-transform-worker@0.84.6: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/metro-transform-worker</code> — metro-transform-worker@0.84.5: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/natural-compare</code> — natural-compare@1.4.0: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/metro-config/node_modules/ob1</code> — ob1@0.84.6: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/ob1</code> — ob1@0.84.5: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/react-devtools-core</code> — react-devtools-core@6.1.5: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/react-remove-scroll-bar</code> — react-remove-scroll-bar@2.3.8: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/saxes</code> — saxes@6.0.0: <code>license-text-not-packaged</code> (ISC)
- <code>mobile:node_modules/server-only</code> — server-only@0.0.1: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/stable-hash</code> — stable-hash@0.0.5: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/standard-navigation</code> — standard-navigation@0.0.5: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/stream-buffers</code> — stream-buffers@2.2.0: <code>license-text-not-packaged</code> (Unlicense)
- <code>mobile:node_modules/structured-headers</code> — structured-headers@0.4.1: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/node-fetch/node_modules/tr46</code> — tr46@0.0.3: <code>license-text-not-packaged</code> (MIT)
- <code>mobile:node_modules/unrs-resolver</code> — unrs-resolver@1.12.2: <code>license-text-not-packaged</code> (MIT)

### 실제 수동 확인이 필요한 패키지

- <code>frontend:node_modules/playwright</code> — playwright@1.63.0: <code>unverified-package-metadata-unavailable</code> (Apache-2.0)
- <code>frontend:node_modules/playwright-core</code> — playwright-core@1.63.0: <code>unverified-package-metadata-unavailable</code> (Apache-2.0)
- <code>mobile:node_modules/ast-types-flow</code> — ast-types-flow@0.0.7: <code>unverified-package-metadata-unavailable</code> (ISC)
- <code>mobile:node_modules/exit</code> — exit@0.1.2: <code>text-extracted-needs-review</code> (—)
- <code>mobile:node_modules/flatted</code> — flatted@3.4.4: <code>unverified-package-metadata-unavailable</code> (ISC)


## 범위와 한계

- 이 목록은 npm lockfile 항목만 다룹니다. Android Gradle, Electron 런타임 번들, 운영체제 구성요소, 이미지·폰트·기타 에셋은 포함하지 않습니다.
- 런타임/개발 분류는 lockfile의 직접 의존성과 dependencies·optionalDependencies 그래프를 따라 계산했습니다. peer dependency, 조건부 로딩 또는 외부 번들링 경로는 별도로 검토해야 합니다.
- 설치된 패키지 메타데이터 또는 원문을 찾지 못했거나, 설치 버전이 lockfile과 다른 항목은 JSON과 이 문서에서 숨기지 않고 미확인 상태로 남겼습니다.
