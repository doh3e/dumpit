import { AppState } from 'react-native';
import { QueryClient, focusManager } from '@tanstack/react-query';

// RN에는 window focus가 없어 AppState 포그라운드 복귀를 focus로 연결
AppState.addEventListener('change', (s) => focusManager.setFocused(s === 'active'));

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true },
  },
});
