import { describe, expect, it } from 'vitest'
import {
  calculateSequence,
  eventUsesActivityResource,
  INITIAL_SEQUENCE_STATE,
} from './event'
import type { EventConfig, SequenceConfig } from './event'

const state: SequenceConfig['initialState'] = {
  ...INITIAL_SEQUENCE_STATE,
  player: {
    ...INITIAL_SEQUENCE_STATE.player,
    exhaustion: 6,
    conditions: [
      {
        id: 'incapacitated-1',
        type: 'incapacitated',
        source: 'enemy',
        recipient: 'player',
      },
    ],
    concentration: { constitutionModifier: 2 },
  },
}

const damagePools = [
  {
    id: 'pool-1',
    diceCount: 1,
    dieSides: 2,
    modifier: 0,
    damageType: 'fire' as const,
  },
]

const events: readonly EventConfig[] = [
  {
    id: 'attack-1',
    type: 'player-attack',
    armorClass: 12,
    attackModifier: 0,
    rollMode: 'normal',
    cover: 'none',
    hitConditions: [],
    damagePools,
  },
  {
    id: 'check-1',
    type: 'player-ability-check',
    ability: 'strength',
    dc: 10,
    modifier: 0,
    rollMode: 'normal',
  },
  {
    id: 'help-1',
    type: 'help',
    owner: 'player',
    target: 'player',
  },
  { id: 'dodge-1', type: 'dodge', owner: 'player' },
  {
    id: 'apply-1',
    type: 'apply-condition',
    source: 'player',
    target: 'enemy',
    conditions: [{ id: 'blind-1', type: 'blinded' }],
  },
  {
    id: 'effect-1',
    type: 'apply-effect',
    source: 'player',
    target: 'enemy',
    effects: [{ id: 'poison-1', type: 'poisoned' }],
  },
  {
    id: 'concentration-1',
    type: 'start-concentration',
    owner: 'player',
    constitutionModifier: 3,
  },
  {
    id: 'save-1',
    type: 'player-saving-throw',
    saveDc: 30,
    saveModifier: 0,
    saveAbility: 'constitution',
    rollMode: 'normal',
    cover: 'none',
    damagePools,
    failureDamage: 'none',
    successDamage: 'none',
    failureConditions: [],
    successConditions: [],
  },
  {
    id: 'initiative-1',
    type: 'player-initiative',
    ability: 'dexterity',
    modifier: 0,
    rollMode: 'normal',
  },
  { id: 'damage-1', type: 'player-damage', damagePools },
  {
    id: 'remove-1',
    type: 'remove-condition',
    target: 'player',
    conditions: [{ id: 'incapacitated-1', type: 'incapacitated' }],
  },
  {
    id: 'remove-effect-1',
    type: 'remove-effect',
    target: 'player',
    effects: [{ type: 'stunned' }],
  },
  { id: 'stop-1', type: 'stop-concentration', owner: 'player' },
]

describe('final event execution validation', () => {
  it('classifies only resource-using manual events as suppressible', () => {
    expect(eventUsesActivityResource(events[0])).toBe(true)
    expect(eventUsesActivityResource(events[1])).toBe(true)
    expect(eventUsesActivityResource(events[2])).toBe(true)
    expect(eventUsesActivityResource(events[3])).toBe(true)
    expect(eventUsesActivityResource(events[4])).toBe(true)
    expect(eventUsesActivityResource(events[5])).toBe(true)
    expect(eventUsesActivityResource(events[6])).toBe(true)
    for (const event of events.slice(7)) {
      expect(eventUsesActivityResource(event)).toBe(false)
    }
  })

  it('suppresses resource events while allowing saves, initiative, external damage, and cleanup', () => {
    const result = calculateSequence({
      initialState: state,
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

    for (const event of events.slice(0, 7)) {
      expect(result.eventResults[event.id].executionProbability).toBe(0)
    }
    for (const event of events.slice(7)) {
      expect(result.eventResults[event.id].executionProbability).toBe(1)
    }
    expect(result.eventResults['save-1'].successProbability).toBe(0)
    expect(
      result.eventResults['stop-1'].stateAfter?.every(
        ({ state: after }) => after.player.concentration === null,
      ),
    ).toBe(true)
  })

  it('ends concentration when an executed event applies Incapacitated', () => {
    const result = calculateSequence({
      initialState: {
        ...INITIAL_SEQUENCE_STATE,
        player: {
          ...INITIAL_SEQUENCE_STATE.player,
          concentration: { constitutionModifier: 2 },
        },
      },
      rounds: [
        {
          id: 'round-1',
          turns: [
            {
              id: 'turn-1',
              owner: 'enemy',
              activities: [
                {
                  id: 'activity-1',
                  type: 'action',
                  owner: 'enemy',
                  events: [
                    {
                      id: 'apply-incapacitated',
                      type: 'apply-condition',
                      source: 'enemy',
                      target: 'player',
                      conditions: [{ type: 'incapacitated' }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    })
    expect(
      result.eventResults['apply-incapacitated'].stateAfter?.every(
        ({ state: after }) => after.player.concentration === null,
      ),
    ).toBe(true)
  })
})
