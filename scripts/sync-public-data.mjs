import crypto from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import * as cheerio from 'cheerio'
import { PDFParse } from 'pdf-parse'

const BASE_URL = 'https://www.fciencias.unam.mx'
const INDEX_URL = `${BASE_URL}/docencia/horarios/indice`
const MISPROFESORES_URL = 'https://www.misprofesores.com/escuelas/Facultad-de-Ciencias-UNAM_2842'
const FFYL_BASE_URL = 'https://servicios-galileo.filos.unam.mx'
const FFYL_INDEX_URL = `${FFYL_BASE_URL}/horarios/ordinarios`
const ENGINEERING_BASE_URL = 'https://www.ssa.ingenieria.unam.mx'
const ENGINEERING_INDEX_URL = `${ENGINEERING_BASE_URL}/horarios.html`
const ENGINEERING_LIST_URL = `${ENGINEERING_BASE_URL}/cj/tmp/programacion_horarios/listaAsignatura.js`
const IIMAS_SCHEDULE_URL = 'https://www.iimas.unam.mx/wp-content/uploads/2026/01/horarios-semestre-2026-2-web.pdf'
const MEDICINE_SCHEDULE_URL = 'https://escolares.facmed.unam.mx/pagina-web/menu/archivos/pregrado/medico-cirujano/programaciones/90c311b16e6112f03be0cef51fb1a180.pdf'
const OUTPUT_PATH = new URL('../public/data/courses.json', import.meta.url)
const CONCURRENCY = Math.max(1, Number(process.env.SYNC_CONCURRENCY || 12))
const MAX_COURSES = Math.max(0, Number(process.env.MAX_COURSES || 0))
const MAX_REVIEW_PROFESSORS = Math.max(0, Number(process.env.MAX_REVIEW_PROFESSORS || 2000))
const REVIEWS_PER_PROFESSOR = Math.max(0, Number(process.env.REVIEWS_PER_PROFESSOR || 2))
const DAYS = [
  ['profesor_horario__lu', 'Lu'],
  ['profesor_horario__ma', 'Ma'],
  ['profesor_horario__mi', 'Mi'],
  ['profesor_horario__ju', 'Ju'],
  ['profesor_horario__vi', 'Vi'],
  ['profesor_horario__sa', 'Sa'],
]
const DAY_ORDER = new Map(DAYS.map(([, day], index) => [day, index]))

function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function slugify(value = '') {
  return normalizeText(value).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))]
}

function cleanHour(value) {
  return String(value ?? '').slice(0, 5)
}

function sortSchedules(schedules = []) {
  return [...schedules].sort((a, b) => {
    const dayDifference = (DAY_ORDER.get(a.day) ?? 99) - (DAY_ORDER.get(b.day) ?? 99)
    if (dayDifference !== 0) return dayDifference
    return String(a.start).localeCompare(String(b.start)) || String(a.end).localeCompare(String(b.end))
  })
}

