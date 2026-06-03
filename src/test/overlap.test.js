import { describe, expect, it } from 'vitest'
import { findOverlaps, schedulesOverlap } from '../utils/overlap.js'

describe('traslapes', () => {
  it('detecta intervalos que se cruzan en el mismo día', () => {
    expect(
      schedulesOverlap(
        { day: 'Lu', start: '09:00', end: '10:00' },
        { day: 'Lu', start: '09:30', end: '11:00' },
      ),
    ).toBe(true)
  })

  it('no marca traslape si el día cambia o termina justo al iniciar', () => {
    expect(
      schedulesOverlap(
        { day: 'Lu', start: '09:00', end: '10:00' },
        { day: 'Ma', start: '09:30', end: '11:00' },
      ),
    ).toBe(false)
    expect(
      schedulesOverlap(
        { day: 'Lu', start: '09:00', end: '10:00' },
        { day: 'Lu', start: '10:00', end: '11:00' },
      ),
    ).toBe(false)
  })

  it('devuelve conflictos contra grupos seleccionados', () => {
    const conflicts = findOverlaps([{ day: 'Mi', start: '07:30', end: '08:30' }], [
      { name: 'Álgebra', schedules: [{ day: 'Mi', start: '07:00', end: '08:00' }] },
    ])
    expect(conflicts).toHaveLength(1)
  })
})
