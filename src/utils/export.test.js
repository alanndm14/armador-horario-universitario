import { describe, expect, it } from 'vitest'
import Papa from 'papaparse'
import { buildScheduleSummary, buildSearchResultsCsv } from './export.js'

describe('buildScheduleSummary', () => {
  it('includes plan, topic, complete teaching team and room information', () => {
    const summary = buildScheduleSummary([
      {
        name: 'Seminario de Ciencias de la Computación A',
        topic: 'Lógica Difusa',
        career: 'Ciencias de la Computación',
        plan: 'Ciencias de la Computación (plan 2013)',
        groupNumber: '7152',
        professors: ['Profesora Uno'],
        assistants: ['Ayudante Uno'],
        modality: 'Presencial',
        classroom: 'P101',
        schedules: [{ day: 'Lu', start: '10:00', end: '12:00', classroom: 'P101' }],
      },
    ])

    expect(summary).toContain('Seminario de Ciencias de la Computación A: Lógica Difusa')
    expect(summary).toContain('Ciencias de la Computación (plan 2013)')
    expect(summary).toContain('Profesora Uno')
    expect(summary).toContain('Ayudante Uno')
    expect(summary).toContain('P101')
  })
})

describe('buildSearchResultsCsv', () => {
  it('exports one complete row per group without collapsing columns', () => {
    const csv = buildSearchResultsCsv([
      {
        faculty: 'Facultad de Ingeniería',
        campus: 'Ciudad Universitaria',
        career: 'Ingeniería (todas las carreras)',
        plan: 'Oferta 2026-2',
        semester: '2026-2',
        period: '20262',
        type: 'Asignatura',
        name: 'Análisis Numérico',
        groups: [{ groupNumber: '1', professors: ['Profesora Uno'], schedules: [], sourceUrl: 'https://example.com' }],
      },
    ], { faculty: 'Facultad de Ingeniería' })
    const parsed = Papa.parse(csv, { header: true }).data[0]

    expect(parsed.facultad).toBe('Facultad de Ingeniería')
    expect(parsed.materia).toBe('Análisis Numérico')
    expect(parsed.grupo).toBe('1')
    expect(parsed.criterios_busqueda).toContain('Facultad de Ingeniería')
  })
})
