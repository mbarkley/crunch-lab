import { describe, expect, it } from 'vitest'
import {
  calculateAttack,
  calculateAbilityCheck,
  calculateDamage,
  calculateEvent,
  calculateInitiative,
  calculateSavingThrow,
  calculateSequence,
  INITIAL_SEQUENCE_STATE,
} from './event'
import type {
  AttackConfig,
  EventConfig,
  GrappledEscapeConfig,
  PlayerAbilityCheckConfig,
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

const playerSave = (
  overrides: Partial<PlayerSavingThrowConfig> = {},
): PlayerSavingThrowConfig => ({
  id: 'save-1',
  type: 'player-saving-throw',
  saveDc: 12,
  saveModifier: 0,
  saveAbility: 'dexterity',
  rollMode: 'normal',
  cover: 'none',
  damagePools: [
    {
      id: 'damage-1',
      diceCount: 1,
      dieSides: 8,
      modifier: 0,
      damageType: 'slashing',
    },
  ],
  failureDamage: 'full',
  successDamage: 'half',
  failureConditions: [],
  successConditions: [],
  ...overrides,
})

const sequenceConfig = (
  events: readonly EventConfig[],
  overrides: Partial<SequenceConfig> = {},
): SequenceConfig => ({
  initialState: {
    player: { ...INITIAL_SEQUENCE_STATE.player },
    enemy: { ...INITIAL_SEQUENCE_STATE.enemy },
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

const calculateEventSequence = (events: readonly EventConfig[]) =>
  calculateSequence(sequenceConfig(events))

describe('event calculations', () => {
  it('groups expected enemy damage by round', () => {
    const first = playerAttack()
    const second = playerAttack({
      id: 'attack-2',
      damagePools: [{ ...first.damagePools[0], id: 'damage-2' }],
    })
    const result = calculateSequence({
      ...sequenceConfig([first]),
      rounds: [
        sequenceConfig([first]).rounds[0],
        {
          id: 'round-2',
          turns: [
            {
              id: 'turn-2',
              owner: 'player',
              activities: [
                {
                  id: 'activity-2',
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
    expect(result.expectedEnemyDamageByRound).toEqual([2.25, 2.25])
  })

  it('calculates an AC-based player attack against enemies', () => {
    const result = calculateAttack(playerAttack())

    expect(result.successProbability).toBeCloseTo(0.45)
    expect(result.criticalProbability).toBeCloseTo(0.05)
    expect(result.outcome).toEqual({
      type: 'expected-damage-against-enemies',
      expectedDamage: 2.25,
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

  it('reports critical probability for each attack roll mode', () => {
    expect(
      calculateAttack(playerAttack({ rollMode: 'normal' })).criticalProbability,
    ).toBeCloseTo(0.05)
    expect(
      calculateAttack(playerAttack({ rollMode: 'advantage' }))
        .criticalProbability,
    ).toBeCloseTo(0.0975)
    expect(
      calculateAttack(playerAttack({ rollMode: 'disadvantage' }))
        .criticalProbability,
    ).toBeCloseTo(0.0025)
  })

  it('doubles every damage die on a critical and adds the modifier once', () => {
    const result = calculateAttack(
      playerAttack({
        armorClass: 100,
        damagePools: [
          {
            id: 'damage-1',
            diceCount: 1,
            dieSides: 4,
            modifier: 0,
            damageType: 'slashing',
          },
          {
            id: 'damage-2',
            diceCount: 2,
            dieSides: 6,
            modifier: -3,
            damageType: 'slashing',
          },
        ],
      }),
    )

    expect(result.successProbability).toBeCloseTo(0.05)
    expect(result.criticalProbability).toBeCloseTo(0.05)
    expect(result.outcome.expectedDamage).toBeCloseTo(0.8)
  })

  it('calculates a four-die attack without enumerating every critical roll', () => {
    const result = calculateAttack(
      playerAttack({
        armorClass: 100,
        damagePools: [
          {
            id: 'damage-1',
            diceCount: 4,
            dieSides: 8,
            modifier: 0,
            damageType: 'slashing',
          },
        ],
      }),
    )

    expect(result.successProbability).toBeCloseTo(0.05)
    expect(result.outcome.expectedDamage).toBeCloseTo(1.8)
  })

  it('rejects damage pools that exceed the supported dice limit', () => {
    expect(() =>
      calculateAttack({
        ...playerAttack(),
        damagePools: [
          {
            id: 'damage-1',
            diceCount: 21,
            dieSides: 8,
            modifier: 0,
            damageType: 'slashing',
          },
        ],
      }),
    ).toThrow(/damage dice count must not exceed 20/i)
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

  it('supports saving throw roll modes and applies Cover only to Dexterity saves', () => {
    expect(
      calculateSavingThrow(playerSave({ rollMode: 'advantage' }))
        .successProbability,
    ).toBeCloseTo(0.6975)
    expect(
      calculateSavingThrow(playerSave({ rollMode: 'disadvantage' }))
        .successProbability,
    ).toBeCloseTo(0.2025)
    expect(
      calculateSavingThrow(playerSave({ rollMode: 'automatic-failure' }))
        .successProbability,
    ).toBe(0)
    expect(
      calculateSavingThrow(playerSave({ cover: 'half' })).successProbability,
    ).toBeCloseTo(0.55)
    expect(
      calculateSavingThrow(
        playerSave({ saveAbility: 'strength', cover: 'half' }),
      ).successProbability,
    ).toBeCloseTo(0.45)
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
          damagePools: [
            {
              id: 'damage-1',
              diceCount: 1,
              dieSides: 4,
              modifier: -2,
              damageType: 'slashing',
            },
          ],
        }),
      ).outcome.expectedDamage,
    ).toBeCloseTo(0.25)
  })

  it('sums same-type damage pools with per-pool modifiers', () => {
    const result = calculateSavingThrow(
      playerSave({
        saveDc: 21,
        damagePools: [
          {
            id: 'damage-1',
            diceCount: 1,
            dieSides: 4,
            modifier: 3,
            damageType: 'slashing',
          },
          {
            id: 'damage-2',
            diceCount: 1,
            dieSides: 6,
            modifier: 0,
            damageType: 'slashing',
          },
        ],
      }),
    )

    expect(result.outcome.expectedDamage).toBe(9)
  })

  it('rounds half damage once after combining every damage pool', () => {
    const result = calculateSavingThrow(
      playerSave({
        saveDc: 1,
        damagePools: [
          {
            id: 'damage-1',
            diceCount: 1,
            dieSides: 4,
            modifier: 0,
            damageType: 'slashing',
          },
          {
            id: 'damage-2',
            diceCount: 1,
            dieSides: 4,
            modifier: 0,
            damageType: 'slashing',
          },
        ],
      }),
    )

    expect(result.outcome.expectedDamage).toBeCloseTo(2.25)
  })

  it('applies typed damage defenses in immunity, resistance, vulnerability order', () => {
    const base = calculateSequence(
      sequenceConfig(
        [
          playerSave({
            saveDc: 1,
            successDamage: 'full',
            damagePools: [
              {
                id: 'damage-1',
                diceCount: 1,
                dieSides: 4,
                modifier: 0,
                damageType: 'slashing',
              },
            ],
          }),
        ],
        {
          initialState: {
            player: { ...INITIAL_SEQUENCE_STATE.player },
            enemy: { ...INITIAL_SEQUENCE_STATE.enemy },
          },
        },
      ),
    )
    expect(base.outcomes[0].expectedDamage).toBeCloseTo(2.5)

    const resistant = calculateSequence(
      sequenceConfig(
        [
          playerSave({
            saveDc: 1,
            successDamage: 'full',
            damagePools: [
              {
                id: 'damage-1',
                diceCount: 1,
                dieSides: 4,
                modifier: 0,
                damageType: 'slashing',
              },
            ],
          }),
        ],
        {
          initialState: {
            player: {
              ...INITIAL_SEQUENCE_STATE.player,
              damageResistances: ['slashing'],
            },
            enemy: { ...INITIAL_SEQUENCE_STATE.enemy },
          },
        },
      ),
    )
    expect(resistant.outcomes[0].expectedDamage).toBeCloseTo(1)

    const vulnerable = calculateSequence(
      sequenceConfig(
        [
          playerSave({
            saveDc: 1,
            successDamage: 'full',
            damagePools: [
              {
                id: 'damage-1',
                diceCount: 1,
                dieSides: 4,
                modifier: 0,
                damageType: 'slashing',
              },
            ],
          }),
        ],
        {
          initialState: {
            player: {
              ...INITIAL_SEQUENCE_STATE.player,
              damageVulnerabilities: ['slashing'],
            },
            enemy: { ...INITIAL_SEQUENCE_STATE.enemy },
          },
        },
      ),
    )
    expect(vulnerable.outcomes[0].expectedDamage).toBeCloseTo(5)

    const immune = calculateSequence(
      sequenceConfig(
        [
          playerSave({
            saveDc: 1,
            successDamage: 'full',
            damagePools: [
              {
                id: 'damage-1',
                diceCount: 1,
                dieSides: 4,
                modifier: 0,
                damageType: 'slashing',
              },
            ],
          }),
        ],
        {
          initialState: {
            player: {
              ...INITIAL_SEQUENCE_STATE.player,
              damageImmunities: ['slashing'],
            },
            enemy: { ...INITIAL_SEQUENCE_STATE.enemy },
          },
        },
      ),
    )
    expect(immune.outcomes[0].expectedDamage).toBe(0)
  })

  it('combines same-type pools before resistance rounding', () => {
    const result = calculateSequence(
      sequenceConfig(
        [
          playerSave({
            saveDc: 1,
            successDamage: 'full',
            damagePools: [
              {
                id: 'damage-1',
                diceCount: 1,
                dieSides: 4,
                modifier: 0,
                damageType: 'slashing',
              },
              {
                id: 'damage-2',
                diceCount: 1,
                dieSides: 4,
                modifier: 0,
                damageType: 'slashing',
              },
            ],
          }),
        ],
        {
          initialState: {
            player: {
              ...INITIAL_SEQUENCE_STATE.player,
              damageResistances: ['slashing'],
            },
            enemy: { ...INITIAL_SEQUENCE_STATE.enemy },
          },
        },
      ),
    )
    expect(result.outcomes[0].expectedDamage).toBeCloseTo(2.25)
  })

  it('applies half damage before mixed resistance and vulnerability', () => {
    const result = calculateSequence(
      sequenceConfig(
        [
          playerSave({
            saveDc: 1,
            damagePools: [
              {
                id: 'fire',
                diceCount: 1,
                dieSides: 2,
                modifier: 1,
                damageType: 'fire',
              },
              {
                id: 'cold',
                diceCount: 1,
                dieSides: 2,
                modifier: 1,
                damageType: 'cold',
              },
            ],
          }),
        ],
        {
          initialState: {
            player: {
              ...INITIAL_SEQUENCE_STATE.player,
              damageResistances: ['fire'],
              damageVulnerabilities: ['cold'],
            },
            enemy: { ...INITIAL_SEQUENCE_STATE.enemy },
          },
        },
      ),
    )

    // Each pool rolls 2 or 3. Half damage is 1 for either roll, then
    // resistance reduces fire to 0 and vulnerability doubles cold to 2.
    expect(result.outcomes[0].expectedDamage).toBeCloseTo(2)
  })

  it('combines same-type pools before half and defense rounding in a mixed event', () => {
    const result = calculateSequence(
      sequenceConfig(
        [
          playerSave({
            saveDc: 1,
            damagePools: [
              {
                id: 'fire-1',
                diceCount: 1,
                dieSides: 2,
                modifier: 0,
                damageType: 'fire',
              },
              {
                id: 'fire-2',
                diceCount: 1,
                dieSides: 2,
                modifier: 0,
                damageType: 'fire',
              },
              {
                id: 'cold',
                diceCount: 1,
                dieSides: 2,
                modifier: 0,
                damageType: 'cold',
              },
            ],
          }),
        ],
        {
          initialState: {
            player: {
              ...INITIAL_SEQUENCE_STATE.player,
              damageResistances: ['fire'],
              damageVulnerabilities: ['cold'],
            },
            enemy: { ...INITIAL_SEQUENCE_STATE.enemy },
          },
        },
      ),
    )

    // The fire pools combine to 2, 3, 3, or 4 before halving and resistance;
    // the cold pool contributes 0 or 2 after halving and vulnerability.
    expect(result.outcomes[0].expectedDamage).toBeCloseTo(1.25)
  })

  it('resolves hit damage against defenses before applying hit conditions', () => {
    const result = calculateSequence(
      sequenceConfig(
        [
          playerAttack({
            armorClass: 1,
            damagePools: [
              {
                id: 'damage-1',
                diceCount: 1,
                dieSides: 2,
                modifier: 0,
                damageType: 'slashing',
              },
            ],
            hitConditions: [{ type: 'petrified' }],
          }),
        ],
        {
          initialState: {
            player: { ...INITIAL_SEQUENCE_STATE.player },
            enemy: { ...INITIAL_SEQUENCE_STATE.enemy },
          },
        },
      ),
    )

    expect(result.outcomes[0].expectedDamage).toBeCloseTo(1.5)
    expect(
      result.eventResults['attack-1'].stateAfter?.some(({ state }) =>
        state.enemy.conditions.some(({ type }) => type === 'petrified'),
      ),
    ).toBe(true)
  })

  it('resolves ability checks with sight failure, exhaustion, and branch effects', () => {
    const check: PlayerAbilityCheckConfig = {
      id: 'check-1',
      type: 'player-ability-check',
      ability: 'wisdom',
      dc: 12,
      modifier: 0,
      rollMode: 'normal',
      sightDependent: false,
      successConditions: [{ type: 'vex' }],
      failureConditions: [{ type: 'sap' }],
      successRemovals: [],
      failureRemovals: [],
    }
    expect(calculateAbilityCheck(check).successProbability).toBeCloseTo(0.45)
    expect(calculateAbilityCheck(check).conditionApplications).toEqual([
      { condition: 'sap', probability: 0.55 },
      { condition: 'vex', probability: 0.45 },
    ])

    const blinded = calculateSequence(
      sequenceConfig([], {
        initialState: {
          player: {
            ...INITIAL_SEQUENCE_STATE.player,
            conditions: [
              {
                id: 'blind-1',
                type: 'blinded',
                source: 'enemy',
                recipient: 'player',
              },
            ],
          },
          enemy: { ...INITIAL_SEQUENCE_STATE.enemy },
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
                    events: [{ ...check, sightDependent: true }],
                  },
                ],
              },
            ],
          },
        ],
      }),
    )
    expect(blinded.eventResults['check-1'].successProbability).toBe(0)
  })

  it('inherits grappled-escape values from the grappler and escaper', () => {
    const escape: GrappledEscapeConfig = {
      id: 'escape-1',
      type: 'grappled-escape',
      owner: 'player',
      ability: 'strength',
      rollMode: 'normal',
    }
    const playerGrappled = {
      id: 'grapple-player',
      type: 'grappled' as const,
      source: 'enemy' as const,
      recipient: 'player' as const,
    }
    const enemyGrappled = {
      id: 'grapple-enemy',
      type: 'grappled' as const,
      source: 'player' as const,
      recipient: 'enemy' as const,
    }

    const playerResult = calculateSequence(
      sequenceConfig([escape], {
        initialState: {
          player: {
            ...INITIAL_SEQUENCE_STATE.player,
            saveModifiers: {
              strength: 2,
              dexterity: 0,
              constitution: 0,
              intelligence: 0,
              wisdom: 0,
              charisma: 0,
            },
            conditions: [playerGrappled],
          },
          enemy: {
            ...INITIAL_SEQUENCE_STATE.enemy,
            saveDc: 15,
          },
        },
      }),
    )
    expect(
      playerResult.eventResults['escape-1'].successProbability,
    ).toBeCloseTo(0.4)

    const enemyResult = calculateSequence(
      sequenceConfig(
        [{ ...escape, id: 'escape-2', owner: 'enemy', ability: 'dexterity' }],
        {
          initialState: {
            player: {
              ...INITIAL_SEQUENCE_STATE.player,
              saveDc: 13,
            },
            enemy: {
              ...INITIAL_SEQUENCE_STATE.enemy,
              saveModifiers: {
                strength: 0,
                dexterity: 1,
                constitution: 0,
                intelligence: 0,
                wisdom: 0,
                charisma: 0,
              },
              conditions: [enemyGrappled],
            },
          },
        },
      ),
    )
    expect(enemyResult.eventResults['escape-2'].successProbability).toBeCloseTo(
      0.45,
    )
  })

  it('uses grappled-escape overrides instead of inherited values', () => {
    const escape: GrappledEscapeConfig = {
      id: 'escape-1',
      type: 'grappled-escape',
      owner: 'player',
      ability: 'strength',
      dc: 14,
      modifier: 3,
      rollMode: 'normal',
    }
    const result = calculateSequence(
      sequenceConfig([escape], {
        initialState: {
          player: {
            ...INITIAL_SEQUENCE_STATE.player,
            saveModifiers: {
              strength: 0,
              dexterity: 0,
              constitution: 0,
              intelligence: 0,
              wisdom: 0,
              charisma: 0,
            },
            conditions: [
              {
                id: 'grapple-player',
                type: 'grappled',
                source: 'enemy',
                recipient: 'player',
              },
            ],
          },
          enemy: { ...INITIAL_SEQUENCE_STATE.enemy, saveDc: 20 },
        },
      }),
    )

    expect(result.eventResults['escape-1'].successProbability).toBeCloseTo(0.5)
  })

  it('evaluates activity condition gates once before its events run', () => {
    const result = calculateSequence({
      initialState: {
        player: { ...INITIAL_SEQUENCE_STATE.player, saveDc: 15 },
        enemy: {
          ...INITIAL_SEQUENCE_STATE.enemy,
          saveModifiers: {
            strength: 4,
            dexterity: 0,
            constitution: 0,
            intelligence: 0,
            wisdom: 0,
            charisma: 0,
          },
        },
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
                  conditionGate: {
                    target: 'enemy',
                    mustHave: [],
                    mustNotHave: [{ type: 'grappled' }, { type: 'prone' }],
                  },
                  events: [
                    {
                      id: 'grapple-1',
                      type: 'player-grapple',
                      saveDc: 15,
                      rollMode: 'normal',
                      cover: 'none',
                    },
                    {
                      id: 'shove-1',
                      type: 'player-shove',
                      saveDc: 15,
                      rollMode: 'normal',
                      cover: 'none',
                      conditionGate: {
                        target: 'enemy',
                        mustHave: [{ type: 'grappled' }],
                        mustNotHave: [],
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    })

    expect(result.eventResults['grapple-1'].executionProbability).toBe(1)
    expect(result.eventResults['shove-1'].executionProbability).toBeCloseTo(0.5)
    expect(result.eventResults['shove-1'].conditionApplications).toEqual([
      { condition: 'prone', probability: 0.25 },
    ])
  })

  it('uses Invisible for Initiative Advantage and reports the expected total', () => {
    expect(
      calculateInitiative({
        id: 'initiative-direct',
        type: 'player-initiative',
        ability: 'dexterity',
        modifier: 0,
        rollMode: 'normal',
      }).outcome,
    ).toEqual({ type: 'expected-initiative', expectedTotal: 10.5 })
    const result = calculateSequence(
      sequenceConfig([], {
        initialState: {
          player: {
            ...INITIAL_SEQUENCE_STATE.player,
            conditions: [
              {
                id: 'invisible-1',
                type: 'invisible',
                source: 'player',
                recipient: 'player',
              },
            ],
          },
          enemy: { ...INITIAL_SEQUENCE_STATE.enemy },
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
                    events: [
                      {
                        id: 'initiative-1',
                        type: 'player-initiative',
                        ability: 'dexterity',
                        modifier: 1,
                        rollMode: 'normal',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      }),
    )
    expect(result.eventResults['initiative-1'].outcome).toEqual({
      type: 'expected-initiative',
      expectedTotal: 14.825,
    })
  })

  it('resolves standalone damage and state events, including Help, Dodge, and concentration', () => {
    const damage = calculateDamage({
      id: 'damage-1',
      type: 'enemy-damage',
      damagePools: [
        {
          id: 'pool-1',
          diceCount: 1,
          dieSides: 4,
          modifier: 0,
          damageType: 'fire',
        },
      ],
    })
    expect(damage.outcome).toEqual({
      type: 'expected-damage-against-enemies',
      expectedDamage: 2.5,
    })

    const result = calculateSequence(
      sequenceConfig([], {
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
                    events: [
                      {
                        id: 'help-1',
                        type: 'help',
                        owner: 'enemy',
                        target: 'player',
                      },
                      { id: 'dodge-1', type: 'dodge', owner: 'enemy' },
                      {
                        id: 'start-concentration-1',
                        type: 'start-concentration',
                        owner: 'player',
                        constitutionModifier: 3,
                      },
                      {
                        id: 'stop-concentration-1',
                        type: 'stop-concentration',
                        owner: 'player',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      }),
    )
    expect(result.eventResults['help-1'].outcome).toEqual({ type: 'no-damage' })
    expect(result.eventResults['dodge-1'].outcome).toEqual({
      type: 'no-damage',
    })
  })

  it('makes Help and Dodge affect the next applicable attack', () => {
    const helped = calculateEventSequence([
      { id: 'help-1', type: 'help', owner: 'enemy', target: 'player' },
      playerAttack({ id: 'attack-2' }),
    ])
    expect(helped.eventResults['attack-2'].successProbability).toBeCloseTo(
      0.6975,
    )

    const dodged = calculateEventSequence([
      { id: 'dodge-1', type: 'dodge', owner: 'enemy' },
      playerAttack({ id: 'attack-2' }),
    ])
    expect(dodged.eventResults['attack-2'].successProbability).toBeCloseTo(
      0.2025,
    )
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
    expect(sequence.eventResults['attack-2'].criticalProbability).toBeCloseTo(
      0.071375,
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
    expect(sequence.eventResults['attack-2'].criticalProbability).toBeCloseTo(
      0.028625,
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
      2.847375,
    )
    expect(result.outcomes).toEqual([
      {
        type: 'expected-damage-against-enemies',
        expectedDamage: 5.097375,
      },
      {
        type: 'expected-damage-against-players',
        expectedDamage: 5.625,
      },
    ])
  })

  it('omits outcome and condition types that do not occur', () => {
    expect(calculateEventSequence([playerAttack()])).toEqual({
      eventResults: { 'attack-1': calculateEvent(playerAttack()) },
      outcomes: [
        {
          type: 'expected-damage-against-enemies',
          expectedDamage: 2.25,
        },
      ],
      expectedConditionApplications: [],
      expectedEnemyDamageByRound: [2.25],
    })
  })

  it('uses the configured initial combatant state', () => {
    const result = calculateSequence(
      sequenceConfig([playerAttack()], {
        initialState: {
          player: { ...INITIAL_SEQUENCE_STATE.player },
          enemy: { ...INITIAL_SEQUENCE_STATE.enemy, vex: true },
        },
      }),
    )

    expect(result.eventResults['attack-1'].successProbability).toBeCloseTo(
      0.6975,
    )
  })

  it('spends Heroic Inspiration to reroll a failed controlling d20', () => {
    const result = calculateSequence(
      sequenceConfig(
        [
          playerAttack({ heroicInspiration: { type: 'd20-after-failure' } }),
          playerAttack({ id: 'attack-2' }),
        ],
        {
          initialState: {
            player: {
              ...INITIAL_SEQUENCE_STATE.player,
              heroicInspiration: true,
            },
            enemy: { ...INITIAL_SEQUENCE_STATE.enemy },
          },
        },
      ),
    )
    expect(result.eventResults['attack-1'].successProbability).toBeCloseTo(
      0.6975,
    )
    expect(result.eventResults['attack-2'].successProbability).toBeCloseTo(0.45)
  })

  it('spends Heroic Inspiration to reroll a selected low damage die', () => {
    const result = calculateSequence(
      sequenceConfig(
        [
          playerAttack({
            heroicInspiration: {
              type: 'damage-pool-threshold',
              damagePoolId: 'damage-1',
              threshold: 1,
            },
          }),
          playerAttack({ id: 'attack-2' }),
        ],
        {
          initialState: {
            player: {
              ...INITIAL_SEQUENCE_STATE.player,
              heroicInspiration: true,
            },
            enemy: { ...INITIAL_SEQUENCE_STATE.enemy },
          },
        },
      ),
    )
    expect(result.eventResults['attack-1'].outcome.expectedDamage).toBeCloseTo(
      2.466015625,
    )
    expect(result.eventResults['attack-2'].outcome.expectedDamage).toBeCloseTo(
      2.25,
    )
  })

  it('rerolls the lowest die exactly in a three-die damage pool', () => {
    const result = calculateSequence(
      sequenceConfig(
        [
          playerAttack({
            damagePools: [
              {
                id: 'damage-1',
                diceCount: 3,
                dieSides: 8,
                modifier: 0,
                damageType: 'slashing',
              },
            ],
            heroicInspiration: {
              type: 'damage-pool-threshold',
              damagePoolId: 'damage-1',
              threshold: 1,
            },
          }),
        ],
        {
          initialState: {
            player: {
              ...INITIAL_SEQUENCE_STATE.player,
              heroicInspiration: true,
            },
            enemy: { ...INITIAL_SEQUENCE_STATE.enemy },
          },
        },
      ),
    )

    expect(result.eventResults['attack-1'].outcome.expectedDamage).toBeCloseTo(
      7.308570194244,
    )
  })

  it('traverses rounds, turns, and activities depth-first', () => {
    const first = playerAttack({ hitConditions: [{ type: 'vex' }] })
    const second = playerAttack({ id: 'attack-2' })
    const result = calculateSequence({
      initialState: {
        player: { ...INITIAL_SEQUENCE_STATE.player },
        enemy: { ...INITIAL_SEQUENCE_STATE.enemy },
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
