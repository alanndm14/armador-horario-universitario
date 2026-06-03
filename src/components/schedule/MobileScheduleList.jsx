import { DAYS, DAY_LABELS, firstStartForDay, formatSchedule } from '../../utils/time.js'

export function MobileScheduleList({ items, onBlockClick }) {
  return (
    <div className="space-y-3">
      {DAYS.map((day) => {
        const dayItems = items
          .filter((item) => item.schedules?.some((schedule) => schedule.day === day))
          .sort((a, b) => firstStartForDay(a, day).localeCompare(firstStartForDay(b, day)))
        return (
          <section key={day} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-2 text-sm font-bold text-slate-900 dark:text-white">{DAY_LABELS[day]}</h3>
            {dayItems.length ? (
              <div className="space-y-2">
                {dayItems.map((item) => (
                  <button
                    key={`${day}-${item.selectionId}`}
                    onClick={() => onBlockClick(item)}
                    className="w-full rounded-md border-l-4 bg-slate-50 p-3 text-left dark:bg-slate-950"
                    style={{ borderLeftColor: item.color }}
                  >
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{item.name}</p>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {formatSchedule(item.schedules.filter((s) => s.day === day))}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">Sin clases.</p>
            )}
          </section>
        )
      })}
    </div>
  )
}
