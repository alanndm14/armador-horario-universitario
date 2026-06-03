import { DAYS, DAY_LABELS, HOURS, timeToMinutes } from '../../utils/time.js'

const START = 7 * 60
const END = 22 * 60
const TOTAL = END - START

export function WeeklySchedule({ items, onBlockClick, scheduleRef }) {
  return (
    <section
      ref={scheduleRef}
      className="schedule-scrollbar h-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="grid min-w-[860px]" style={{ gridTemplateColumns: '72px repeat(6, minmax(128px, 1fr))' }}>
        <div className="sticky left-0 top-0 z-20 border-b border-r border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          Hora
        </div>
        {DAYS.map((day) => (
          <div
            key={day}
            className="sticky top-0 z-10 border-b border-r border-slate-200 bg-slate-50 p-3 text-center text-sm font-bold text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          >
            {DAY_LABELS[day]}
          </div>
        ))}
        <div className="sticky left-0 z-10 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="h-16 border-b border-slate-100 px-2 pt-1 text-xs font-semibold text-slate-400 dark:border-slate-900"
            >
              {String(hour).padStart(2, '0')}:00
            </div>
          ))}
        </div>
        {DAYS.map((day) => (
          <div key={day} className="relative border-r border-slate-100 dark:border-slate-900" style={{ height: HOURS.length * 64 }}>
            {HOURS.map((hour) => (
              <div key={hour} className="h-16 border-b border-slate-100 dark:border-slate-900" />
            ))}
            {items.flatMap((item) =>
              (item.schedules ?? [])
                .filter((schedule) => schedule.day === day)
                .map((schedule, index) => {
                  const top = ((timeToMinutes(schedule.start) - START) / TOTAL) * (HOURS.length * 64)
                  const height = ((timeToMinutes(schedule.end) - timeToMinutes(schedule.start)) / TOTAL) * (HOURS.length * 64)
                  return (
                    <button
                      key={`${item.selectionId}-${day}-${index}`}
                      className={`absolute left-1 right-1 overflow-hidden rounded-md px-2 py-1 text-left text-xs font-semibold text-white shadow-sm ring-1 ring-black/5 transition hover:brightness-110 ${
                        item.hasConflict ? 'outline outline-2 outline-offset-1 outline-rose-400' : ''
                      }`}
                      style={{ top, minHeight: Math.max(height, 34), backgroundColor: item.color }}
                      onClick={() => onBlockClick(item)}
                    >
                      <span className="block truncate">{item.name}</span>
                      <span className="block truncate opacity-85">
                        {item.groupNumber} · {schedule.classroom || item.classroom || 'Sin aula'}
                      </span>
                    </button>
                  )
                }),
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
