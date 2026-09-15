import { Distribution, keepHighest, keepLowest, sumDice } from './distribution'
import {
  CONDITION_CATALOG_TYPES,
  isConditionImmune,
  isPersistentConditionType,
  TRANSIENT_EFFECT_TYPES,
} from './conditions'
import type {
  Combatant,
  ConditionInstance,
  ConditionType,
  ExhaustionLevel,
  PersistentConditionType,
} from './conditions'

export {
  CONDITION_CATALOG,
  CONDITION_CATALOG_TYPES,
  effectiveConditionTypes,
  hasEffectiveCondition,
  isConditionCatalogType,
  isConditionImmune,
  isTransientEffectType,
  PERSISTENT_CONDITION_TYPES,
  TRANSIENT_EFFECT_TYPES,
} from './conditions'
export type {
  Combatant,
  ConditionCatalogType,
  ConditionDefinition,
  ConditionDuration,
  ConditionInstance,
  ConditionType,
  ExhaustionLevel,
  PersistentConditionType,
  TransientEffectType,
  TurnBoundary,
} from './conditions'

export type AttackRollMode = 'normal' | 'advantage' | 'disadvantage'
export interface ConditionConfig {
  readonly type: ConditionType
  readonly id?: string
  readonly duration?: ConditionInstance['duration']
  readonly exhaustionLevels?: number
}
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

export type ActivityType = 'action' | 'bonus-action'

export interface ConcentrationState {
  readonly constitutionModifier: number
}

export interface CombatantState {
  readonly vex: boolean
  readonly sap: boolean
  readonly conditions: readonly ConditionInstance[]
  readonly conditionImmunities: readonly PersistentConditionType[]
  readonly exhaustion: ExhaustionLevel
  readonly concentration: ConcentrationState | null
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
  readonly criticalProbability?: number
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
  readonly critical: boolean
  readonly expectedDamage: number
  readonly appliedConditions: readonly ConditionType[]
}

