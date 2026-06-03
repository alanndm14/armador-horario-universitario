export const DAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa']
export const DAY_LABELS = {
  Lu: 'Lunes',
  Ma: 'Martes',
  Mi: 'Miércoles',
  Ju: 'Jueves',
  Vi: 'Viernes',
  Sa: 'Sábado',
}

export const HOURS = Array.from({ length: 16 }, (_, index) => 7 + index)
const DAY_ORDER = new Map(DAYS.map((day, index) => [day, index]))

export function timeToMinutes(time) {
  const [hours, minutes] = String(time).split(':').map(Number)
  return hours * 60 + (minutes || 0)
}

export function minutesToTime(value) {
  const hours = Math.floor(value / 60)
  const minutes = value % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function durationHours(items) {
  return items.reduce((total, item) => {
    const schedules = item.schedules ?? []
    return (
      total +
      schedules.reduce((subtotal, schedule) => {
        return subtotal + Math.max(0, timeToMinutes(schedule.end) - timeToMinutes(schedule.start)) / 60
      }, 0)
    )
  }, 0)
}

export function formatSchedule(schedules = []) {
  return sortSchedules(schedules)
    .map((item) => `${item.day} ${item.start}-${item.end}${item.classroom ? ` ${item.classroom}` : ''}`)
    .join(', ')
}

export function sortSchedules(schedules = []) {
  return [...schedules].sort((a, b) => {
    const day = (DAY_ORDER.get(a.day) ?? 99) - (DAY_ORDER.get(b.day) ?? 99)
    if (day !== 0) return day
    return String(a.start).localeCompare(String(b.start)) || String(a.end).localeCompare(String(b.end))
  })
}

export function firstStartForDay(item, day) {
  const schedule = sortSchedules(item.schedules ?? []).find((entry) => entry.day === day)
  return schedule?.start ?? '99:99'
}
