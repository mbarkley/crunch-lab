import { Distribution } from './distribution'
import {
  CONDITION_CATALOG_TYPES,
  effectiveConditionTypes,
  hasEffectiveCondition,
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
export type SavingThrowRollMode = AttackRollMode | 'automatic-failure'
export type Ability =
  | 'strength'
  | 'dexterity'
  | 'constitution'
  | 'intelligence'
  | 'wisdom'
  | 'charisma'
export type Cover = 'none' | 'half' | 'three-quarters'
export type DamageType =
  | 'acid'
  | 'bludgeoning'
  | 'cold'
  | 'fire'
  | 'force'
  | 'lightning'
  | 'necrotic'
  | 'piercing'
  | 'poison'
  | 'psychic'
  | 'radiant'
  | 'slashing'
  | 'thunder'
export interface ConditionConfig {
  readonly type: ConditionType
  readonly id?: string
  readonly duration?: ConditionInstance['duration']
  readonly exhaustionLevels?: number
}
export type DamageConsequence = 'none' | 'half' | 'full'

export interface DamagePoolConfig {
  readonly id: string
  readonly diceCount: number
  readonly dieSides: number
  readonly modifier: number
  readonly damageType: DamageType
}

export interface DamageRollConfig {
  readonly damagePools: readonly DamagePoolConfig[]
}

export type HeroicInspirationPolicy =
  | { readonly type: 'd20-after-failure' }
  | {
      readonly type: 'damage-pool-threshold'
      readonly damagePoolId: string
      readonly threshold: number
    }

interface BaseEventConfig extends DamageRollConfig {
  readonly id: string
  readonly heroicInspiration?: HeroicInspirationPolicy
}

interface BaseAttackConfig extends BaseEventConfig {
  readonly armorClass: number
  readonly attackModifier: number
  readonly rollMode: AttackRollMode
  readonly cover: Cover
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
  readonly saveAbility: Ability
  readonly rollMode: SavingThrowRollMode
  readonly cover: Cover
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
  readonly heroicInspiration: boolean
  readonly damageImmunities: readonly DamageType[]
  readonly damageResistances: readonly DamageType[]
  readonly damageVulnerabilities: readonly DamageType[]
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
  readonly executionProbability: number
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
  readonly executed: boolean
  readonly success: boolean
  readonly critical: boolean
  readonly exactDamage: number
  readonly appliedConditions: readonly ConditionType[]
}

interface DamagePoolOutcome {
  readonly damageType: DamageType
  readonly damage: number
  readonly inspirationSpent: boolean
}

interface DamageOutcome {
  readonly damage: number
  readonly inspirationSpent: boolean
}

const CALCULATION_PRECISION = 1e12
const ATTACK_ROLL_MODES: readonly AttackRollMode[] = [
  'normal',
  'advantage',
  'disadvantage',
]
const SAVE_ROLL_MODES: readonly SavingThrowRollMode[] = [
  ...ATTACK_ROLL_MODES,
  'automatic-failure',
]
const ABILITIES: readonly Ability[] = [
  'strength',
  'dexterity',
  'constitution',
  'intelligence',
  'wisdom',
  'charisma',
]
const COVER_TYPES: readonly Cover[] = ['none', 'half', 'three-quarters']
const DAMAGE_TYPES: readonly DamageType[] = [
  'acid',
  'bludgeoning',
  'cold',
  'fire',
  'force',
  'lightning',
  'necrotic',
  'piercing',
  'poison',
  'psychic',
  'radiant',
  'slashing',
  'thunder',
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
    heroicInspiration: false,
    damageImmunities: [],
    damageResistances: [],
    damageVulnerabilities: [],
    conditions: [],
    conditionImmunities: [],
    exhaustion: 0,
    concentration: null,
  },
  enemy: {
    vex: false,
    sap: false,
    heroicInspiration: false,
    damageImmunities: [],
    damageResistances: [],
    damageVulnerabilities: [],
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

function validateDamageTypes(types: readonly DamageType[], name: string) {
  for (const type of types) {
    if (!DAMAGE_TYPES.includes(type)) {
      throw new RangeError(`${name} contains an invalid damage type`)
    }
  }
}

function validateCombatantState(
  state: CombatantState,
  owner?: Combatant,
  ids?: Set<string>,
) {
  validateDamageTypes(state.damageImmunities, 'Damage immunities')
  validateDamageTypes(state.damageResistances, 'Damage resistances')
  validateDamageTypes(state.damageVulnerabilities, 'Damage vulnerabilities')
  if (typeof state.vex !== 'boolean' || typeof state.sap !== 'boolean') {
    throw new RangeError('Vex and Sap state must be boolean')
  }
  if (typeof state.heroicInspiration !== 'boolean') {
    throw new RangeError('Heroic Inspiration state must be boolean')
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
  const conditionIds = new Set<string>()
  for (const condition of state.conditions) {
    if (ids) {
      assertUniqueId(condition.id, 'Condition instance', ids)
    } else {
      if (condition.id.length === 0) {
        throw new RangeError('Condition instance ID must not be empty')
      }
      if (conditionIds.has(condition.id)) {
        throw new RangeError(`Duplicate condition instance ID: ${condition.id}`)
      }
      conditionIds.add(condition.id)
    }
    if (!isPersistentConditionType(condition.type)) {
      throw new RangeError('Condition instance type is not supported')
    }
    if (condition.source !== 'player' && condition.source !== 'enemy') {
      throw new RangeError('Condition source must be player or enemy')
    }
    if (owner !== undefined && condition.recipient !== owner) {
      throw new RangeError(
        `Condition ${condition.id} recipient must match its state owner`,
      )
    }
    validateConditionDuration(condition.duration)
  }
}

function validateDamageRoll(config: DamageRollConfig) {
  if (config.damagePools.length === 0) {
    throw new RangeError('Damage must include at least one dice pool')
  }
  const ids = new Set<string>()
  for (const pool of config.damagePools) {
    if (pool.id.length === 0) {
      throw new RangeError('Damage pool ID must not be empty')
    }
    if (ids.has(pool.id)) {
      throw new RangeError(`Duplicate damage pool ID: ${pool.id}`)
    }
    ids.add(pool.id)
    assertInteger(pool.diceCount, 'Damage dice count', 1)
    assertInteger(pool.dieSides, 'Damage die sides', 2)
    assertInteger(pool.modifier, 'Damage modifier')
    if (!DAMAGE_TYPES.includes(pool.damageType)) {
      throw new RangeError('Damage pool must have a valid damage type')
    }
  }
}

function validateInspirationPolicy(config: EventConfig) {
  const policy = config.heroicInspiration
  if (!policy || policy.type === 'd20-after-failure') return
  if (policy.type !== 'damage-pool-threshold') {
    throw new RangeError('Invalid Heroic Inspiration policy')
  }
  assertInteger(policy.threshold, 'Damage reroll threshold')
  if (!config.damagePools.some((pool) => pool.id === policy.damagePoolId)) {
    throw new RangeError(
      'Heroic Inspiration damage pool must belong to the event',
    )
  }
}

function rollDice(
  count: number,
  sides: number,
): Distribution<readonly number[]> {
  let rolls = Distribution.constant<readonly number[]>([], (values) =>
    values.join(','),
  )
  for (let index = 0; index < count; index += 1) {
    rolls = rolls.combine(
      Distribution.die(sides),
      (values, value) => [...values, value],
      (values) => values.join(','),
    )
  }
  return rolls
}

function poolDistribution(
  pool: DamagePoolConfig,
  diceMultiplier: number,
  inspirationAvailable: boolean,
  policy: HeroicInspirationPolicy | undefined,
): Distribution<DamagePoolOutcome> {
  const canReroll =
    inspirationAvailable &&
    policy?.type === 'damage-pool-threshold' &&
    policy.damagePoolId === pool.id
  return rollDice(pool.diceCount * diceMultiplier, pool.dieSides).flatMap(
    (values) => {
      const lowest = Math.min(...values)
      if (!canReroll || lowest > policy.threshold) {
        return Distribution.constant<DamagePoolOutcome>(
          {
            damageType: pool.damageType,
            damage: Math.max(
              0,
              values.reduce((sum, value) => sum + value, 0) + pool.modifier,
            ),
            inspirationSpent: false,
          },
          (outcome) => `${outcome.damageType}:${outcome.damage}:false`,
        )
      }
      const rerollIndex = values.indexOf(lowest)
      return Distribution.die(pool.dieSides).map<DamagePoolOutcome>(
        (reroll) => {
          const replaced = [...values]
          replaced[rerollIndex] = reroll
          return {
            damageType: pool.damageType,
            damage: Math.max(
              0,
              replaced.reduce((sum, value) => sum + value, 0) + pool.modifier,
            ),
            inspirationSpent: true,
          }
        },
        (outcome) => `${outcome.damageType}:${outcome.damage}:true`,
      )
    },
    (outcome) =>
      `${outcome.damageType}:${outcome.damage}:${outcome.inspirationSpent}`,
  )
}

function coverBonus(cover: Cover) {
  switch (cover) {
    case 'none':
      return 0
    case 'half':
      return 2
    case 'three-quarters':
      return 5
  }
}

function applyDamageConsequence(value: number, consequence: DamageConsequence) {
  switch (consequence) {
    case 'none':
      return 0
    case 'half':
      return Math.floor(value / 2)
    case 'full':
      return value
  }
}

function applyDamageDefenses(
  value: number,
  type: DamageType,
  state: CombatantState,
) {
  if (state.damageImmunities.includes(type)) return 0
  if (
    type === 'poison' &&
    hasEffectiveCondition(state.conditions, 'petrified')
  ) {
    return 0
  }
  const resistant =
    state.damageResistances.includes(type) ||
    hasEffectiveCondition(state.conditions, 'petrified')
  const vulnerable = state.damageVulnerabilities.includes(type)
  if (resistant && vulnerable) return value
  let adjusted = resistant ? Math.floor(value / 2) : value
  if (vulnerable) adjusted *= 2
  return adjusted
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

function damageDistribution(
  config: EventConfig,
  targetState: CombatantState,
  consequence: DamageConsequence,
  diceMultiplier: number,
  inspirationAvailable: boolean,
): Distribution<DamageOutcome> {
  validateDamageRoll(config)
  validateInspirationPolicy(config)
  if (consequence === 'none') {
    return Distribution.constant(
      { damage: 0, inspirationSpent: false },
      (outcome) => `${outcome.damage}:false`,
    )
  }
  let distribution = Distribution.constant<readonly DamagePoolOutcome[]>(
    [],
    (values) => JSON.stringify(values),
  )
  for (const pool of config.damagePools) {
    distribution = distribution.combine(
      poolDistribution(
        pool,
        diceMultiplier,
        inspirationAvailable,
        config.heroicInspiration,
      ),
      (values, value) => [...values, value],
      (values) => JSON.stringify(values),
    )
  }
  return distribution.map(
    (pools) => {
      const byType = new Map<DamageType, number>()
      for (const pool of pools) {
        byType.set(
          pool.damageType,
          (byType.get(pool.damageType) ?? 0) + pool.damage,
        )
      }
      let damage = 0
      for (const [type, typedDamage] of byType) {
        damage += applyDamageDefenses(
          applyDamageConsequence(typedDamage, consequence),
          type,
          targetState,
        )
      }
      return {
        damage,
        inspirationSpent: pools.some((pool) => pool.inspirationSpent),
      }
    },
    (outcome) => `${outcome.damage}:${outcome.inspirationSpent}`,
  )
}

function d20Rolls(mode: AttackRollMode): Distribution<readonly number[]> {
  return rollDice(mode === 'normal' ? 1 : 2, 20)
}

function selectedD20(values: readonly number[], mode: AttackRollMode) {
  return mode === 'disadvantage' ? Math.min(...values) : Math.max(...values)
}

function rerolledD20(values: readonly number[], mode: AttackRollMode) {
  const selected = selectedD20(values, mode)
  const selectedIndex = values.indexOf(selected)
  return Distribution.die(20).map(
    (reroll) => {
      const replaced = [...values]
      replaced[selectedIndex] = reroll
      return selectedD20(replaced, mode)
    },
    (roll) => roll,
  )
}

export type ConditionRollContext =
  'outgoing-attack' | 'incoming-attack' | 'saving-throw'

export interface ConditionRollEffects {
  readonly advantage: readonly PersistentConditionType[]
  readonly disadvantage: readonly PersistentConditionType[]
  readonly automaticFailure: boolean
}

export function conditionRollEffects(
  instances: readonly ConditionInstance[],
  context: ConditionRollContext,
  ability?: Ability,
): ConditionRollEffects {
  const effective = effectiveConditionTypes(instances)
  const advantage: PersistentConditionType[] = []
  const disadvantage: PersistentConditionType[] = []
  const addDisadvantage = (condition: PersistentConditionType) => {
    if (effective.has(condition)) disadvantage.push(condition)
  }
  const addAdvantage = (condition: PersistentConditionType) => {
    if (effective.has(condition)) advantage.push(condition)
  }

  if (context === 'outgoing-attack') {
    addDisadvantage('blinded')
    addDisadvantage('poisoned')
    addDisadvantage('prone')
    addDisadvantage('restrained')
    addDisadvantage('frightened')
  } else if (context === 'incoming-attack') {
    addAdvantage('blinded')
    addAdvantage('restrained')
    addAdvantage('stunned')
    addAdvantage('paralyzed')
    addAdvantage('petrified')
    addAdvantage('unconscious')
    addAdvantage('prone')
  } else if (context === 'saving-throw') {
    if (ability === 'dexterity') addDisadvantage('restrained')
  }

  const automaticFailure =
    context === 'saving-throw' &&
    (ability === 'strength' || ability === 'dexterity') &&
    (effective.has('stunned') ||
      effective.has('paralyzed') ||
      effective.has('petrified') ||
      effective.has('unconscious'))
  return { advantage, disadvantage, automaticFailure }
}

function effectiveRollMode(
  manualMode: AttackRollMode,
  advantageSources: readonly unknown[] = [],
  disadvantageSources: readonly unknown[] = [],
): AttackRollMode {
  const hasAdvantage = manualMode === 'advantage' || advantageSources.length > 0
  const hasDisadvantage =
    manualMode === 'disadvantage' || disadvantageSources.length > 0
  if (hasAdvantage === hasDisadvantage) return 'normal'
  return hasAdvantage ? 'advantage' : 'disadvantage'
}

export function initiativeRollMode(
  manualMode: AttackRollMode = 'normal',
  instances: readonly ConditionInstance[] = [],
): AttackRollMode {
  const effective = effectiveConditionTypes(instances)
  return effectiveRollMode(
    manualMode,
    effective.has('invisible') ? ['invisible'] : [],
    effective.has('incapacitated') ? ['incapacitated'] : [],
  )
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

function spendInspiration(
  state: SequenceState,
  combatant: Combatant,
  spent: boolean,
): SequenceState {
  if (!spent) return state
  return {
    ...state,
    [combatant]: {
      ...state[combatant],
      heroicInspiration: false,
    },
  }
}

export function canExecuteActivity(
  state: SequenceState,
  owner: Combatant,
): boolean {
  return (
    state[owner].exhaustion < 6 &&
    !hasEffectiveCondition(state[owner].conditions, 'incapacitated')
  )
}

export function activityExecutionProbability(
  state: SequenceState,
  owner: Combatant,
): number {
  return canExecuteActivity(state, owner) ? 1 : 0
}

function stateKey(state: SequenceState) {
  return (['player', 'enemy'] as const)
    .map((combatant) => {
      const value = state[combatant]
      return [
        value.vex,
        value.sap,
        value.heroicInspiration,
        [...value.damageImmunities].sort().join(','),
        [...value.damageResistances].sort().join(','),
        [...value.damageVulnerabilities].sort().join(','),
        value.exhaustion,
        [...value.conditionImmunities].sort().join(','),
        value.concentration?.constitutionModifier ?? '',
        value.conditions
          .map(
            (condition) =>
              `${condition.id},${condition.type},${condition.source},${condition.recipient},${condition.duration?.remainingTurns ?? ''},${condition.duration?.boundary ?? ''},${condition.duration?.turnOwner ?? ''}`,
          )
          .sort()
          .join(';'),
      ].join(':')
    })
    .join('|')
}

export function sequenceStateKey(state: SequenceState) {
  return stateKey(state)
}

function transitionKey(transition: EventTransition) {
  return [
    stateKey(transition.state),
    transition.executed,
    transition.success,
    transition.critical,
    transition.exactDamage,
    ...transition.appliedConditions,
  ].join(':')
}

function attackSuccess(
  roll: number,
  config: AttackConfig,
  exhaustionPenalty = 0,
) {
  return (
    roll === 20 ||
    (roll !== 1 &&
      roll + config.attackModifier - exhaustionPenalty >=
        config.armorClass + coverBonus(config.cover))
  )
}

function attackTransitions(
  config: AttackConfig,
  state: SequenceState,
): Distribution<EventTransition> {
  assertInteger(config.armorClass, 'Armor class', 1)
  assertInteger(config.attackModifier, 'Attack modifier')
  if (!ATTACK_ROLL_MODES.includes(config.rollMode)) {
    throw new RangeError('Attack roll mode is invalid')
  }
  if (!COVER_TYPES.includes(config.cover)) {
    throw new RangeError('Cover must be none, half, or three-quarters')
  }
  validateConditions(config.hitConditions)
  validateInspirationPolicy(config)
  const attacker: Combatant =
    config.type === 'player-attack' ? 'player' : 'enemy'
  const target: Combatant = attacker === 'player' ? 'enemy' : 'player'
  const attackerEffects = conditionRollEffects(
    state[attacker].conditions,
    'outgoing-attack',
  )
  const targetEffects = conditionRollEffects(
    state[target].conditions,
    'incoming-attack',
  )
  const mode = effectiveRollMode(
    config.rollMode,
    state[target].vex
      ? ['vex', ...attackerEffects.advantage, ...targetEffects.advantage]
      : [...attackerEffects.advantage, ...targetEffects.advantage],
    state[attacker].sap
      ? ['sap', ...attackerEffects.disadvantage, ...targetEffects.disadvantage]
      : [...attackerEffects.disadvantage, ...targetEffects.disadvantage],
  )
  const canRerollD20 =
    state[attacker].heroicInspiration &&
    config.heroicInspiration?.type === 'd20-after-failure'
  const consumedState: SequenceState = {
    ...state,
    [attacker]: { ...state[attacker], sap: false },
    [target]: { ...state[target], vex: false },
  }

  return d20Rolls(mode).flatMap((values) => {
    const original = selectedD20(values, mode)
    const exhaustionPenalty = state[attacker].exhaustion * 2
    const initialSuccess = attackSuccess(original, config, exhaustionPenalty)
    const resolvedRolls =
      !initialSuccess && canRerollD20
        ? rerolledD20(values, mode)
        : Distribution.constant(original, (roll) => roll)
    return resolvedRolls.flatMap((roll) => {
      const success = attackSuccess(roll, config, exhaustionPenalty)
      const critical =
        success &&
        (roll === 20 ||
          hasEffectiveCondition(state[target].conditions, 'paralyzed') ||
          hasEffectiveCondition(state[target].conditions, 'unconscious'))
      const d20Spent = !initialSuccess && canRerollD20
      const stateAfterD20 = spendInspiration(consumedState, attacker, d20Spent)
      if (!success) {
        return Distribution.constant(
          {
            state: stateAfterD20,
            executed: true,
            success: false,
            critical: false,
            exactDamage: 0,
            appliedConditions: [],
          },
          transitionKey,
        )
      }
      const application = applyConditionConfigs(
        stateAfterD20,
        target,
        attacker,
        `${config.id}:hit`,
        config.hitConditions,
      )
      return damageDistribution(
        config,
        state[target],
        'full',
        critical ? 2 : 1,
        stateAfterD20[attacker].heroicInspiration,
      ).map(
        (damage) => ({
          state: spendInspiration(
            application.state,
            attacker,
            damage.inspirationSpent,
          ),
          executed: true,
          success: true,
          critical,
          exactDamage: damage.damage,
          appliedConditions: application.appliedConditions,
        }),
        transitionKey,
      )
    }, transitionKey)
  }, transitionKey)
}

function savingThrowTransitions(
  config: SavingThrowConfig,
  state: SequenceState,
): Distribution<EventTransition> {
  assertInteger(config.saveDc, 'Save DC', 1)
  assertInteger(config.saveModifier, 'Save modifier')
  if (!ABILITIES.includes(config.saveAbility)) {
    throw new RangeError('Saving throw ability is invalid')
  }
  if (!SAVE_ROLL_MODES.includes(config.rollMode)) {
    throw new RangeError('Saving throw roll mode is invalid')
  }
  if (!COVER_TYPES.includes(config.cover)) {
    throw new RangeError('Cover must be none, half, or three-quarters')
  }
  if (!DAMAGE_CONSEQUENCES.includes(config.failureDamage)) {
    throw new RangeError('Failure damage must be none, half, or full')
  }
  if (!DAMAGE_CONSEQUENCES.includes(config.successDamage)) {
    throw new RangeError('Success damage must be none, half, or full')
  }
  validateConditions(config.failureConditions)
  validateConditions(config.successConditions)
  validateInspirationPolicy(config)
  const target: Combatant =
    config.type === 'player-saving-throw' ? 'player' : 'enemy'
  const source: Combatant = target === 'player' ? 'enemy' : 'player'
  const automaticFailure = config.rollMode === 'automatic-failure'
  const saveEffects = conditionRollEffects(
    state[target].conditions,
    'saving-throw',
    config.saveAbility,
  )
  const mode: AttackRollMode = automaticFailure
    ? 'normal'
    : effectiveRollMode(
        config.rollMode,
        saveEffects.advantage,
        saveEffects.disadvantage,
      )
  const canRerollD20 =
    !automaticFailure &&
    state[target].heroicInspiration &&
    config.heroicInspiration?.type === 'd20-after-failure'
  const bonus =
    config.saveAbility === 'dexterity' ? coverBonus(config.cover) : 0
  const exhaustionPenalty = state[target].exhaustion * 2
  const succeeds = (roll: number) =>
    roll + config.saveModifier + bonus - exhaustionPenalty >= config.saveDc
  const rolls = automaticFailure
    ? Distribution.constant<readonly number[]>([0], (values) =>
        values.join(','),
      )
    : d20Rolls(mode)

  return rolls.flatMap((values) => {
    const original = automaticFailure ? 0 : selectedD20(values, mode)
    const initialSuccess = !automaticFailure && succeeds(original)
    const resolvedRolls =
      !initialSuccess && canRerollD20
        ? rerolledD20(values, mode)
        : Distribution.constant(original, (roll) => roll)
    return resolvedRolls.flatMap((roll) => {
      const success =
        !automaticFailure && !saveEffects.automaticFailure && succeeds(roll)
      const d20Spent = !initialSuccess && canRerollD20
      const stateAfterD20 = spendInspiration(state, target, d20Spent)
      const consequence = success ? config.successDamage : config.failureDamage
      const branch = success ? 'success' : 'failure'
      const application = applyConditionConfigs(
        stateAfterD20,
        target,
        source,
        `${config.id}:${branch}`,
        success ? config.successConditions : config.failureConditions,
      )
      return damageDistribution(
        config,
        state[target],
        consequence,
        1,
        stateAfterD20[source].heroicInspiration,
      ).map(
        (damage) => ({
          state: spendInspiration(
            application.state,
            source,
            damage.inspirationSpent,
          ),
          executed: true,
          success,
          critical: false,
          exactDamage: damage.damage,
          appliedConditions: application.appliedConditions,
        }),
        transitionKey,
      )
    }, transitionKey)
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
    executionProbability: normalizeCalculation(
      transitions.probabilityOf((transition) => transition.executed),
    ),
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
      transitions.expectedValue((transition) => transition.exactDamage),
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

export function calculateSequence(config: SequenceConfig): SequenceResult {
  validateSequence(config)
  let states = Distribution.constant(config.initialState, stateKey)
  const eventResults: Record<string, EventResult> = {}
  const totals = new Map<Outcome['type'], number>()
  const conditionTotals = new Map<string, ExpectedConditionApplications>()

  for (const round of config.rounds) {
    for (const turn of round.turns) {
      for (const activity of turn.activities) {
        for (const event of activity.events) {
          const transitions = states.flatMap(
            (state) =>
              canExecuteActivity(state, activity.owner)
                ? eventTransitions(event, state)
                : Distribution.constant(
                    {
                      state,
                      executed: false,
                      success: false,
                      critical: false,
                      exactDamage: 0,
                      appliedConditions: [],
                    },
                    transitionKey,
                  ),
            transitionKey,
          )
          const result = resultFromTransitions(event, transitions)
          eventResults[event.id] = result
          totals.set(
            result.outcome.type,
            (totals.get(result.outcome.type) ?? 0) +
              result.outcome.expectedDamage,
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
      }
    }
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