function fullName(person) {
  if (!person) return null
  return [person.persona__nombre, person.persona__apellido_1, person.persona__apellido_2]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractDrupalSettings(html) {
  const $ = cheerio.load(html)
  const raw = $('script[data-drupal-selector="drupal-settings-json"]').first().text()
  if (!raw) throw new Error('La pagina oficial no contiene drupal-settings-json.')
  return JSON.parse(raw)
}

function getIndexPlans(settings) {
  return settings.queryData?.data?.especialidades_periodo?.flatMap((career) =>
    (career.especialidad__planes ?? []).map((plan) => ({
      careerId: career.especialidad__id,
      career: career.especialidad__nombre,
      planId: plan.plan__id,
      planName: plan.plan__nombre,
    })),
  ) ?? []
}

function getPlanCourses(settings) {
  return settings.querygruposplan?.data?.grupos_por_plan?.flatMap((block) =>
    (block.plan__grupos_bloque ?? []).map((item) => ({
      semesterBlock: block.plan__bloque,
      courseId: item.asignatura__asignatura?.asignatura__id,
      courseName: item.asignatura__asignatura?.asignatura__nombre,
    })),
  ) ?? []
}

function normalizeSchedule(raw, role) {
  return DAYS.filter(([key]) => raw[key]).map(([, day]) => ({
    day,
    start: cleanHour(raw.profesor_horario__hora_inicio),
    end: cleanHour(raw.profesor_horario__hora_termino),
    classroom: raw.profesor_horario__lugar?.lugar__nombre ?? null,
    type: normalizeText(role || raw.grupo__cargo?.cargo__nombre_corto || 'clase'),
    note: raw.profesor_horario__nota ?? raw.profesor_horario__texto ?? null,
  }))
}

function parseCoursePage(html, target) {
  const settings = extractDrupalSettings(html)
  const records = settings.queryhorarios?.data?.grupos_por_asignatura ?? []
  const firstGroup = records[0]?.grupo__grupo
  const courseName = firstGroup?.grupo__asignatura?.asignatura__nombre ?? target.courseName ?? 'Materia sin nombre'
  const planName = firstGroup?.plan__plan?.plan__nombre ?? target.planName ?? ''
  const period = String(firstGroup?.calendario__periodo ?? settings.semestre ?? target.semesterCode ?? '')
  const sourceHash = crypto.createHash('sha256').update(html).digest('hex')
  const genericTopicCourse = /temas selectos|seminario/i.test(courseName)
  const course = {
    id: slugify(`${target.career}-${target.planId}-${period}-${target.courseId || courseName}`),
    name: courseName,
    normalizedName: normalizeText(courseName),
    faculty: 'Facultad de Ciencias',
    campus: 'Ciudad Universitaria',
    career: target.career || 'Sin carrera publicada',
    plan: target.planName || planName,
    plans: unique([target.planName]),
    semester: target.semesterBlock ?? period,
    period,
    type: normalizeText(target.semesterBlock).includes('optativa') ? 'Optativa' : 'Obligatoria',
    credits: null,
    department: null,
    isActive: true,
    sourceUrl: target.url,
    sourceHash,
    lastSyncedAt: new Date().toISOString(),
  }

  const groups = records.map((record) => {
    const rawGroup = record.grupo__grupo ?? {}
    const professors = []
    const assistants = []
    const schedules = []

    for (const teacher of record.grupo__profesores ?? []) {
      const name = fullName(teacher.profesor__persona)
      const role = teacher.profesor__horarios?.[0]?.grupo__cargo?.cargo__nombre_corto ?? 'Profesor'
      if (name && normalizeText(role).includes('ayud')) assistants.push(name)
      if (name && !normalizeText(role).includes('ayud')) professors.push(name)
      for (const schedule of teacher.profesor__horarios ?? []) {
        schedules.push(...normalizeSchedule(schedule, role))
      }
    }

    const sortedSchedules = sortSchedules(schedules)
    return {
      id: slugify(rawGroup.grupo__clave || rawGroup.grupo__id),
      groupNumber: String(rawGroup.grupo__clave ?? rawGroup.grupo__id ?? ''),
      topic: rawGroup.grupo__subtitulo ?? rawGroup.grupo__nota ?? (genericTopicCourse ? 'Tema no publicado por la Facultad' : null),
      professors: unique(professors),
      assistants: unique(assistants),
      modality: rawGroup.grupo__modalidad?.modalidad__nombre ?? 'Sin modalidad',
      schedules: sortedSchedules,
      classroom: sortedSchedules.find((item) => item.classroom)?.classroom ?? null,
      quota: rawGroup.grupo__cupo ?? null,
      students: rawGroup.grupo__alumnos ?? null,
      rating: null,
      professorRatings: [],
      notes: rawGroup.grupo__nota ?? null,
      source: 'fciencias.unam.mx',
      sourceUrl: target.url,
      hasPresentation: Boolean(rawGroup.grupo__tiene_presentacion),
      presentationUrl: rawGroup.grupo__tiene_presentacion
        ? `${BASE_URL}/docencia/horarios/presentacion/${rawGroup.grupo__id}`
        : null,
      sourceGroupId: rawGroup.grupo__id,
      finalExams: rawGroup.grupo__finales ?? null,
      updatedAt: new Date().toISOString(),
    }
  }).sort((a, b) => String(a.groupNumber).localeCompare(String(b.groupNumber), 'es', { numeric: true }))

  return { course, groups }
}

function parseFfylScheduleCell(value, day) {
  const schedules = []
  const text = String(value ?? '').replace(/\s+/g, ' ').trim()
  const pattern = /(\d{2})-(\d{2})(.*?)(?=\d{2}-\d{2}|$)/g
  for (const match of text.matchAll(pattern)) {
    schedules.push({
      day,
      start: `${match[1]}:00`,
      end: `${match[2]}:00`,
      classroom: match[3].trim() || null,
      type: 'clase',
      note: null,
    })
  }
  return schedules
}

function getFfylPlans(html) {
  const $ = cheerio.load(html)
  return $('a[href*="/horarios/ordinarios/"]').map((_, link) => {
    const href = $(link).attr('href')
    const context = $(link).parent().parent().text().replace(/\s+/g, ' ').trim()
    const career = context.split(/\bPlan\s+\d+/i)[0].trim()
    return {
      faculty: 'Facultad de Filosofía y Letras',
      campus: 'Ciudad Universitaria',
      career,
      planName: $(link).text().replace(/\s+/g, ' ').trim(),
      planId: href.split('/').pop(),
      url: `${FFYL_BASE_URL}${href}`,
    }
  }).get().filter((plan) => plan.career && plan.planId)
}

function parseFfylPlanPage(html, target) {
  const $ = cheerio.load(html)
  const sourceHash = crypto.createHash('sha256').update(html).digest('hex')
  const periodMatch = $.root().text().match(/SEMESTRE\s+(\d{4})[-\s]?(\d)/i)
  const period = periodMatch ? `${periodMatch[1]}${periodMatch[2]}` : '20262'
  const parsed = []
  let current = null

  $('table tr').each((_, row) => {
    const cells = $(row).find('th,td').map((__, cell) => $(cell).text().replace(/\s+/g, ' ').trim()).get()
    if (cells.length === 1) {
      const heading = cells[0].match(/^([A-Z0-9-]+)\s*-\s*(.+)$/i)
      if (!heading) return
      const courseName = heading[2].trim()
      current = {
        course: {
          id: slugify(`${target.faculty}-${target.career}-${target.planId}-${period}-${heading[1]}-${courseName}`),
          name: courseName,
          normalizedName: normalizeText(courseName),
          faculty: target.faculty,
          campus: target.campus,
          career: target.career,
          plan: target.planName,
          plans: [target.planName],
          semester: 'Sin semestre publicado',
          period,
          type: 'Sin clasificación publicada',
          credits: null,
          department: null,
          isActive: true,
          sourceUrl: target.url,
          sourceHash,
          lastSyncedAt: new Date().toISOString(),
        },
        groups: [],
      }
      parsed.push(current)
      return
    }
    if (!current || cells.length < 9 || !/^\d+$/.test(cells[0])) return
    const schedules = sortSchedules(cells.slice(3, 9).flatMap((cell, index) => parseFfylScheduleCell(cell, DAYS[index][1])))
    const professor = cells[2].replace(/\S+@\S+/g, '').replace(/\s+/g, ' ').trim()
    current.groups.push({
      id: slugify(`${target.planId}-${current.course.id}-${cells[1]}`),
      groupNumber: cells[1],
      topic: null,
      professors: professor ? [professor] : [],
      assistants: [],
      modality: 'Presencial',
      schedules,
      classroom: schedules.find((item) => item.classroom)?.classroom ?? null,
      quota: null,
      students: null,
      rating: null,
      professorRatings: [],
      notes: null,
      source: 'servicios-galileo.filos.unam.mx',
      sourceUrl: target.url,
      hasPresentation: false,
      presentationUrl: null,
      sourceGroupId: null,
      finalExams: null,
      updatedAt: new Date().toISOString(),
    })
  })
  return parsed.filter((course) => course.groups.length)
}

function parseEngineeringSubjects(script) {
  return [...script.matchAll(/asignatura\['(\d+)'\]\s*=\s*'([^']*)'/g)].map((match) => ({
    key: match[1],
    name: match[2].replace(/\s+/g, ' ').trim(),
    url: `${ENGINEERING_BASE_URL}/cj/tmp/programacion_horarios/${match[1]}.html`,
  }))
}

