import { describe, expect, it } from 'vitest'
import {
  activityExecutionProbability,
  calculateSequence,
  calculateSavingThrow,
  conditionRollEffects,
  INITIAL_SEQUENCE_STATE,
  initiativeRollMode,
} from './event'
import type {
  ConditionInstance,
  EnemySavingThrowConfig,
  EventConfig,
  PlayerAttackConfig,
  PlayerSavingThrowConfig,
  SequenceConfig,
} from './event'

const instance = (
  type: ConditionInstance['type'],
  recipient: 'player' | 'enemy' = 'player',
  id = `${type}-${recipient}`,
): ConditionInstance => ({
  id,
  type,
  source: recipient === 'player' ? 'enemy' : 'player',
  recipient,
})

const attack = (
  overrides: Partial<PlayerAttackConfig> = {},
): PlayerAttackConfig => ({
  id: 'attack-1',
  type: 'player-attack',
  armorClass: 12,
  attackModifier: 0,
  rollMode: 'normal',
  cover: 'none',
  hitConditions: [],
  damagePools: [
    {
      id: 'damage-1',
      diceCount: 1,
      dieSides: 8,
      modifier: 0,
      damageType: 'slashing',
    },
  ],
  ...overrides,
})

const save = (
  overrides: Partial<PlayerSavingThrowConfig> = {},
): PlayerSavingThrowConfig => ({
  id: 'save-1',
  type: 'player-saving-throw',
  saveDc: 12,
  saveModifier: 0,
  saveAbility: 'dexterity',
  rollMode: 'normal',
  cover: 'none',
  failureDamage: 'full',
  successDamage: 'half',
  failureConditions: [],
  successConditions: [],
  damagePools: [
    {
      id: 'damage-1',
      diceCount: 1,
      dieSides: 8,
      modifier: 0,
      damageType: 'slashing',
    },
  ],
  ...overrides,
})

const enemySave = (
  overrides: Partial<EnemySavingThrowConfig> = {},
): EnemySavingThrowConfig =>
  ({
    ...save(),
    type: 'enemy-saving-throw',
    ...overrides,
  }) as EnemySavingThrowConfig

const sequence = (
  events: readonly EventConfig[],
  initialState = INITIAL_SEQUENCE_STATE,
): SequenceConfig => ({
  initialState,
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
})

