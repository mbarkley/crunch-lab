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
  TurnBoundary,
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
  OngoingDamageTrigger,
  RepeatedSaveTrigger,
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

export const MAX_DAMAGE_DICE = 20

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
  /** Optional state gate evaluated before this event resolves. */
  readonly conditionGate?: ConditionGateConfig
}

export interface ConditionGateConfig {
  readonly target: Combatant
  readonly mustHave: readonly ConditionRemovalConfig[]
  readonly mustNotHave: readonly ConditionRemovalConfig[]
}

interface DamageEventConfig extends BaseEventConfig, DamageRollConfig {}

interface BaseAttackConfig extends DamageEventConfig {
  /** Omit to use the target's / attacker's combatant-state default. */
  readonly armorClass?: number
  readonly attackModifier?: number
  readonly rollMode: AttackRollMode
  readonly cover: Cover
  readonly hitConditions: readonly ConditionConfig[]
  /** Resolved after a successful attack, in addition to direct hit conditions. */
  readonly hitSave?: ConditionOnlySaveConfig
}

export interface PlayerAttackConfig extends BaseAttackConfig {
  readonly type: 'player-attack'
}

export interface EnemyAttackConfig extends BaseAttackConfig {
  readonly type: 'enemy-attack'
}

export type AttackConfig = PlayerAttackConfig | EnemyAttackConfig

/** A save which changes state but never deals damage. */
export interface ConditionOnlySaveConfig {
  readonly saveDc?: number
  readonly saveModifier?: number
  readonly saveAbility: Ability
  readonly rollMode: SavingThrowRollMode
  readonly cover: Cover
  readonly failureConditions: readonly ConditionConfig[]
  readonly successConditions: readonly ConditionConfig[]
}

