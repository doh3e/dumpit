import { useCallback, useRef } from 'react';
import { AccessibilityInfo, findNodeHandle, type Text } from 'react-native';

/** 바텀시트가 열리면(index>=0) 제목으로 TalkBack 포커스를 옮긴다. 닫힘(-1) 시 복귀는 OS가 처리 */
export function useSheetFocus() {
  const headingRef = useRef<Text>(null);
  const onChange = useCallback((index: number) => {
    if (index < 0) return;
    const tag = headingRef.current ? findNodeHandle(headingRef.current) : null;
    if (tag) setTimeout(() => AccessibilityInfo.setAccessibilityFocus(tag), 50);
  }, []);
  return { headingRef, onChange };
}
