import clsx from 'clsx'

const tones = {
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  teal: 'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-200',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-200',
  rose: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-200',
  indigo: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200',
}

export function Badge({ children, tone = 'slate', className }) {
  return (
    <span className={clsx('inline-flex rounded-md px-2 py-1 text-xs font-semibold', tones[tone], className)}>
      {children}
    </span>
  )
}
