import { Distribution, keepHighest, keepLowest, sumDice } from './distribution'

export type AttackRollMode = 'normal' | 'advantage' | 'disadvantage'
export type ConditionType = 'vex' | 'sap'
export type ConditionConfig =
  { readonly type: 'vex' } | { readonly type: 'sap' }
export type DamageConsequence = 'none' | 'half' | 'full'

export interface DamagePoolConfig {
  readonly diceCount: number
  readonly dieSides: number
}

export interface DamageRollConfig {
  readonly damagePools: readonly DamagePoolConfig[]
  readonly damageModifier: number
}

interface BaseEventConfig extends DamageRollConfig {
  readonly id: string
}

interface BaseAttackConfig extends BaseEventConfig {
  readonly armorClass: number
  readonly attackModifier: number
  readonly rollMode: AttackRollMode
  readonly hitConditions: readonly ConditionConfig[]
}

export interface PlayerAttackConfig extends BaseAttackConfig {
  readonly type: 'player-attack'
}

export interface EnemyAttackConfig extends BaseAttackConfig {
  readonly type: 'enemy-attack'
}

export type AttackConfig = PlayerAttackConfig | EnemyAttackConfig

interface BaseSavingThrowConfig extends BaseEventConfig {
  readonly saveDc: number
  readonly saveModifier: number
  readonly failureDamage: DamageConsequence
  readonly successDamage: DamageConsequence
  readonly failureConditions: readonly ConditionConfig[]
  readonly successConditions: readonly ConditionConfig[]
}

export interface PlayerSavingThrowConfig extends BaseSavingThrowConfig {
  readonly type: 'player-saving-throw'
}

export interface EnemySavingThrowConfig extends BaseSavingThrowConfig {
  readonly type: 'enemy-saving-throw'
}

export type SavingThrowConfig = PlayerSavingThrowConfig | EnemySavingThrowConfig
export type EventConfig = AttackConfig | SavingThrowConfig

export type Combatant = 'player' | 'enemy'
export type ActivityType = 'action' | 'bonus-action'

export interface CombatantState {
  readonly vex: boolean
  readonly sap: boolean
}

export interface SequenceState {
  readonly player: CombatantState
  readonly enemy: CombatantState
}

export interface ActivityConfig {
  readonly id: string
  readonly type: ActivityType
  readonly owner: Combatant
  readonly events: readonly EventConfig[]
}

export interface TurnConfig {
  readonly id: string
  readonly owner: Combatant
  readonly activities: readonly ActivityConfig[]
}

export interface RoundConfig {
  readonly id: string
  readonly turns: readonly TurnConfig[]
}

export interface SequenceConfig {
  readonly initialState: SequenceState
  readonly rounds: readonly RoundConfig[]
}

export interface ExpectedDamageAgainstEnemies {
  readonly type: 'expected-damage-against-enemies'
  readonly expectedDamage: number
}

export interface ExpectedDamageAgainstPlayers {
  readonly type: 'expected-damage-against-players'
  readonly expectedDamage: number
}

export type Outcome =
  ExpectedDamageAgainstEnemies | ExpectedDamageAgainstPlayers

export interface ConditionApplication {
  readonly condition: ConditionType
  readonly probability: number
}

export type ConditionTarget = 'players' | 'enemies'

export interface ExpectedConditionApplications {
  readonly condition: ConditionType
  readonly target: ConditionTarget
  readonly expectedApplications: number
}

export interface EventResult {
  readonly successProbability: number
  readonly outcome: Outcome
  readonly conditionApplications: readonly ConditionApplication[]
}

export interface SequenceResult {
  readonly eventResults: Readonly<Record<string, EventResult>>
  readonly outcomes: readonly Outcome[]
  readonly expectedConditionApplications: readonly ExpectedConditionApplications[]
}

interface EventTransition {
  readonly state: SequenceState
  readonly success: boolean
  readonly expectedDamage: number
  readonly appliedConditions: readonly ConditionType[]
}