function engineeringDays(value = '') {
  const map = { lun: 'Lu', mar: 'Ma', mie: 'Mi', jue: 'Ju', vie: 'Vi', sab: 'Sa' }
  return String(value).split(',').map((day) => map[normalizeText(day)]).filter(Boolean)
}

function parseEngineeringCourse(html, target) {
  const $ = cheerio.load(html)
  const groups = new Map()
  $('.compu table tbody').each((_, tbody) => {
    let group = null
    $(tbody).find('tr').each((__, row) => {
      const cells = $(row).find('td').map((___, cell) => $(cell).text().replace(/\s+/g, ' ').trim()).get()
      if (cells.length >= 9) {
        const professorText = cells[2]
        const modality = professorText.match(/\(([^)]+)\)\s*$/)?.[1] ?? 'Sin modalidad'
        const professor = professorText.replace(/\([^)]+\)\s*$/, '').trim()
        const quota = Number(cells[7])
        const vacancies = Number(cells[8])
        group = {
          id: slugify(`ingenieria-${target.key}-${cells[1]}`),
          groupNumber: cells[1],
          topic: null,
          professors: professor ? [professor] : [],
          assistants: [],
          modality,
          schedules: [],
          classroom: cells[6] || null,
          quota: Number.isFinite(quota) ? quota : null,
          students: Number.isFinite(quota) && Number.isFinite(vacancies) ? quota - vacancies : null,
          vacancies: Number.isFinite(vacancies) ? vacancies : null,
          rating: null,
          professorRatings: [],
          notes: `Tipo oficial: ${cells[3] || 'Sin publicar'}`,
          source: 'ssa.ingenieria.unam.mx',
          sourceUrl: target.url,
          hasPresentation: false,
          presentationUrl: null,
          sourceGroupId: null,
          finalExams: null,
          updatedAt: new Date().toISOString(),
        }
        groups.set(group.groupNumber, group)
        for (const day of engineeringDays(cells[5])) {
          group.schedules.push({ day, start: cells[4].slice(0, 5), end: cells[4].slice(-5), classroom: cells[6] || null, type: cells[3] || 'clase', note: null })
        }
      } else if (group && cells.length >= 3) {
        for (const day of engineeringDays(cells[1])) {
          group.schedules.push({ day, start: cells[0].slice(0, 5), end: cells[0].slice(-5), classroom: cells[2] || null, type: 'clase', note: null })
        }
      }
    })
  })
  const department = $('strong').first().text().replace(/\s+/g, ' ').trim() || null
  return {
    course: {
      id: slugify(`facultad-ingenieria-20262-${target.key}-${target.name}`),
      name: target.name,
      normalizedName: normalizeText(target.name),
      faculty: 'Facultad de Ingeniería',
      campus: 'Ciudad Universitaria',
      career: 'Ingeniería (todas las carreras)',
      plan: 'Oferta oficial 2026-2',
      plans: ['Oferta oficial 2026-2'],
      semester: 'Sin semestre publicado',
      period: '20262',
      type: 'Asignatura',
      credits: null,
      department,
      isActive: true,
      sourceUrl: target.url,
      sourceHash: crypto.createHash('sha256').update(html).digest('hex'),
      lastSyncedAt: new Date().toISOString(),
    },
    groups: [...groups.values()].map((group) => ({ ...group, schedules: sortSchedules(group.schedules) })),
  }
}

