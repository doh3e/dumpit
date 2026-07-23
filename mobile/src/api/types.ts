// 백엔드 DTO 대응 타입 (TaskResponse.java·TaskPlanningResponse.java 등 기준)
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
export type Category =
  | 'WORK' | 'STUDY' | 'APPOINTMENT' | 'CHORE'
  | 'ROUTINE' | 'HEALTH' | 'HOBBY' | 'OTHER';
export type RecommendationBucket =
  | 'OVERDUE' | 'TODAY' | 'TOMORROW' | 'NEXT_7_DAYS' | 'LATER' | 'SOMEDAY';

/** 날짜 문자열은 오프셋 없는 KST 벽시계 ISO — "2026-07-24T18:00:00" */
export type TaskResponse = {
  taskId: string;
  parentTaskId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  category: Category;
  aiPriorityScore: number | null;   // 0~1
  userPriorityScore: number | null; // 0~1, 사용자 오버라이드
  effectivePriority: number;        // 서버가 항상 계산해서 내려줌
  deadline: string | null;          // 응답에 noDeadline 필드는 없음 — null이 곧 기한 없음
  estimatedMinutes: number | null;
  startTime: string | null;
  endTime: string | null;
  isLocked: boolean;
  routineId: string | null;
  routineScheduledDate: string | null; // "2026-07-23"
  syncSource: 'LOCAL' | 'GOOGLE';
  createdAt: string;
  completedAt: string | null;
  stickerCode: string | null;
  coinsGranted: number;             // 완료 시 실지급액, 기본 0
};

export type PlanningSections = {
  overdue: TaskResponse[];
  today: TaskResponse[];
  tomorrow: TaskResponse[];
  next7Days: TaskResponse[];
  later: TaskResponse[];
  someday: TaskResponse[];
  recentDone: TaskResponse[];       // 최근 3일 완료
};

export type NowSuggestion = {
  type: 'CURRENT_EVENT' | 'SLEEP' | 'MEAL' | 'DAY_START' | 'DAY_END' | 'OPEN_SLOT' | 'STUDY_NUDGE';
  title: string;
  message: string;
  task: TaskResponse | null;
  focusMinutes: number | null;
};

export type TaskRecommendation = {
  task: TaskResponse;
  score: number;
  bucket: RecommendationBucket;
  reasons: string[];
};

export type PlanningResponse = {
  now: string;
  availableFocusMinutes: number;
  tasks: TaskResponse[];
  nowSuggestion: NowSuggestion;
  focusRecommendations: TaskRecommendation[];
  sections: PlanningSections;
};

export type AiUsage = { used: number; limit: number; remaining: number; resetAt: string };

export type DumpTaskItem = {
  taskId: string | null;            // 제안 단계 null, confirm 후 채워짐
  title: string;
  description: string | null;
  aiPriorityScore: number | null;
  category: string | null;
  deadline: string | null;
  estimatedMinutes: number | null;
};
export type DumpResponse = { dumpId: string; tasks: DumpTaskItem[] };

/** 시큐리티 계층은 timestamp 없음, RestControllerAdvice 계층은 있음 */
export type ApiErrorBody = { status: number; code: string; error: string; timestamp?: string };

export type RepeatType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'MONTHLY_WEEKDAY';

/** RoutineResponse.java 대응 — 시각은 "HH:mm(:ss)", 날짜는 "YYYY-MM-DD" */
export type RoutineResponse = {
  routineId: string;
  name: string;
  description: string | null;
  enabled: boolean;
  repeatType: RepeatType;
  daysOfWeek: number[];            // 월=1..일=7
  daysOfMonth: number[];
  monthlyWeekOrdinal: number | null;
  monthlyWeekDay: number | null;
  runOnLastDayIfMissing: boolean;
  createTime: string | null;
  routineStartTime: string | null; // 서버가 null이면 createTime 폴백해 내려줌
  routineEndTime: string | null;
  startDate: string;
  endDate: string | null;
  lastGeneratedDate: string | null;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UserSettings = {
  routineStartHour: number;   // 0~23
  routineEndHour: number;     // 0~23, start > end = 자정넘김
  notificationsEnabled: boolean;
  notificationThresholds: number[];
};

export type PomodoroSettleResponse = { coins: number; totalCoins: number; settledSessions: number };
