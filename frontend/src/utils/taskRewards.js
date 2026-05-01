function parseDate(value) {
  if (!value) return null
  if (Array.isArray(value)) {
    return new Date(value[0], (value[1] || 1) - 1, value[2] || 1, value[3] || 0, value[4] || 0, value[5] || 0)
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function calcCompletionCoins(task) {
  if (task.parentTaskId) return 0
  const deadline = parseDate(task.deadline)
  if (deadline && deadline < new Date()) return 5
  const priority = task.effectivePriority ?? 0.5
  return Math.floor(10 + priority * 40)
}