async function pdfPages(url) {
  const parser = new PDFParse({ url })
  try {
    return (await parser.getText()).pages
  } finally {
    await parser.destroy()
  }
}

function partialOfficialGroup({ faculty, career, plan, semester, period, name, groupNumber, professors = [], assistants = [], notes, sourceUrl }) {
  return {
    course: {
      id: slugify(`${faculty}-${career}-${plan}-${period}-${name}`),
      name,
      normalizedName: normalizeText(name),
      faculty,
      campus: 'Ciudad Universitaria',
      career,
      plan,
      plans: [plan],
      semester,
      period,
      type: 'Asignatura',
      credits: null,
      department: null,
      isActive: true,
      sourceUrl,
      sourceHash: crypto.createHash('sha256').update(notes).digest('hex'),
      lastSyncedAt: new Date().toISOString(),
    },
    groups: [{
      id: slugify(`${faculty}-${career}-${groupNumber}-${name}`),
      groupNumber,
      topic: null,
      professors,
      assistants,
      modality: 'Consultar fuente oficial',
      schedules: [],
      classroom: null,
      quota: null,
      students: null,
      rating: null,
      professorRatings: [],
      notes,
      source: new URL(sourceUrl).hostname,
      sourceUrl,
      hasPresentation: false,
      presentationUrl: null,
      sourceGroupId: null,
      finalExams: null,
      updatedAt: new Date().toISOString(),
    }],
  }
}

