import { describe, expect, it } from 'vitest'
import { buildScheduleSummary } from './export.js'

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