const CALCULATION_PRECISION = 1e12
const ATTACK_ROLL_MODES: readonly AttackRollMode[] = [
  'normal',
  'advantage',
  'disadvantage',
]
const CONDITION_TYPES: readonly ConditionType[] = ['vex', 'sap']
const DAMAGE_CONSEQUENCES: readonly DamageConsequence[] = [
  'none',
  'half',
  'full',
]
export const INITIAL_SEQUENCE_STATE: SequenceState = {
  player: { vex: false, sap: false },
  enemy: { vex: false, sap: false },
}

function normalizeCalculation(value: number) {
  return Math.round(value * CALCULATION_PRECISION) / CALCULATION_PRECISION
}

function assertInteger(value: number, name: string, minimum?: number) {
  if (!Number.isInteger(value) || (minimum !== undefined && value < minimum)) {
    const lowerBound = minimum === undefined ? '' : ` of at least ${minimum}`
    throw new RangeError(`${name} must be an integer${lowerBound}`)
  }
}

function validateConditions(conditions: readonly ConditionConfig[]) {
  for (const condition of conditions) {
    if (!CONDITION_TYPES.includes(condition.type)) {
      throw new RangeError('Condition must be vex or sap')
    }
  }
}

function validateDamageRoll(config: DamageRollConfig) {
  if (config.damagePools.length === 0) {
    throw new RangeError('Damage must include at least one dice pool')
  }
  for (const pool of config.damagePools) {
    assertInteger(pool.diceCount, 'Damage dice count', 1)
    assertInteger(pool.dieSides, 'Damage die sides', 2)
  }
  assertInteger(config.damageModifier, 'Damage modifier')
}

function damageDistribution(config: DamageRollConfig) {
  validateDamageRoll(config)
  const diceTotal = config.damagePools.reduce(
    (total, pool) =>
      total.combine(
        sumDice(pool.diceCount, pool.dieSides),
        (left, right) => left + right,
        (damage) => damage,
      ),
    Distribution.constant(0, (damage) => damage),
  )
  return diceTotal.map(
    (damage) => Math.max(0, damage + config.damageModifier),
    (damage) => damage,
  )
}

function expectedDamage(
  damage: Distribution<number>,
  consequence: DamageConsequence,
) {
  switch (consequence) {
    case 'none':
      return 0
    case 'half':
      return damage.expectedValue((value) => Math.floor(value / 2))
    case 'full':
      return damage.expectedValue((value) => value)
  }
}

function damageOutcome(target: 'enemies' | 'players', value: number): Outcome {
  return target === 'enemies'
    ? {
        type: 'expected-damage-against-enemies',
        expectedDamage: normalizeCalculation(value),
      }
    : {
        type: 'expected-damage-against-players',
        expectedDamage: normalizeCalculation(value),
      }
}

function attackRoll(mode: AttackRollMode) {
  switch (mode) {
    case 'normal':
      return Distribution.die(20)
    case 'advantage':
      return keepHighest(2, 20, 1)
    case 'disadvantage':
      return keepLowest(2, 20, 1)
  }
}

function effectiveRollMode(
  manualMode: AttackRollMode,
  hasVex: boolean,
  hasSap: boolean,
): AttackRollMode {
  const hasAdvantage = manualMode === 'advantage' || hasVex
  const hasDisadvantage = manualMode === 'disadvantage' || hasSap
  if (hasAdvantage === hasDisadvantage) return 'normal'
  return hasAdvantage ? 'advantage' : 'disadvantage'
}

function applyConditions(
  state: SequenceState,
  target: 'player' | 'enemy',
  conditions: readonly ConditionType[],
): SequenceState {
  if (conditions.length === 0) return state
  const uniqueConditions = [...new Set(conditions)]
  const targetState = { ...state[target] }
  for (const condition of uniqueConditions) targetState[condition] = true
  return {
    ...state,
    [target]: targetState,
  }
}

function stateKey(state: SequenceState) {
  return [
    state.player.vex,
    state.player.sap,
    state.enemy.vex,
    state.enemy.sap,
  ].join(':')
}

