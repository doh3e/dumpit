export const keys = {
  planning: ['planning'] as const,
  aiUsage: ['ai-usage'] as const,
  catalog: ['shop-catalog'] as const,
  calendar: (year: number, month: number) => ['calendar', year, month] as const,
};
