import { useEffect, useMemo, useState } from 'react'
import { getCourses } from '../services/courseService.js'
import { createSearchIndex, normalizeText } from '../utils/normalize.js'
import { hasOverlap } from '../utils/overlap.js'

const initialFilters = {
  search: '',
  career: '',
  plan: '',
  semester: '',
  type: '',
  modality: '',
  days: [],
  start: '07:00',
  end: '22:00',
  minRating: '',
  reviewsOnly: false,
  roomOnly: false,
  presentationOnly: false,
  sortBy: 'name',
  hideOverlaps: false,
  allowOverlaps: false,
}

function reviewCount(group) {
  return group.professorRatings?.reduce((total, rating) => total + (rating.reviewCount ?? 0), 0) ?? 0
}

function sortGroups(groups, sortBy) {
  return [...groups].sort((a, b) => {
    if (sortBy === 'rating') return (b.rating ?? -1) - (a.rating ?? -1)
    if (sortBy === 'reviews') return reviewCount(b) - reviewCount(a)
    if (sortBy === 'time') return String(a.schedules?.[0]?.start ?? '99:99').localeCompare(String(b.schedules?.[0]?.start ?? '99:99'))
    if (sortBy === 'group') return String(a.groupNumber).localeCompare(String(b.groupNumber), 'es', { numeric: true })
    return 0
  })
}

export function useCourses(selectedItems) {
  const [courses, setCourses] = useState([])
  const [filters, setFilters] = useState(initialFilters)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    getCourses()
      .then((result) => active && setCourses(result))
      .catch((reason) => active && setError(reason))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  const facets = useMemo(() => {
    const careers = [...new Set(courses.map((course) => course.career).filter(Boolean))]
    const plans = [...new Set(courses.map((course) => course.plan).filter(Boolean))]
    const semesters = [...new Set(courses.map((course) => course.semester).filter(Boolean))]
    const types = [...new Set(courses.map((course) => course.type).filter(Boolean))]
    const modalities = [
      ...new Set(courses.flatMap((course) => course.groups ?? []).map((group) => group.modality).filter(Boolean)),
    ]
    return { careers, plans, semesters, types, modalities }
  }, [courses])

  const filteredCourses = useMemo(() => {
    const needle = normalizeText(filters.search)
    return courses
      .filter((course) => {
        if (filters.career && course.career !== filters.career) return false
        if (filters.plan && course.plan !== filters.plan) return false
        if (filters.semester && course.semester !== filters.semester) return false
        if (filters.type && course.type !== filters.type) return false
        return true
      })
      .map((course) => {
        const groups = sortGroups((course.groups ?? []).filter((group) => {
          if (filters.modality && group.modality !== filters.modality) return false
          if (needle && !createSearchIndex(course, group).includes(needle)) return false
          if (filters.days.length && !group.schedules?.some((schedule) => filters.days.includes(schedule.day))) return false
          if (filters.start && group.schedules?.some((schedule) => schedule.start < filters.start)) return false
          if (filters.end && group.schedules?.some((schedule) => schedule.end > filters.end)) return false
          if (filters.minRating && (group.rating == null || group.rating < Number(filters.minRating))) return false
          if (filters.reviewsOnly && !group.professorRatings?.some((rating) => rating.reviews?.length > 0)) return false
          if (filters.roomOnly && !group.classroom) return false
          if (filters.presentationOnly && !group.presentationUrl) return false
          if (filters.hideOverlaps && hasOverlap(group.schedules, selectedItems)) return false
          return true
        }), filters.sortBy)
        return { ...course, groups }
      })
      .filter((course) => course.groups.length > 0)
      .sort((a, b) => {
        if (filters.sortBy === 'rating') return (b.groups[0]?.rating ?? -1) - (a.groups[0]?.rating ?? -1)
        if (filters.sortBy === 'reviews') {
          return reviewCount(b.groups[0]) - reviewCount(a.groups[0])
        }
        if (filters.sortBy === 'time') {
          return String(a.groups[0]?.schedules?.[0]?.start ?? '99:99').localeCompare(String(b.groups[0]?.schedules?.[0]?.start ?? '99:99'))
        }
        if (filters.sortBy === 'group') {
          return String(a.groups[0]?.groupNumber).localeCompare(String(b.groups[0]?.groupNumber), 'es', { numeric: true })
        }
        return a.name.localeCompare(b.name, 'es')
      })
  }, [courses, filters, selectedItems])

  return { courses, filteredCourses, facets, filters, setFilters, loading, error }
}
