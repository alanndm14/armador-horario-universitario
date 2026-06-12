import { useMemo, useState } from 'react'
import { findOverlaps } from '../utils/overlap.js'

const colors = ['#0f766e', '#4f46e5', '#d97706', '#dc2626', '#0891b2', '#7c3aed', '#be123c']

export function useScheduleBuilder() {
  const [selectedItems, setSelectedItems] = useState([])

  const selectedIds = useMemo(() => new Set(selectedItems.map((item) => item.selectionId)), [selectedItems])

  function buildItem(course, group) {
    return {
      selectionId: `${course.id}-${group.id ?? group.groupNumber}`,
      courseId: course.id,
      groupId: group.id,
      name: course.name,
      career: course.career,
      plan: course.plan,
      semester: course.semester,
      credits: course.credits,
      groupNumber: group.groupNumber,
      topic: group.topic,
      professors: group.professors ?? [],
      assistants: group.assistants ?? [],
      modality: group.modality,
      schedules: group.schedules ?? [],
      classroom: group.classroom,
      quota: group.quota,
      students: group.students,
      sourceUrl: group.sourceUrl ?? course.sourceUrl,
      presentationUrl: group.presentationUrl,
      color: colors[selectedItems.length % colors.length],
      kind: 'course',
    }
  }

  function addGroup(course, group, allowOverlaps = false) {
    const item = buildItem(course, group)
    const conflicts = findOverlaps(item.schedules, selectedItems)
    if (selectedIds.has(item.selectionId)) return { ok: false, reason: 'duplicate', conflicts }
    if (conflicts.length && !allowOverlaps) return { ok: false, reason: 'overlap', conflicts }
    setSelectedItems((current) => [...current, { ...item, hasConflict: conflicts.length > 0 }])
    return { ok: true, conflicts }
  }

  function addPersonalBlock(block) {
    const item = {
      selectionId: `personal-${crypto.randomUUID()}`,
      name: block.name || 'Bloque personal',
      groupNumber: 'personal',
      modality: 'Personal',
      schedules: block.schedules,
      color: block.color || '#64748b',
      kind: 'personal',
    }
    const conflicts = findOverlaps(item.schedules, selectedItems)
    setSelectedItems((current) => [...current, { ...item, hasConflict: conflicts.length > 0 }])
    return conflicts
  }

  function removeItem(selectionId) {
    setSelectedItems((current) => current.filter((item) => item.selectionId !== selectionId))
  }

  function clear() {
    setSelectedItems([])
  }

  function updateColor(selectionId, color) {
    setSelectedItems((current) => current.map((item) => (item.selectionId === selectionId ? { ...item, color } : item)))
  }

  return { selectedItems, setSelectedItems, selectedIds, addGroup, addPersonalBlock, removeItem, clear, updateColor }
}
