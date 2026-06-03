import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'
import { formatSchedule } from './time.js'

export function buildScheduleSummary(items = []) {
  return items
    .map((item) => {
      const professor = item.professors?.join(', ') || 'Sin profesor registrado'
      return `${item.name} - Grupo ${item.groupNumber ?? 'personal'}\nProfesor: ${professor}\nHorario: ${formatSchedule(item.schedules)}\nModalidad: ${item.modality ?? 'Personal'}\nAula: ${item.classroom ?? 'No registrada'}`
    })
    .join('\n\n')
}

export async function copySummary(items) {
  await navigator.clipboard.writeText(buildScheduleSummary(items))
}

export async function downloadSchedulePng(node, fileName = 'horario.png') {
  const dataUrl = await toPng(node, { cacheBust: true, pixelRatio: 2 })
  const link = document.createElement('a')
  link.download = fileName
  link.href = dataUrl
  link.click()
}

export async function downloadSchedulePdf(node, fileName = 'horario.pdf') {
  const dataUrl = await toPng(node, { cacheBust: true, pixelRatio: 2 })
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const width = pdf.internal.pageSize.getWidth()
  const height = pdf.internal.pageSize.getHeight()
  pdf.addImage(dataUrl, 'PNG', 24, 24, width - 48, height - 48)
  pdf.save(fileName)
}

export function downloadScheduleJson(payload, fileName = 'horario.json') {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const link = document.createElement('a')
  link.download = fileName
  link.href = URL.createObjectURL(blob)
  link.click()
  URL.revokeObjectURL(link.href)
}
