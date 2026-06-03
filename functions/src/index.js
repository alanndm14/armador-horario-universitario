import crypto from 'node:crypto'
import * as cheerio from 'cheerio'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'

initializeApp()

const db = getFirestore()
const BASE_URL = 'https://www.fciencias.unam.mx'
const MISPROFESORES_SCHOOL_URL = 'https://www.misprofesores.com/escuelas/Facultad-de-Ciencias-UNAM_2842'
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
    .trim()
}

function slugify(value = '') {
  return normalizeText(value).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function cleanHour(value) {
  return String(value ?? '').slice(0, 5)
}

function sortSchedules(schedules = []) {
  return [...schedules].sort((a, b) => {
    const day = (DAY_ORDER.get(a.day) ?? 99) - (DAY_ORDER.get(b.day) ?? 99)
    if (day !== 0) return day
    return String(a.start).localeCompare(String(b.start)) || String(a.end).localeCompare(String(b.end))
  })
}

function fullName(person) {
  if (!person) return null
  return [person.persona__nombre, person.persona__apellido_1, person.persona__apellido_2].filter(Boolean).join(' ').trim()
}

function extractDrupalSettings(html) {
  const $ = cheerio.load(html)
  const raw = $('script[data-drupal-selector="drupal-settings-json"]').first().text()
  if (!raw) throw new Error('No se encontró drupal-settings-json en la página oficial.')
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

function normalizeSchedule(raw, type) {
  return DAYS.filter(([key]) => raw[key]).map(([, day]) => ({
    day,
    start: cleanHour(raw.profesor_horario__hora_inicio),
    end: cleanHour(raw.profesor_horario__hora_termino),
    classroom: raw.profesor_horario__lugar?.lugar__nombre ?? null,
    type: normalizeText(type || raw.grupo__cargo?.cargo__nombre_corto || 'clase'),
    note: raw.profesor_horario__nota ?? raw.profesor_horario__texto ?? null,
  }))
}

function parseFcienciasCoursePage(html, sourceUrl, fallback = {}) {
  const settings = extractDrupalSettings(html)
  const groups = settings.queryhorarios?.data?.grupos_por_asignatura ?? []
  const firstGroup = groups[0]?.grupo__grupo
  const courseName = firstGroup?.grupo__asignatura?.asignatura__nombre ?? fallback.courseName ?? 'Materia sin nombre'
  const planName = firstGroup?.plan__plan?.plan__nombre ?? String(settings.plan ?? fallback.plan ?? '')
  const period = String(firstGroup?.calendario__periodo ?? settings.semestre ?? fallback.semesterCode ?? '')

  const course = {
    id: slugify(`${fallback.career ?? planName}-${period}-${courseName}`),
    name: courseName,
    normalizedName: normalizeText(courseName),
    career: fallback.career || planName.replace(/\s*\(.*?\)\s*/g, '').trim() || 'Facultad de Ciencias',
    plan: planName,
    semester: fallback.semesterBlock ?? period,
    period,
    type: fallback.semesterBlock?.toLowerCase?.().includes('optativa') ? 'Optativa' : fallback.type ?? 'Sin clasificar',
    credits: null,
    department: null,
    isActive: true,
    sourceUrl,
    sourceHash: crypto.createHash('sha256').update(html).digest('hex'),
    lastSyncedAt: FieldValue.serverTimestamp(),
  }

  const normalizedGroups = groups.map((record) => {
    const rawGroup = record.grupo__grupo
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

    return {
      id: slugify(rawGroup.grupo__clave || rawGroup.grupo__id),
      groupNumber: String(rawGroup.grupo__clave ?? rawGroup.grupo__id),
      professors,
      assistants,
      modality: rawGroup.grupo__modalidad?.modalidad__nombre ?? 'Sin modalidad',
      schedules: sortSchedules(schedules),
      classroom: schedules.find((item) => item.classroom)?.classroom ?? null,
      quota: rawGroup.grupo__cupo ?? null,
      students: rawGroup.grupo__alumnos ?? null,
      rating: null,
      notes: rawGroup.grupo__nota ?? rawGroup.grupo__subtitulo ?? null,
      source: 'fciencias.unam.mx',
      sourceUrl,
      sourceGroupId: rawGroup.grupo__id,
      finalExams: rawGroup.grupo__finales ?? null,
      updatedAt: FieldValue.serverTimestamp(),
    }
  }).sort((a, b) => String(a.groupNumber).localeCompare(String(b.groupNumber), 'es', { numeric: true }))

  return { course, groups: normalizedGroups }
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'armador-horario-universitario/1.0 (+GitHub Pages Firebase sync)',
      accept: 'text/html,application/xhtml+xml',
    },
  })
  if (!response.ok) throw new Error(`No se pudo leer ${url}: HTTP ${response.status}`)
  return response.text()
}

