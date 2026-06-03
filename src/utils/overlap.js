import { timeToMinutes } from './time.js'

export function schedulesOverlap(a, b) {
  if (a.day !== b.day) return false
  return timeToMinutes(a.start) < timeToMinutes(b.end) && timeToMinutes(b.start) < timeToMinutes(a.end)
}

export function findOverlaps(candidateSchedules = [], selectedItems = []) {
  const conflicts = []
  for (const candidate of candidateSchedules) {
    for (const item of selectedItems) {
      for (const schedule of item.schedules ?? []) {
        if (schedulesOverlap(candidate, schedule)) {
          conflicts.push({ candidate, item, schedule })
        }
      }
    }
  }
  return conflicts
}

export function hasOverlap(candidateSchedules, selectedItems) {
  return findOverlaps(candidateSchedules, selectedItems).length > 0
}
