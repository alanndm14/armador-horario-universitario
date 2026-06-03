import { DAYS, DAY_LABELS, durationHours } from './time.js'

export function buildScheduleStats(items = []) {
  const byDay = Object.fromEntries(DAYS.map((day) => [day, 0]))
  items.forEach((item) => {
    ;(item.schedules ?? []).forEach((schedule) => {
      byDay[schedule.day] = (byDay[schedule.day] ?? 0) + 1
    })
  })
  const busiest = Object.entries(byDay)
    .sort((a, b) => b[1] - a[1])
    .filter(([, count]) => count > 0)
    .slice(0, 2)
    .map(([day]) => DAY_LABELS[day])

  const credits = items.reduce((total, item) => total + Number(item.credits ?? 0), 0)
  return {
    totalItems: items.length,
    totalHours: durationHours(items),
    credits,
    busiest,
  }
}
