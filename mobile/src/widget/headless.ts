import { initPomodoro, getSession, startSession, pauseSession, resumeSession, resetSession } from '../pomodoro/store';
import { loadSettings } from '../pomodoro/persistence';

/** 위젯 버튼 → HeadlessJsTaskService → 이 핸들러. 상태 전이는 전부 기존 스토어 경로(미러 훅 포함). */
export async function runPomodoroCommand({ command }: { command: string }): Promise<void> {
  await initPomodoro();
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
    case 'reset':
      // 미정산 세트 + 정산 실패(오프라인)면 false — 세션이 보존되고 위젯도 그대로 남는다(코인
      // 소실 방지가 우선, resetSession 계약). 성공 시 미러 훅이 위젯을 idle로 되돌린다.
      await resetSession();
      break;
  }
}