function parseIimasPages(pages) {
  return pages.slice(0, 2).flatMap((page) => {
    const header = page.text.match(/(Sexto|Octavo) Semestre[\s\S]*?Plan de Estudios:\s*(\d+)/i)
    if (!header) return []
    const blocks = page.text.split(/(?=^\d{4}\s+\d{4}\b)/gm).slice(1)
    return blocks.map((block) => {
      const match = block.match(/^(\d{4})\s+(\d{4})\s+([\s\S]*?)(?:\d+\s*horas?|\n(?:Dr|Dra|Lic|M\.C|Esp|Ing)\.)/i)
      if (!match) return null
      const name = match[3].replace(/\s+/g, ' ').trim()
      const publishedTeam = block.match(/\d+\s*horas?\s+([\s\S]*?)(?=\d{1,2}:\d{2})/i)?.[1].replace(/\s+/g, ' ').trim()
      return partialOfficialGroup({
        faculty: 'Instituto de Investigaciones en Matemáticas Aplicadas y en Sistemas',
        career: 'Ciencia de Datos',
        plan: `Plan de Estudios ${header[2]}`,
        semester: `${header[1]} Semestre`,
        period: '20262',
        name,
        groupNumber: match[1],
        professors: publishedTeam ? [`Equipo docente publicado: ${publishedTeam}`] : [],
        notes: block.replace(/\s+/g, ' ').trim(),
        sourceUrl: IIMAS_SCHEDULE_URL,
      })
    }).filter(Boolean)
  })
}

function parseMedicinePages(pages) {
  const courses = [
    'Anatomía',
    'Biología Celular e Histología Médica',
    'Bioquímica y Biología Molecular',
    'Embriología Humana',
    'Integración Básico Clínica 1',
    'Introducción a la Salud Mental',
    'Salud Pública y Comunidad',
    'Informática Biomédica 1',
  ]
  const groups = unique(pages.flatMap((page) => page.text.match(/\b11\d{2}\b/g) ?? []))
  return courses.flatMap((name) => groups.map((groupNumber) => partialOfficialGroup({
    faculty: 'Facultad de Medicina',
    career: 'Médico Cirujano',
    plan: 'Plan vigente publicado',
    semester: 'Primer año',
    period: '2025-2026',
    name,
    groupNumber,
    notes: 'El horario detallado se publica como cuadrícula visual en el PDF oficial. Consulta la fuente para confirmar día, hora, aula y tipo de sesión.',
    sourceUrl: MEDICINE_SCHEDULE_URL,
  })))
}

async function fetchText(url, attempt = 1) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'armador-horario-universitario/1.0 (public academic data sync)',
      accept: 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(45_000),
  })
  if (response.ok) return response.text()
  if (attempt < 3 && (response.status === 429 || response.status >= 500)) {
    await new Promise((resolve) => setTimeout(resolve, 750 * attempt))
    return fetchText(url, attempt + 1)
  }
  throw new Error(`HTTP ${response.status} al leer ${url}`)
}

