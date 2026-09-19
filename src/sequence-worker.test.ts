import { describe, expect, it } from 'vitest'
import {
  INITIAL_SEQUENCE_STATE,
  type SequenceConfig,
} from './probability/event'
import { calculateSequenceRequest } from './sequence-worker'

describe('sequence worker request handling', () => {
  it('returns the matching request id and calculated sequence', () => {
    const config: SequenceConfig = {
      initialState: INITIAL_SEQUENCE_STATE,
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
                  type: 'generic',
                  owner: 'player',
                  events: [
                    {
                      id: 'damage-1',
                      type: 'enemy-damage',
                      damagePools: [
                        {
                          id: 'pool-1',
                          diceCount: 1,
                          dieSides: 8,
                          modifier: 0,
                          damageType: 'fire',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }

    const response = calculateSequenceRequest({ requestId: 7, config })

    expect(response).toMatchObject({ requestId: 7 })
    expect('sequence' in response && response.sequence.outcomes).toEqual([
      { type: 'expected-damage-against-enemies', expectedDamage: 4.5 },
    ])
  })

  it('serializes calculation errors', () => {
    const response = calculateSequenceRequest({
      requestId: 8,
      config: {
        initialState: INITIAL_SEQUENCE_STATE,
        rounds: [
          { id: 'duplicate-round', turns: [] },
          { id: 'duplicate-round', turns: [] },
        ],
      },
    })

    expect(response).toEqual({
      requestId: 8,
      error: expect.any(String),
    })
  })
})
