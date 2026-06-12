import { forwardRef } from 'react'
import { DAYS, DAY_LABELS, formatSchedule, sortSchedules } from '../../utils/time.js'

export const ExportSchedule = forwardRef(function ExportSchedule({ items }, ref) {
  const courses = items.filter((item) => item.kind === 'course')

  return (
    <section ref={ref} className="fixed left-[-10000px] top-0 w-[1400px] bg-white p-10 text-slate-950">
      <header className="border-b-2 border-slate-900 pb-4">
        <h1 className="text-3xl font-bold">Mi horario · Facultad de Ciencias UNAM</h1>
        <p className="mt-1 text-sm">Generado el {new Date().toLocaleString('es-MX')} · {courses.length} materias</p>
      </header>

      <div className="mt-6 grid grid-cols-6 gap-2">
        {DAYS.map((day) => (
          <section key={day} className="border border-slate-300">
            <h2 className="bg-slate-900 p-2 text-center text-sm font-bold text-white">{DAY_LABELS[day]}</h2>
            <div className="space-y-2 p-2">
              {sortSchedules(items.flatMap((item) => (item.schedules ?? []).filter((entry) => entry.day === day).map((entry) => ({ ...entry, item }))))
                .map((entry, index) => (
                  <div key={`${entry.item.selectionId}-${index}`} className="border-l-4 p-2 text-xs" style={{ borderColor: entry.item.color }}>
                    <p className="font-bold">{entry.item.topic || entry.item.name}</p>
                    {entry.item.topic && <p className="text-slate-500">{entry.item.name}</p>}
                    <p>{entry.start}-{entry.end} · Grupo {entry.item.groupNumber}</p>
                    <p>{entry.classroom || entry.item.classroom || 'Sin aula publicada'}</p>
                  </div>
                ))}
            </div>
          </section>
        ))}
      </div>

      <table className="mt-8 w-full border-collapse text-left text-xs">
        <thead>
          <tr className="bg-slate-900 text-white">
            {['Materia / tema', 'Carrera y plan', 'Grupo', 'Equipo docente', 'Horario', 'Modalidad / aula'].map((heading) => (
              <th key={heading} className="border border-slate-700 p-2">{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.selectionId}>
              <td className="border border-slate-300 p-2"><strong>{item.name}</strong>{item.topic ? <><br />{item.topic}</> : null}</td>
              <td className="border border-slate-300 p-2">{item.career || 'Personal'}{item.plan ? <><br />{item.plan}</> : null}</td>
              <td className="border border-slate-300 p-2">{item.groupNumber}</td>
              <td className="border border-slate-300 p-2">
                Profesores: {item.professors?.join(', ') || 'N/A'}<br />
                Ayudantes: {item.assistants?.join(', ') || 'N/A'}
              </td>
              <td className="border border-slate-300 p-2">{formatSchedule(item.schedules)}</td>
              <td className="border border-slate-300 p-2">{item.modality || 'Personal'}<br />{item.classroom || 'Sin aula publicada'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
})
