import { Image, type ImageStyle, type StyleProp } from 'react-native';

const COIN = require('../../../assets/coin.png');

/** 코인 아이콘 — 웹 coin_image.png 동일 에셋 (🪙 이모지는 기기 폰트마다 달라 보여 쓰지 않는다) */
export function CoinIcon({ size = 14, style }: { size?: number; style?: StyleProp<ImageStyle> }) {
  return (
    <Image
      source={COIN}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
      accessibilityLabel="코인"
    />
  );
}
