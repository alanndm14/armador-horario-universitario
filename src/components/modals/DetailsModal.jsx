import { X } from 'lucide-react'
import { Button } from '../ui/Button.jsx'
import { Badge } from '../ui/Badge.jsx'
import { formatSchedule } from '../../utils/time.js'

export function DetailsModal({ payload, onClose, onRemove }) {
  if (!payload) return null
  const item = payload.group
    ? {
        name: payload.course.name,
        ...payload.group,
      }
    : payload
  const professorRatings = item.professorRatings ?? []

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <section className="w-full max-w-xl rounded-lg border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">{item.name}</h2>
            <p className="text-sm font-medium text-slate-500">Grupo {item.groupNumber}</p>
          </div>
          <button className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        <div className="mt-4 grid gap-3 text-sm">
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">Profesorado</p>
            <p className="font-medium">{item.professors?.join(', ') || 'Sin registro'}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">Ayudantes</p>
            <p className="font-medium">{item.assistants?.join(', ') || 'Sin registro'}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">Horario</p>
            <p className="font-medium">{formatSchedule(item.schedules)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="teal">{item.modality ?? 'Personal'}</Badge>
            {item.classroom && <Badge>{item.classroom}</Badge>}
            {item.quota && <Badge tone="amber">{item.students ?? 0}/{item.quota} lugares</Badge>}
            {item.rating && <Badge tone="indigo">MisProfesores {item.rating.toFixed(1)}</Badge>}
            {item.sourceUrl && (
              <a className="text-xs font-bold text-teal-700 underline dark:text-teal-300" href={item.sourceUrl} target="_blank" rel="noreferrer">
                Fuente oficial
              </a>
            )}
          </div>
          {professorRatings.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase text-slate-400">Calificaciones y reseñas</p>
              <div className="mt-2 grid gap-2">
                {professorRatings.map((rating) => (
                  <div key={`${rating.name}-${rating.professorId}`} className="rounded-md bg-slate-50 p-3 dark:bg-slate-900">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold">{rating.name}</span>
                      <Badge tone="indigo">★ {rating.score?.toFixed?.(1)}</Badge>
                      <Badge>{rating.reviewCount ?? 0} reseñas</Badge>
                      {rating.sourceUrl && (
                        <a className="text-xs font-bold text-teal-700 underline dark:text-teal-300" href={rating.sourceUrl} target="_blank" rel="noreferrer">
                          Ver fuente
                        </a>
                      )}
                    </div>
                    <div className="mt-2 space-y-2">
                      {(rating.reviews ?? []).slice(0, 3).map((review, index) => (
                        <blockquote key={`${rating.professorId}-${index}`} className="border-l-2 border-slate-300 pl-3 text-xs leading-5 text-slate-600 dark:border-slate-700 dark:text-slate-300">
                          <p className="font-semibold text-slate-800 dark:text-slate-100">
                            {review.date} · Calidad {review.quality ?? 'N/A'} · Dificultad {review.difficulty ?? 'N/A'}
                            {review.className ? ` · ${review.className}` : ''}
                          </p>
                          <p>{review.comment}</p>
                          {!!review.tags?.length && <p className="mt-1 text-slate-400">{review.tags.join(' · ')}</p>}
                        </blockquote>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          {onRemove && item.selectionId && (
            <Button variant="danger" onClick={() => onRemove(item.selectionId)}>
              Eliminar
            </Button>
          )}
          <Button variant="primary" onClick={onClose}>
            Listo
          </Button>
        </div>
      </section>
    </div>
  )
}
