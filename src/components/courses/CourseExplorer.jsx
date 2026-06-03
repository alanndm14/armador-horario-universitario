import { ChevronDown } from 'lucide-react'
import { GroupCard } from './GroupCard.jsx'

export function CourseExplorer({ courses, loading, selectedItems, selectedIds, onAdd, onDetails }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-32 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>
    )
  }

  if (!courses.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        No hay grupos con esos filtros.
      </div>
    )
  }

  const groupsBySemester = courses.reduce((acc, course) => {
    const key = course.semester || 'Sin semestre'
    acc[key] = [...(acc[key] ?? []), course]
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {Object.entries(groupsBySemester).map(([semester, semesterCourses]) => (
        <section key={semester} className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <ChevronDown size={14} /> {semester}
          </div>
          {semesterCourses.map((course) => (
            <div key={course.id} className="space-y-2">
              {course.groups.map((group) => (
                <GroupCard
                  key={`${course.id}-${group.id ?? group.groupNumber}`}
                  course={course}
                  group={group}
                  selectedItems={selectedItems}
                  selected={selectedIds.has(`${course.id}-${group.id ?? group.groupNumber}`)}
                  onAdd={() => onAdd(course, group)}
                  onDetails={() => onDetails({ course, group })}
                />
              ))}
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}