const CALCULATION_PRECISION = 1e12
const ATTACK_ROLL_MODES: readonly AttackRollMode[] = [
  'normal',
  'advantage',
  'disadvantage',
]
const CONDITION_TYPES: readonly ConditionType[] = [
  ...CONDITION_CATALOG_TYPES,
  ...TRANSIENT_EFFECT_TYPES,
]
const DAMAGE_CONSEQUENCES: readonly DamageConsequence[] = [
  'none',
  'half',
  'full',
]
export const INITIAL_SEQUENCE_STATE: SequenceState = {
  player: {
    vex: false,
    sap: false,
    conditions: [],
    conditionImmunities: [],
    exhaustion: 0,
    concentration: null,
  },
  enemy: {
    vex: false,
    sap: false,
    conditions: [],
    conditionImmunities: [],
    exhaustion: 0,
    concentration: null,
  },
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

function validateConditionDuration(duration: ConditionInstance['duration']) {
  if (duration === undefined) return
  assertInteger(duration.remainingTurns, 'Condition duration', 1)
  if (duration.boundary !== 'start' && duration.boundary !== 'end') {
    throw new RangeError('Condition duration boundary must be start or end')
  }
  if (duration.turnOwner !== 'player' && duration.turnOwner !== 'enemy') {
    throw new RangeError(
      'Condition duration turn owner must be player or enemy',
    )
  }
}

function validateConditions(conditions: readonly ConditionConfig[]) {
  const ids = new Set<string>()
  for (const condition of conditions) {
    if (condition.type === 'exhaustion') {
      assertInteger(condition.exhaustionLevels ?? 1, 'Exhaustion levels', 1)
      if (
        condition.exhaustionLevels !== undefined &&
        condition.exhaustionLevels > 6
      ) {
        throw new RangeError('Exhaustion levels must not exceed 6')
      }
      if (condition.duration !== undefined) {
        throw new RangeError('Exhaustion applications cannot have a duration')
      }
    } else if (condition.exhaustionLevels !== undefined) {
      throw new RangeError(
        'Exhaustion levels can only be set for Exhaustion applications',
      )
    }
    if (!CONDITION_TYPES.includes(condition.type)) {
      throw new RangeError('Condition is not supported')
    }
    if (condition.id !== undefined) {
      if (condition.id.length === 0) {
        throw new RangeError('Condition application ID must not be empty')
      }
      if (ids.has(condition.id)) {
        throw new RangeError(
          `Duplicate condition application ID: ${condition.id}`,
        )
      }
      ids.add(condition.id)
    }
    if (isPersistentConditionType(condition.type)) {
      validateConditionDuration(condition.duration)
    } else if (condition.duration !== undefined) {
      throw new RangeError(
        'Only persistent condition applications can have a duration',
      )
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

function damageDistribution(config: DamageRollConfig, diceMultiplier = 1) {
  validateDamageRoll(config)
  const diceTotal = config.damagePools.reduce(
    (total, pool) =>
      total.combine(
        sumDice(pool.diceCount * diceMultiplier, pool.dieSides),
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

export function applyConditionConfigs(
  state: SequenceState,
  target: Combatant,
  source: Combatant,
  applicationId: string,
  conditions: readonly ConditionConfig[],
): {
  readonly state: SequenceState
  readonly appliedConditions: readonly ConditionType[]
} {
  validateConditions(conditions)
  if (conditions.length === 0) {
    return { state, appliedConditions: [] }
  }

  let vex = state[target].vex
  let sap = state[target].sap
  const instances = [...state[target].conditions]
  const appliedConditions = new Set<ConditionType>()

  conditions.forEach((condition, index) => {
    if (condition.type === 'vex' || condition.type === 'sap') {
      if (condition.type === 'vex') vex = true
      else sap = true
      appliedConditions.add(condition.type)
      return
    }

    if (condition.type === 'exhaustion') {
      const levels = condition.exhaustionLevels ?? 1
      const exhaustion = Math.min(
        6,
        state[target].exhaustion + levels,
      ) as ExhaustionLevel
      state = {
        ...state,
        [target]: {
          ...state[target],
          exhaustion,
        },
      }
      appliedConditions.add(condition.type)
      return
    }

    if (
      isConditionImmune(
        instances,
        state[target].conditionImmunities,
        condition.type,
      )
    ) {
      return
    }

    instances.push({
      id: condition.id ?? `${applicationId}:${index}`,
      type: condition.type,
      source,
      recipient: target,
      ...(condition.duration === undefined
        ? {}
        : { duration: condition.duration }),
    })
    appliedConditions.add(condition.type)
  })

  return {
    state: {
      ...state,
      [target]: {
        ...state[target],
        vex,
        sap,
        conditions: instances,
      },
    },
    appliedConditions: [...appliedConditions],
  }
}

function combatantStateKey(state: CombatantState) {
  const conditions = state.conditions
    .map(
      (condition) =>
        `${condition.id},${condition.type},${condition.source},${condition.recipient},${condition.duration?.remainingTurns ?? ''},${condition.duration?.boundary ?? ''},${condition.duration?.turnOwner ?? ''}`,
    )
    .sort()
    .join(';')
  return [
    state.vex,
    state.sap,
    conditions,
    [...state.conditionImmunities].sort().join(','),
    state.exhaustion,
    state.concentration?.constitutionModifier ?? '',
  ].join(':')
}

export function sequenceStateKey(state: SequenceState) {
  return [combatantStateKey(state.player), combatantStateKey(state.enemy)].join(
    '|',
  )
}
function transitionKey(transition: EventTransition) {
  return [
    sequenceStateKey(transition.state),
    transition.success,
    transition.critical,
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
  const normalDamage = expectedDamage(damageDistribution(config), 'full')
  const criticalDamage = expectedDamage(damageDistribution(config, 2), 'full')
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
    const critical = roll === 20
    const success =
      critical ||
      (roll !== 1 && roll + config.attackModifier >= config.armorClass)
    const application = success
      ? applyConditionConfigs(
          consumedState,
          target,
          attacker,
          `${config.id}:hit`,
          config.hitConditions,
        )
      : { state: consumedState, appliedConditions: [] }
    return {
      state: application.state,
      success,
      critical,
      expectedDamage: success ? (critical ? criticalDamage : normalDamage) : 0,
      appliedConditions: application.appliedConditions,
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
    const branch = success ? 'success' : 'failure'
    const application = applyConditionConfigs(
      state,
      target,
      target === 'player' ? 'enemy' : 'player',
      `${config.id}:${branch}`,
      success ? config.successConditions : config.failureConditions,
    )
    return {
      state: application.state,
      success,
      critical: false,
      expectedDamage: expectedDamage(damage, consequence),
      appliedConditions: application.appliedConditions,
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
    ...(config.type === 'player-attack' || config.type === 'enemy-attack'
      ? {
          criticalProbability: normalizeCalculation(
            transitions.probabilityOf((transition) => transition.critical),
          ),
        }
      : {}),
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

function validateCombatantState(
  state: CombatantState,
  owner: Combatant,
  ids: Set<string>,
) {
  if (typeof state.vex !== 'boolean' || typeof state.sap !== 'boolean') {
    throw new RangeError('Vex and Sap state must be boolean')
  }
  assertInteger(state.exhaustion, 'Exhaustion level', 0)
  if (state.exhaustion > 6) {
    throw new RangeError('Exhaustion level must not exceed 6')
  }
  const immunities = new Set<PersistentConditionType>()
  for (const immunity of state.conditionImmunities) {
    if (!isPersistentConditionType(immunity)) {
      throw new RangeError('Condition immunity is not supported')
    }
    if (immunities.has(immunity)) {
      throw new RangeError(`Duplicate condition immunity: ${immunity}`)
    }
    immunities.add(immunity)
  }
  if (state.concentration !== null) {
    assertInteger(
      state.concentration.constitutionModifier,
      'Concentration Constitution modifier',
    )
  }
  for (const condition of state.conditions) {
    assertUniqueId(condition.id, 'Condition instance', ids)
    if (!isPersistentConditionType(condition.type)) {
      throw new RangeError('Condition instance type is not supported')
    }
    if (condition.source !== 'player' && condition.source !== 'enemy') {
      throw new RangeError('Condition source must be player or enemy')
    }
    if (condition.recipient !== owner) {
      throw new RangeError(
        `Condition ${condition.id} recipient must match its state owner`,
      )
    }
    validateConditionDuration(condition.duration)
  }
}

function validateSequence(config: SequenceConfig) {
  const ids = new Set<string>()
  validateCombatantState(config.initialState.player, 'player', ids)
  validateCombatantState(config.initialState.enemy, 'enemy', ids)
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
          const conditionLists =
            event.type === 'player-attack' || event.type === 'enemy-attack'
              ? [{ branch: 'hit', conditions: event.hitConditions }]
              : [
                  { branch: 'failure', conditions: event.failureConditions },
                  { branch: 'success', conditions: event.successConditions },
                ]
          for (const { branch, conditions } of conditionLists) {
            validateConditions(conditions)
            conditions.forEach((condition, index) => {
              if (!isPersistentConditionType(condition.type)) return
              const conditionId =
                condition.id ?? `${event.id}:${branch}:${index}`
              assertUniqueId(conditionId, 'Condition instance', ids)
            })
          }
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
  let states = Distribution.constant(config.initialState, sequenceStateKey)
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
    states = transitions.map((transition) => transition.state, sequenceStateKey)
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