function transitionKey(transition: EventTransition) {
  return [
    stateKey(transition.state),
    transition.success,
    transition.expectedDamage,
    ...transition.appliedConditions,
  ].join(':')
}

function attackTransitions(
  config: AttackConfig,
  state: SequenceState,
): Distribution<EventTransition> {
  assertInteger(config.armorClass, 'Armor class', 1)
  assertInteger(config.attackModifier, 'Attack modifier')
  if (!ATTACK_ROLL_MODES.includes(config.rollMode)) {
    throw new RangeError(
      'Attack roll mode must be normal, advantage, or disadvantage',
    )
  }
  validateConditions(config.hitConditions)
  const averageDamage = expectedDamage(damageDistribution(config), 'full')
  const attacker = config.type === 'player-attack' ? 'player' : 'enemy'
  const target = attacker === 'player' ? 'enemy' : 'player'
  const mode = effectiveRollMode(
    config.rollMode,
    state[target].vex,
    state[attacker].sap,
  )
  const consumedState: SequenceState = {
    ...state,
    [attacker]: { ...state[attacker], sap: false },
    [target]: { ...state[target], vex: false },
  }

  return attackRoll(mode).map((roll) => {
    const success =
      roll === 20 ||
      (roll !== 1 && roll + config.attackModifier >= config.armorClass)
    const appliedConditions = success
      ? [...new Set(config.hitConditions.map((condition) => condition.type))]
      : []
    return {
      state: success
        ? applyConditions(consumedState, target, appliedConditions)
        : consumedState,
      success,
      expectedDamage: success ? averageDamage : 0,
      appliedConditions,
    }
  }, transitionKey)
}

function savingThrowTransitions(
  config: SavingThrowConfig,
  state: SequenceState,
): Distribution<EventTransition> {
  assertInteger(config.saveDc, 'Save DC', 1)
  assertInteger(config.saveModifier, 'Save modifier')
  if (!DAMAGE_CONSEQUENCES.includes(config.failureDamage)) {
    throw new RangeError('Failure damage must be none, half, or full')
  }
  if (!DAMAGE_CONSEQUENCES.includes(config.successDamage)) {
    throw new RangeError('Success damage must be none, half, or full')
  }
  validateConditions(config.failureConditions)
  validateConditions(config.successConditions)
  const damage = damageDistribution(config)
  const target = config.type === 'player-saving-throw' ? 'player' : 'enemy'

  return Distribution.die(20).map((roll) => {
    const success = roll + config.saveModifier >= config.saveDc
    const consequence = success ? config.successDamage : config.failureDamage
    const appliedConditions = [
      ...new Set(
        (success ? config.successConditions : config.failureConditions).map(
          (condition) => condition.type,
        ),
      ),
    ]
    return {
      state: applyConditions(state, target, appliedConditions),
      success,
      expectedDamage: expectedDamage(damage, consequence),
      appliedConditions,
    }
  }, transitionKey)
}

function eventTransitions(config: EventConfig, state: SequenceState) {
  switch (config.type) {
    case 'player-attack':
    case 'enemy-attack':
      return attackTransitions(config, state)
    case 'player-saving-throw':
    case 'enemy-saving-throw':
      return savingThrowTransitions(config, state)
  }
}

function configuredConditions(config: EventConfig) {
  return [
    ...new Set(
      config.type === 'player-attack' || config.type === 'enemy-attack'
        ? config.hitConditions.map((condition) => condition.type)
        : [...config.failureConditions, ...config.successConditions].map(
            (condition) => condition.type,
          ),
    ),
  ]
}

function eventTarget(config: EventConfig): ConditionTarget {
  return config.type === 'player-attack' || config.type === 'enemy-saving-throw'
    ? 'enemies'
    : 'players'
}