async function fetchEngineeringText(url, attempt = 1) {
  await new Promise((resolve) => setTimeout(resolve, 400))
  const response = await fetch(url, {
    headers: {
      'user-agent': 'armador-horario-universitario/1.0 (public academic data sync)',
      accept: 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(45_000),
  })
  if (response.ok) return response.text()
  if (attempt < 8 && (response.status === 429 || response.status >= 500)) {
    await new Promise((resolve) => setTimeout(resolve, 3000 * attempt))
    return fetchEngineeringText(url, attempt + 1)
  }
  throw new Error(`HTTP ${response.status} al leer ${url}`)
}

async function mapConcurrent(items, limit, mapper) {
  const results = new Array(items.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await mapper(items[index], index)
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

function parseMisprofesoresDataset(html) {
  const match = html.match(/dataSet\s*=\s*(\[[\s\S]*?\]);/)
  if (!match) return new Map()
  const ratings = new Map()
  for (const row of JSON.parse(match[1])) {
    const name = [row.n, row.a].filter(Boolean).join(' ')
    if (!name || row.c == null) continue
    ratings.set(normalizeText(name), {
      score: Number(Number(row.c).toFixed(1)),
      reviewCount: Number(row.m ?? 0),
      source: 'misprofesores.com',
      sourceUrl: `https://www.misprofesores.com/profesores/${slugify(name)}_${row.i}`,
      professorId: row.i,
    })
  }
  return ratings
}

function parseMisprofesoresReviews(html, sourceUrl) {
  const $ = cheerio.load(html)
  const reviews = []
  $('table.tftable tr').each((_, row) => {
    if (reviews.length >= REVIEWS_PER_PROFESSOR) return
    const $row = $(row)
    const comment = $row.find('.commentsParagraph').text().replace(/\s+/g, ' ').trim()
    if (!comment || normalizeText(comment).includes('comentario esperando revision')) return
    const scores = $row.find('.score').map((__, score) => Number($(score).text().trim())).get()
    reviews.push({
      date: $row.find('.date').text().replace(/\s+/g, ' ').trim(),
      className: $row.find('td.class .name .response').first().text().replace(/\s+/g, ' ').trim(),
      quality: Number.isFinite(scores[0]) ? scores[0] : null,
      difficulty: Number.isFinite(scores[1]) ? scores[1] : null,
      ratingType: $row.find('.rating-type').text().replace(/\s+/g, ' ').trim(),
      tags: $row.find('.tagbox span').map((__, tag) => $(tag).text().replace(/\s+/g, ' ').trim()).get().filter(Boolean),
      comment,
      sourceUrl,
    })
  })
  return reviews
}

function mergeCourses(parsedCourses) {
  const courses = new Map()
  for (const parsed of parsedCourses.filter(Boolean)) {
    const current = courses.get(parsed.course.id)
    if (!current) {
      courses.set(parsed.course.id, { ...parsed.course, groups: parsed.groups })
      continue
    }
    current.plans = unique([...current.plans, ...parsed.course.plans])
    const groups = new Map(current.groups.map((group) => [group.id, group]))
    for (const group of parsed.groups) groups.set(group.id, group)
    current.groups = [...groups.values()].sort((a, b) =>
      String(a.groupNumber).localeCompare(String(b.groupNumber), 'es', { numeric: true }),
    )
  }
  return [...courses.values()].sort((a, b) =>
    a.career.localeCompare(b.career, 'es') || a.name.localeCompare(b.name, 'es'),
  )
}

function previousFacultyCourses(previousCourses, faculty) {
  return previousCourses
    .filter((course) => course.faculty === faculty)
    .map((course) => ({ course: { ...course, groups: undefined }, groups: course.groups ?? [] }))
}

async function main() {
  let previousCourses = []
  try {
    const previousPayload = JSON.parse(await readFile(OUTPUT_PATH, 'utf8'))
    previousCourses = previousPayload.courses ?? []
  } catch {
    previousCourses = []
  }
  console.log('Descubriendo carreras y planes oficiales...')
  const indexSettings = extractDrupalSettings(await fetchText(INDEX_URL))
  const semester = String(indexSettings.semestre_actual || indexSettings.semestre || '')
  const plans = getIndexPlans(indexSettings)

  const planResults = await mapConcurrent(plans, Math.min(CONCURRENCY, 8), async (plan) => {
    try {
      const url = `${BASE_URL}/docencia/horarios/indiceplan/${semester}/${plan.planId}`
      const settings = extractDrupalSettings(await fetchText(url))
      return getPlanCourses(settings).filter((course) => course.courseId).map((course) => ({
        ...plan,
        ...course,
        semesterCode: semester,
        url: `${BASE_URL}/docencia/horarios/${semester}/${plan.planId}/${course.courseId}`,
      }))
    } catch (error) {
      console.warn(`Plan omitido (${plan.planName}): ${error.message}`)
      return []
    }
  })

  const targetsByUrl = new Map(planResults.flat().map((target) => [target.url, target]))
  let targets = [...targetsByUrl.values()]
  if (MAX_COURSES > 0) targets = targets.slice(0, MAX_COURSES)
  console.log(`Leyendo ${targets.length} paginas de materias de ${plans.length} planes...`)

  let courseErrors = 0
  const parsed = await mapConcurrent(targets, CONCURRENCY, async (target, index) => {
    if ((index + 1) % 100 === 0) console.log(`Materias procesadas: ${index + 1}/${targets.length}`)
    try {
      return parseCoursePage(await fetchText(target.url), target)
    } catch (error) {
      courseErrors += 1
      console.warn(`Materia omitida (${target.courseName}): ${error.message}`)
      return null
    }
  })
  console.log('Leyendo horarios públicos de la Facultad de Filosofía y Letras...')
  let ffylPlans = []
  let ffylParsed = []
  try {
    ffylPlans = getFfylPlans(await fetchText(FFYL_INDEX_URL))
    ffylParsed = (await mapConcurrent(ffylPlans, Math.min(CONCURRENCY, 8), async (plan) => {
      try {
        return parseFfylPlanPage(await fetchText(plan.url), plan)
      } catch (error) {
        console.warn(`Plan FFyL omitido (${plan.career} ${plan.planName}): ${error.message}`)
        return []
      }
    })).flat()
  } catch (error) {
    console.warn(`Facultad de Filosofía y Letras omitida: ${error.message}`)
  }

  console.log('Leyendo horarios públicos de la Facultad de Ingeniería...')
  let engineeringParsed = previousFacultyCourses(previousCourses, 'Facultad de Ingeniería')
  try {
    const engineeringSubjects = parseEngineeringSubjects(await fetchText(ENGINEERING_LIST_URL))
    const refreshedEngineering = await mapConcurrent(engineeringSubjects, 2, async (subject, index) => {
      if ((index + 1) % 100 === 0) console.log(`Asignaturas de Ingeniería procesadas: ${index + 1}/${engineeringSubjects.length}`)
      try {
        const parsedCourse = parseEngineeringCourse(await fetchEngineeringText(subject.url), subject)
        return parsedCourse.groups.length ? parsedCourse : null
      } catch (error) {
        console.warn(`Asignatura de Ingeniería omitida (${subject.name}): ${error.message}`)
        return null
      }
    })
    engineeringParsed = [...engineeringParsed, ...refreshedEngineering]
  } catch (error) {
    console.warn(`Facultad de Ingeniería omitida: ${error.message}`)
  }

  console.log('Leyendo horario oficial de Ciencia de Datos IIMAS...')
  let iimasParsed = previousFacultyCourses(previousCourses, 'Instituto de Investigaciones en Matemáticas Aplicadas y en Sistemas')
  try {
    iimasParsed = [...iimasParsed, ...parseIimasPages(await pdfPages(IIMAS_SCHEDULE_URL))]
  } catch (error) {
    console.warn(`Ciencia de Datos IIMAS omitida: ${error.message}`)
  }

  console.log('Leyendo grupos oficiales de la Facultad de Medicina...')
  let medicineParsed = previousFacultyCourses(previousCourses, 'Facultad de Medicina')
  try {
    medicineParsed = [...medicineParsed, ...parseMedicinePages(await pdfPages(MEDICINE_SCHEDULE_URL))]
  } catch (error) {
    console.warn(`Facultad de Medicina omitida: ${error.message}`)
  }

  const courses = mergeCourses([...parsed, ...ffylParsed, ...engineeringParsed, ...iimasParsed, ...medicineParsed])

  let ratings = new Map()
  try {
    ratings = parseMisprofesoresDataset(await fetchText(MISPROFESORES_URL))
  } catch (error) {
    console.warn(`Calificaciones omitidas: ${error.message}`)
  }

  const matchedRatings = new Map()
  for (const course of courses) {
    for (const group of course.groups) {
      if (course.faculty !== 'Facultad de Ciencias') continue
      const teachingStaff = [
        ...group.professors.map((name) => ({ name, role: 'Profesor' })),
        ...group.assistants.map((name) => ({ name, role: 'Ayudante' })),
      ]
      group.professorRatings = teachingStaff.map((person) => ({
        ...person,
        ...(ratings.get(normalizeText(person.name)) ?? {}),
      }))
      const scores = group.professorRatings.map((rating) => rating.score).filter(Number.isFinite)
      group.rating = scores.length ? Number((scores.reduce((total, score) => total + score, 0) / scores.length).toFixed(1)) : null
      for (const rating of group.professorRatings) {
        if (rating.sourceUrl) matchedRatings.set(rating.sourceUrl, rating)
      }
    }
  }

  const reviewTargets = [...matchedRatings.values()]
    .sort((a, b) => b.reviewCount - a.reviewCount)
    .slice(0, MAX_REVIEW_PROFESSORS)
  const reviewCache = new Map()
  console.log(`Leyendo resenas recientes de ${reviewTargets.length} profesores coincidentes...`)
  await mapConcurrent(reviewTargets, Math.min(CONCURRENCY, 8), async (rating) => {
    try {
      reviewCache.set(rating.sourceUrl, parseMisprofesoresReviews(await fetchText(rating.sourceUrl), rating.sourceUrl))
    } catch {
      reviewCache.set(rating.sourceUrl, [])
    }
  })

  for (const course of courses) {
    for (const group of course.groups) {
      for (const rating of group.professorRatings) rating.reviews = reviewCache.get(rating.sourceUrl) ?? []
    }
  }

  const careers = unique(courses.map((course) => course.career))
  const groupCount = courses.reduce((total, course) => total + course.groups.length, 0)
  const topicCount = courses.flatMap((course) => course.groups).filter((group) => group.topic).length
  const presentationCount = courses.flatMap((course) => course.groups).filter((group) => group.presentationUrl).length
  const payload = {
    meta: {
      generatedAt: new Date().toISOString(),
      semester,
      careerCount: careers.length,
      careers,
      facultyCount: unique(courses.map((course) => course.faculty)).length,
      faculties: unique(courses.map((course) => course.faculty)),
      planCount: unique(courses.map((course) => `${course.faculty}|${course.plan}`)).length,
      courseCount: courses.length,
      groupCount,
      topicCount,
      presentationCount,
      ratingsAvailable: ratings.size,
      ratingMatches: matchedRatings.size,
      reviewPagesLoaded: reviewCache.size,
      courseErrors,
      sources: [INDEX_URL, FFYL_INDEX_URL, ENGINEERING_INDEX_URL, IIMAS_SCHEDULE_URL, MEDICINE_SCHEDULE_URL, MISPROFESORES_URL],
    },
    courses,
  }

  await mkdir(new URL('../public/data/', import.meta.url), { recursive: true })
  await writeFile(OUTPUT_PATH, `${JSON.stringify(payload)}\n`, 'utf8')
  console.log(JSON.stringify(payload.meta, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
