import { useState } from 'react'
import { ArrowLeft, DatabaseZap, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Header } from '../components/layout/Header.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { syncFcienciasSchedules } from '../services/adminSyncService.js'
import { useToast } from '../components/ui/Toast.jsx'

export default function AdminSync() {
  const { showToast } = useToast()
  const [career, setCareer] = useState('')
  const [semesterCode, setSemesterCode] = useState('')
  const [limit, setLimit] = useState(200)
  const [includeProfessorRatings, setIncludeProfessorRatings] = useState(true)
  const [includeProfessorReviews, setIncludeProfessorReviews] = useState(true)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSync() {
    setLoading(true)
    setResult(null)
    try {
      const data = await syncFcienciasSchedules({ career, semesterCode, limit, includeProfessorRatings, includeProfessorReviews })
      setResult(data)
      showToast('Sincronización terminada')
    } catch (error) {
      setResult({ ok: false, errors: [error.message] })
      showToast(error.message)
    } finally {
      setLoading(false)
    }
  }

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
                <DatabaseZap size={18} /> Actualizar datos
              </div>
              <h1 className="text-2xl font-bold tracking-normal">Sincronización automática desde Facultad de Ciencias</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                Esta vista no pide capturar materias manualmente. Llama una Firebase Function protegida por admins,
                lee el JSON público embebido en las páginas oficiales, recorre carreras/planes y actualiza Firestore.
              </p>
            </div>
            <Badge tone="amber">Admin</Badge>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <label className="grid gap-1 text-sm font-semibold">
              Carrera (vacío = todas)
              <input
                value={career}
                onChange={(event) => setCareer(event.target.value)}
                placeholder="Todas las carreras"
                className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Semestre oficial (vacío = actual)
              <input
                value={semesterCode}
                onChange={(event) => setSemesterCode(event.target.value)}
                placeholder="20271"
                className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Límite por corrida
              <input
                type="number"
                value={limit}
                onChange={(event) => setLimit(Number(event.target.value))}
                className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
          </div>
          <label className="mt-4 flex items-center justify-between rounded-md border border-slate-200 p-3 text-sm font-semibold dark:border-slate-800">
            Incluir calificaciones públicas de MisProfesores
            <input
              type="checkbox"
              checked={includeProfessorRatings}
              onChange={(event) => setIncludeProfessorRatings(event.target.checked)}
              className="h-4 w-4 accent-teal-600"
            />
          </label>
          <label className="mt-2 flex items-center justify-between rounded-md border border-slate-200 p-3 text-sm font-semibold dark:border-slate-800">
            Incluir reseñas recientes en Materias
            <input
              type="checkbox"
              checked={includeProfessorReviews}
              onChange={(event) => setIncludeProfessorReviews(event.target.checked)}
              className="h-4 w-4 accent-teal-600"
            />
          </label>
          <Button className="mt-5" variant="primary" onClick={handleSync} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Actualizando...' : 'Actualizar desde Facultad de Ciencias'}
          </Button>
        </section>

        {result && (
          <section className="mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <h2 className="font-bold">Resultado</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-4">
              <Badge tone={result.ok ? 'teal' : 'rose'}>{result.ok ? 'Correcto' : 'Con errores'}</Badge>
              <Badge>{result.coursesWritten ?? 0} materias</Badge>
              <Badge>{result.groupsWritten ?? 0} grupos</Badge>
              <Badge>{result.sourcesVisited ?? 0} fuentes</Badge>
              <Badge>{result.ratingsLoaded ?? 0} ratings</Badge>
              <Badge>{result.reviewPagesLoaded ?? 0} páginas de reseñas</Badge>
            </div>
            {!!result.errors?.length && (
              <ul className="mt-4 space-y-2 text-sm text-rose-700 dark:text-rose-300">
                {result.errors.map((error, index) => (
                  <li key={`${error}-${index}`}>{error}</li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
