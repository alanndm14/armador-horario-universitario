import crypto from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import * as cheerio from 'cheerio'

const BASE_URL = 'https://www.fciencias.unam.mx'
const INDEX_URL = `${BASE_URL}/docencia/horarios/indice`
const MISPROFESORES_URL = 'https://www.misprofesores.com/escuelas/Facultad-de-Ciencias-UNAM_2842'
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
  const course = {
    id: slugify(`${target.career}-${target.planId}-${period}-${target.courseId || courseName}`),
    name: courseName,
    normalizedName: normalizeText(courseName),
    career: target.career || 'Facultad de Ciencias',
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
      topic: rawGroup.grupo__subtitulo ?? null,
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

async function main() {
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
  const courses = mergeCourses(parsed)

  let ratings = new Map()
  try {
    ratings = parseMisprofesoresDataset(await fetchText(MISPROFESORES_URL))
  } catch (error) {
    console.warn(`Calificaciones omitidas: ${error.message}`)
  }

  const matchedRatings = new Map()
  for (const course of courses) {
    for (const group of course.groups) {
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
      planCount: plans.length,
      courseCount: courses.length,
      groupCount,
      topicCount,
      presentationCount,
      ratingsAvailable: ratings.size,
      ratingMatches: matchedRatings.size,
      reviewPagesLoaded: reviewCache.size,
      courseErrors,
      sources: [INDEX_URL, MISPROFESORES_URL],
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
