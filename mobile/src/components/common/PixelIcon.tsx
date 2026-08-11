import { Image, type ImageStyle, type StyleProp } from 'react-native';

/**
 * UI 도트 아이콘 — 이모지 대체(도트 통일 Phase A, 2026-08-11).
 * 마스터는 frontend gen_ui_icons.py가 만드는 100×100(20×20 도트 ×5 NEAREST) PNG를
 * 그대로 복사한다(assets/icons/). 5배 정수 마스터라 축소 표시에도 도트가 뭉개지지 않는다
 * (CoinIcon과 동일 접근). token·gear는 웹 크롬 아이콘 마스터(번개·톱니) 공유본.
 */
const ICONS = {
  sparkle: require('../../../assets/icons/ui_sparkle.png'),
  pencil: require('../../../assets/icons/ui_pencil.png'),
  pin: require('../../../assets/icons/ui_pin.png'),
  bulb: require('../../../assets/icons/ui_bulb.png'),
  home: require('../../../assets/icons/ui_home.png'),
  loop: require('../../../assets/icons/ui_loop.png'),
  scissors: require('../../../assets/icons/ui_scissors.png'),
  puzzle: require('../../../assets/icons/ui_puzzle.png'),
  user: require('../../../assets/icons/ui_user.png'),
  megaphone: require('../../../assets/icons/ui_megaphone.png'),
  bubble: require('../../../assets/icons/ui_bubble.png'),
  cart: require('../../../assets/icons/ui_cart.png'),
  question: require('../../../assets/icons/ui_question.png'),
  envelope: require('../../../assets/icons/ui_envelope.png'),
  document: require('../../../assets/icons/ui_document.png'),
  lock: require('../../../assets/icons/ui_lock.png'),
  token: require('../../../assets/icons/ui_token.png'),
  gear: require('../../../assets/icons/ui_gear.png'),
  // 위젯 컬러 토마토 스프라이트 1프레임 재사용 (128×128, w_i_tomato_c_f1)
  tomato: require('../../../assets/icons/ui_tomato.png'),
  moon: require('../../../assets/icons/ui_moon.png'),
  calendar: require('../../../assets/icons/ui_calendar.png'),
  // Phase B — 카테고리 8종(달력·순환·압정 재사용) + 버튼 잔여분
  briefcase: require('../../../assets/icons/ui_briefcase.png'),
  books: require('../../../assets/icons/ui_books.png'),
  broom: require('../../../assets/icons/ui_broom.png'),
  dumbbell: require('../../../assets/icons/ui_dumbbell.png'),
  gamepad: require('../../../assets/icons/ui_gamepad.png'),
  tree: require('../../../assets/icons/ui_tree.png'),
  sprout: require('../../../assets/icons/ui_sprout.png'),
  eye: require('../../../assets/icons/ui_eye.png'),
  sun: require('../../../assets/icons/ui_sun.png'),
  phone: require('../../../assets/icons/ui_phone.png'),
  ban: require('../../../assets/icons/ui_ban.png'),
  checkboxOff: require('../../../assets/icons/ui_checkbox_off.png'),
  checkboxOn: require('../../../assets/icons/ui_checkbox_on.png'),
} as const;

export type PixelIconName = keyof typeof ICONS;

type Props = {
  name: PixelIconName;
  /** 표시 한 변(px). 텍스트 인라인은 12, 버튼 아이콘 14, 리스트 16, 탭 20 권장 */
  size?: number;
  style?: StyleProp<ImageStyle>;
};

/** 장식용 — 의미는 항상 곁의 라벨/accessibilityLabel이 전달한다 */
export function PixelIcon({ name, size = 16, style }: Props) {
  return (
    <Image
      source={ICONS[name]}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
