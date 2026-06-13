import { Download, RotateCcw, Search, SlidersHorizontal } from 'lucide-react'
import { DAYS, DAY_LABELS } from '../../utils/time.js'
import { Button } from '../ui/Button.jsx'

function SelectField({ label, value, options, onChange, allLabel = 'Todas' }) {
  const optionLabels = {
    rating: 'Mejor calificación',
    reviews: 'Más reseñas',
    time: 'Hora más temprana',
    group: 'Número de grupo',
  }
  return (
    <label className="grid gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm font-medium text-slate-800 outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {optionLabels[option] ?? option}
          </option>
        ))}
      </select>
    </label>
  )
}

export function FilterPanel({ filters, setFilters, facets, resultCount, onExportCsv, onExportJson }) {
  const update = (patch) => setFilters((current) => ({ ...current, ...patch }))
  const activeFilterCount = [
    filters.faculty,
    filters.career,
    filters.plan,
    filters.semester,
    filters.type,
    filters.modality,
    filters.minRating,
    filters.reviewsOnly,
    filters.roomOnly,
    filters.presentationOnly,
    filters.hideOverlaps,
    filters.days.length > 0,
    filters.start !== '07:00',
    filters.end !== '22:00',
  ].filter(Boolean).length

  const clearFilters = () => setFilters((current) => ({
    ...current,
    faculty: '',
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
    hideOverlaps: false,
  }))

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <SlidersHorizontal size={17} /> Buscar y filtrar
          {activeFilterCount > 0 && <span className="text-xs text-teal-700 dark:text-teal-300">{activeFilterCount} activos</span>}
        </div>
        {activeFilterCount > 0 && (
          <Button className="h-8 w-8 px-0" variant="ghost" onClick={clearFilters} aria-label="Limpiar filtros">
            <RotateCcw size={15} />
          </Button>
        )}
      </div>

      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          value={filters.search}
          onChange={(event) => update({ search: event.target.value })}
          placeholder="Materia, profesor, ayudante o grupo"
          className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm font-medium text-slate-900 outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
      </label>

      <div className="grid gap-3">
        <SelectField label="Facultad" value={filters.faculty} options={facets.faculties} onChange={(faculty) => update({ faculty, career: '', plan: '', semester: '', type: '', modality: '' })} />
        <SelectField label="Carrera" value={filters.career} options={facets.careers} onChange={(career) => update({ career, plan: '', semester: '', type: '', modality: '' })} />
        <SelectField label="Plan de estudios" value={filters.plan} options={facets.plans} onChange={(plan) => update({ plan, semester: '', type: '', modality: '' })} />
        <SelectField label="Semestre" value={filters.semester} options={facets.semesters} onChange={(semester) => update({ semester, type: '', modality: '' })} />
        <SelectField label="Tipo" value={filters.type} options={facets.types} onChange={(type) => update({ type })} />
        <SelectField label="Modalidad" value={filters.modality} options={facets.modalities} onChange={(modality) => update({ modality })} />
        <SelectField
          label="Promedio mínimo del equipo"
          value={filters.minRating}
          options={['6', '7', '8', '9']}
          allLabel="Cualquier calificación"
          onChange={(minRating) => update({ minRating })}
        />
        <SelectField
          label="Ordenar resultados"
          value={filters.sortBy}
          options={['rating', 'reviews', 'time', 'group']}
          allLabel="Nombre de materia"
          onChange={(sortBy) => update({ sortBy: sortBy || 'name' })}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <Button variant="secondary" onClick={onExportCsv} disabled={!resultCount}>
          <Download size={15} /> CSV completo
        </Button>
        <Button variant="secondary" onClick={onExportJson} disabled={!resultCount}>
          <Download size={15} /> JSON completo
        </Button>
        <p className="col-span-2 text-xs font-medium text-slate-500">
          Exporta los filtros y los {resultCount.toLocaleString('es-MX')} grupos encontrados con todos sus datos.
        </p>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">Días disponibles</p>
        <div className="grid grid-cols-3 gap-2">
          {DAYS.map((day) => {
            const active = filters.days.includes(day)
            return (
              <button
                key={day}
                className={`rounded-md border px-2 py-2 text-xs font-bold transition ${
                  active
                    ? 'border-teal-600 bg-teal-50 text-teal-700 dark:border-teal-400 dark:bg-teal-950 dark:text-teal-200'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                }`}
                onClick={() => update({ days: active ? filters.days.filter((item) => item !== day) : [...filters.days, day] })}
              >
                {DAY_LABELS[day].slice(0, 3)}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
          Desde
          <input type="time" value={filters.start} onChange={(event) => update({ start: event.target.value })} className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
          Hasta
          <input type="time" value={filters.end} onChange={(event) => update({ end: event.target.value })} className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
        </label>
      </div>

      {[
        ['Solo con reseñas', 'reviewsOnly'],
        ['Solo con aula publicada', 'roomOnly'],
        ['Solo con presentación', 'presentationOnly'],
        ['Ocultar traslapes', 'hideOverlaps'],
        ['Permitir traslapes', 'allowOverlaps'],
      ].map(([label, key]) => (
        <label key={key} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-3 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900">
          {label}
          <input type="checkbox" checked={filters[key]} onChange={(event) => update({ [key]: event.target.checked })} className="h-4 w-4 accent-teal-600" />
        </label>
      ))}
    </section>
  )
}
