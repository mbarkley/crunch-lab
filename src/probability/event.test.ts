import { describe, expect, it } from 'vitest'
import {
  calculateAttack,
  calculateEvent,
  calculateSavingThrow,
  calculateSequence,
} from './event'
import type {
  AttackConfig,
  PlayerSavingThrowConfig,
  SavingThrowConfig,
} from './event'

const playerAttack = (overrides: Partial<AttackConfig> = {}): AttackConfig => ({
  id: 'attack-1',
  type: 'player-attack',
  armorClass: 12,
  attackModifier: 0,
  damageDiceCount: 1,
  damageDieSides: 8,
  damageModifier: 0,
  ...overrides,
})

const playerSave = (
  overrides: Partial<PlayerSavingThrowConfig> = {},
): PlayerSavingThrowConfig => ({
  id: 'save-1',
  type: 'player-saving-throw',
  saveDc: 12,
  saveModifier: 0,
  damageDiceCount: 1,
  damageDieSides: 8,
  damageModifier: 0,
  failureDamage: 'full',
  successDamage: 'half',
  ...overrides,
})

describe('event calculations', () => {
  it('calculates an AC-based player attack against enemies', () => {
    const result = calculateAttack(playerAttack())

    expect(result.successProbability).toBeCloseTo(0.45)
    expect(result.outcome).toEqual({
      type: 'expected-damage-against-enemies',
      expectedDamage: 2.025,
    })
  })

  it('applies natural 1 and natural 20 attack rules without critical damage', () => {
    expect(
      calculateAttack(playerAttack({ armorClass: 1 })).successProbability,
    ).toBeCloseTo(0.95)
    expect(
      calculateAttack(playerAttack({ armorClass: 100 })).successProbability,
    ).toBeCloseTo(0.05)
    expect(
      calculateAttack(playerAttack({ armorClass: 100 })).outcome.expectedDamage,
    ).toBeCloseTo(0.05 * 4.5)
  })

  it('uses the attack modifier and targets players for enemy attacks', () => {
    const result = calculateAttack({
      ...playerAttack({ armorClass: 15, attackModifier: 4 }),
      type: 'enemy-attack',
    })

    expect(result.successProbability).toBeCloseTo(0.5)
    expect(result.outcome.type).toBe('expected-damage-against-players')
  })

  it('calculates full damage on a failed save and rounded half on success', () => {
    const result = calculateSavingThrow(playerSave())

    expect(result.successProbability).toBeCloseTo(0.45)
    expect(result.outcome).toEqual({
      type: 'expected-damage-against-players',
      expectedDamage: 3.375,
    })
  })

  it('supports each damage consequence on either save branch', () => {
    expect(
      calculateSavingThrow(playerSave({ saveDc: 1, successDamage: 'none' }))
        .outcome.expectedDamage,
    ).toBe(0)
    expect(
      calculateSavingThrow(
        playerSave({
          saveDc: 21,
          failureDamage: 'half',
          successDamage: 'full',
        }),
      ).outcome.expectedDamage,
    ).toBeCloseTo(2)
  })

  it('rounds half damage for each roll after flooring modified damage', () => {
    expect(
      calculateSavingThrow(
        playerSave({
          saveDc: 1,
          damageDiceCount: 1,
          damageDieSides: 4,
          damageModifier: -2,
        }),
      ).outcome.expectedDamage,
    ).toBeCloseTo(0.25)
  })

  it('aggregates the requested mixed sequence by outcome type', () => {
    const events: readonly (AttackConfig | SavingThrowConfig)[] = [
      playerAttack(),
      playerAttack({ id: 'attack-2' }),
      { ...playerAttack({ id: 'attack-3' }), type: 'enemy-attack' },
      playerSave(),
    ]

    expect(calculateSequence(events)).toEqual({
      eventResults: events.map(calculateEvent),
      outcomes: [
        {
          type: 'expected-damage-against-enemies',
          expectedDamage: 4.05,
        },
        {
          type: 'expected-damage-against-players',
          expectedDamage: 5.4,
        },
      ],
    })
  })

  it('omits outcome types that do not occur', () => {
    expect(calculateSequence([playerAttack()]).outcomes).toEqual([
      {
        type: 'expected-damage-against-enemies',
        expectedDamage: 2.025,
      },
    ])
  })

  it('rejects invalid event configurations', () => {
    expect(() => calculateAttack(playerAttack({ armorClass: 0 }))).toThrow(
      /Armor class/,
    )
    expect(() =>
      calculateAttack(playerAttack({ attackModifier: 1.5 })),
    ).toThrow(/Attack modifier/)
    expect(() => calculateSavingThrow(playerSave({ saveDc: 0 }))).toThrow(
      /Save DC/,
    )
    expect(() =>
      calculateSavingThrow(playerSave({ saveModifier: 1.5 })),
    ).toThrow(/Save modifier/)
  })
})
