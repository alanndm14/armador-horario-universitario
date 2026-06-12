import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'
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
      return `${item.name}${item.topic ? `: ${item.topic}` : ''} - Grupo ${item.groupNumber ?? 'personal'}\nCarrera: ${item.career ?? 'Personal'}\nPlan: ${item.plan ?? 'No aplica'}\nProfesores: ${professor}\nAyudantes: ${assistants}\nHorario: ${formatSchedule(item.schedules)}\nModalidad: ${item.modality ?? 'Personal'}\nAula: ${item.classroom ?? 'No publicada'}`
    })
    .join('\n\n')
}

export async function copySummary(items) {
  await navigator.clipboard.writeText(buildScheduleSummary(items))
}

export async function downloadSchedulePng(node, fileName = 'horario.png') {
  const dataUrl = await toPng(node, { cacheBust: true, pixelRatio: 2, width: node.scrollWidth, height: node.scrollHeight })
  triggerDownload(dataUrl, fileName)
}

export async function downloadSchedulePdf(node, fileName = 'horario.pdf') {
  const dataUrl = await toPng(node, { cacheBust: true, pixelRatio: 2, width: node.scrollWidth, height: node.scrollHeight })
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
