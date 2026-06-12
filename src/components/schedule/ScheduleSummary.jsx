import { AlertTriangle, Copy, Download, FileJson, FileText, Save, Trash2 } from 'lucide-react'
import { Button } from '../ui/Button.jsx'
import { Badge } from '../ui/Badge.jsx'
import { buildScheduleStats } from '../../utils/scheduleStats.js'

export function ScheduleSummary({ items, onSave, onPng, onPdf, onCopy, onJson, onClear, onRemove, onColor }) {
  const stats = buildScheduleStats(items)
  const conflicts = items.filter((item) => item.hasConflict)

  return (
    <aside className="flex h-full flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-4">
        <h2 className="text-base font-bold text-slate-950 dark:text-white">Mi horario</h2>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Selecciona grupos y bloques personales.</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-md bg-slate-50 p-2 dark:bg-slate-900">
          <p className="text-lg font-bold">{stats.totalItems}</p>
          <p className="text-[11px] font-semibold text-slate-500">materias</p>
        </div>
        <div className="rounded-md bg-slate-50 p-2 dark:bg-slate-900">
          <p className="text-lg font-bold">{stats.totalHours.toFixed(1)}</p>
          <p className="text-[11px] font-semibold text-slate-500">horas</p>
        </div>
        <div className="rounded-md bg-slate-50 p-2 dark:bg-slate-900">
          <p className="text-lg font-bold">{stats.credits}</p>
          <p className="text-[11px] font-semibold text-slate-500">créditos</p>
        </div>
      </div>
      {conflicts.length > 0 && (
        <div className="mt-3 flex items-start gap-2 rounded-md bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:bg-rose-950 dark:text-rose-200">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {conflicts.length} traslape(s) detectado(s).
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {stats.busiest.map((day) => (
          <Badge key={day} tone="indigo">
            {day} cargado
          </Badge>
        ))}
        {items.length === 0 && <Badge>Horario vacío</Badge>}
      </div>
      <div className="schedule-scrollbar mt-4 flex-1 space-y-2 overflow-auto">
        {items.map((item) => (
          <div key={item.selectionId} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{item.name}</p>
                {item.topic && <p className="text-xs font-semibold text-teal-700 dark:text-teal-300">{item.topic}</p>}
                <p className="text-xs text-slate-500">Grupo {item.groupNumber} · {item.plan ?? item.modality}</p>
              </div>
              <input
                aria-label="Color de materia"
                type="color"
                value={item.color}
                onChange={(event) => onColor(item.selectionId, event.target.value)}
                className="h-7 w-8 rounded border-0 bg-transparent p-0"
              />
            </div>
            <Button className="mt-2 w-full" variant="ghost" onClick={() => onRemove(item.selectionId)}>
              <Trash2 size={14} /> Quitar
            </Button>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="primary" onClick={onSave}>
          <Save size={15} /> Guardar
        </Button>
        <Button onClick={onPng}>
          <Download size={15} /> PNG
        </Button>
        <Button onClick={onPdf}>
          <FileText size={15} /> PDF
        </Button>
        <Button onClick={onCopy}>
          <Copy size={15} /> Copiar
        </Button>
        <Button onClick={onJson}>
          <FileJson size={15} /> JSON
        </Button>
        <Button variant="danger" onClick={onClear}>
          <Trash2 size={15} /> Limpiar
        </Button>
      </div>
    </aside>
  )
}
