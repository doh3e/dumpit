import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import {
  Keyboard,
  Platform,
  useWindowDimensions,
  type KeyboardMetrics,
  type NativeMethods,
} from 'react-native';

type SheetKeyboardViewport = Pick<NativeMethods, 'measureInWindow'>;

export function getWindowLocalKeyboardTop(
  keyboardScreenY: number,
  keyboardHeight: number,
  windowHeight: number,
): number {
  if (![keyboardScreenY, keyboardHeight, windowHeight].every(Number.isFinite) || windowHeight <= 0) {
    return Math.max(0, windowHeight);
  }
  // Android keyboard screenY is display-space, while Fabric measureInWindow is app-window local
  // in a bottom split. A docked IME's frame bottom reveals that translated window origin.
  const windowOrigin = Math.max(0, keyboardScreenY + Math.max(0, keyboardHeight) - windowHeight);
  return Math.max(0, keyboardScreenY - windowOrigin);
}

export function getSheetKeyboardOverlap(
  viewportY: number,
  viewportHeight: number,
  keyboardScreenY: number,
): number {
  if (viewportHeight <= 0 || !Number.isFinite(keyboardScreenY)) return 0;
  return Math.max(0, viewportY + viewportHeight - keyboardScreenY);
}

export function useSheetKeyboardOverlap(
  viewportRef: RefObject<SheetKeyboardViewport | null>,
) {
  const enabled = Platform.OS === 'android';
  const { height: windowHeight } = useWindowDimensions();
  const windowHeightRef = useRef(windowHeight);

  const nativeKeyboardRef = useRef<KeyboardMetrics | null>(null);
  const keyboardFrameRef = useRef<KeyboardMetrics | null>(null);
  const measurementRevisionRef = useRef(0);
  const mountedRef = useRef(false);
  const [overlap, setOverlap] = useState(0);

  const syncNativeKeyboard = useCallback((metrics: KeyboardMetrics | null) => {
    if (metrics === nativeKeyboardRef.current) return;
    nativeKeyboardRef.current = metrics;
    keyboardFrameRef.current = metrics;
  }, []);

  const measure = useCallback(() => {
    if (!enabled) return;
    syncNativeKeyboard(Keyboard.metrics() ?? null);
    const keyboardFrame = keyboardFrameRef.current;
    const viewport = viewportRef.current;
    const revision = ++measurementRevisionRef.current;

    if (!keyboardFrame || typeof viewport?.measureInWindow !== 'function') {
      if (mountedRef.current) setOverlap(0);
      return;
    }

    viewport.measureInWindow((_x, y, _width, height) => {
      if (!mountedRef.current || revision !== measurementRevisionRef.current) return;

      const currentKeyboardFrame = keyboardFrameRef.current;
      if (!currentKeyboardFrame) {
        setOverlap(0);
        return;
      }

      const localKeyboardTop = getWindowLocalKeyboardTop(
        currentKeyboardFrame.screenY,
        currentKeyboardFrame.height,
        windowHeightRef.current,
      );
      setOverlap(getSheetKeyboardOverlap(y, height, localKeyboardTop));
    });
  }, [enabled, syncNativeKeyboard, viewportRef]);

  const reset = useCallback(() => {
    measurementRevisionRef.current += 1;
    nativeKeyboardRef.current = null;
    keyboardFrameRef.current = null;
    if (mountedRef.current) setOverlap(0);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (!enabled) {
      return () => {
        mountedRef.current = false;
        measurementRevisionRef.current += 1;
      };
    }
    const show = Keyboard.addListener('keyboardDidShow', (event) => {
      syncNativeKeyboard(event.endCoordinates);
      measure();
    });
    const hide = Keyboard.addListener('keyboardDidHide', reset);
    measure();

    return () => {
      mountedRef.current = false;
      measurementRevisionRef.current += 1;
      show.remove();
      hide.remove();
    };
  }, [enabled, measure, reset, syncNativeKeyboard]);

  useLayoutEffect(() => {
    windowHeightRef.current = windowHeight;
    measure();
  }, [measure, windowHeight]);

  return {
    keyboardOverlap: overlap,
    onViewportLayout: measure,
    resetKeyboardOverlap: reset,
  };
}