describe('condition mechanics', () => {
  it('composes outgoing attack disadvantage for every applicable condition', () => {
    for (const type of [
      'blinded',
      'poisoned',
      'prone',
      'restrained',
      'frightened',
    ] as const) {
      expect(conditionRollEffects([instance(type)], 'outgoing-attack')).toEqual(
        {
          advantage: [],
          disadvantage: [type],
          automaticFailure: false,
        },
      )
    }
  })

  it('composes incoming attack advantage, including inherited conditions', () => {
    for (const type of [
      'blinded',
      'restrained',
      'stunned',
      'paralyzed',
      'petrified',
      'unconscious',
      'prone',
    ] as const) {
      const effects = conditionRollEffects([instance(type)], 'incoming-attack')
      expect(effects.advantage).toContain(type)
    }
    expect(
      conditionRollEffects([instance('unconscious')], 'incoming-attack')
        .advantage,
    ).toContain('prone')
  })

  it('automatically fails Strength and Dexterity saves for inherited incapacitating conditions', () => {
    for (const type of [
      'stunned',
      'paralyzed',
      'petrified',
      'unconscious',
    ] as const) {
      expect(
        conditionRollEffects([instance(type)], 'saving-throw', 'strength')
          .automaticFailure,
      ).toBe(true)
      expect(
        conditionRollEffects([instance(type)], 'saving-throw', 'dexterity')
          .automaticFailure,
      ).toBe(true)
      expect(
        conditionRollEffects([instance(type)], 'saving-throw', 'wisdom')
          .automaticFailure,
      ).toBe(false)
    }
  })

  it('applies Restrained disadvantage to Dexterity saves and cancels opposing sources', () => {
    expect(
      calculateSavingThrow(
        save({
          saveDc: 12,
          cover: 'none',
          failureDamage: 'none',
          successDamage: 'none',
        }),
      ).successProbability,
    ).toBeCloseTo(0.45)
    const restrained = {
      ...INITIAL_SEQUENCE_STATE,
      player: {
        ...INITIAL_SEQUENCE_STATE.player,
        conditions: [instance('restrained')],
      },
    }
    const result = calculateSequence(
      sequence(
        [save({ failureDamage: 'none', successDamage: 'none' })],
        restrained,
      ),
    )
    expect(result.eventResults['save-1'].successProbability).toBeCloseTo(0.2025)
  })

  it('cancels condition Advantage and Disadvantage sources before rolling', () => {
    const initialState = {
      ...INITIAL_SEQUENCE_STATE,
      player: {
        ...INITIAL_SEQUENCE_STATE.player,
        conditions: [instance('blinded')],
      },
      enemy: {
        ...INITIAL_SEQUENCE_STATE.enemy,
        conditions: [instance('blinded', 'enemy', 'enemy-blinded')],
      },
    }
    const result = calculateSequence(sequence([attack()], initialState))
    expect(result.eventResults['attack-1'].successProbability).toBeCloseTo(0.45)
  })

  it('applies inherited condition effects to stochastic later events', () => {
    const first = enemySave({
      id: 'save-1',
      failureDamage: 'none',
      successDamage: 'none',
      failureConditions: [{ type: 'stunned' }],
    })
    const result = calculateSequence(
      sequence([first, attack({ id: 'attack-2' })] as const),
    )

    expect(result.eventResults['attack-2'].successProbability).toBeCloseTo(
      0.586125,
    )
  })

  it('makes every hit against Paralyzed or Unconscious targets critical', () => {
    for (const type of ['paralyzed', 'unconscious'] as const) {
      const initialState = {
        ...INITIAL_SEQUENCE_STATE,
        enemy: {
          ...INITIAL_SEQUENCE_STATE.enemy,
          conditions: [instance(type, 'enemy')],
        },
      }
      const result = calculateSequence(
        sequence([attack({ armorClass: 1 })], initialState),
      )
      expect(result.eventResults['attack-1'].successProbability).toBeCloseTo(
        0.9975,
      )
      expect(result.eventResults['attack-1'].criticalProbability).toBeCloseTo(
        0.9975,
      )
      expect(
        result.eventResults['attack-1'].outcome.expectedDamage,
      ).toBeCloseTo(8.9775)
    }
  })

  it('applies Exhaustion to d20 tests and suppresses activities at level six', () => {
    const exhausted = {
      ...INITIAL_SEQUENCE_STATE,
      player: { ...INITIAL_SEQUENCE_STATE.player, exhaustion: 1 as const },
    }
    expect(
      calculateSequence(sequence([attack()], exhausted)).eventResults[
        'attack-1'
      ].successProbability,
    ).toBeCloseTo(0.35)

    const stunnedState = {
      ...INITIAL_SEQUENCE_STATE,
      player: {
        ...INITIAL_SEQUENCE_STATE.player,
        conditions: [instance('stunned')],
      },
    }
    expect(
      calculateSequence(sequence([attack()], stunnedState)).eventResults[
        'attack-1'
      ].executionProbability,
    ).toBe(0)

    const incapacitated = {
      ...INITIAL_SEQUENCE_STATE,
      player: {
        ...INITIAL_SEQUENCE_STATE.player,
        exhaustion: 6 as const,
      },
    }
    const suppressed = calculateSequence(sequence([attack()], incapacitated))
      .eventResults['attack-1']
    expect(suppressed.executionProbability).toBe(0)
    expect(suppressed.successProbability).toBe(0)
    expect(suppressed.outcome.expectedDamage).toBe(0)
    expect(activityExecutionProbability(incapacitated, 'player')).toBe(0)
  })

  it('gives Petrified resistance to all damage and immunity to Poisoned', () => {
    const initialState = {
      ...INITIAL_SEQUENCE_STATE,
      enemy: {
        ...INITIAL_SEQUENCE_STATE.enemy,
        conditions: [instance('petrified', 'enemy')],
      },
    }
    const attackResult = calculateSequence(sequence([attack()], initialState))
      .eventResults['attack-1']
    expect(attackResult.outcome.expectedDamage).toBeCloseTo(1.614375)

    const poisonResult = calculateSequence(
      sequence(
        [attack({ hitConditions: [{ type: 'poisoned' }] })],
        initialState,
      ),
    ).eventResults['attack-1']
    expect(poisonResult.conditionApplications).toEqual([
      { condition: 'poisoned', probability: 0 },
    ])
  })

  it('exposes Invisible advantage and Incapacitated disadvantage for Initiative', () => {
    expect(initiativeRollMode('normal', [instance('invisible')])).toBe(
      'advantage',
    )
    expect(initiativeRollMode('normal', [instance('stunned')])).toBe(
      'disadvantage',
    )
    expect(
      initiativeRollMode('normal', [
        instance('invisible'),
        instance('stunned'),
      ]),
    ).toBe('normal')
  })
})
