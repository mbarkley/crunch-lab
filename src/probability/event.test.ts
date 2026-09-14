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
  SequenceConfig,
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

const sequenceConfig = (
  events: readonly (AttackConfig | SavingThrowConfig)[],
  overrides: Partial<SequenceConfig> = {},
): SequenceConfig => ({
  initialState: {
    player: { vex: false, sap: false },
    enemy: { vex: false, sap: false },
  },
  rounds: [
    {
      id: 'round-1',
      turns: [
        {
          id: 'turn-1',
          owner: 'player',
          activities: [
            {
              id: 'activity-1',
              type: 'action',
              owner: 'player',
              events,
            },
          ],
        },
      ],
    },
  ],
  ...overrides,
})

const calculateEventSequence = (
  events: readonly (AttackConfig | SavingThrowConfig)[],
) => calculateSequence(sequenceConfig(events))

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
    const sequence = calculateEventSequence([
      playerAttack({ hitConditions: [{ type: 'vex' }] }),
      playerAttack({ id: 'attack-2', hitConditions: [{ type: 'vex' }] }),
      playerAttack({ id: 'attack-3' }),
    ])

    expect(sequence.eventResults['attack-1'].successProbability).toBeCloseTo(
      0.45,
    )
    expect(sequence.eventResults['attack-2'].successProbability).toBeCloseTo(
      0.561375,
    )
    expect(sequence.eventResults['attack-3'].successProbability).toBeCloseTo(
      0.5889403125,
    )
    expect(sequence.eventResults['attack-2'].conditionApplications).toEqual([
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
    const sequence = calculateEventSequence([
      playerAttack({ hitConditions: [{ type: 'vex' }] }),
      playerAttack({ id: 'attack-2' }),
      playerAttack({ id: 'attack-3' }),
    ])

    expect(sequence.eventResults['attack-2'].successProbability).toBeCloseTo(
      0.561375,
    )
    expect(sequence.eventResults['attack-3'].successProbability).toBeCloseTo(
      0.45,
    )
  })

  it('applies Sap to the target and consumes it on that target’s next attack', () => {
    const sequence = calculateEventSequence([
      playerAttack({ hitConditions: [{ type: 'sap' }] }),
      { ...playerAttack({ id: 'attack-2' }), type: 'enemy-attack' },
      { ...playerAttack({ id: 'attack-3' }), type: 'enemy-attack' },
    ])

    expect(sequence.eventResults['attack-2'].successProbability).toBeCloseTo(
      0.338625,
    )
    expect(sequence.eventResults['attack-3'].successProbability).toBeCloseTo(
      0.45,
    )
  })

  it('cancels advantage and disadvantage from manual and condition sources', () => {
    const sequence = calculateEventSequence([
      {
        ...playerSave({
          failureConditions: [{ type: 'vex' }],
          successConditions: [{ type: 'vex' }],
        }),
        type: 'enemy-saving-throw',
      },
      playerAttack({ id: 'attack-2', rollMode: 'disadvantage' }),
    ])

    expect(sequence.eventResults['attack-2'].successProbability).toBeCloseTo(
      0.45,
    )
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
    const result = calculateEventSequence([
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
    const result = calculateEventSequence(events)

    expect(result.eventResults['attack-2'].outcome.expectedDamage).toBeCloseTo(
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
    expect(calculateEventSequence([playerAttack()])).toEqual({
      eventResults: { 'attack-1': calculateEvent(playerAttack()) },
      outcomes: [
        {
          type: 'expected-damage-against-enemies',
          expectedDamage: 2.025,
        },
      ],
      expectedConditionApplications: [],
    })
  })

  it('uses the configured initial combatant state', () => {
    const result = calculateSequence(
      sequenceConfig([playerAttack()], {
        initialState: {
          player: { vex: false, sap: false },
          enemy: { vex: true, sap: false },
        },
      }),
    )

    expect(result.eventResults['attack-1'].successProbability).toBeCloseTo(
      0.6975,
    )
  })

  it('traverses rounds, turns, and activities depth-first', () => {
    const first = playerAttack({ hitConditions: [{ type: 'vex' }] })
    const second = playerAttack({ id: 'attack-2' })
    const result = calculateSequence({
      initialState: {
        player: { vex: false, sap: false },
        enemy: { vex: false, sap: false },
      },
      rounds: [
        {
          id: 'round-1',
          turns: [
            {
              id: 'player-turn-1',
              owner: 'player',
              activities: [
                {
                  id: 'action-1',
                  type: 'action',
                  owner: 'player',
                  events: [first],
                },
                {
                  id: 'bonus-action-1',
                  type: 'bonus-action',
                  owner: 'player',
                  events: [],
                },
              ],
            },
            {
              id: 'enemy-turn-1',
              owner: 'enemy',
              activities: [],
            },
          ],
        },
        {
          id: 'round-2',
          turns: [
            {
              id: 'player-turn-2',
              owner: 'player',
              activities: [
                {
                  id: 'action-2',
                  type: 'action',
                  owner: 'player',
                  events: [second],
                },
              ],
            },
          ],
        },
      ],
    })

    expect(Object.keys(result.eventResults)).toEqual(['attack-1', 'attack-2'])
    expect(result.eventResults['attack-2'].successProbability).toBeCloseTo(
      0.561375,
    )
  })

  it('requires globally unique stable IDs', () => {
    const config = sequenceConfig([playerAttack({ id: 'round-1' })])

    expect(() => calculateSequence(config)).toThrow(/Duplicate ID: round-1/)
  })

  it('requires activity ownership to match its turn', () => {
    const config = sequenceConfig([playerAttack()])
    const mismatched: SequenceConfig = {
      ...config,
      rounds: config.rounds.map((round) => ({
        ...round,
        turns: round.turns.map((turn) => ({
          ...turn,
          activities: turn.activities.map((activity) => ({
            ...activity,
            owner: 'enemy',
          })),
        })),
      })),
    }

    expect(() => calculateSequence(mismatched)).toThrow(/owner must match turn/)
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
