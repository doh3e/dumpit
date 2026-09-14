import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { createQueryClient } from './queryClient';

function createAccountQuerySession() {
  const client = createQueryClient();
  let lifecycle = 0;

  return {
    client,
    mount() {
      const mountedLifecycle = ++lifecycle;
      return () => {
        // StrictMode effect 재설정은 건너뛰고, 실제 unmount에서는 자식 observer 정리 뒤 폐기한다.
        queueMicrotask(() => {
          if (lifecycle !== mountedLifecycle) return;
          client.getMutationCache().getAll().forEach((mutation) => mutation.destroy());
          client.clear();
        });
      };
    },
  };
}

function AccountQueryBoundary({ children }: { children: ReactNode }) {
  const [session] = useState(createAccountQuerySession);

  useEffect(() => session.mount(), [session]);

  return <QueryClientProvider client={session.client}>{children}</QueryClientProvider>;
}

export function AccountQueryProvider({ children }: { children: ReactNode }) {
  const { me } = useAuth();
  const sessionKey = me ? `account:${me.email}` : 'anonymous';
  return <AccountQueryBoundary key={sessionKey}>{children}</AccountQueryBoundary>;
}
