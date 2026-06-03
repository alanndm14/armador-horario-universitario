import { describe, expect, it } from 'vitest'
import { normalizeDay, normalizeHour, normalizeText } from '../utils/normalize.js'

describe('normalización', () => {
  it('busca sin acentos y en minúsculas', () => {
    expect(normalizeText('Álgebra Superior I')).toBe('algebra superior i')
  })

  it('normaliza días comunes', () => {
    expect(normalizeDay('Miércoles')).toBe('Mi')
    expect(normalizeDay('sabado')).toBe('Sa')
  })

  it('normaliza horas a HH:mm', () => {
    expect(normalizeHour('7:00:00')).toBe('07:00')
    expect(normalizeHour('0900')).toBe('09:00')
  })
})