async function discoverCourseTargets({ semesterCode, career, planId, limit }) {
  const indexHtml = await fetchText(`${BASE_URL}/docencia/horarios/indice`)
  const indexSettings = extractDrupalSettings(indexHtml)
  const effectiveSemester = String(semesterCode || indexSettings.semestre_actual || indexSettings.semestre || '')
  const allPlans = getIndexPlans(indexSettings)
  const selectedPlans = allPlans.filter((plan) => {
    if (planId && String(plan.planId) !== String(planId)) return false
    if (career && career !== 'Todas' && !normalizeText(plan.career).includes(normalizeText(career))) return false
    return true
  })

  const targets = []
  for (const plan of selectedPlans) {
    if (targets.length >= limit) break
    try {
      const planUrl = `${BASE_URL}/docencia/horarios/indiceplan/${effectiveSemester}/${plan.planId}`
      const planHtml = await fetchText(planUrl)
      const planSettings = extractDrupalSettings(planHtml)
      for (const course of getPlanCourses(planSettings)) {
        if (!course.courseId) continue
        targets.push({
          url: `${BASE_URL}/docencia/horarios/${effectiveSemester}/${plan.planId}/${course.courseId}`,
          semesterCode: effectiveSemester,
          career: plan.career,
          planId: plan.planId,
          planName: plan.planName,
          semesterBlock: course.semesterBlock,
          courseName: course.courseName,
          courseId: course.courseId,
        })
        if (targets.length >= limit) break
      }
    } catch (error) {
      targets.push({ error: `${plan.planName}: ${error.message}`, career: plan.career, planId: plan.planId })
    }
  }

  if (targets.length === 0 && effectiveSemester) {
    targets.push({
      url: `${BASE_URL}/docencia/horarios/${effectiveSemester}/1556/7`,
      semesterCode: effectiveSemester,
      career: 'Ciencias de la Computación',
      planId: 1556,
      semesterBlock: 'Primer Semestre',
      courseName: 'Álgebra Superior I',
      courseId: 7,
    })
  }

  return targets.slice(0, limit)
}

function parseMisprofesoresDataset(html) {
  const match = html.match(/dataSet\s*=\s*(\[[\s\S]*?\]);/)
  if (!match) return new Map()
  const rows = JSON.parse(match[1])
  const ratings = new Map()
  for (const row of rows) {
    const name = [row.n, row.a].filter(Boolean).join(' ')
    if (!name || row.c == null) continue
    const sourceUrl = `https://www.misprofesores.com/profesores/${slugify(name)}_${row.i}`
    ratings.set(normalizeText(name), {
      score: Number(Number(row.c).toFixed(1)),
      reviewCount: Number(row.m ?? 0),
      source: 'misprofesores.com',
      sourceUrl,
      professorId: row.i,
    })
  }
  return ratings
}

function parseMisprofesoresReviews(html, sourceUrl, limit = 3) {
  const $ = cheerio.load(html)
  const reviews = []
  $('table.tftable tr').each((_, row) => {
    if (reviews.length >= limit) return
    const $row = $(row)
    const comment = $row.find('.commentsParagraph').text().replace(/\s+/g, ' ').trim()
    if (!comment || comment.includes('Comentario esperando revisión')) return
    const scores = $row.find('.score').map((__, score) => Number($(score).text().trim())).get()
    const tags = $row.find('.tagbox span').map((__, tag) => $(tag).text().replace(/\s+/g, ' ').trim()).get().filter(Boolean)
    reviews.push({
      date: $row.find('.date').text().replace(/\s+/g, ' ').trim(),
      className: $row.find('td.class .name .response').first().text().replace(/\s+/g, ' ').trim(),
      quality: Number.isFinite(scores[0]) ? scores[0] : null,
      difficulty: Number.isFinite(scores[1]) ? scores[1] : null,
      ratingType: $row.find('.rating-type').text().replace(/\s+/g, ' ').trim(),
      tags,
      comment,
      sourceUrl,
    })
  })
  return reviews
}

async function fetchMisprofesoresRatings() {
  const html = await fetchText(MISPROFESORES_SCHOOL_URL)
  return parseMisprofesoresDataset(html)
}

