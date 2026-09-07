/** 폰트 패밀리 상수 — 화면 코드는 useTheme().fonts로만 받는다. 이 상수를 직접 import하는 곳은 theme/·widget/뿐 */
export const fonts = {
  display: 'Galmuri11',        // 히어로·섹션 제목·태스크 제목 (웹 갈무리11 400)
  displayBold: 'Galmuri11-Bold', // 갈무리11 700 대응
  body: 'Pretendard-Regular',
  bodyBold: 'Pretendard-Bold',
  chrome: 'DungGeunMo',        // 크롬층(탭바 라벨·뱃지 등)
} as const;

export type Fonts = { [K in keyof typeof fonts]: string };

/** 굵은 글자 모드 — 둥근모는 굵기가 하나뿐이라 같은 픽셀 계열 갈무리11 Bold로 대체(합성 볼드는 픽셀이 번진다) */
export function resolveFonts(bold: boolean): Fonts {
  if (!bold) return fonts;
  return {
    display: fonts.displayBold,
    displayBold: fonts.displayBold,
    body: fonts.bodyBold,
    bodyBold: fonts.bodyBold,
    chrome: fonts.displayBold,
  };
}