interface BaseSavingThrowConfig extends DamageEventConfig {
  /** Omit to use the source's / target's combatant-state default. */
  readonly saveDc?: number
  readonly saveModifier?: number
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

interface BaseGrappleOrShoveConfig extends BaseEventConfig {
  /** Omit to use the acting combatant's save DC. */
  readonly saveDc?: number
  /** Supplying a modifier also requires specifying the ability it represents. */
  readonly targetSaveModifier?: number
  readonly targetSaveAbility?: 'strength' | 'dexterity'
  readonly rollMode: SavingThrowRollMode
  readonly cover: Cover
}
export interface PlayerGrappleConfig extends BaseGrappleOrShoveConfig {
  readonly type: 'player-grapple'
}
export interface EnemyGrappleConfig extends BaseGrappleOrShoveConfig {
  readonly type: 'enemy-grapple'
}
export interface PlayerShoveConfig extends BaseGrappleOrShoveConfig {
  readonly type: 'player-shove'
}
export interface EnemyShoveConfig extends BaseGrappleOrShoveConfig {
  readonly type: 'enemy-shove'
}
export type GrappleOrShoveConfig =
  | PlayerGrappleConfig
  | EnemyGrappleConfig
  | PlayerShoveConfig
  | EnemyShoveConfig

/** Executes child events only in branches matching all requested state tests. */
export interface ConditionalEventConfig extends BaseEventConfig {
  readonly type: 'conditional'
  readonly target: Combatant
  readonly mustHave: readonly ConditionRemovalConfig[]
  readonly mustNotHave: readonly ConditionRemovalConfig[]
  readonly events: readonly EventConfig[]
}

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

export interface GrappledEscapeConfig extends Omit<
  BaseAbilityCheckConfig,
  'dc' | 'modifier'
> {
  readonly type: 'grappled-escape'
  readonly owner: Combatant
  /** Omit to use the grappler's combatant-state default. */
  readonly dc?: number
  /** Omit to use the escaping combatant's selected save modifier. */
  readonly modifier?: number
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
  | GrappleOrShoveConfig
  | ConditionalEventConfig
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

/** A generic turn timeline entry does not consume an action resource. */
export type ActivityType = 'action' | 'bonus-action' | 'generic'

export interface ConcentrationState {
  readonly constitutionModifier: number
}

export interface CombatantState {
  /** Baseline d20 traits, used when an event does not set an override. */
  readonly armorClass?: number
  readonly attackModifier?: number
  readonly saveDc?: number
  readonly saveModifiers?: Readonly<Record<Ability, number>>
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
  readonly helpSource: Combatant | null
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
  readonly conditionGate?: ConditionGateConfig
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
  readonly executionProbability: number
  readonly successProbability: number
  readonly criticalProbability?: number
  readonly outcome: Outcome
  readonly conditionApplications: readonly ConditionApplication[]
  readonly stateBefore?: readonly StateProbability[]
  readonly stateAfter?: readonly StateProbability[]
}

export interface StateProbability {
  readonly probability: number
  readonly state: SequenceState
}

export type GeneratedBoundaryResultType =
  'repeated-save' | 'ongoing-damage' | 'concentration-save'

export interface GeneratedBoundaryResult {
  readonly id: string
  readonly owner: Combatant
  readonly boundary: TurnBoundary
  readonly type: GeneratedBoundaryResultType
  readonly result: EventResult
}

export interface SequenceResult {
  readonly eventResults: Readonly<Record<string, EventResult>>
  readonly outcomes: readonly Outcome[]
  readonly expectedConditionApplications: readonly ExpectedConditionApplications[]
  readonly generatedResults?: readonly GeneratedBoundaryResult[]
  /** Expected enemy damage, grouped by sequence round (including turn boundaries). */
  readonly expectedEnemyDamageByRound: readonly number[]
}

interface EventTransition {
  readonly state: SequenceState
  readonly executed: boolean
  readonly success: boolean
  readonly critical: boolean
  readonly exactDamage: number
  readonly rollTotal?: number
  readonly appliedConditions: readonly ConditionType[]
  readonly generatedResults?: readonly GeneratedBoundaryResult[]
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
    armorClass: 12,
    attackModifier: 0,
    saveDc: 12,
    saveModifiers: {
      strength: 0,
      dexterity: 0,
      constitution: 0,
      intelligence: 0,
      wisdom: 0,
      charisma: 0,
    },
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
    helpSource: null,
    dodging: false,
  },
  enemy: {
    armorClass: 12,
    attackModifier: 0,
    saveDc: 12,
    saveModifiers: {
      strength: 0,
      dexterity: 0,
      constitution: 0,
      intelligence: 0,
      wisdom: 0,
      charisma: 0,
    },
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
    helpSource: null,
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

function ongoingDamagePools(
  trigger: NonNullable<ConditionInstance['duration']>['ongoingDamage'],
): readonly DamagePoolConfig[] {
  if (trigger === undefined) return []
  if (trigger.damagePools !== undefined) {
    return trigger.damagePools.map((pool) => ({
      ...pool,
      damageType: pool.damageType as DamageType,
    }))
  }
  return [
    {
      id: 'ongoing-damage',
      diceCount: trigger.diceCount!,
      dieSides: trigger.dieSides!,
      modifier: trigger.modifier!,
      damageType: trigger.damageType as DamageType,
    },
  ]
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
  if (duration.repeatedSave !== undefined) {
    if (!ABILITIES.includes(duration.repeatedSave.ability as Ability)) {
      throw new RangeError('Repeated save ability is invalid')
    }
    assertInteger(duration.repeatedSave.dc, 'Repeated save DC', 1)
    assertInteger(duration.repeatedSave.saveModifier, 'Repeated save modifier')
  }
  if (duration.ongoingDamage !== undefined) {
    if (duration.repeatedSave !== undefined) {
      throw new RangeError('A condition duration may have only one trigger')
    }
    const pools = ongoingDamagePools(duration.ongoingDamage)
    if (
      pools.length === 0 ||
      pools.some(
        (pool) =>
          pool.damageType === undefined ||
          pool.diceCount === undefined ||
          pool.dieSides === undefined ||
          pool.modifier === undefined,
      )
    ) {
      throw new RangeError('Ongoing damage must include at least one dice pool')
    }
    const ids = new Set<string>()
    for (const [index, pool] of pools.entries()) {
      const id = pool.id || `ongoing-${index}`
      if (id.length === 0 || ids.has(id)) {
        throw new RangeError(
          'Ongoing damage pool IDs must be unique and non-empty',
        )
      }
      ids.add(id)
      assertInteger(pool.diceCount, 'Ongoing damage dice count', 1)
      assertInteger(pool.dieSides, 'Ongoing damage die sides', 2)
      assertInteger(pool.modifier, 'Ongoing damage modifier')
      if (!DAMAGE_TYPES.includes(pool.damageType as DamageType)) {
        throw new RangeError(
          'Ongoing damage pool must have a valid damage type',
        )
      }
    }
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
  if (typeof state.helped !== 'boolean' || typeof state.dodging !== 'boolean') {
    throw new RangeError('Helped and dodging state must be boolean')
  }
  if (
    state.helpSource !== null &&
    state.helpSource !== 'player' &&
    state.helpSource !== 'enemy'
  ) {
    throw new RangeError('Help source must be player or enemy')
  }
  if (state.helped && state.helpSource === null) {
    throw new RangeError('Helped state must include a help source')
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
    if (pool.diceCount > MAX_DAMAGE_DICE) {
      throw new RangeError(
        `Damage dice count must not exceed ${MAX_DAMAGE_DICE}`,
      )
    }
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
  assertInteger(policy.threshold, 'Damage reroll threshold', 1)
  const pool = (config.damagePools ?? []).find(
    (candidate) => candidate.id === policy.damagePoolId,
  )
  if (pool === undefined) {
    throw new RangeError(
      'Heroic Inspiration damage pool must belong to the event',
    )
  }
  if (policy.threshold > pool.dieSides) {
    throw new RangeError('Damage reroll threshold cannot exceed the die size')
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

interface DiceSummary {
  readonly total: number
  readonly lowest: number
}

function summarizedDice(
  count: number,
  sides: number,
): Distribution<DiceSummary> {
  let rolls = Distribution.die(sides).map(
    (value) => ({ total: value, lowest: value }),
    (summary) => `${summary.total}:${summary.lowest}`,
  )
  for (let index = 1; index < count; index += 1) {
    rolls = rolls.combine(
      Distribution.die(sides),
      (summary, value) => ({
        total: summary.total + value,
        lowest: Math.min(summary.lowest, value),
      }),
      (summary) => `${summary.total}:${summary.lowest}`,
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
  return summarizedDice(pool.diceCount * diceMultiplier, pool.dieSides).flatMap(
    (summary) => {
      if (!canReroll || summary.lowest > policy.threshold) {
        return Distribution.constant<DamagePoolOutcome>(
          {
            damageType: pool.damageType,
            damage: Math.max(0, summary.total + pool.modifier),
            inspirationSpent: false,
          },
          (outcome) => `${outcome.damageType}:${outcome.damage}:false`,
        )
      }
      return Distribution.die(pool.dieSides).map<DamagePoolOutcome>(
        (reroll) => {
          return {
            damageType: pool.damageType,
            damage: Math.max(
              0,
              summary.total - summary.lowest + reroll + pool.modifier,
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
        // Saving throw consequences modify each combined damage type before
        // the target's type-specific defenses. Grouping first preserves the
        // single rounding step for multiple pools of the same type.
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

interface ConcentrationCheckOutcome {
  readonly state: SequenceState
  readonly passed: boolean
  readonly dc: number
  readonly roll?: number
}

function concentrationAfterDamage(
  state: SequenceState,
  target: Combatant,
  damage: number,
): Distribution<ConcentrationCheckOutcome> {
  const concentration = state[target].concentration
  if (damage <= 0 || concentration === null) {
    return Distribution.constant(
      { state, passed: true, dc: 0 },
      (outcome) => `${stateKey(outcome.state)}:no-check`,
    )
  }
  if (hasEffectiveCondition(state[target].conditions, 'incapacitated')) {
    return Distribution.constant(
      {
        state: {
          ...state,
          [target]: { ...state[target], concentration: null },
        },
        passed: false,
        dc: Math.min(30, Math.max(10, Math.floor(damage / 2))),
      },
      (outcome) => `${stateKey(outcome.state)}:incapacitated`,
    )
  }
  const dc = Math.min(30, Math.max(10, Math.floor(damage / 2)))
  const penalty = state[target].exhaustion * 2
  return Distribution.die(20).map(
    (roll) => {
      const passed = roll + concentration.constitutionModifier - penalty >= dc
      return {
        state: passed
          ? state
          : {
              ...state,
              [target]: { ...state[target], concentration: null },
            },
        passed,
        dc,
        roll,
      }
    },
    (outcome) => `${stateKey(outcome.state)}:${outcome.roll ?? ''}`,
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
    if (
      condition.type === 'vex' ||
      condition.type === 'sap' ||
      condition.type === 'dodging'
    ) {
      if (condition.type === 'vex') vex = true
      else if (condition.type === 'sap') sap = true
      else state = { ...state, [target]: { ...state[target], dodging: true } }
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

    // Persistent conditions are state, not stacks. Reapplying a condition
    // that is already present leaves its original duration and stable ID in
    // place, so probability branches with double/triple applications merge.
    if (instances.some((instance) => instance.type === condition.type)) {
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

  const updatedCombatant = {
    ...state[target],
    vex,
    sap,
    conditions: instances,
  }
  return {
    state: {
      ...state,
      [target]: hasEffectiveCondition(instances, 'incapacitated')
        ? { ...updatedCombatant, concentration: null }
        : updatedCombatant,
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
    if (
      removal.type === 'vex' ||
      removal.type === 'sap' ||
      removal.type === 'dodging'
    ) {
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

export function canExecuteActivity(
  state: SequenceState,
  owner: Combatant,
): boolean {
  return (
    state[owner].exhaustion < 6 &&
    !hasEffectiveCondition(state[owner].conditions, 'incapacitated')
  )
}

const SPEED_ZERO_CONDITIONS: readonly PersistentConditionType[] = [
  'grappled',
  'restrained',
  'stunned',
  'paralyzed',
  'petrified',
  'unconscious',
]

export function isDodgeActive(state: SequenceState, owner: Combatant) {
  return (
    state[owner].dodging &&
    !hasEffectiveCondition(state[owner].conditions, 'incapacitated') &&
    !SPEED_ZERO_CONDITIONS.some((condition) =>
      hasEffectiveCondition(state[owner].conditions, condition),
    )
  )
}

export function activityExecutionProbability(
  state: SequenceState,
  owner: Combatant,
): number {
  return canExecuteActivity(state, owner) ? 1 : 0
}

/** Events that consume an action or bonus action are suppressed by incapacitation. */
export function eventUsesActivityResource(config: EventConfig): boolean {
  switch (config.type) {
    case 'player-attack':
    case 'enemy-attack':
    case 'player-grapple':
    case 'enemy-grapple':
    case 'player-shove':
    case 'enemy-shove':
    case 'player-ability-check':
    case 'enemy-ability-check':
    case 'grappled-escape':
    case 'help':
    case 'dodge':
    case 'apply-condition':
    case 'apply-effect':
    case 'start-concentration':
      return true
    case 'player-saving-throw':
    case 'enemy-saving-throw':
    case 'player-initiative':
    case 'enemy-initiative':
    case 'player-damage':
    case 'enemy-damage':
    case 'remove-condition':
    case 'remove-effect':
    case 'stop-concentration':
    case 'conditional':
      return false
  }
}

function stateHasRequirement(
  state: CombatantState,
  requirement: ConditionRemovalConfig,
): boolean {
  if (
    requirement.type === 'vex' ||
    requirement.type === 'sap' ||
    requirement.type === 'dodging'
  )
    return state[requirement.type]
  if (requirement.type === 'exhaustion') return state.exhaustion > 0
  return hasEffectiveCondition(
    state.conditions,
    requirement.type as PersistentConditionType,
  )
}

function conditionGateMatches(
  config: ConditionGateConfig,
  state: SequenceState,
): boolean {
  assertCombatant(config.target, 'Conditional target')
  validateConditionRemovals(config.mustHave)
  validateConditionRemovals(config.mustNotHave)
  const target = state[config.target]
  return (
    config.mustHave.every((item) => stateHasRequirement(target, item)) &&
    config.mustNotHave.every((item) => !stateHasRequirement(target, item))
  )
}

function conditionalMatches(
  config: ConditionalEventConfig,
  state: SequenceState,
) {
  return conditionGateMatches(config, state)
}

function normalizePersistentConditions(
  conditions: readonly ConditionInstance[],
): readonly ConditionInstance[] {
  const seen = new Set<PersistentConditionType>()
  return conditions.filter((condition) => {
    if (seen.has(condition.type)) return false
    seen.add(condition.type)
    return true
  })
}

function normalizeSequenceState(state: SequenceState): SequenceState {
  return {
    player: {
      ...state.player,
      conditions: normalizePersistentConditions(state.player.conditions),
    },
    enemy: {
      ...state.enemy,
      conditions: normalizePersistentConditions(state.enemy.conditions),
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
        value.helpSource ?? '',
        value.dodging,
        normalizePersistentConditions(value.conditions)
          .map(
            (condition) =>
              `${condition.type},${condition.duration?.remainingTurns ?? ''},${condition.duration?.boundary ?? ''},${condition.duration?.turnOwner ?? ''},${JSON.stringify(condition.duration?.repeatedSave ?? '')},${JSON.stringify(condition.duration?.ongoingDamage ?? '')}`,
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
    transition.rollTotal ?? '',
    ...transition.appliedConditions,
  ].join(':')
}

function attackSuccess(
  roll: number,
  config: AttackConfig,
  armorClass: number,
  attackModifier: number,
  exhaustionPenalty = 0,
) {
  return (
    roll === 20 ||
    (roll !== 1 &&
      roll + attackModifier - exhaustionPenalty >=
        armorClass + coverBonus(config.cover))
  )
}

function attackTransitions(
  config: AttackConfig,
  state: SequenceState,
): Distribution<EventTransition> {
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
  const armorClass = config.armorClass ?? state[target].armorClass ?? 12
  const attackModifier =
    config.attackModifier ?? state[attacker].attackModifier ?? 0
  assertInteger(armorClass, 'Armor class', 1)
  assertInteger(attackModifier, 'Attack modifier')
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
    [
      ...(state[target].vex ? ['vex'] : []),
      ...(state[attacker].helped ? ['help'] : []),
      ...attackerEffects.advantage,
      ...targetEffects.advantage,
    ],
    [
      ...(state[attacker].sap ? ['sap'] : []),
      ...(isDodgeActive(state, target) ? ['dodge'] : []),
      ...attackerEffects.disadvantage,
      ...targetEffects.disadvantage,
    ],
  )
  const canRerollD20 =
    state[attacker].heroicInspiration &&
    config.heroicInspiration?.type === 'd20-after-failure'
  const consumedState: SequenceState = {
    ...state,
    [attacker]: {
      ...state[attacker],
      sap: false,
      helped: false,
      helpSource: null,
    },
    [target]: { ...state[target], vex: false },
  }

  return d20Rolls(mode).flatMap((values) => {
    const original = selectedD20(values, mode)
    const exhaustionPenalty = state[attacker].exhaustion * 2
    const initialSuccess = attackSuccess(
      original,
      config,
      armorClass,
      attackModifier,
      exhaustionPenalty,
    )
    const resolvedRolls =
      !initialSuccess && canRerollD20
        ? rerolledD20(values, mode)
        : Distribution.constant(original, (roll) => roll)
    return resolvedRolls.flatMap((roll) => {
      const success = attackSuccess(
        roll,
        config,
        armorClass,
        attackModifier,
        exhaustionPenalty,
      )
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
      const hitSave =
        config.hitSave === undefined
          ? Distribution.constant(
              {
                state: application.state,
                appliedConditions: application.appliedConditions,
              },
              (value) => stateKey(value.state),
            )
          : conditionOnlySaveTransitions(
              config.hitSave,
              application.state,
              target,
              attacker,
              `${config.id}:hit-save`,
            ).map(
              (transition) => ({
                state: transition.state,
                appliedConditions: [
                  ...application.appliedConditions,
                  ...transition.appliedConditions,
                ],
              }),
              (value) => stateKey(value.state),
            )
      return hitSave.flatMap(
        (saved) =>
          damageDistribution(
            config,
            // Hit-triggered state changes occur after this attack's damage,
            // matching the existing direct on-hit condition timing.
            stateAfterD20[target],
            'full',
            critical ? 2 : 1,
            stateAfterD20[attacker].heroicInspiration,
          ).flatMap(
            (damage) =>
              concentrationAfterDamage(
                spendInspiration(
                  saved.state,
                  attacker,
                  damage.inspirationSpent,
                ),
                target,
                damage.damage,
              ).map(
                (concentration) => ({
                  state: concentration.state,
                  executed: true,
                  success: true,
                  critical,
                  exactDamage: damage.damage,
                  appliedConditions: saved.appliedConditions,
                }),
                transitionKey,
              ),
            transitionKey,
          ),
        transitionKey,
      )
    }, transitionKey)
  }, transitionKey)
}

function savingThrowTransitions(
  config: SavingThrowConfig,
  state: SequenceState,
): Distribution<EventTransition> {
  const target: Combatant =
    config.type === 'player-saving-throw' ? 'player' : 'enemy'
  const source: Combatant = target === 'player' ? 'enemy' : 'player'
  const saveDc = config.saveDc ?? state[source].saveDc ?? 12
  const saveModifier =
    config.saveModifier ??
    state[target].saveModifiers?.[config.saveAbility] ??
    0
  assertInteger(saveDc, 'Save DC', 1)
  assertInteger(saveModifier, 'Save modifier')
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
  const saveMode = effectiveRollMode(
    mode,
    config.saveAbility === 'dexterity' && isDodgeActive(state, target)
      ? ['dodge']
      : [],
    [],
  )
  const succeeds = (roll: number) =>
    roll + saveModifier + bonus - exhaustionPenalty >= saveDc
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
        stateAfterD20[target],
        consequence,
        1,
        stateAfterD20[source].heroicInspiration,
      ).flatMap(
        (damage) =>
          concentrationAfterDamage(
            spendInspiration(
              application.state,
              source,
              damage.inspirationSpent,
            ),
            target,
            damage.damage,
          ).map(
            (concentration) => ({
              state: concentration.state,
              executed: true,
              success,
              critical: false,
              exactDamage: damage.damage,
              appliedConditions: application.appliedConditions,
            }),
            transitionKey,
          ),
        transitionKey,
      )
    }, transitionKey)
  }, transitionKey)
}

function conditionOnlySaveTransitions(
  config: ConditionOnlySaveConfig,
  state: SequenceState,
  target: Combatant,
  source: Combatant,
  id: string,
): Distribution<EventTransition> {
  const saveDc = config.saveDc ?? state[source].saveDc ?? 12
  const saveModifier =
    config.saveModifier ??
    state[target].saveModifiers?.[config.saveAbility] ??
    0
  assertInteger(saveDc, 'Save DC', 1)
  assertInteger(saveModifier, 'Save modifier')
  if (!ABILITIES.includes(config.saveAbility))
    throw new RangeError('Saving throw ability is invalid')
  if (!SAVE_ROLL_MODES.includes(config.rollMode))
    throw new RangeError('Saving throw roll mode is invalid')
  if (!COVER_TYPES.includes(config.cover))
    throw new RangeError('Cover must be none, half, or three-quarters')
  validateConditions(config.failureConditions)
  validateConditions(config.successConditions)
  const automaticFailure = config.rollMode === 'automatic-failure'
  const effects = conditionRollEffects(
    state[target].conditions,
    'saving-throw',
    config.saveAbility,
  )
  const mode = automaticFailure
    ? 'normal'
    : effectiveRollMode(
        config.rollMode,
        effects.advantage,
        effects.disadvantage,
      )
  const saveMode = effectiveRollMode(
    mode,
    config.saveAbility === 'dexterity' && isDodgeActive(state, target)
      ? ['dodge']
      : [],
    [],
  )
  const bonus =
    config.saveAbility === 'dexterity' ? coverBonus(config.cover) : 0
  const succeeds = (roll: number) =>
    roll + saveModifier + bonus - state[target].exhaustion * 2 >= saveDc
  const rolls = automaticFailure
    ? Distribution.constant<readonly number[]>([0], (v) => v.join(','))
    : d20Rolls(saveMode)
  return rolls.map((values) => {
    const roll = automaticFailure ? 0 : selectedD20(values, saveMode)
    const success =
      !automaticFailure && !effects.automaticFailure && succeeds(roll)
    const applied = applyConditionConfigs(
      state,
      target,
      source,
      `${id}:${success ? 'success' : 'failure'}`,
      success ? config.successConditions : config.failureConditions,
    )
    return {
      state: applied.state,
      executed: true,
      success,
      critical: false,
      exactDamage: 0,
      appliedConditions: applied.appliedConditions,
    }
  }, transitionKey)
}

function grappleOrShoveTransitions(
  config: GrappleOrShoveConfig,
  state: SequenceState,
): Distribution<EventTransition> {
  const actor: Combatant = config.type.startsWith('player-')
    ? 'player'
    : 'enemy'
  const target: Combatant = actor === 'player' ? 'enemy' : 'player'
  if (
    (config.targetSaveModifier === undefined) !==
    (config.targetSaveAbility === undefined)
  ) {
    throw new RangeError(
      'Custom target save requires both an ability and modifier',
    )
  }
  const ability =
    config.targetSaveAbility ??
    ((state[target].saveModifiers?.strength ?? 0) >=
    (state[target].saveModifiers?.dexterity ?? 0)
      ? 'strength'
      : 'dexterity')
  const modifier =
    config.targetSaveModifier ?? state[target].saveModifiers?.[ability] ?? 0
  const condition: ConditionType = config.type.endsWith('grapple')
    ? 'grappled'
    : 'prone'
  return conditionOnlySaveTransitions(
    {
      saveDc: config.saveDc,
      saveModifier: modifier,
      saveAbility: ability,
      rollMode: config.rollMode,
      cover: config.cover,
      failureConditions: [{ type: condition }],
      successConditions: [],
    },
    state,
    target,
    actor,
    config.id,
  )
}

function conditionalTransitions(
  config: ConditionalEventConfig,
  state: SequenceState,
): Distribution<EventTransition> {
  if (!conditionalMatches(config, state)) {
    return Distribution.constant(
      {
        state,
        executed: false,
        success: false,
        critical: false,
        exactDamage: 0,
        appliedConditions: [],
      },
      transitionKey,
    )
  }
  let states = Distribution.constant(state, stateKey)
  for (const child of config.events) {
    states = states.flatMap((current) => {
      const actor = eventActor(child)
      const transitions =
        eventUsesActivityResource(child) &&
        actor !== undefined &&
        !canExecuteActivity(current, actor)
          ? Distribution.constant(
              {
                state: current,
                executed: false,
                success: false,
                critical: false,
                exactDamage: 0,
                appliedConditions: [],
              },
              transitionKey,
            )
          : eventTransitions(child, current)
      return transitions.map((transition) => transition.state, stateKey)
    }, stateKey)
  }
  return states.map(
    (next) => ({
      state: next,
      executed: true,
      success: true,
      critical: false,
      exactDamage: 0,
      appliedConditions: [],
    }),
    transitionKey,
  )
}

function eventActor(config: EventConfig): Combatant | undefined {
  switch (config.type) {
    case 'player-attack':
    case 'player-grapple':
    case 'player-shove':
    case 'player-ability-check':
      return 'player'
    case 'enemy-attack':
    case 'enemy-grapple':
    case 'enemy-shove':
    case 'enemy-ability-check':
      return 'enemy'
    case 'grappled-escape':
    case 'help':
    case 'dodge':
    case 'start-concentration':
      return config.owner
    case 'apply-condition':
    case 'apply-effect':
      return config.source
    default:
      return undefined
  }
}

function abilityCheckTransitions(
  config: AbilityCheckConfig | GrappledEscapeConfig,
  state: SequenceState,
): Distribution<EventTransition> {
  if (!ABILITIES.includes(config.ability)) {
    throw new RangeError('Ability check ability is invalid')
  }
  if (
    config.type === 'grappled-escape' &&
    config.ability !== 'strength' &&
    config.ability !== 'dexterity'
  ) {
    throw new RangeError('Grappled escape must use Strength or Dexterity')
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
  const grappler: Combatant = actor === 'player' ? 'enemy' : 'player'
  const dc =
    config.type === 'grappled-escape'
      ? (config.dc ?? state[grappler].saveDc ?? 12)
      : config.dc
  const modifier =
    config.type === 'grappled-escape'
      ? (config.modifier ?? state[actor].saveModifiers?.[config.ability] ?? 0)
      : config.modifier
  assertInteger(dc, 'Ability check DC', 1)
  assertInteger(modifier, 'Ability check modifier')
  const target: Combatant = actor
  if (
    config.type === 'grappled-escape' &&
    !hasEffectiveCondition(state[actor].conditions, 'grappled')
  ) {
    return Distribution.constant(
      {
        state,
        executed: true,
        success: false,
        critical: false,
        exactDamage: 0,
        appliedConditions: [],
      },
      transitionKey,
    )
  }
  const hasDisadvantage =
    hasEffectiveCondition(state[actor].conditions, 'poisoned') ||
    hasEffectiveCondition(state[actor].conditions, 'frightened')
  const mode = effectiveRollMode(
    config.rollMode,
    [],
    hasDisadvantage ? ['poisoned', 'frightened'] : [],
  )
  const sightFailure =
    config.sightDependent === true &&
    hasEffectiveCondition(state[actor].conditions, 'blinded')
  const succeeds = (roll: number) =>
    !sightFailure && roll + modifier - state[actor].exhaustion * 2 >= dc
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
          executed: true,
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
    hasEffectiveCondition(state[actor].conditions, 'invisible')
      ? ['invisible']
      : [],
    hasEffectiveCondition(state[actor].conditions, 'incapacitated')
      ? ['incapacitated']
      : [],
  )
  return d20Rolls(mode).map(
    (values) => ({
      state,
      executed: true,
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
  ).flatMap(
    (damage) =>
      concentrationAfterDamage(
        spendInspiration(state, source, damage.inspirationSpent),
        target,
        damage.damage,
      ).map(
        (concentration) => ({
          state: concentration.state,
          executed: true,
          success: true,
          critical: false,
          exactDamage: damage.damage,
          appliedConditions: [],
        }),
        transitionKey,
      ),
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
        [config.target]: {
          ...state[config.target],
          helped: true,
          helpSource: config.owner,
        },
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
      executed: true,
      success: true,
      critical: false,
      exactDamage: 0,
      appliedConditions,
    },
    transitionKey,
  )
}

function eventTransitions(config: EventConfig, state: SequenceState) {
  if (
    config.conditionGate !== undefined &&
    !conditionGateMatches(config.conditionGate, state)
  ) {
    return Distribution.constant(
      {
        state,
        executed: false,
        success: false,
        critical: false,
        exactDamage: 0,
        appliedConditions: [],
      },
      transitionKey,
    )
  }
  switch (config.type) {
    case 'player-attack':
    case 'enemy-attack':
      return attackTransitions(config, state)
    case 'player-grapple':
    case 'enemy-grapple':
    case 'player-shove':
    case 'enemy-shove':
      return grappleOrShoveTransitions(config, state)
    case 'conditional':
      return conditionalTransitions(config, state)
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

function configuredConditions(config: EventConfig): readonly ConditionType[] {
  const conditions = (() => {
    switch (config.type) {
      case 'player-attack':
      case 'enemy-attack':
        return [
          ...config.hitConditions,
          ...(config.hitSave
            ? [
                ...config.hitSave.failureConditions,
                ...config.hitSave.successConditions,
              ]
            : []),
        ]
      case 'player-grapple':
        return [{ type: 'grappled' }]
      case 'enemy-grapple':
        return [{ type: 'grappled' }]
      case 'player-shove':
      case 'enemy-shove':
        return [{ type: 'prone' }]
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
  return [
    ...new Set(conditions.map((condition) => condition.type)),
  ] as readonly ConditionType[]
}

function eventTarget(config: EventConfig): ConditionTarget | undefined {
  switch (config.type) {
    case 'player-attack':
    case 'enemy-saving-throw':
    case 'enemy-damage':
    case 'player-grapple':
    case 'player-shove':
      return 'enemies'
    case 'enemy-attack':
    case 'player-saving-throw':
    case 'player-damage':
    case 'enemy-grapple':
    case 'enemy-shove':
      return 'players'
    case 'apply-condition':
    case 'apply-effect':
      return config.target === 'player' ? 'players' : 'enemies'
    default:
      return undefined
  }
}

function stateSummary(
  distribution: Distribution<SequenceState>,
): readonly StateProbability[] {
  return distribution.outcomes.map(({ value, probability }) => ({
    state: value,
    probability: normalizeCalculation(probability),
  }))
}

function producesDamage(config: EventConfig) {
  return (
    config.type === 'player-attack' ||
    config.type === 'enemy-attack' ||
    config.type === 'player-grapple' ||
    config.type === 'enemy-grapple' ||
    config.type === 'player-shove' ||
    config.type === 'enemy-shove' ||
    config.type === 'player-saving-throw' ||
    config.type === 'enemy-saving-throw' ||
    config.type === 'player-damage' ||
    config.type === 'enemy-damage'
  )
}

function resultFromTransitions(
  config: EventConfig,
  transitions: Distribution<EventTransition>,
  before: Distribution<SequenceState> = Distribution.constant(
    INITIAL_SEQUENCE_STATE,
    stateKey,
  ),
): EventResult {
  const target = eventTarget(config)
  if (
    config.type === 'player-initiative' ||
    config.type === 'enemy-initiative'
  ) {
    return {
      executionProbability: normalizeCalculation(
        transitions.probabilityOf((transition) => transition.executed),
      ),
      successProbability: 1,
      outcome: {
        type: 'expected-initiative',
        expectedTotal: normalizeCalculation(
          transitions.expectedValue((transition) => transition.rollTotal ?? 0),
        ),
      },
      conditionApplications: [],
      stateBefore: stateSummary(before),
      stateAfter: stateSummary(
        transitions.map((transition) => transition.state, stateKey),
      ),
    }
  }
  const outcome =
    target === undefined || !producesDamage(config)
      ? noDamageOutcome()
      : damageOutcome(
          target,
          transitions.expectedValue((transition) => transition.exactDamage),
        )
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
    outcome,
    conditionApplications: configuredConditions(config).map((condition) => ({
      condition,
      probability: normalizeCalculation(
        transitions.probabilityOf((transition) =>
          transition.appliedConditions.includes(condition),
        ),
      ),
    })),
    stateBefore: stateSummary(before),
    stateAfter: stateSummary(
      transitions.map((transition) => transition.state, stateKey),
    ),
  }
}

interface BoundaryTransition {
  readonly state: SequenceState
  readonly generatedResults: readonly GeneratedBoundaryResult[]
}

interface WeightedGeneratedResult {
  readonly generated: GeneratedBoundaryResult
  readonly probability: number
}

function aggregateGeneratedResults(
  weighted: readonly WeightedGeneratedResult[],
): readonly GeneratedBoundaryResult[] {
  const groups = new Map<string, WeightedGeneratedResult[]>()
  for (const item of weighted) {
    const group = groups.get(item.generated.id) ?? []
    group.push(item)
    groups.set(item.generated.id, group)
  }
  return [...groups.values()].map((group) => {
    const first = group[0].generated
    const outcomes = group.map(({ generated, probability }) => ({
      generated,
      probability,
    }))
    const eventResults = outcomes.map(({ generated }) => generated.result)
    const expectedDamage = eventResults.reduce((sum, result, index) => {
      const outcome = result.outcome
      const damage =
        outcome.type === 'expected-damage-against-enemies' ||
        outcome.type === 'expected-damage-against-players'
          ? outcome.expectedDamage
          : 0
      return sum + damage * outcomes[index].probability
    }, 0)
    const outcome =
      first.result.outcome.type === 'expected-damage-against-enemies'
        ? damageOutcome('enemies', expectedDamage)
        : first.result.outcome.type === 'expected-damage-against-players'
          ? damageOutcome('players', expectedDamage)
          : first.result.outcome
    const mergeStates = (which: 'stateBefore' | 'stateAfter') => {
      const merged = new Map<string, StateProbability>()
      for (const { generated, probability } of outcomes) {
        for (const state of generated.result[which] ?? []) {
          const key = stateKey(state.state)
          const existing = merged.get(key)
          merged.set(key, {
            state: state.state,
            probability:
              (existing?.probability ?? 0) + probability * state.probability,
          })
        }
      }
      return [...merged.values()].map((state) => ({
        ...state,
        probability: normalizeCalculation(state.probability),
      }))
    }
    return {
      ...first,
      result: {
        executionProbability: normalizeCalculation(
          outcomes.reduce(
            (sum, item) =>
              sum +
              item.probability * item.generated.result.executionProbability,
            0,
          ),
        ),
        successProbability: normalizeCalculation(
          outcomes.reduce(
            (sum, item) =>
              sum + item.probability * item.generated.result.successProbability,
            0,
          ),
        ),
        outcome,
        conditionApplications: [],
        stateBefore: mergeStates('stateBefore'),
        stateAfter: mergeStates('stateAfter'),
      },
    }
  })
}

function boundaryResult(
  id: string,
  owner: Combatant,
  boundary: TurnBoundary,
  type: GeneratedBoundaryResultType,
  before: SequenceState,
  after: SequenceState,
  successProbability: number,
  outcome: Outcome = noDamageOutcome(),
): GeneratedBoundaryResult {
  return {
    id,
    owner,
    boundary,
    type,
    result: {
      executionProbability: 1,
      successProbability: normalizeCalculation(successProbability),
      outcome,
      conditionApplications: [],
      stateBefore: [{ probability: 1, state: before }],
      stateAfter: [{ probability: 1, state: after }],
    },
  }
}

function decrementCondition(
  state: SequenceState,
  target: Combatant,
  id: string,
): SequenceState {
  const conditions = state[target].conditions.flatMap((condition) => {
    if (condition.id !== id || condition.duration === undefined) {
      return [condition]
    }
    const remainingTurns = condition.duration.remainingTurns - 1
    return remainingTurns <= 0
      ? []
      : [{ ...condition, duration: { ...condition.duration, remainingTurns } }]
  })
  return { ...state, [target]: { ...state[target], conditions } }
}

function removeConditionInstance(
  state: SequenceState,
  target: Combatant,
  id: string,
) {
  return {
    ...state,
    [target]: {
      ...state[target],
      conditions: state[target].conditions.filter(
        (condition) => condition.id !== id,
      ),
    },
  }
}

function boundaryConditionTransitions(
  state: SequenceState,
  target: Combatant,
  condition: ConditionInstance,
  turn: TurnConfig,
  boundary: TurnBoundary,
): Distribution<BoundaryTransition> {
  const duration = condition.duration
  if (
    duration === undefined ||
    duration.turnOwner !== turn.owner ||
    duration.boundary !== boundary
  ) {
    return Distribution.constant(
      { state, generatedResults: [] },
      (value) => `${stateKey(value.state)}:none`,
    )
  }
  const triggerId = `boundary:${turn.id}:${boundary}:${condition.id}`
  if (duration.repeatedSave !== undefined) {
    const ability = duration.repeatedSave.ability as Ability
    const effects = conditionRollEffects(
      state[target].conditions,
      'saving-throw',
      ability,
    )
    const mode = effectiveRollMode(
      'normal',
      effects.advantage,
      effects.disadvantage,
    )
    return d20Rolls(mode).flatMap(
      (values) => {
        const roll = selectedD20(values, mode)
        const success =
          !effects.automaticFailure &&
          roll +
            duration.repeatedSave!.saveModifier -
            state[target].exhaustion * 2 >=
            duration.repeatedSave!.dc
        const afterDuration = success
          ? removeConditionInstance(state, target, condition.id)
          : decrementCondition(state, target, condition.id)
        const result = boundaryResult(
          triggerId,
          target,
          boundary,
          'repeated-save',
          state,
          afterDuration,
          success ? 1 : 0,
        )
        return Distribution.constant(
          { state: afterDuration, generatedResults: [result] },
          (value) =>
            `${stateKey(value.state)}:${value.generatedResults[0]?.id}:${roll}`,
        )
      },
      (value) => `${stateKey(value.state)}:${value.generatedResults[0]?.id}`,
    )
  }
  if (duration.ongoingDamage !== undefined) {
    const damageConfig: DamageEventConfig = {
      id: triggerId,
      damagePools: ongoingDamagePools(duration.ongoingDamage),
    }
    return damageDistribution(
      damageConfig,
      state[target],
      'full',
      1,
      false,
    ).flatMap(
      (damage) => {
        const beforeDamage = decrementCondition(state, target, condition.id)
        return concentrationAfterDamage(
          beforeDamage,
          target,
          damage.damage,
        ).map(
          (concentration) => ({
            state: concentration.state,
            generatedResults: [
              boundaryResult(
                triggerId,
                target,
                boundary,
                'ongoing-damage',
                state,
                concentration.state,
                1,
                damageOutcome(
                  target === 'player' ? 'players' : 'enemies',
                  damage.damage,
                ),
              ),
            ],
          }),
          (value) => `${stateKey(value.state)}:${triggerId}:${damage.damage}`,
        )
      },
      (value) => `${stateKey(value.state)}:${value.generatedResults[0]?.id}`,
    )
  }
  const next = decrementCondition(state, target, condition.id)
  return Distribution.constant({ state: next, generatedResults: [] }, (value) =>
    stateKey(value.state),
  )
}

function boundaryTransitions(
  state: SequenceState,
  turn: TurnConfig,
  boundary: TurnBoundary,
  processed = new Set<string>(),
): Distribution<BoundaryTransition> {
  let initial = state
  if (boundary === 'start') {
    initial = {
      ...initial,
      [turn.owner]: {
        ...initial[turn.owner],
        dodging: false,
      },
    }
    for (const target of ['player', 'enemy'] as const) {
      if (initial[target].helped && initial[target].helpSource === turn.owner) {
        initial = {
          ...initial,
          [target]: { ...initial[target], helped: false, helpSource: null },
        }
      }
    }
  }
  for (const combatant of ['player', 'enemy'] as const) {
    if (
      hasEffectiveCondition(initial[combatant].conditions, 'incapacitated') &&
      initial[combatant].concentration !== null
    ) {
      initial = {
        ...initial,
        [combatant]: { ...initial[combatant], concentration: null },
      }
    }
  }
  for (const target of ['player', 'enemy'] as const) {
    for (const condition of initial[target].conditions) {
      const duration = condition.duration
      if (
        !processed.has(condition.id) &&
        duration?.turnOwner === turn.owner &&
        duration.boundary === boundary
      ) {
        return boundaryConditionTransitions(
          initial,
          target,
          condition,
          turn,
          boundary,
        ).flatMap(
          (result) =>
            boundaryTransitions(
              result.state,
              turn,
              boundary,
              new Set([...processed, condition.id]),
            ).map(
              (nested) => ({
                state: nested.state,
                generatedResults: [
                  ...result.generatedResults,
                  ...nested.generatedResults,
                ],
              }),
              (value) =>
                `${stateKey(value.state)}:${value.generatedResults.map((event) => event.id).join(',')}`,
            ),
          (value) =>
            `${stateKey(value.state)}:${value.generatedResults.map((event) => event.id).join(',')}`,
        )
      }
    }
  }
  return Distribution.constant(
    { state: initial, generatedResults: [] },
    (value) => stateKey(value.state),
  )
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
  const validateChildren = (events: readonly EventConfig[]) => {
    for (const event of events) {
      assertUniqueId(event.id, 'Event', ids)
      // calculateEvent performs the event-specific validation without changing
      // sequence state; doing it here also validates action/save overrides.
      calculateEvent(event)
      if (event.type === 'conditional') validateChildren(event.events)
    }
  }
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
        if (
          activity.type !== 'action' &&
          activity.type !== 'bonus-action' &&
          activity.type !== 'generic'
        ) {
          throw new RangeError(
            'Activity type must be action, bonus-action, or generic',
          )
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
          if (event.type === 'conditional') {
            validateConditionRemovals(event.mustHave)
            validateConditionRemovals(event.mustNotHave)
            validateChildren(event.events)
          }
        }
      }
    }
  }
}

export function calculateSequence(config: SequenceConfig): SequenceResult {
  validateSequence(config)
  let states = Distribution.constant(
    normalizeSequenceState(config.initialState),
    stateKey,
  )
  const eventResults: Record<string, EventResult> = {}
  const totals = new Map<Outcome['type'], number>()
  const conditionTotals = new Map<string, ExpectedConditionApplications>()
  const weightedGeneratedResults: WeightedGeneratedResult[] = []
  const enemyDamageByRound: number[] = []
  let currentRoundEnemyDamage = 0

  // Conditional children are results in their own right.  Their transition is
  // explicitly gated per incoming branch, so a skipped child contributes a
  // zero execution probability rather than disappearing from the report.
  const collectConditionalResults = (
    conditional: ConditionalEventConfig,
    before: Distribution<SequenceState>,
  ) => {
    for (const child of conditional.events) {
      const transitions = before.flatMap(
        (state) =>
          conditionalMatches(conditional, state)
            ? eventTransitions(child, state)
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
      const result = resultFromTransitions(child, transitions, before)
      eventResults[child.id] = result
      if (
        result.outcome.type === 'expected-damage-against-enemies' ||
        result.outcome.type === 'expected-damage-against-players'
      ) {
        totals.set(
          result.outcome.type,
          (totals.get(result.outcome.type) ?? 0) +
            result.outcome.expectedDamage,
        )
        if (result.outcome.type === 'expected-damage-against-enemies') {
          currentRoundEnemyDamage += result.outcome.expectedDamage
        }
      }
      const target = eventTarget(child)
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
      if (child.type === 'conditional') collectConditionalResults(child, before)
    }
  }

  const collectBoundary = (
    boundaryDistribution: Distribution<BoundaryTransition>,
  ) => {
    for (const outcome of boundaryDistribution.outcomes) {
      for (const generated of outcome.value.generatedResults) {
        weightedGeneratedResults.push({
          generated,
          probability: outcome.probability,
        })
        const generatedOutcome = generated.result.outcome
        if (
          generatedOutcome.type === 'expected-damage-against-enemies' ||
          generatedOutcome.type === 'expected-damage-against-players'
        ) {
          totals.set(
            generatedOutcome.type,
            (totals.get(generatedOutcome.type) ?? 0) +
              outcome.probability * generatedOutcome.expectedDamage,
          )
          if (generatedOutcome.type === 'expected-damage-against-enemies') {
            currentRoundEnemyDamage +=
              outcome.probability * generatedOutcome.expectedDamage
          }
        }
      }
    }
    return boundaryDistribution.map((transition) => transition.state, stateKey)
  }

  for (const round of config.rounds) {
    currentRoundEnemyDamage = 0
    for (const turn of round.turns) {
      states = collectBoundary(
        states.flatMap(
          (state) => boundaryTransitions(state, turn, 'start'),
          (value) =>
            `${stateKey(value.state)}:${value.generatedResults.map((event) => event.id).join(',')}`,
        ),
      )
      for (const activity of turn.activities) {
        let activityBranches = states.map(
          (state) => ({
            state,
            active:
              activity.conditionGate === undefined ||
              conditionGateMatches(activity.conditionGate, state),
          }),
          (branch) => `${stateKey(branch.state)}:${branch.active}`,
        )
        for (const event of activity.events) {
          const before = activityBranches.map(
            (branch) => branch.state,
            stateKey,
          )
          const branchTransitions = activityBranches.flatMap(
            (branch) => {
              const transition =
                branch.active &&
                (!eventUsesActivityResource(event) ||
                  canExecuteActivity(branch.state, activity.owner))
                  ? eventTransitions(event, branch.state)
                  : Distribution.constant(
                      {
                        state: branch.state,
                        executed: false,
                        success: false,
                        critical: false,
                        exactDamage: 0,
                        appliedConditions: [],
                      },
                      transitionKey,
                    )
              return transition.map(
                (eventTransition) => ({
                  state: eventTransition.state,
                  active: branch.active,
                  eventTransition,
                }),
                (next) =>
                  `${stateKey(next.state)}:${next.active}:${transitionKey(next.eventTransition)}`,
              )
            },
            (next) =>
              `${stateKey(next.state)}:${next.active}:${transitionKey(next.eventTransition)}`,
          )
          const transitions = branchTransitions.map(
            (branch) => branch.eventTransition,
            transitionKey,
          )
          const result = resultFromTransitions(event, transitions, before)
          eventResults[event.id] = result
          if (event.type === 'conditional')
            collectConditionalResults(event, before)
          if (
            result.outcome.type === 'expected-damage-against-enemies' ||
            result.outcome.type === 'expected-damage-against-players'
          ) {
            totals.set(
              result.outcome.type,
              (totals.get(result.outcome.type) ?? 0) +
                result.outcome.expectedDamage,
            )
            if (result.outcome.type === 'expected-damage-against-enemies') {
              currentRoundEnemyDamage += result.outcome.expectedDamage
            }
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
          activityBranches = branchTransitions.map(
            (branch) => ({ state: branch.state, active: branch.active }),
            (branch) => `${stateKey(branch.state)}:${branch.active}`,
          )
        }
        states = activityBranches.map((branch) => branch.state, stateKey)
      }
      states = collectBoundary(
        states.flatMap(
          (state) => boundaryTransitions(state, turn, 'end'),
          (value) =>
            `${stateKey(value.state)}:${value.generatedResults.map((event) => event.id).join(',')}`,
        ),
      )
    }
    enemyDamageByRound.push(normalizeCalculation(currentRoundEnemyDamage))
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
    expectedEnemyDamageByRound: enemyDamageByRound,
    ...(weightedGeneratedResults.length > 0
      ? {
          generatedResults: aggregateGeneratedResults(weightedGeneratedResults),
        }
      : {}),
  }
}
