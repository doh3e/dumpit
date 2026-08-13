export const keys = {
  planning: ['planning'] as const,
  aiUsage: ['ai-usage'] as const,
  catalog: ['shop-catalog'] as const,
  calendar: (year: number, month: number) => ['calendar', year, month] as const,
  routines: ['routines'] as const,
  settings: ['user-settings'] as const,
  ideas: ['ideas'] as const,
  stats: ['me-stats'] as const,
  profile: ['me-profile'] as const,
  overdue: ['tasks-overdue'] as const,
  notices: (page: number) => ['notices', page] as const,
};
