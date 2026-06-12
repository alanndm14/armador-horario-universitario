import { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, DatabaseZap, ExternalLink, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Header } from '../components/layout/Header.jsx'
import { Badge } from '../components/ui/Badge.jsx'

const ACTIONS_URL = 'https://github.com/alanndm14/armador-horario-universitario/actions/workflows/pages.yml'

export default function AdminSync() {
  const [meta, setMeta] = useState(null)

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/courses.json`, { cache: 'no-store' })
      .then((response) => response.json())
      .then((payload) => setMeta(payload.meta))
      .catch(() => setMeta(null))
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Header />
      <main className="mx-auto max-w-5xl p-4">
        <Link to="/" className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-950 dark:text-slate-300">
          <ArrowLeft size={16} /> Volver al horario
        </Link>
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-bold text-teal-700 dark:text-teal-300">
                <DatabaseZap size={18} /> Estado de los datos
              </div>
              <h1 className="text-2xl font-bold">Actualización automática activa</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                GitHub actualiza diariamente las materias, grupos, equipo docente, horarios, aulas publicadas, calificaciones y reseñas. Esta vista ya no llama a Firebase ni produce errores internos.
              </p>
            </div>
            <Badge tone="teal"><CheckCircle2 size={14} /> Activa</Badge>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div><p className="text-xs font-bold uppercase text-slate-400">Última actualización</p><p className="mt-1 font-semibold">{meta?.generatedAt ? new Date(meta.generatedAt).toLocaleString('es-MX') : 'Cargando...'}</p></div>
            <div><p className="text-xs font-bold uppercase text-slate-400">Semestre</p><p className="mt-1 font-semibold">{meta?.semester ?? 'Cargando...'}</p></div>
            <div><p className="text-xs font-bold uppercase text-slate-400">Materias</p><p className="mt-1 font-semibold">{meta?.courseCount?.toLocaleString('es-MX') ?? 'Cargando...'}</p></div>
            <div><p className="text-xs font-bold uppercase text-slate-400">Grupos</p><p className="mt-1 font-semibold">{meta?.groupCount?.toLocaleString('es-MX') ?? 'Cargando...'}</p></div>
            <div><p className="text-xs font-bold uppercase text-slate-400">Temas detallados</p><p className="mt-1 font-semibold">{meta?.topicCount?.toLocaleString('es-MX') ?? 'Cargando...'}</p></div>
            <div><p className="text-xs font-bold uppercase text-slate-400">Presentaciones</p><p className="mt-1 font-semibold">{meta?.presentationCount?.toLocaleString('es-MX') ?? 'Cargando...'}</p></div>
            <div><p className="text-xs font-bold uppercase text-slate-400">Perfiles con calificación</p><p className="mt-1 font-semibold">{meta?.ratingMatches?.toLocaleString('es-MX') ?? 'Cargando...'}</p></div>
            <div><p className="text-xs font-bold uppercase text-slate-400">Perfiles con reseñas consultadas</p><p className="mt-1 font-semibold">{meta?.reviewPagesLoaded?.toLocaleString('es-MX') ?? 'Cargando...'}</p></div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <a href={ACTIONS_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">
              <RefreshCw size={16} /> Ejecutar actualización en GitHub <ExternalLink size={14} />
            </a>
            <a href="https://www.fciencias.unam.mx/docencia/horarios/indice" target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold dark:border-slate-700">
              Fuente oficial <ExternalLink size={14} />
            </a>
          </div>
        </section>
      </main>
    </div>
  )
}
