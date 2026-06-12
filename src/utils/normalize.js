export function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

export function slugify(value = '') {
  return normalizeText(value).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export function normalizeDay(value = '') {
  const text = normalizeText(value)
  const map = {
    l: 'Lu',
    lu: 'Lu',
    lunes: 'Lu',
    m: 'Ma',
    ma: 'Ma',
    martes: 'Ma',
    mi: 'Mi',
    miercoles: 'Mi',
    j: 'Ju',
    ju: 'Ju',
    jueves: 'Ju',
    v: 'Vi',
    vi: 'Vi',
    viernes: 'Vi',
    s: 'Sa',
    sa: 'Sa',
    sabado: 'Sa',
  }
  return map[text] ?? value
}

export function normalizeHour(value = '') {
  const match = String(value).match(/(\d{1,2}):?(\d{2})?/)
  if (!match) return ''
  const hour = match[1].padStart(2, '0')
  const minute = (match[2] ?? '00').padStart(2, '0')
  return `${hour}:${minute}`
}

export function createSearchIndex(course, group) {
  return normalizeText(
    [
      course.name,
      course.career,
      course.plan,
      course.type,
      group.groupNumber,
      group.topic,
      group.classroom,
      group.modality,
      ...(group.professors ?? []),
      ...(group.assistants ?? []),
    ].join(' '),
  )
}
