import { describe, expect, it } from 'vitest'
import { calculateAttack, calculateSequence } from './attack'
import type { AttackConfig } from './attack'

const attack = (overrides: Partial<AttackConfig> = {}): AttackConfig => ({
  id: 'attack-1',
  hitThreshold: 12,
  damageDiceCount: 1,
  damageDieSides: 8,
  damageModifier: 0,
  ...overrides,
})

describe('attack calculations', () => {
  it('calculates hit chance and expected damage', () => {
    const result = calculateAttack(attack())

    expect(result.hitProbability).toBeCloseTo(0.45)
    expect(result.expectedDamage).toBeCloseTo(2.025)
  })

  it('handles threshold endpoints', () => {
    expect(
      calculateAttack(attack({ hitThreshold: 1 })).hitProbability,
    ).toBeCloseTo(1)
    expect(
      calculateAttack(attack({ hitThreshold: 20 })).hitProbability,
    ).toBeCloseTo(0.05)
  })

  it('handles multiple dice and positive modifiers', () => {
    expect(
      calculateAttack(
        attack({
          hitThreshold: 11,
          damageDiceCount: 2,
          damageDieSides: 6,
          damageModifier: 3,
        }),
      ).expectedDamage,
    ).toBeCloseTo(5)
  })

  it('floors damage at zero after applying a negative modifier', () => {
    expect(
      calculateAttack(attack({ damageDieSides: 4, damageModifier: -2 }))
        .expectedDamage,
    ).toBeCloseTo(0.45 * 0.75)
  })

  it('sums the expected damage of an attack sequence', () => {
    expect(
      calculateSequence([
        attack(),
        attack({ id: 'attack-2', hitThreshold: 20 }),
      ]).expectedDamage,
    ).toBeCloseTo(2.25)
  })

  it('rejects invalid attack configurations', () => {
    expect(() => calculateAttack(attack({ hitThreshold: 21 }))).toThrow(
      /Hit threshold/,
    )
    expect(() => calculateAttack(attack({ damageModifier: 1.5 }))).toThrow(
      /Damage modifier/,
    )
  })
})
