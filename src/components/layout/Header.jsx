import { CalendarRange, DatabaseZap, LogIn, LogOut, Moon, Sun } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { Button } from '../ui/Button.jsx'
import { useAuth } from '../../hooks/useAuth.jsx'
import { useTheme } from '../../hooks/useTheme.jsx'

export function Header() {
  const { user, login, logout, isDemo } = useAuth()
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-950">
      <div>
        <h1 className="text-lg font-bold tracking-normal text-slate-950 dark:text-white">Armador de horario</h1>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Facultad de Ciencias UNAM · datos automáticos
        </p>
      </div>
      <div className="flex items-center gap-2">
        <nav className="hidden rounded-lg border border-slate-200 bg-slate-50 p-1 md:flex dark:border-slate-800 dark:bg-slate-900">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${
                isActive
                  ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`
            }
          >
            <CalendarRange size={16} /> Horario
          </NavLink>
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${
                isActive
                  ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`
            }
          >
            <DatabaseZap size={16} /> Datos
          </NavLink>
        </nav>
        {isDemo && (
          <span className="hidden rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 sm:inline-flex dark:bg-amber-950 dark:text-amber-200">
            Demo sin Firebase
          </span>
        )}
        <Button variant="ghost" className="h-9 w-9 px-0" onClick={toggleTheme} aria-label="Cambiar tema">
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </Button>
        {user ? (
          <Button variant="secondary" onClick={logout}>
            <LogOut size={16} /> <span className="hidden sm:inline">{user.displayName ?? 'Salir'}</span>
          </Button>
        ) : (
          <Button variant="primary" onClick={login}>
            <LogIn size={16} /> Google
          </Button>
        )}
      </div>
    </header>
  )
}
