import { useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { Header } from '../components/layout/Header.jsx'
import { FilterPanel } from '../components/filters/FilterPanel.jsx'
import { CourseExplorer } from '../components/courses/CourseExplorer.jsx'
import { WeeklySchedule } from '../components/schedule/WeeklySchedule.jsx'
import { MobileScheduleList } from '../components/schedule/MobileScheduleList.jsx'
import { ScheduleSummary } from '../components/schedule/ScheduleSummary.jsx'
import { DetailsModal } from '../components/modals/DetailsModal.jsx'
import { Button } from '../components/ui/Button.jsx'
import { useCourses } from '../hooks/useCourses.js'
import { useScheduleBuilder } from '../hooks/useScheduleBuilder.js'
import { useAuth } from '../hooks/useAuth.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { saveSchedule } from '../services/scheduleService.js'
import { copySummary, downloadScheduleJson, downloadSchedulePdf, downloadSchedulePng } from '../utils/export.js'

export default function Home() {
  const scheduleRef = useRef(null)
  const { user } = useAuth()
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState('horario')
  const [details, setDetails] = useState(null)
  const builder = useScheduleBuilder()
  const courses = useCourses(builder.selectedItems)

  function handleAdd(course, group) {
    const result = builder.addGroup(course, group, courses.filters.allowOverlaps)
    if (result.ok) {
      showToast(result.conflicts.length ? 'Materia agregada con traslape detectado' : 'Materia agregada')
    } else if (result.reason === 'overlap') {
      showToast('Traslape detectado. Activa “Permitir traslapes” para agregarla.')
    } else {
      showToast('Ese grupo ya está en tu horario')
    }
  }

  function addPersonalBlock() {
    const conflicts = builder.addPersonalBlock({
      name: 'Comida',
      schedules: [{ day: 'Ma', start: '14:00', end: '15:00', classroom: 'Personal', type: 'personal' }],
      color: '#64748b',
    })
    showToast(conflicts.length ? 'Bloque personal agregado con traslape' : 'Bloque personal agregado')
  }

  async function handleSave() {
    const id = await saveSchedule(user?.uid, {
      name: `Horario ${new Date().toLocaleDateString('es-MX')}`,
      selectedGroups: builder.selectedItems.filter((item) => item.kind === 'course'),
      personalBlocks: builder.selectedItems.filter((item) => item.kind === 'personal'),
    })
    showToast(`Horario guardado (${id})`)
  }

  return (
    <div className="flex h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Header />
      <div className="border-b border-slate-200 bg-white p-2 md:hidden dark:border-slate-800 dark:bg-slate-950">
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-900">
          {['materias', 'horario', 'mi horario'].map((tab) => (
            <button
              key={tab}
              className={`rounded-md px-2 py-2 text-xs font-bold capitalize ${
                activeTab === tab ? 'bg-white shadow-sm dark:bg-slate-800' : 'text-slate-500'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
      <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 md:grid-cols-[320px_minmax(0,1fr)_300px]">
        <aside className={`${activeTab === 'materias' ? 'block' : 'hidden'} schedule-scrollbar overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-4 md:block dark:border-slate-800 dark:bg-slate-950`}>
          <FilterPanel filters={courses.filters} setFilters={courses.setFilters} facets={courses.facets} />
          <div className="mt-4">
            <CourseExplorer
              courses={courses.filteredCourses}
              loading={courses.loading}
              selectedItems={builder.selectedItems}
              selectedIds={builder.selectedIds}
              onAdd={handleAdd}
              onDetails={setDetails}
            />
          </div>
        </aside>
        <section className={`${activeTab === 'horario' ? 'block' : 'hidden'} min-h-0 md:block`}>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold">Horario semanal</h2>
              <p className="text-xs font-medium text-slate-500">07:00 a 22:00 · lunes a sábado</p>
            </div>
            <Button onClick={addPersonalBlock}>
              <Plus size={15} /> Bloque personal
            </Button>
          </div>
          <div className="hidden h-[calc(100%-44px)] md:block">
            <WeeklySchedule items={builder.selectedItems} onBlockClick={setDetails} scheduleRef={scheduleRef} />
          </div>
          <div className="schedule-scrollbar h-[calc(100vh-150px)] overflow-auto md:hidden">
            <MobileScheduleList items={builder.selectedItems} onBlockClick={setDetails} />
          </div>
        </section>
        <section className={`${activeTab === 'mi horario' ? 'block' : 'hidden'} min-h-0 md:block`}>
          <ScheduleSummary
            items={builder.selectedItems}
            onSave={handleSave}
            onPng={() => downloadSchedulePng(scheduleRef.current).then(() => showToast('PNG descargado'))}
            onPdf={() => downloadSchedulePdf(scheduleRef.current).then(() => showToast('PDF exportado'))}
            onCopy={() => copySummary(builder.selectedItems).then(() => showToast('Resumen copiado'))}
            onJson={() => {
              downloadScheduleJson(builder.selectedItems)
              showToast('JSON exportado')
            }}
            onClear={() => {
              builder.clear()
              showToast('Horario limpio')
            }}
            onRemove={builder.removeItem}
            onColor={builder.updateColor}
          />
        </section>
      </main>
      <DetailsModal payload={details} onClose={() => setDetails(null)} onRemove={details?.selectionId ? builder.removeItem : null} />
    </div>
  )
}
