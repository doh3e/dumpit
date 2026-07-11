import { parseDate } from './dates'

export function calcCompletionCoins(task) {
  if (task.parentTaskId) return 0
  const deadline = parseDate(task.deadline)
  if (deadline && deadline < new Date()) return 5
  const priority = task.effectivePriority ?? 0.5
  return Math.floor(10 + priority * 40)
}
