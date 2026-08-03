import { widgetNative } from './native';
import { API_BASE_URL } from '../api/client';
import { deriveState, phasesFrom, type Session } from '../pomodoro/engine';
import type { PlanningResponse } from '../api/types';
import { formatDeadline, formatTime, isToday } from '../tasks/dates';
import { skinKey } from '../theme/skins';
import type { ThemeMode } from '../theme/context';
import type { Equipments } from '../theme/compose';

const PHASE_HORIZON = 12; // 알림 플랜 ROLLING_PHASES(6)보다 넉넉히 — 위젯은 조회만 하므로 저렴

export async function mirrorConfig(): Promise<void> {
  await widgetNative?.mirrorConfig(JSON.stringify({ apiBaseUrl: API_BASE_URL }));
}

/** 순수 — 렌더 밖(스토어 훅·구독 콜백)에서 now를 주입해 호출한다 */
export function buildPomodoroMirror(session: Session | null, now: number): string | null {
  if (!session) return null;
  const d = deriveState(session, now);
  return JSON.stringify({
    taskTitle: session.taskTitle,
    pausedAt: session.pausedAt,
    remainingSecAtPause: session.pausedAt != null ? d.remainingSec : null,
    done: d.phase === 'DONE',
    phases: phasesFrom(session, now, PHASE_HORIZON),
  });
}

export async function mirrorPomodoro(session: Session | null): Promise<void> {
  await widgetNative?.mirrorPomodoro(buildPomodoroMirror(session, Date.now()));
}

/**
 * 홈 히어로 카드(NowHeroCard)를 그대로 미러링한다 — 오늘 진행률·지금 할 일·다음 제안·대기열.
 * todayDone/Total/allDone 계산은 app/(tabs)/index.tsx와 동일한 규칙(오늘 마감 + CANCELLED 제외)을 따른다.
 */
export function buildHeroMirror(data: PlanningResponse, now: number): string {
  const todayTasks = (data.tasks ?? []).filter((t) => isToday(t.deadline) && t.status !== 'CANCELLED');
  const done = todayTasks.filter((t) => t.status === 'DONE').length;
  const allDone = todayTasks.length > 0 && done === todayTasks.length;
  const task = allDone ? null : data.nowSuggestion?.task ?? null;
  return JSON.stringify({
    updatedAt: now,
    loggedIn: true,
    allDone,
    todayDone: done,
    todayTotal: todayTasks.length,
    hero: task ? {
      taskId: task.taskId, title: task.title,
      deadlineLabel: task.deadline
        ? (isToday(task.deadline) ? `${formatTime(task.deadline)} 마감` : `${formatDeadline(task.deadline)} 마감`)
        : null,
    } : null,
    suggestion: {
      title: data.nowSuggestion?.title ?? '지금은 비어 있는 시간이에요.',
      message: data.nowSuggestion?.message ?? '가벼운 일부터 하나 시작해볼까요?',
    },
    queue: (data.focusRecommendations ?? []).slice(0, 3).map((r) => ({
      taskId: r.task.taskId, title: r.task.title, bucket: r.bucket, done: false,
    })),
  });
}

export async function mirrorHero(data: PlanningResponse): Promise<void> {
  await widgetNative?.mirrorTodayTasks(buildHeroMirror(data, Date.now()));
}

/** PLANET 코드는 스킨 7종 목록에 없으므로 skinKey를 못 쓴다 — 접미사만 딴다 */
function codeSuffix(code: string | null | undefined): string | null {
  return code ? code.split('.').pop() ?? null : null;
}

export function buildThemeMirror(mode: ThemeMode, equipments: Equipments): string {
  return JSON.stringify({
    mode,
    bgSkin: skinKey(equipments?.BACKGROUND),
    pomoSkin: skinKey(equipments?.POMODORO),
    planet: codeSuffix(equipments?.PLANET),
  });
}

export async function mirrorTheme(mode: ThemeMode, equipments: Equipments): Promise<void> {
  await widgetNative?.mirrorTheme(buildThemeMirror(mode, equipments));
}

/**
 * 로그아웃 시 위젯 미러를 비운다 — 지우지 않으면 다음 401 응답까지(최대 30분)
 * 이전 유저의 할 일 목록이 위젯에 그대로 남는다.
 * updatedAt은 0 고정 — 로그아웃 스냅샷은 시각 정보가 필요 없어 Date.now() 규약을 적용하지 않는다.
 */
export async function clearWidgetMirrors(): Promise<void> {
  await widgetNative?.mirrorTodayTasks(JSON.stringify({
    updatedAt: 0, loggedIn: false, allDone: false, todayDone: 0, todayTotal: 0,
    hero: null, suggestion: null, queue: [],
  }));
  await widgetNative?.mirrorPomodoro(null);
  // 장착 스킨 유출 방지(다음 계정에 이전 테마가 보이면 안 됨) — mode는 기기 설정값이라 초기화와 무관하므로 system 고정
  await widgetNative?.mirrorTheme(JSON.stringify({ mode: 'system', bgSkin: null, pomoSkin: null, planet: null }));
}
