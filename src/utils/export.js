import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'
import Papa from 'papaparse'
import { formatSchedule } from './time.js'

function triggerDownload(href, fileName, revoke = false) {
  const link = document.createElement('a')
  link.download = fileName
  link.href = href
  document.body.appendChild(link)
  link.click()
  link.remove()
  if (revoke) setTimeout(() => URL.revokeObjectURL(href), 1000)
}

export function buildScheduleSummary(items = []) {
  return items
    .map((item) => {
      const professor = item.professors?.join(', ') || 'Sin profesor registrado'
      const assistants = item.assistants?.join(', ') || 'Sin ayudantes registrados'
      return `${item.name}${item.topic ? `: ${item.topic}` : ''} - Grupo ${item.groupNumber ?? 'personal'}\nFacultad: ${item.faculty ?? 'Personal'}\nCarrera: ${item.career ?? 'Personal'}\nPlan: ${item.plan ?? 'No aplica'}\nProfesores: ${professor}\nAyudantes: ${assistants}\nHorario: ${formatSchedule(item.schedules)}\nModalidad: ${item.modality ?? 'Personal'}\nAula: ${item.classroom ?? 'No publicada'}`
    })
    .join('\n\n')
}

export async function copySummary(items) {
  await navigator.clipboard.writeText(buildScheduleSummary(items))
}

async function captureSchedule(node) {
  if (!node) throw new Error('No se encontró el horario para exportar.')
  const previousStyle = node.getAttribute('style')
  node.style.cssText = 'position:fixed;left:0;top:0;width:1400px;z-index:99999;display:block;opacity:1;pointer-events:none;background:#fff;color:#0f172a;'
  await document.fonts?.ready
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  try {
    return await toPng(node, {
      cacheBust: true,
      pixelRatio: 2,
      width: node.scrollWidth,
      height: node.scrollHeight,
      backgroundColor: '#ffffff',
    })
  } finally {
    if (previousStyle == null) node.removeAttribute('style')
    else node.setAttribute('style', previousStyle)
  }
}

export async function downloadSchedulePng(node, fileName = 'horario.png') {
  const dataUrl = await captureSchedule(node)
  triggerDownload(dataUrl, fileName)
}

export async function downloadSchedulePdf(node, fileName = 'horario.pdf') {
  const dataUrl = await captureSchedule(node)
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const width = pdf.internal.pageSize.getWidth()
  const height = pdf.internal.pageSize.getHeight()
  const printableWidth = width - 48
  const imageHeight = (node.scrollHeight / node.scrollWidth) * printableWidth
  const pageHeight = height - 48
  let offset = 0
  while (offset < imageHeight) {
    if (offset > 0) pdf.addPage('a4', 'landscape')
    pdf.addImage(dataUrl, 'PNG', 24, 24 - offset, printableWidth, imageHeight)
    offset += pageHeight
  }
  pdf.save(fileName)
}

export function downloadScheduleJson(payload, fileName = 'horario.json') {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  triggerDownload(URL.createObjectURL(blob), fileName, true)
}

function resultRows(courses = []) {
  return courses.flatMap((course) => course.groups.map((group) => ({
    facultad: course.faculty,
    campus: course.campus,
    carrera: course.career,
    plan: course.plan,
    semestre: course.semester,
    periodo: course.period,
    tipo: course.type,
    materia: course.name,
    tema_detallado: group.topic,
    grupo: group.groupNumber,
    profesores: group.professors?.join(' | '),
    ayudantes: group.assistants?.join(' | '),
    horario: formatSchedule(group.schedules),
    aula: group.classroom,
    modalidad: group.modality,
    cupo: group.quota,
    inscritos: group.students,
    calificacion_promedio: group.rating,
    calificaciones_y_resenas: JSON.stringify(group.professorRatings ?? []),
    notas: group.notes,
    presentacion: group.presentationUrl,
    fuente_grupo: group.sourceUrl,
    fuente_materia: course.sourceUrl,
  })))
}

export function downloadSearchResultsJson(courses, filters, fileName = 'resultados-materias.json') {
  const groups = resultRows(courses)
  const payload = { generatedAt: new Date().toISOString(), filters, courseCount: courses.length, groupCount: groups.length, courses }
  downloadScheduleJson(payload, fileName)
}

export function downloadSearchResultsCsv(courses, filters, fileName = 'resultados-materias.csv') {
  const csv = buildSearchResultsCsv(courses, filters)
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' })
  triggerDownload(URL.createObjectURL(blob), fileName, true)
}

export function buildSearchResultsCsv(courses, filters) {
  const generatedAt = new Date().toISOString()
  const criteria = JSON.stringify(filters)
  return Papa.unparse(resultRows(courses).map((row) => ({
    exportado_en: generatedAt,
    criterios_busqueda: criteria,
    ...row,
  })))
}
