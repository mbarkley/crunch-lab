import { Distribution } from './distribution'
import {
  CONDITION_CATALOG_TYPES,
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

interface BaseEventConfig {
  readonly id: string
  readonly heroicInspiration?: HeroicInspirationPolicy
}

interface DamageEventConfig extends BaseEventConfig, DamageRollConfig {}

interface BaseAttackConfig extends DamageEventConfig {
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

interface BaseSavingThrowConfig extends DamageEventConfig {
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

export interface ConditionRemovalConfig {
  readonly type: ConditionType
  readonly id?: string
}

interface BaseAbilityCheckConfig extends BaseEventConfig {
  readonly ability: Ability
  readonly dc: number
  readonly modifier: number
  readonly rollMode: AttackRollMode
  readonly sightDependent?: boolean
  readonly successConditions?: readonly ConditionConfig[]
  readonly failureConditions?: readonly ConditionConfig[]
  readonly successRemovals?: readonly ConditionRemovalConfig[]
  readonly failureRemovals?: readonly ConditionRemovalConfig[]
}

export interface PlayerAbilityCheckConfig extends BaseAbilityCheckConfig {
  readonly type: 'player-ability-check'
}

export interface EnemyAbilityCheckConfig extends BaseAbilityCheckConfig {
  readonly type: 'enemy-ability-check'
}

export type AbilityCheckConfig =
  PlayerAbilityCheckConfig | EnemyAbilityCheckConfig

interface BaseInitiativeConfig extends BaseEventConfig {
  readonly ability: Ability
  readonly modifier: number
  readonly rollMode: AttackRollMode
}

export interface PlayerInitiativeConfig extends BaseInitiativeConfig {
  readonly type: 'player-initiative'
}

export interface EnemyInitiativeConfig extends BaseInitiativeConfig {
  readonly type: 'enemy-initiative'
}

export type InitiativeConfig = PlayerInitiativeConfig | EnemyInitiativeConfig

interface BaseStandaloneDamageConfig extends DamageEventConfig {
  readonly target?: Combatant
}

export interface StandaloneDamageConfig extends BaseStandaloneDamageConfig {
  readonly type: 'player-damage' | 'enemy-damage'
}

export interface ApplyConditionEventConfig extends BaseEventConfig {
  readonly type: 'apply-condition'
  readonly source: Combatant
  readonly target: Combatant
  readonly conditions: readonly ConditionConfig[]
}

export interface ApplyEffectEventConfig extends BaseEventConfig {
  readonly type: 'apply-effect'
  readonly source: Combatant
  readonly target: Combatant
  readonly effects: readonly ConditionConfig[]
}

export interface RemoveConditionEventConfig extends BaseEventConfig {
  readonly type: 'remove-condition'
  readonly target: Combatant
  readonly conditions: readonly ConditionRemovalConfig[]
}

export interface RemoveEffectEventConfig extends BaseEventConfig {
  readonly type: 'remove-effect'
  readonly target: Combatant
  readonly effects: readonly ConditionRemovalConfig[]
}

export interface HelpEventConfig extends BaseEventConfig {
  readonly type: 'help'
  readonly owner: Combatant
  readonly target: Combatant
}

export interface DodgeEventConfig extends BaseEventConfig {
  readonly type: 'dodge'
  readonly owner: Combatant
}

export interface GrappledEscapeConfig extends BaseAbilityCheckConfig {
  readonly type: 'grappled-escape'
  readonly owner: Combatant
  readonly grappledConditionId?: string
}

export interface StartConcentrationConfig extends BaseEventConfig {
  readonly type: 'start-concentration'
  readonly owner: Combatant
  readonly constitutionModifier: number
}

export interface StopConcentrationConfig extends BaseEventConfig {
  readonly type: 'stop-concentration'
  readonly owner: Combatant
}

export type EventConfig =
  | AttackConfig
  | SavingThrowConfig
  | AbilityCheckConfig
  | InitiativeConfig
  | StandaloneDamageConfig
  | ApplyConditionEventConfig
  | ApplyEffectEventConfig
  | RemoveConditionEventConfig
  | RemoveEffectEventConfig
  | HelpEventConfig
  | DodgeEventConfig
  | GrappledEscapeConfig
  | StartConcentrationConfig
  | StopConcentrationConfig

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
  readonly helped: boolean
  readonly dodging: boolean
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

export interface ExpectedInitiative {
  readonly type: 'expected-initiative'
  readonly expectedTotal: number
  readonly expectedDamage?: number
}

export interface NoDamageOutcome {
  readonly type: 'no-damage'
  readonly expectedDamage?: number
}

export type DamageOutcome =
  ExpectedDamageAgainstEnemies | ExpectedDamageAgainstPlayers
export type Outcome = DamageOutcome | ExpectedInitiative | NoDamageOutcome

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
  readonly exactDamage: number
  readonly rollTotal?: number
  readonly appliedConditions: readonly ConditionType[]
}

interface DamagePoolOutcome {
  readonly damageType: DamageType
  readonly damage: number
  readonly inspirationSpent: boolean
}

interface DamageRollOutcome {
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
    helped: false,
    dodging: false,
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
    helped: false,
    dodging: false,
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

function assertCombatant(value: Combatant, name: string) {
  if (value !== 'player' && value !== 'enemy') {
    throw new RangeError(`${name} must be player or enemy`)
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

function validateInspirationPolicy(
  config: BaseEventConfig & {
    readonly damagePools?: readonly DamagePoolConfig[]
  },
) {
  const policy = config.heroicInspiration
  if (!policy || policy.type === 'd20-after-failure') return
  if (policy.type !== 'damage-pool-threshold') {
    throw new RangeError('Invalid Heroic Inspiration policy')
  }
  assertInteger(policy.threshold, 'Damage reroll threshold')
  if (
    !(config.damagePools ?? []).some((pool) => pool.id === policy.damagePoolId)
  ) {
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
  const resistant = state.damageResistances.includes(type)
  const vulnerable = state.damageVulnerabilities.includes(type)
  if (resistant && vulnerable) return value
  let adjusted = resistant ? Math.floor(value / 2) : value
  if (vulnerable) adjusted *= 2
  return adjusted
}

function damageOutcome(
  target: 'enemies' | 'players',
  value: number,
): DamageOutcome {
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

function noDamageOutcome(): NoDamageOutcome {
  return { type: 'no-damage' }
}

function damageDistribution(
  config: DamageEventConfig,
  targetState: CombatantState,
  consequence: DamageConsequence,
  diceMultiplier: number,
  inspirationAvailable: boolean,
): Distribution<DamageRollOutcome> {
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

function effectiveRollMode(
  manualMode: AttackRollMode,
  hasVex: boolean,
  hasSap: boolean,
  hasHelp = false,
  hasDodge = false,
): AttackRollMode {
  const hasAdvantage = manualMode === 'advantage' || hasVex || hasHelp
  const hasDisadvantage = manualMode === 'disadvantage' || hasSap || hasDodge
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

function validateConditionRemovals(
  removals: readonly ConditionRemovalConfig[],
) {
  const ids = new Set<string>()
  for (const removal of removals) {
    if (!CONDITION_TYPES.includes(removal.type)) {
      throw new RangeError('Condition removal is not supported')
    }
    if (removal.id !== undefined) {
      if (removal.id.length === 0) {
        throw new RangeError('Condition removal ID must not be empty')
      }
      if (ids.has(removal.id)) {
        throw new RangeError(`Duplicate condition removal ID: ${removal.id}`)
      }
      ids.add(removal.id)
    }
  }
}

export function removeConditionConfigs(
  state: SequenceState,
  target: Combatant,
  removals: readonly ConditionRemovalConfig[],
): {
  readonly state: SequenceState
  readonly removedConditions: readonly ConditionType[]
} {
  validateConditionRemovals(removals)
  let next = state
  const removed = new Set<ConditionType>()
  for (const removal of removals) {
    const targetState = next[target]
    if (removal.type === 'vex' || removal.type === 'sap') {
      if (targetState[removal.type]) removed.add(removal.type)
      next = {
        ...next,
        [target]: { ...targetState, [removal.type]: false },
      }
      continue
    }
    if (removal.type === 'exhaustion') {
      if (targetState.exhaustion > 0) removed.add(removal.type)
      next = { ...next, [target]: { ...targetState, exhaustion: 0 } }
      continue
    }
    const matches = targetState.conditions.filter(
      (condition) =>
        condition.type === removal.type &&
        (removal.id === undefined || condition.id === removal.id),
    )
    if (matches.length === 0) continue
    const matchIds = new Set(matches.map((condition) => condition.id))
    next = {
      ...next,
      [target]: {
        ...targetState,
        conditions: targetState.conditions.filter(
          (condition) => !matchIds.has(condition.id),
        ),
      },
    }
    removed.add(removal.type)
  }
  return { state: next, removedConditions: [...removed] }
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
        value.helped,
        value.dodging,
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
    transition.success,
    transition.critical,
    transition.exactDamage,
    transition.rollTotal ?? '',
    ...transition.appliedConditions,
  ].join(':')
}

function attackSuccess(roll: number, config: AttackConfig) {
  return (
    roll === 20 ||
    (roll !== 1 &&
      roll + config.attackModifier >=
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
  const mode = effectiveRollMode(
    config.rollMode,
    state[target].vex,
    state[attacker].sap,
    state[attacker].helped,
    state[target].dodging &&
      !hasEffectiveCondition(state[target].conditions, 'incapacitated'),
  )
  const canRerollD20 =
    state[attacker].heroicInspiration &&
    config.heroicInspiration?.type === 'd20-after-failure'
  const consumedState: SequenceState = {
    ...state,
    [attacker]: { ...state[attacker], sap: false, helped: false },
    [target]: { ...state[target], vex: false },
  }

  return d20Rolls(mode).flatMap((values) => {
    const original = selectedD20(values, mode)
    const initialSuccess = attackSuccess(original, config)
    const resolvedRolls =
      !initialSuccess && canRerollD20
        ? rerolledD20(values, mode)
        : Distribution.constant(original, (roll) => roll)
    return resolvedRolls.flatMap((roll) => {
      const success = attackSuccess(roll, config)
      const critical = success && roll === 20
      const d20Spent = !initialSuccess && canRerollD20
      const stateAfterD20 = spendInspiration(consumedState, attacker, d20Spent)
      if (!success) {
        return Distribution.constant(
          {
            state: stateAfterD20,
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
  const mode: AttackRollMode = automaticFailure ? 'normal' : config.rollMode
  const canRerollD20 =
    !automaticFailure &&
    state[target].heroicInspiration &&
    config.heroicInspiration?.type === 'd20-after-failure'
  const bonus =
    config.saveAbility === 'dexterity' ? coverBonus(config.cover) : 0
  const saveMode = effectiveRollMode(
    mode,
    config.saveAbility === 'dexterity' &&
      state[target].dodging &&
      !hasEffectiveCondition(state[target].conditions, 'incapacitated'),
    false,
  )
  const succeeds = (roll: number) =>
    roll + config.saveModifier + bonus >= config.saveDc
  const rolls = automaticFailure
    ? Distribution.constant<readonly number[]>([0], (values) =>
        values.join(','),
      )
    : d20Rolls(saveMode)

  return rolls.flatMap((values) => {
    const original = automaticFailure ? 0 : selectedD20(values, saveMode)
    const initialSuccess = !automaticFailure && succeeds(original)
    const resolvedRolls =
      !initialSuccess && canRerollD20
        ? rerolledD20(values, saveMode)
        : Distribution.constant(original, (roll) => roll)
    return resolvedRolls.flatMap((roll) => {
      const success = !automaticFailure && succeeds(roll)
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

function abilityCheckTransitions(
  config: AbilityCheckConfig | GrappledEscapeConfig,
  state: SequenceState,
): Distribution<EventTransition> {
  assertInteger(config.dc, 'Ability check DC', 1)
  assertInteger(config.modifier, 'Ability check modifier')
  if (!ABILITIES.includes(config.ability)) {
    throw new RangeError('Ability check ability is invalid')
  }
  if (!ATTACK_ROLL_MODES.includes(config.rollMode)) {
    throw new RangeError('Ability check roll mode is invalid')
  }
  validateConditions(config.successConditions ?? [])
  validateConditions(config.failureConditions ?? [])
  validateConditionRemovals(config.successRemovals ?? [])
  validateConditionRemovals(config.failureRemovals ?? [])
  validateInspirationPolicy(config)
  const actor: Combatant =
    config.type === 'grappled-escape'
      ? config.owner
      : config.type === 'player-ability-check'
        ? 'player'
        : 'enemy'
  assertCombatant(actor, 'Ability check owner')
  const target: Combatant = actor
  const hasDisadvantage =
    hasEffectiveCondition(state[actor].conditions, 'poisoned') ||
    hasEffectiveCondition(state[actor].conditions, 'frightened')
  const mode = effectiveRollMode(
    config.rollMode,
    false,
    hasDisadvantage,
    false,
    false,
  )
  const sightFailure =
    config.sightDependent === true &&
    hasEffectiveCondition(state[actor].conditions, 'blinded')
  const succeeds = (roll: number) =>
    !sightFailure &&
    roll + config.modifier - state[actor].exhaustion * 2 >= config.dc
  const canRerollD20 =
    state[actor].heroicInspiration &&
    config.heroicInspiration?.type === 'd20-after-failure'
  return d20Rolls(mode).flatMap((values) => {
    const original = selectedD20(values, mode)
    const initialSuccess = succeeds(original)
    const resolvedRolls =
      !initialSuccess && canRerollD20
        ? rerolledD20(values, mode)
        : Distribution.constant(original, (roll) => roll)
    return resolvedRolls.flatMap((roll) => {
      const success = succeeds(roll)
      const stateAfterD20 = spendInspiration(
        state,
        actor,
        !initialSuccess && canRerollD20,
      )
      const branch = success ? 'success' : 'failure'
      const applied = applyConditionConfigs(
        stateAfterD20,
        target,
        actor === target ? (actor === 'player' ? 'enemy' : 'player') : actor,
        `${config.id}:${branch}`,
        success
          ? (config.successConditions ?? [])
          : (config.failureConditions ?? []),
      )
      const removals = success
        ? (config.successRemovals ?? [])
        : (config.failureRemovals ?? [])
      const removed = removeConditionConfigs(applied.state, target, removals)
      const escaped =
        config.type === 'grappled-escape' && success
          ? removeConditionConfigs(removed.state, target, [
              { type: 'grappled', id: config.grappledConditionId },
            ])
          : removed
      return Distribution.constant(
        {
          state: escaped.state,
          success,
          critical: false,
          exactDamage: 0,
          appliedConditions: applied.appliedConditions,
        },
        transitionKey,
      )
    }, transitionKey)
  }, transitionKey)
}

function initiativeTransitions(
  config: InitiativeConfig,
  state: SequenceState,
): Distribution<EventTransition> {
  assertInteger(config.modifier, 'Initiative modifier')
  if (!ABILITIES.includes(config.ability)) {
    throw new RangeError('Initiative ability is invalid')
  }
  if (!ATTACK_ROLL_MODES.includes(config.rollMode)) {
    throw new RangeError('Initiative roll mode is invalid')
  }
  const actor: Combatant =
    config.type === 'player-initiative' ? 'player' : 'enemy'
  const mode = effectiveRollMode(
    config.rollMode,
    hasEffectiveCondition(state[actor].conditions, 'invisible'),
    false,
  )
  return d20Rolls(mode).map(
    (values) => ({
      state,
      success: true,
      critical: false,
      exactDamage: 0,
      rollTotal:
        selectedD20(values, mode) +
        config.modifier -
        state[actor].exhaustion * 2,
      appliedConditions: [],
    }),
    transitionKey,
  )
}

function standaloneDamageTransitions(
  config: StandaloneDamageConfig,
  state: SequenceState,
): Distribution<EventTransition> {
  validateDamageRoll(config)
  validateInspirationPolicy(config)
  const target: Combatant = config.type === 'player-damage' ? 'player' : 'enemy'
  assertCombatant(target, 'Standalone damage target')
  if (config.target !== undefined && config.target !== target) {
    throw new RangeError('Standalone damage target does not match its type')
  }
  const source: Combatant = target === 'player' ? 'enemy' : 'player'
  return damageDistribution(
    config,
    state[target],
    'full',
    1,
    state[source].heroicInspiration,
  ).map(
    (damage) => ({
      state: spendInspiration(state, source, damage.inspirationSpent),
      success: true,
      critical: false,
      exactDamage: damage.damage,
      appliedConditions: [],
    }),
    transitionKey,
  )
}

function stateEventTransitions(
  config:
    | ApplyConditionEventConfig
    | ApplyEffectEventConfig
    | RemoveConditionEventConfig
    | RemoveEffectEventConfig
    | HelpEventConfig
    | DodgeEventConfig
    | StartConcentrationConfig
    | StopConcentrationConfig,
  state: SequenceState,
): Distribution<EventTransition> {
  let next = state
  let appliedConditions: readonly ConditionType[] = []
  switch (config.type) {
    case 'apply-condition': {
      assertCombatant(config.source, 'Condition source')
      assertCombatant(config.target, 'Condition target')
      const result = applyConditionConfigs(
        state,
        config.target,
        config.source,
        config.id,
        config.conditions,
      )
      next = result.state
      appliedConditions = result.appliedConditions
      break
    }
    case 'apply-effect': {
      assertCombatant(config.source, 'Effect source')
      assertCombatant(config.target, 'Effect target')
      const result = applyConditionConfigs(
        state,
        config.target,
        config.source,
        config.id,
        config.effects,
      )
      next = result.state
      appliedConditions = result.appliedConditions
      break
    }
    case 'remove-condition':
      assertCombatant(config.target, 'Condition target')
      next = removeConditionConfigs(
        state,
        config.target,
        config.conditions,
      ).state
      break
    case 'remove-effect':
      assertCombatant(config.target, 'Effect target')
      next = removeConditionConfigs(state, config.target, config.effects).state
      break
    case 'help':
      assertCombatant(config.owner, 'Help owner')
      assertCombatant(config.target, 'Help target')
      next = {
        ...state,
        [config.target]: { ...state[config.target], helped: true },
      }
      break
    case 'dodge':
      assertCombatant(config.owner, 'Dodge owner')
      next = {
        ...state,
        [config.owner]: { ...state[config.owner], dodging: true },
      }
      break
    case 'start-concentration':
      assertCombatant(config.owner, 'Concentration owner')
      assertInteger(
        config.constitutionModifier,
        'Concentration Constitution modifier',
      )
      next = {
        ...state,
        [config.owner]: {
          ...state[config.owner],
          concentration: {
            constitutionModifier: config.constitutionModifier,
          },
        },
      }
      break
    case 'stop-concentration':
      assertCombatant(config.owner, 'Concentration owner')
      next = {
        ...state,
        [config.owner]: { ...state[config.owner], concentration: null },
      }
      break
  }
  return Distribution.constant(
    {
      state: next,
      success: true,
      critical: false,
      exactDamage: 0,
      appliedConditions,
    },
    transitionKey,
  )
}

function eventTransitions(config: EventConfig, state: SequenceState) {
  switch (config.type) {
    case 'player-attack':
    case 'enemy-attack':
      return attackTransitions(config, state)
    case 'player-saving-throw':
    case 'enemy-saving-throw':
      return savingThrowTransitions(config, state)
    case 'player-ability-check':
    case 'enemy-ability-check':
      return abilityCheckTransitions(config, state)
    case 'grappled-escape':
      return abilityCheckTransitions(config, state)
    case 'player-initiative':
    case 'enemy-initiative':
      return initiativeTransitions(config, state)
    case 'player-damage':
    case 'enemy-damage':
      return standaloneDamageTransitions(config, state)
    case 'apply-condition':
    case 'apply-effect':
    case 'remove-condition':
    case 'remove-effect':
    case 'help':
    case 'dodge':
    case 'start-concentration':
    case 'stop-concentration':
      return stateEventTransitions(config, state)
  }
}

function configuredConditions(config: EventConfig) {
  const conditions = (() => {
    switch (config.type) {
      case 'player-attack':
      case 'enemy-attack':
        return config.hitConditions
      case 'player-saving-throw':
      case 'enemy-saving-throw':
        return [...config.failureConditions, ...config.successConditions]
      case 'player-ability-check':
      case 'enemy-ability-check':
      case 'grappled-escape':
        return [
          ...(config.failureConditions ?? []),
          ...(config.successConditions ?? []),
        ]
      case 'apply-condition':
        return config.conditions
      case 'apply-effect':
        return config.effects
      default:
        return []
    }
  })()
  return [...new Set(conditions.map((condition) => condition.type))]
}

function eventTarget(config: EventConfig): ConditionTarget | undefined {
  switch (config.type) {
    case 'player-attack':
    case 'enemy-saving-throw':
    case 'enemy-damage':
      return 'enemies'
    case 'enemy-attack':
    case 'player-saving-throw':
    case 'player-damage':
      return 'players'
    default:
      return undefined
  }
}

function resultFromTransitions(
  config: EventConfig,
  transitions: Distribution<EventTransition>,
): EventResult {
  const target = eventTarget(config)
  if (
    config.type === 'player-initiative' ||
    config.type === 'enemy-initiative'
  ) {
    return {
      successProbability: 1,
      outcome: {
        type: 'expected-initiative',
        expectedTotal: normalizeCalculation(
          transitions.expectedValue((transition) => transition.rollTotal ?? 0),
        ),
      },
      conditionApplications: [],
    }
  }
  const outcome =
    target === undefined
      ? noDamageOutcome()
      : damageOutcome(
          target,
          transitions.expectedValue((transition) => transition.exactDamage),
        )
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
    outcome,
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

export function calculateAbilityCheck(
  config: AbilityCheckConfig | GrappledEscapeConfig,
): EventResult {
  return calculateSingleEvent(config)
}

export function calculateInitiative(config: InitiativeConfig): EventResult {
  return calculateSingleEvent(config)
}

export function calculateDamage(config: StandaloneDamageConfig): EventResult {
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
              : event.type === 'player-saving-throw' ||
                  event.type === 'enemy-saving-throw'
                ? [
                    { branch: 'failure', conditions: event.failureConditions },
                    { branch: 'success', conditions: event.successConditions },
                  ]
                : event.type === 'player-ability-check' ||
                    event.type === 'enemy-ability-check' ||
                    event.type === 'grappled-escape'
                  ? [
                      {
                        branch: 'failure',
                        conditions: event.failureConditions ?? [],
                      },
                      {
                        branch: 'success',
                        conditions: event.successConditions ?? [],
                      },
                    ]
                  : event.type === 'apply-condition'
                    ? [{ branch: 'apply', conditions: event.conditions }]
                    : event.type === 'apply-effect'
                      ? [{ branch: 'apply', conditions: event.effects }]
                      : []
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
    if (
      result.outcome.type === 'expected-damage-against-enemies' ||
      result.outcome.type === 'expected-damage-against-players'
    ) {
      totals.set(
        result.outcome.type,
        (totals.get(result.outcome.type) ?? 0) + result.outcome.expectedDamage,
      )
    }
    const target = eventTarget(event)
    for (const application of result.conditionApplications) {
      if (target === undefined) continue
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
