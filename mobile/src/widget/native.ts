import { requireNativeModule } from 'expo-modules-core';

type DumpitWidgetNative = {
  mirrorConfig(json: string): Promise<void>;
  mirrorTodayTasks(json: string): Promise<void>;
  mirrorPomodoro(json: string | null): Promise<void>;
  mirrorTheme(json: string): Promise<void>;
};

let native: DumpitWidgetNative | null = null;
try {
  native = requireNativeModule<DumpitWidgetNative>('DumpitWidget');
} catch {
  native = null; // 위젯 모듈이 없는 APK(재빌드 전) — 미러는 조용히 무시
}

export const widgetNative = native;
