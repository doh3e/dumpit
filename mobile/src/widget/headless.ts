import { initPomodoro, getSession, startSession, pauseSession, resumeSession } from '../pomodoro/store';
import { loadSettings } from '../pomodoro/persistence';

/** 위젯 버튼 → HeadlessJsTaskService → 이 핸들러. 상태 전이는 전부 기존 스토어 경로(미러 훅 포함). */
export async function runPomodoroCommand({ command }: { command: string }): Promise<void> {
  await initPomodoro(); // 세션 로드 + 백그라운드 정산
  switch (command) {
    case 'start':
      if (!getSession()) await startSession(await loadSettings(), null);
      break;
    case 'pause':
      await pauseSession();
      break;
    case 'resume':
      await resumeSession();
      break;
  }
}
