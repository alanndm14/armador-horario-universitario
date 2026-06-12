import { Eye, Plus } from 'lucide-react'
import { Badge } from '../ui/Badge.jsx'
import { Button } from '../ui/Button.jsx'
import { formatSchedule } from '../../utils/time.js'
import { hasOverlap } from '../../utils/overlap.js'

export function GroupCard({ course, group, selectedItems, selected, onAdd, onDetails }) {
  const conflicts = hasOverlap(group.schedules, selectedItems)
  const ratedStaff = group.professorRatings?.filter((rating) => rating.score != null) ?? []
  const firstReview = ratedStaff.flatMap((rating) => rating.reviews ?? [])[0]
  const reviewCount = ratedStaff.reduce((total, rating) => total + (rating.reviewCount ?? 0), 0)

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-slate-950 dark:text-white">{course.name}</p>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Grupo {group.groupNumber}</p>
          <p className="text-xs text-slate-400">{course.career}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge tone={conflicts ? 'rose' : 'teal'}>{conflicts ? 'Riesgo de traslape' : group.modality}</Badge>
          {group.rating != null && <Badge tone="indigo">Promedio ★ {group.rating.toFixed(1)}</Badge>}
        </div>
      </div>
      <dl className="mt-3 grid gap-2 text-xs text-slate-600 dark:text-slate-300">
        <div>
          <dt className="font-semibold text-slate-400">Profesores</dt>
          <dd>{group.professors?.join(', ') || 'Sin registro'}</dd>
        </div>
        {!!group.assistants?.length && (
          <div>
            <dt className="font-semibold text-slate-400">Ayudantes</dt>
            <dd>{group.assistants.join(', ')}</dd>
          </div>
        )}
        <div>
          <dt className="font-semibold text-slate-400">Horario</dt>
          <dd>{formatSchedule(group.schedules)}</dd>
        </div>
        <div className="flex flex-wrap gap-1">
          {(group.tags ?? [group.modality]).filter(Boolean).map((tag) => <Badge key={tag}>{tag}</Badge>)}
          {group.quota && <Badge tone="amber">{group.students ?? 0}/{group.quota}</Badge>}
          {reviewCount > 0 && <Badge tone="indigo">{reviewCount} reseñas del equipo</Badge>}
        </div>
        {firstReview && (
          <div className="rounded-md bg-slate-50 p-2 dark:bg-slate-950">
            <dt className="font-semibold text-slate-400">Reseña reciente</dt>
            <dd className="line-clamp-3">{firstReview.comment}</dd>
          </div>
        )}
      </dl>
      <div className="mt-3 flex gap-2">
        <Button className="flex-1" variant={selected ? 'ghost' : 'primary'} onClick={onAdd} disabled={selected}>
          <Plus size={15} /> {selected ? 'Agregada' : 'Agregar'}
        </Button>
        <Button className="h-9 w-9 px-0" onClick={onDetails} aria-label="Ver detalles">
          <Eye size={15} />
        </Button>
      </div>
    </article>
  )
}
