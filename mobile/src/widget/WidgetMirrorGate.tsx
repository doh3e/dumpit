import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { mirrorConfig } from './mirror';
import { installTodayMirror } from './todayMirror';

export function WidgetConfigGate() {
  useEffect(() => {
    void mirrorConfig();
  }, []);

  return null;
}

export function WidgetMirrorGate() {
  const client = useQueryClient();

  useEffect(() => installTodayMirror(client), [client]);

  return null;
}