async function applyProfessorRatings(groups, ratings, reviewCache, options = {}) {
  const reviewLimit = Number(options.reviewLimit ?? 3)
  const professorReviewLimit = Number(options.professorReviewLimit ?? 80)
  const reviewFetches = { count: 0 }

  return Promise.all(groups.map(async (group) => {
    const professorRatings = (group.professors ?? [])
      .map((name) => ({ name, ...(ratings.get(normalizeText(name)) ?? {}) }))
      .filter((item) => item.score != null)

    for (const rating of professorRatings) {
      if (!rating.sourceUrl || reviewLimit <= 0) continue
      if (!reviewCache.has(rating.sourceUrl) && reviewFetches.count < professorReviewLimit) {
        reviewFetches.count += 1
        try {
          const html = await fetchText(rating.sourceUrl)
          reviewCache.set(rating.sourceUrl, parseMisprofesoresReviews(html, rating.sourceUrl, reviewLimit))
        } catch {
          reviewCache.set(rating.sourceUrl, [])
        }
      }
      rating.reviews = reviewCache.get(rating.sourceUrl) ?? []
    }

    return {
      ...group,
      rating: professorRatings[0]?.score ?? null,
      professorRatings,
    }
  }))
}

async function assertAdmin(uid) {
  if (!uid) throw new HttpsError('unauthenticated', 'Debes iniciar sesión con Google.')
  const adminDoc = await db.doc(`admins/${uid}`).get()
  if (!adminDoc.exists) throw new HttpsError('permission-denied', 'Tu UID no está registrado en admins/{uid}.')
}

async function upsertCourseWithGroups(course, groups) {
  const courseRef = db.doc(`courses/${course.id}`)
  await courseRef.set(course, { merge: true })
  const writer = db.bulkWriter()
  for (const group of groups) {
    writer.set(courseRef.collection('groups').doc(group.id), group, { merge: true })
  }
  await writer.close()
}

export const syncFcienciasSchedules = onCall(
  {
    region: 'us-central1',
    timeoutSeconds: 540,
    memory: '512MiB',
  },
  async (request) => {
    await assertAdmin(request.auth?.uid)

    const career = request.data?.career || ''
    const semesterCode = String(request.data?.semesterCode || '')
    const planId = request.data?.planId || ''
    const includeProfessorRatings = request.data?.includeProfessorRatings !== false
    const includeProfessorReviews = request.data?.includeProfessorReviews !== false
    const reviewLimit = Math.min(Number(request.data?.reviewLimit || 3), 5)
    const professorReviewLimit = Math.min(Number(request.data?.professorReviewLimit || 80), 250)
    const limit = Math.min(Number(request.data?.limit || 200), 2500)
    const targets = await discoverCourseTargets({ semesterCode, career, planId, limit })
    const errors = []
    let coursesWritten = 0
    let groupsWritten = 0
    let ratings = new Map()
    const reviewCache = new Map()

    if (includeProfessorRatings) {
      try {
        ratings = await fetchMisprofesoresRatings()
      } catch (error) {
        errors.push(`MisProfesores: ${error.message}`)
      }
    }

    const syncRef = await db.collection('syncRuns').add({
      source: 'fciencias.unam.mx',
      career,
      semesterCode,
      requestedBy: request.auth.uid,
      status: 'running',
      startedAt: FieldValue.serverTimestamp(),
    })

    for (const target of targets) {
      if (target.error) {
        errors.push(target.error)
        continue
      }
      try {
        const html = await fetchText(target.url)
        const { course, groups } = parseFcienciasCoursePage(html, target.url, target)
        const ratedGroups = includeProfessorRatings
          ? await applyProfessorRatings(groups, ratings, reviewCache, {
              reviewLimit: includeProfessorReviews ? reviewLimit : 0,
              professorReviewLimit,
            })
          : groups
        await upsertCourseWithGroups(course, ratedGroups)
        coursesWritten += 1
        groupsWritten += ratedGroups.length
      } catch (error) {
        errors.push(`${target.url}: ${error.message}`)
      }
    }

    await syncRef.set(
      {
        status: errors.length ? 'completed_with_errors' : 'completed',
        finishedAt: FieldValue.serverTimestamp(),
        sourcesVisited: targets.length,
        coursesWritten,
        groupsWritten,
        errors,
      },
      { merge: true },
    )

    return {
      ok: errors.length === 0,
      sourcesVisited: targets.length,
      coursesWritten,
      groupsWritten,
      ratingsLoaded: ratings.size,
      reviewPagesLoaded: reviewCache.size,
      errors,
    }
  },
)

export {
  discoverCourseTargets,
  parseFcienciasCoursePage,
  parseMisprofesoresDataset,
  parseMisprofesoresReviews,
  sortSchedules,
}
