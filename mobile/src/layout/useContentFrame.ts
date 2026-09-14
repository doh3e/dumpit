import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { contentFrame } from './contentFrame';

export function useContentFrame(padding = 16) {
  const { width } = useWindowDimensions();
  const { left, right } = useSafeAreaInsets();
  return contentFrame(width, left, right, padding);
}
