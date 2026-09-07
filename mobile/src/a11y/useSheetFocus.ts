import { useCallback, useEffect, useRef } from 'react';
import { AccessibilityInfo, findNodeHandle, type Text } from 'react-native';
import { useSheetA11y } from './SheetA11yContext';

/** onChange(index)를 열림/닫힘 에지로 바꾼다 — 스냅 변경(>=0 반복)은 무시 */
export function openEdge(wasOpen: boolean, index: number): 'open' | 'close' | null {
  if (index >= 0 && !wasOpen) return 'open';
  if (index < 0 && wasOpen) return 'close';
  return null;
}

/** 바텀시트가 열리면(index>=0) 제목으로 TalkBack 포커스를 옮긴다. 닫힘(-1) 시 복귀는 OS가 처리 */
export function useSheetFocus() {
  const headingRef = useRef<Text>(null);
  const openRef = useRef(false);
  const { setSheetOpen } = useSheetA11y();

  // 열린 채로 언마운트되면 카운트가 새어 배경이 영영 숨겨진다
  useEffect(() => () => {
    if (openRef.current) {
      openRef.current = false;
      setSheetOpen(false);
    }
  }, [setSheetOpen]);

  const onChange = useCallback((index: number) => {
    const edge = openEdge(openRef.current, index);
    if (edge === 'close') {
      openRef.current = false;
      setSheetOpen(false);
      return;
    }
    if (edge !== 'open') return;
    openRef.current = true;
    setSheetOpen(true);
    const tag = headingRef.current ? findNodeHandle(headingRef.current) : null;
    if (tag) setTimeout(() => AccessibilityInfo.setAccessibilityFocus(tag), 50);
  }, [setSheetOpen]);

  return { headingRef, onChange };
}
