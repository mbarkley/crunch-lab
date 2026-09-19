import { describe, expect, it } from 'vitest'
import {
  CONDITION_CATALOG,
  effectiveConditionTypes,
  hasEffectiveCondition,
  isConditionImmune,
} from './conditions'
import {
  applyConditionConfigs,
  INITIAL_SEQUENCE_STATE,
  calculateSequence,
  sequenceStateKey,
} from './event'
import type { SequenceConfig } from './event'

const emptySequence = (
  initialState = INITIAL_SEQUENCE_STATE,
): SequenceConfig => ({
  initialState,
  rounds: [],
})

describe('condition state model', () => {
  it('catalogs persistent conditions, Exhaustion, and transient effects separately', () => {
    expect(Object.keys(CONDITION_CATALOG)).toEqual([
      'blinded',
      'poisoned',
      'restrained',
      'stunned',
      'paralyzed',
      'unconscious',
      'prone',
      'grappled',
      'frightened',
      'petrified',
      'incapacitated',
      'invisible',
      'exhaustion',
    ])
    expect(CONDITION_CATALOG.stunned.includes).toEqual(['incapacitated'])
    expect(CONDITION_CATALOG.paralyzed.includes).toEqual(['incapacitated'])
    expect(CONDITION_CATALOG.unconscious.includes).toEqual([
      'incapacitated',
      'prone',
    ])
    expect(CONDITION_CATALOG.petrified.conditionImmunities).toEqual([
      'poisoned',
    ])
  })

  it('derives inherited effective conditions from each active instance', () => {
    const instances = [
      {
        id: 'paralyzed-1',
        type: 'paralyzed' as const,
        source: 'enemy' as const,
        recipient: 'player' as const,
      },
      {
        id: 'unconscious-1',
        type: 'unconscious' as const,
        source: 'enemy' as const,
        recipient: 'player' as const,
      },
    ]

    expect(effectiveConditionTypes(instances)).toEqual(
      new Set(['paralyzed', 'incapacitated', 'unconscious', 'prone']),
    )
    expect(hasEffectiveCondition(instances, 'incapacitated')).toBe(true)
    expect(hasEffectiveCondition(instances, 'petrified')).toBe(false)
  })

  it('checks explicit and inherited condition immunity', () => {
    const petrified = [
      {
        id: 'petrified-1',
        type: 'petrified' as const,
        source: 'enemy' as const,
        recipient: 'player' as const,
      },
    ]

    expect(isConditionImmune([], ['poisoned'], 'poisoned')).toBe(true)
    expect(isConditionImmune(petrified, [], 'poisoned')).toBe(true)
    expect(isConditionImmune(petrified, [], 'blinded')).toBe(false)
  })

  it('creates stable condition instances with source, recipient, and duration', () => {
    const result = applyConditionConfigs(
      INITIAL_SEQUENCE_STATE,
      'enemy',
      'player',
      'attack-1:hit',
      [
        {
          type: 'blinded',
          id: 'blind-from-attack-1',
          duration: { remainingTurns: 2, boundary: 'end', turnOwner: 'enemy' },
        },
      ],
    )

    expect(result.appliedConditions).toEqual(['blinded'])
    expect(result.state.enemy.conditions).toEqual([
      {
        id: 'blind-from-attack-1',
        type: 'blinded',
        source: 'player',
        recipient: 'enemy',
        duration: { remainingTurns: 2, boundary: 'end', turnOwner: 'enemy' },
      },
    ])
  })

  it('does not stack repeated persistent conditions', () => {
    const once = applyConditionConfigs(
      INITIAL_SEQUENCE_STATE,
      'enemy',
      'player',
      'first',
      [
        {
          type: 'prone',
          duration: { remainingTurns: 2, boundary: 'end', turnOwner: 'enemy' },
        },
      ],
    )
    const twice = applyConditionConfigs(
      once.state,
      'enemy',
      'player',
      'second',
      [{ type: 'prone' }],
    )

    expect(twice.state.enemy.conditions).toEqual(once.state.enemy.conditions)
    expect(twice.appliedConditions).toEqual([])
  })

  it('merges equivalent conditions created by different events', () => {
    const withFirstProne = applyConditionConfigs(
      INITIAL_SEQUENCE_STATE,
      'enemy',
      'player',
      'first-event',
      [{ type: 'prone' }],
    ).state
    const withSecondProne = applyConditionConfigs(
      INITIAL_SEQUENCE_STATE,
      'enemy',
      'player',
      'second-event',
      [{ type: 'prone' }],
    ).state

    expect(sequenceStateKey(withFirstProne)).toBe(
      sequenceStateKey(withSecondProne),
    )
  })

  it('skips immune applications while preserving other applications', () => {
    const state = {
      ...INITIAL_SEQUENCE_STATE,
      enemy: {
        ...INITIAL_SEQUENCE_STATE.enemy,
        conditionImmunities: ['poisoned' as const],
      },
    }
    const result = applyConditionConfigs(state, 'enemy', 'player', 'save-1', [
      { type: 'poisoned' },
      { type: 'restrained' },
    ])

    expect(result.appliedConditions).toEqual(['restrained'])
    expect(result.state.enemy.conditions.map(({ type }) => type)).toEqual([
      'restrained',
    ])
  })

  it('applies Exhaustion levels, caps at six, and accepts it in initial state', () => {
    const state = {
      ...INITIAL_SEQUENCE_STATE,
      player: { ...INITIAL_SEQUENCE_STATE.player, exhaustion: 4 as const },
    }
    const result = applyConditionConfigs(state, 'player', 'enemy', 'save-1', [
      { type: 'exhaustion', exhaustionLevels: 3 },
    ])

    expect(result.appliedConditions).toEqual(['exhaustion'])
    expect(result.state.player.exhaustion).toBe(6)
    expect(calculateSequence(emptySequence(state))).toEqual({
      eventResults: {},
      outcomes: [],
      expectedConditionApplications: [],
      expectedEnemyDamageByRound: [],
    })
  })

  it('validates initial condition instance ownership and duration', () => {
    const condition = {
      id: 'initial-blinded',
      type: 'blinded' as const,
      source: 'enemy' as const,
      recipient: 'player' as const,
      duration: {
        remainingTurns: 1,
        boundary: 'start' as const,
        turnOwner: 'player' as const,
      },
    }
    expect(() =>
      calculateSequence(
        emptySequence({
          ...INITIAL_SEQUENCE_STATE,
          player: { ...INITIAL_SEQUENCE_STATE.player, conditions: [condition] },
        }),
      ),
    ).not.toThrow()

    expect(() =>
      calculateSequence(
        emptySequence({
          ...INITIAL_SEQUENCE_STATE,
          player: {
            ...INITIAL_SEQUENCE_STATE.player,
            conditions: [{ ...condition, recipient: 'enemy' as const }],
          },
        }),
      ),
    ).toThrow(/recipient must match/)
    expect(() =>
      calculateSequence(
        emptySequence({
          ...INITIAL_SEQUENCE_STATE,
          player: {
            ...INITIAL_SEQUENCE_STATE.player,
            conditions: [
              {
                ...condition,
                duration: {
                  remainingTurns: 0,
                  boundary: 'start',
                  turnOwner: 'player',
                },
              },
            ],
          },
        }),
      ),
    ).toThrow(/duration/)
  })
})
