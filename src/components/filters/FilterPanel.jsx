import { Search, SlidersHorizontal } from 'lucide-react'
import { DAYS, DAY_LABELS } from '../../utils/time.js'

function SelectField({ label, value, options, onChange }) {
  return (
    <label className="grid gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm font-medium text-slate-800 outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        <option value="">Todas</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

export function FilterPanel({ filters, setFilters, facets }) {
  const update = (patch) => setFilters((current) => ({ ...current, ...patch }))

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
        <SlidersHorizontal size={17} /> Materias
      </div>
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          value={filters.search}
          onChange={(event) => update({ search: event.target.value })}
          placeholder="Buscar materia, profe o grupo"
          className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm font-medium text-slate-900 outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
      </label>
      <div className="grid gap-3">
        <SelectField label="Carrera" value={filters.career} options={facets.careers} onChange={(career) => update({ career })} />
        <SelectField label="Semestre" value={filters.semester} options={facets.semesters} onChange={(semester) => update({ semester })} />
        <SelectField label="Tipo" value={filters.type} options={facets.types} onChange={(type) => update({ type })} />
        <SelectField
          label="Modalidad"
          value={filters.modality}
          options={facets.modalities}
          onChange={(modality) => update({ modality })}
        />
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
                onClick={() =>
                  update({
                    days: active ? filters.days.filter((item) => item !== day) : [...filters.days, day],
                  })
                }
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
          <input
            type="time"
            value={filters.start}
            onChange={(event) => update({ start: event.target.value })}
            className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
          Hasta
          <input
            type="time"
            value={filters.end}
            onChange={(event) => update({ end: event.target.value })}
            className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
      </div>
      <label className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-3 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900">
        Ocultar traslapes
        <input
          type="checkbox"
          checked={filters.hideOverlaps}
          onChange={(event) => update({ hideOverlaps: event.target.checked })}
          className="h-4 w-4 accent-teal-600"
        />
      </label>
      <label className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-3 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900">
        Permitir traslapes
        <input
          type="checkbox"
          checked={filters.allowOverlaps}
          onChange={(event) => update({ allowOverlaps: event.target.checked })}
          className="h-4 w-4 accent-teal-600"
        />
      </label>
    </section>
  )
}
