import { useState } from 'react';
import { Image, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

/**
 * 부모를 가득 채우도록 타일을 반복하는 배경 이미지.
 *
 * `resizeMode="repeat"`는 뷰 프레임을 채우도록 반복하는데, absoluteFill만 준 Image는
 * Fabric에서 프레임이 제대로 잡히지 않아 위쪽 일부만 그려진다. 실측 크기를 명시해야 한다.
 * 터치를 가로채지 않도록 pointerEvents는 항상 none.
 */
export function TiledImage({ source }: { source: number }) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  };

  return (
    <View pointerEvents="none" onLayout={onLayout} style={StyleSheet.absoluteFill}>
      {size.width > 0 && (
        <Image
          source={source}
          style={{ position: 'absolute', top: 0, left: 0, width: size.width, height: size.height }}
          resizeMode="repeat"
        />
      )}
    </View>
  );
}
