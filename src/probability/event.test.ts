import { describe, expect, it } from 'vitest'
import {
  calculateAttack,
  calculateEvent,
  calculateSavingThrow,
  calculateSequence,
} from './event'
import type {
  AttackConfig,
  PlayerAttackConfig,
  PlayerSavingThrowConfig,
  SavingThrowConfig,
} from './event'

const playerAttack = (
  overrides: Partial<PlayerAttackConfig> = {},
): PlayerAttackConfig => ({
  id: 'attack-1',
  type: 'player-attack',
  armorClass: 12,
  attackModifier: 0,
  rollMode: 'normal',
  hitConditions: [],
  damagePools: [{ diceCount: 1, dieSides: 8 }],
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
  damagePools: [{ diceCount: 1, dieSides: 8 }],
  damageModifier: 0,
  failureDamage: 'full',
  successDamage: 'half',
  failureConditions: [],
  successConditions: [],
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
    expect(result.conditionApplications).toEqual([])
  })

  it('supports normal, advantage, and disadvantage attack rolls', () => {
    expect(
      calculateAttack(playerAttack({ rollMode: 'normal' })).successProbability,
    ).toBeCloseTo(0.45)
    expect(
      calculateAttack(playerAttack({ rollMode: 'advantage' }))
        .successProbability,
    ).toBeCloseTo(0.6975)
    expect(
      calculateAttack(playerAttack({ rollMode: 'disadvantage' }))
        .successProbability,
    ).toBeCloseTo(0.2025)
  })

  it('applies natural 1 and natural 20 rules to the selected attack die', () => {
    expect(
      calculateAttack(playerAttack({ armorClass: 1, rollMode: 'advantage' }))
        .successProbability,
    ).toBeCloseTo(0.9975)
    expect(
      calculateAttack(
        playerAttack({ armorClass: 100, rollMode: 'disadvantage' }),
      ).successProbability,
    ).toBeCloseTo(0.0025)
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
    expect(result.conditionApplications).toEqual([])
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
          damagePools: [{ diceCount: 1, dieSides: 4 }],
          damageModifier: -2,
        }),
      ).outcome.expectedDamage,
    ).toBeCloseTo(0.25)
  })

  it('sums damage pools before applying the shared modifier', () => {
    const result = calculateSavingThrow(
      playerSave({
        saveDc: 21,
        damagePools: [
          { diceCount: 1, dieSides: 4 },
          { diceCount: 1, dieSides: 6 },
        ],
        damageModifier: 3,
      }),
    )

    expect(result.outcome.expectedDamage).toBe(9)
  })

  it('rounds half damage once after combining every damage pool', () => {
    const result = calculateSavingThrow(
      playerSave({
        saveDc: 1,
        damagePools: [
          { diceCount: 1, dieSides: 4 },
          { diceCount: 1, dieSides: 4 },
        ],
      }),
    )

    expect(result.outcome.expectedDamage).toBeCloseTo(2.25)
  })

  it('applies Vex on hit and uses it for the next attack against that target', () => {
    const sequence = calculateSequence([
      playerAttack({ hitConditions: [{ type: 'vex' }] }),
      playerAttack({ id: 'attack-2', hitConditions: [{ type: 'vex' }] }),
      playerAttack({ id: 'attack-3' }),
    ])

    expect(sequence.eventResults[0].successProbability).toBeCloseTo(0.45)
    expect(sequence.eventResults[1].successProbability).toBeCloseTo(0.561375)
    expect(sequence.eventResults[2].successProbability).toBeCloseTo(
      0.5889403125,
    )
    expect(sequence.eventResults[1].conditionApplications).toEqual([
      { condition: 'vex', probability: 0.561375 },
    ])
    expect(sequence.expectedConditionApplications).toEqual([
      {
        condition: 'vex',
        target: 'enemies',
        expectedApplications: 1.011375,
      },
    ])
  })

  it('consumes Vex on the next applicable attack even when it misses', () => {
    const sequence = calculateSequence([
      playerAttack({ hitConditions: [{ type: 'vex' }] }),
      playerAttack({ id: 'attack-2' }),
      playerAttack({ id: 'attack-3' }),
    ])

    expect(sequence.eventResults[1].successProbability).toBeCloseTo(0.561375)
    expect(sequence.eventResults[2].successProbability).toBeCloseTo(0.45)
  })

  it('applies Sap to the target and consumes it on that target’s next attack', () => {
    const sequence = calculateSequence([
      playerAttack({ hitConditions: [{ type: 'sap' }] }),
      { ...playerAttack({ id: 'attack-2' }), type: 'enemy-attack' },
      { ...playerAttack({ id: 'attack-3' }), type: 'enemy-attack' },
    ])

    expect(sequence.eventResults[1].successProbability).toBeCloseTo(0.338625)
    expect(sequence.eventResults[2].successProbability).toBeCloseTo(0.45)
  })

  it('cancels advantage and disadvantage from manual and condition sources', () => {
    const sequence = calculateSequence([
      {
        ...playerSave({
          failureConditions: [{ type: 'vex' }],
          successConditions: [{ type: 'vex' }],
        }),
        type: 'enemy-saving-throw',
      },
      playerAttack({ id: 'attack-2', rollMode: 'disadvantage' }),
    ])

    expect(sequence.eventResults[1].successProbability).toBeCloseTo(0.45)
  })

  it('applies save conditions on their separate branches and unions both branches', () => {
    const branched = calculateSavingThrow(
      playerSave({
        failureConditions: [{ type: 'vex' }],
        successConditions: [{ type: 'sap' }],
      }),
    )
    expect(branched.conditionApplications).toEqual([
      { condition: 'vex', probability: 0.55 },
      { condition: 'sap', probability: 0.45 },
    ])

    const guaranteed = calculateSavingThrow(
      playerSave({
        failureConditions: [{ type: 'vex' }],
        successConditions: [{ type: 'vex' }],
      }),
    )
    expect(guaranteed.conditionApplications).toEqual([
      { condition: 'vex', probability: 1 },
    ])
  })

  it('aggregates expected applications separately for each target', () => {
    const result = calculateSequence([
      playerSave({
        failureConditions: [{ type: 'vex' }],
        successConditions: [{ type: 'vex' }],
      }),
      playerSave({
        id: 'save-2',
        failureConditions: [{ type: 'vex' }],
        successConditions: [{ type: 'vex' }],
      }),
      {
        ...playerSave({
          id: 'save-3',
          failureConditions: [{ type: 'vex' }],
          successConditions: [{ type: 'vex' }],
        }),
        type: 'enemy-saving-throw',
      },
    ])

    expect(result.expectedConditionApplications).toEqual([
      { condition: 'vex', target: 'players', expectedApplications: 2 },
      { condition: 'vex', target: 'enemies', expectedApplications: 1 },
    ])
  })

  it('tracks Vex and Sap independently when both are applied', () => {
    const result = calculateAttack(
      playerAttack({ hitConditions: [{ type: 'vex' }, { type: 'sap' }] }),
    )

    expect(result.conditionApplications).toEqual([
      { condition: 'vex', probability: 0.45 },
      { condition: 'sap', probability: 0.45 },
    ])
  })

  it('aggregates a stateful mixed sequence by outcome type', () => {
    const events: readonly (AttackConfig | SavingThrowConfig)[] = [
      playerAttack({ hitConditions: [{ type: 'vex' }] }),
      playerAttack({ id: 'attack-2' }),
      { ...playerAttack({ id: 'attack-3' }), type: 'enemy-attack' },
      playerSave(),
    ]
    const result = calculateSequence(events)

    expect(result.eventResults[1].outcome.expectedDamage).toBeCloseTo(
      0.561375 * 4.5,
    )
    expect(result.outcomes).toEqual([
      {
        type: 'expected-damage-against-enemies',
        expectedDamage: 4.5511875,
      },
      {
        type: 'expected-damage-against-players',
        expectedDamage: 5.4,
      },
    ])
  })

  it('omits outcome and condition types that do not occur', () => {
    expect(calculateSequence([playerAttack()])).toEqual({
      eventResults: [calculateEvent(playerAttack())],
      outcomes: [
        {
          type: 'expected-damage-against-enemies',
          expectedDamage: 2.025,
        },
      ],
      expectedConditionApplications: [],
    })
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
    expect(() =>
      calculateAttack(
        playerAttack({ rollMode: 'invalid' as PlayerAttackConfig['rollMode'] }),
      ),
    ).toThrow(/roll mode/)
    expect(() => calculateAttack(playerAttack({ damagePools: [] }))).toThrow(
      /at least one dice pool/,
    )
    expect(() =>
      calculateAttack(
        playerAttack({
          hitConditions: [
            {
              type: 'invalid' as PlayerAttackConfig['hitConditions'][number]['type'],
            },
          ],
        }),
      ),
    ).toThrow(/Condition/)
  })
})