function resultFromTransitions(
  config: EventConfig,
  transitions: Distribution<EventTransition>,
): EventResult {
  const target = eventTarget(config)
  return {
    successProbability: normalizeCalculation(
      transitions.probabilityOf((transition) => transition.success),
    ),
    outcome: damageOutcome(
      target,
      transitions.expectedValue((transition) => transition.expectedDamage),
    ),
    conditionApplications: configuredConditions(config).map((condition) => ({
      condition,
      probability: normalizeCalculation(
        transitions.probabilityOf((transition) =>
          transition.appliedConditions.includes(condition),
        ),
      ),
    })),
  }
}

function calculateSingleEvent(config: EventConfig) {
  return resultFromTransitions(
    config,
    eventTransitions(config, INITIAL_SEQUENCE_STATE),
  )
}

export function calculateAttack(config: AttackConfig): EventResult {
  return calculateSingleEvent(config)
}

export function calculateSavingThrow(config: SavingThrowConfig): EventResult {
  return calculateSingleEvent(config)
}

export function calculateEvent(config: EventConfig): EventResult {
  return calculateSingleEvent(config)
}

function assertUniqueId(id: string, kind: string, ids: Set<string>) {
  if (id.length === 0) throw new RangeError(`${kind} ID must not be empty`)
  if (ids.has(id)) throw new RangeError(`Duplicate ID: ${id}`)
  ids.add(id)
}

function validateSequence(config: SequenceConfig) {
  const ids = new Set<string>()
  for (const round of config.rounds) {
    assertUniqueId(round.id, 'Round', ids)
    for (const turn of round.turns) {
      assertUniqueId(turn.id, 'Turn', ids)
      if (turn.owner !== 'player' && turn.owner !== 'enemy') {
        throw new RangeError('Turn owner must be player or enemy')
      }
      for (const activity of turn.activities) {
        assertUniqueId(activity.id, 'Activity', ids)
        if (activity.type !== 'action' && activity.type !== 'bonus-action') {
          throw new RangeError('Activity type must be action or bonus-action')
        }
        if (activity.owner !== turn.owner) {
          throw new RangeError(
            `Activity ${activity.id} owner must match turn ${turn.id} owner`,
          )
        }
        for (const event of activity.events) {
          assertUniqueId(event.id, 'Event', ids)
        }
      }
    }
  }
}

function sequenceEvents(config: SequenceConfig) {
  return config.rounds.flatMap((round) =>
    round.turns.flatMap((turn) =>
      turn.activities.flatMap((activity) => activity.events),
    ),
  )
}

export function calculateSequence(config: SequenceConfig): SequenceResult {
  validateSequence(config)
  let states = Distribution.constant(config.initialState, stateKey)
  const eventResults: Record<string, EventResult> = {}
  const totals = new Map<Outcome['type'], number>()
  const conditionTotals = new Map<string, ExpectedConditionApplications>()

  for (const event of sequenceEvents(config)) {
    const transitions = states.flatMap(
      (state) => eventTransitions(event, state),
      transitionKey,
    )
    const result = resultFromTransitions(event, transitions)
    eventResults[event.id] = result
    totals.set(
      result.outcome.type,
      (totals.get(result.outcome.type) ?? 0) + result.outcome.expectedDamage,
    )
    const target = eventTarget(event)
    for (const application of result.conditionApplications) {
      const key = `${application.condition}:${target}`
      const current = conditionTotals.get(key)
      conditionTotals.set(key, {
        condition: application.condition,
        target,
        expectedApplications:
          (current?.expectedApplications ?? 0) + application.probability,
      })
    }
    states = transitions.map((transition) => transition.state, stateKey)
  }

  const outcomes: Outcome[] = []
  const enemyDamage = totals.get('expected-damage-against-enemies')
  if (enemyDamage !== undefined) {
    outcomes.push(damageOutcome('enemies', enemyDamage))
  }
  const playerDamage = totals.get('expected-damage-against-players')
  if (playerDamage !== undefined) {
    outcomes.push(damageOutcome('players', playerDamage))
  }

  return {
    eventResults,
    outcomes,
    expectedConditionApplications: [...conditionTotals.values()].map(
      (total) => ({
        ...total,
        expectedApplications: normalizeCalculation(total.expectedApplications),
      }),
    ),
  }
}
