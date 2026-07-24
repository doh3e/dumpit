import { useEffect, useState } from 'react';
import { AccessibilityInfo, Image, StyleSheet, View } from 'react-native';
import type { SpriteEntry } from '../../shop/spriteRegistry';

type Props = {
  sprite: SpriteEntry;
  size: number;            // 표시 한 변(px) — 프레임 시트는 프레임 1칸 기준
};

/** 픽셀 스프라이트 — frames 있으면 가로 시트를 프레임 스텝 재생 (웹 PixelSprite steps 애니 대응) */
export function PixelSprite({ sprite, size }: Props) {
  const frames = sprite.frames ?? 1;
  const [frame, setFrame] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
  }, []);

  useEffect(() => {
    if (frames <= 1 || reduceMotion) return;
    const t = setInterval(() => setFrame((f) => (f + 1) % frames), 1000 / (sprite.fps ?? 5));
    return () => clearInterval(t);
  }, [frames, reduceMotion, sprite.fps]);

  if (frames <= 1) {
    return <Image source={sprite.img} style={{ width: size, height: size }} resizeMode="contain" accessibilityLabel={sprite.name} />;
  }

  return (
    <View style={[styles.clip, { width: size, height: size }]} accessibilityLabel={sprite.name}>
      <Image
        source={sprite.img}
        style={{ width: size * frames, height: size, transform: [{ translateX: -frame * size }] }}
        resizeMode="stretch"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
});
