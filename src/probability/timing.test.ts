import { describe, expect, it } from 'vitest'
import { calculateSequence, INITIAL_SEQUENCE_STATE } from './event'
import type { EventConfig, SequenceConfig } from './event'

const sequence = (
  rounds: SequenceConfig['rounds'],
  initialState = INITIAL_SEQUENCE_STATE,
): SequenceConfig => ({ initialState, rounds })

const turn = (
  id: string,
  owner: 'player' | 'enemy',
  events: readonly EventConfig[],
) => ({
  id,
  owner,
  activities: [{ id: `${id}-action`, type: 'action' as const, owner, events }],
})

describe('timed conditions and persistent state', () => {
  it('processes duration at the configured owner boundary and expires it', () => {
    const initialState = {
      ...INITIAL_SEQUENCE_STATE,
      enemy: {
        ...INITIAL_SEQUENCE_STATE.enemy,
        conditions: [
          {
            id: 'blind-1',
            type: 'blinded' as const,
            source: 'player' as const,
            recipient: 'enemy' as const,
            duration: {
              remainingTurns: 1,
              boundary: 'end' as const,
              turnOwner: 'enemy' as const,
            },
          },
        ],
      },
    }
    const result = calculateSequence(
      sequence(
        [
          {
            id: 'round-1',
            turns: [
              turn('player-1', 'player', [
                {
                  id: 'attack-1',
                  type: 'player-attack',
                  armorClass: 12,
                  attackModifier: 0,
                  rollMode: 'normal',
                  cover: 'none',
                  hitConditions: [],
                  damagePools: [
                    {
                      id: 'd1',
                      diceCount: 1,
                      dieSides: 2,
                      modifier: 0,
                      damageType: 'slashing',
                    },
                  ],
                },
              ]),
              turn('enemy-1', 'enemy', []),
            ],
          },
          {
            id: 'round-2',
            turns: [
              turn('player-2', 'player', [
                {
                  id: 'attack-2',
                  type: 'player-attack',
                  armorClass: 12,
                  attackModifier: 0,
                  rollMode: 'normal',
                  cover: 'none',
                  hitConditions: [],
                  damagePools: [
                    {
                      id: 'd2',
                      diceCount: 1,
                      dieSides: 2,
                      modifier: 0,
                      damageType: 'slashing',
                    },
                  ],
                },
              ]),
            ],
          },
        ],
        initialState,
      ),
    )
    expect(result.eventResults['attack-1'].successProbability).toBeCloseTo(
      0.6975,
    )
    expect(result.eventResults['attack-2'].successProbability).toBeCloseTo(0.45)
  })

  it('emits repeated-save boundary records before removing the instance', () => {
    const initialState = {
      ...INITIAL_SEQUENCE_STATE,
      player: {
        ...INITIAL_SEQUENCE_STATE.player,
        conditions: [
          {
            id: 'prone-1',
            type: 'prone' as const,
            source: 'enemy' as const,
            recipient: 'player' as const,
            duration: {
              remainingTurns: 1,
              boundary: 'start' as const,
              turnOwner: 'player' as const,
              repeatedSave: { ability: 'constitution', dc: 1 },
            },
          },
        ],
      },
    }
    const result = calculateSequence(
      sequence(
        [{ id: 'round-1', turns: [turn('player-1', 'player', [])] }],
        initialState,
      ),
    )
    expect(result.generatedResults).toHaveLength(1)
    expect(result.generatedResults?.[0].type).toBe('repeated-save')
  })

  it('deals ongoing typed damage at a boundary and checks concentration on post-defense damage', () => {
    const initialState = {
      ...INITIAL_SEQUENCE_STATE,
      player: {
        ...INITIAL_SEQUENCE_STATE.player,
        concentration: { constitutionModifier: -20 },
      },
      enemy: {
        ...INITIAL_SEQUENCE_STATE.enemy,
        conditions: [
          {
            id: 'burn-1',
            type: 'poisoned' as const,
            source: 'player' as const,
            recipient: 'enemy' as const,
            duration: {
              remainingTurns: 1,
              boundary: 'start' as const,
              turnOwner: 'enemy' as const,
              ongoingDamage: {
                damagePools: [
                  {
                    id: 'fire',
                    diceCount: 1,
                    dieSides: 2,
                    modifier: 0,
                    damageType: 'fire',
                  },
                ],
              },
            },
          },
        ],
      },
    }
    const result = calculateSequence(
      sequence(
        [{ id: 'round-1', turns: [turn('enemy-1', 'enemy', [])] }],
        initialState,
      ),
    )
    expect(result.generatedResults?.[0].result.outcome.type).toBe(
      'expected-damage-against-enemies',
    )
    expect(result.generatedResults?.[0].result.outcome).toEqual({
      type: 'expected-damage-against-enemies',
      expectedDamage: 1,
    })
  })

  it('expires Help and Dodge at the owner next turn and disables Dodge with speed zero', () => {
    const helped = calculateSequence(
      sequence([
        {
          id: 'round-1',
          turns: [
            turn('player-1', 'player', [
              { id: 'help', type: 'help', owner: 'enemy', target: 'player' },
              {
                id: 'attack-1',
                type: 'player-attack',
                armorClass: 12,
                attackModifier: 0,
                rollMode: 'normal',
                cover: 'none',
                hitConditions: [],
                damagePools: [
                  {
                    id: 'd1',
                    diceCount: 1,
                    dieSides: 2,
                    modifier: 0,
                    damageType: 'slashing',
                  },
                ],
              },
            ]),
            turn('enemy-1', 'enemy', []),
          ],
        },
        {
          id: 'round-2',
          turns: [
            turn('player-2', 'player', [
              {
                id: 'attack-2',
                type: 'player-attack',
                armorClass: 12,
                attackModifier: 0,
                rollMode: 'normal',
                cover: 'none',
                hitConditions: [],
                damagePools: [
                  {
                    id: 'd2',
                    diceCount: 1,
                    dieSides: 2,
                    modifier: 0,
                    damageType: 'slashing',
                  },
                ],
              },
            ]),
          ],
        },
      ]),
    )
    expect(helped.eventResults['attack-1'].successProbability).toBeCloseTo(
      0.6975,
    )
    expect(helped.eventResults['attack-2'].successProbability).toBeCloseTo(0.45)

    const initialState = {
      ...INITIAL_SEQUENCE_STATE,
      enemy: {
        ...INITIAL_SEQUENCE_STATE.enemy,
        dodging: true,
        conditions: [
          {
            id: 'restrained-1',
            type: 'restrained' as const,
            source: 'player' as const,
            recipient: 'enemy' as const,
          },
        ],
      },
    }
    const dodged = calculateSequence(
      sequence(
        [
          {
            id: 'round-1',
            turns: [
              turn('player-1', 'player', [
                {
                  id: 'attack-1',
                  type: 'player-attack',
                  armorClass: 12,
                  attackModifier: 0,
                  rollMode: 'normal',
                  cover: 'none',
                  hitConditions: [],
                  damagePools: [
                    {
                      id: 'd1',
                      diceCount: 1,
                      dieSides: 2,
                      modifier: 0,
                      damageType: 'slashing',
                    },
                  ],
                },
              ]),
            ],
          },
        ],
        initialState,
      ),
    )
    expect(dodged.eventResults['attack-1'].successProbability).toBeCloseTo(
      0.6975,
    )
  })

  it('exposes probability-weighted before and after state summaries', () => {
    const result = calculateSequence(
      sequence([
        {
          id: 'round-1',
          turns: [
            turn('player-1', 'player', [
              {
                id: 'attack-1',
                type: 'player-attack',
                armorClass: 12,
                attackModifier: 0,
                rollMode: 'normal',
                cover: 'none',
                hitConditions: [],
                damagePools: [
                  {
                    id: 'd1',
                    diceCount: 1,
                    dieSides: 2,
                    modifier: 0,
                    damageType: 'slashing',
                  },
                ],
              },
            ]),
          ],
        },
      ]),
    )
    const event = result.eventResults['attack-1']
    expect(
      event.stateBefore?.reduce((sum, item) => sum + item.probability, 0),
    ).toBeCloseTo(1)
    expect(
      event.stateAfter?.reduce((sum, item) => sum + item.probability, 0),
    ).toBeCloseTo(1)
  })

  it('ends concentration after a positive post-defense damage result', () => {
    const initialState = {
      ...INITIAL_SEQUENCE_STATE,
      player: {
        ...INITIAL_SEQUENCE_STATE.player,
        concentration: { constitutionModifier: -20 },
      },
    }
    const result = calculateSequence(
      sequence(
        [
          {
            id: 'round-1',
            turns: [
              turn('player-1', 'player', [
                {
                  id: 'damage-1',
                  type: 'player-damage',
                  damagePools: [
                    {
                      id: 'd1',
                      diceCount: 1,
                      dieSides: 2,
                      modifier: 0,
                      damageType: 'fire',
                    },
                  ],
                },
              ]),
            ],
          },
        ],
        initialState,
      ),
    )
    expect(result.eventResults['damage-1'].outcome.expectedDamage).toBeCloseTo(
      1.5,
    )
    expect(
      result.eventResults['damage-1'].stateAfter?.every(
        ({ state }) => state.player.concentration === null,
      ),
    ).toBe(true)
  })
})
