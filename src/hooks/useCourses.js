import { useEffect, useMemo, useState } from 'react'
import { getCourses } from '../services/courseService.js'
import { createSearchIndex, normalizeText } from '../utils/normalize.js'
import { hasOverlap } from '../utils/overlap.js'

const initialFilters = {
  search: '',
  career: '',
  semester: '',
  type: '',
  modality: '',
  days: [],
  start: '07:00',
  end: '22:00',
  minRating: '',
  reviewsOnly: false,
  roomOnly: false,
  hideOverlaps: false,
  allowOverlaps: false,
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
    const semesters = [...new Set(courses.map((course) => course.semester).filter(Boolean))]
    const types = [...new Set(courses.map((course) => course.type).filter(Boolean))]
    const modalities = [
      ...new Set(courses.flatMap((course) => course.groups ?? []).map((group) => group.modality).filter(Boolean)),
    ]
    return { careers, semesters, types, modalities }
  }, [courses])

  const filteredCourses = useMemo(() => {
    const needle = normalizeText(filters.search)
    return courses
      .filter((course) => {
        if (filters.career && course.career !== filters.career) return false
        if (filters.semester && course.semester !== filters.semester) return false
        if (filters.type && course.type !== filters.type) return false
        return true
      })
      .map((course) => {
        const groups = (course.groups ?? []).filter((group) => {
          if (filters.modality && group.modality !== filters.modality) return false
          if (needle && !createSearchIndex(course, group).includes(needle)) return false
          if (filters.days.length && !group.schedules?.some((schedule) => filters.days.includes(schedule.day))) return false
          if (filters.start && group.schedules?.some((schedule) => schedule.start < filters.start)) return false
          if (filters.end && group.schedules?.some((schedule) => schedule.end > filters.end)) return false
          if (filters.minRating && (group.rating == null || group.rating < Number(filters.minRating))) return false
          if (filters.reviewsOnly && !group.professorRatings?.some((rating) => rating.reviews?.length > 0)) return false
          if (filters.roomOnly && !group.classroom) return false
          if (filters.hideOverlaps && hasOverlap(group.schedules, selectedItems)) return false
          return true
        })
        return { ...course, groups }
      })
      .filter((course) => course.groups.length > 0)
  }, [courses, filters, selectedItems])

  return { courses, filteredCourses, facets, filters, setFilters, loading, error }
}
