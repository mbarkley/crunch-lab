import { Distribution } from './distribution'

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
export type ConditionType = 'vex' | 'sap'
export type ConditionConfig =
  { readonly type: 'vex' } | { readonly type: 'sap' }
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

export type Combatant = 'player' | 'enemy'
export type ActivityType = 'action' | 'bonus-action'

export interface CombatantState {
  readonly vex: boolean
  readonly sap: boolean
  readonly heroicInspiration: boolean
  readonly damageImmunities: readonly DamageType[]
  readonly damageResistances: readonly DamageType[]
  readonly damageVulnerabilities: readonly DamageType[]
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
const CONDITION_TYPES: readonly ConditionType[] = ['vex', 'sap']
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
  },
  enemy: {
    vex: false,
    sap: false,
    heroicInspiration: false,
    damageImmunities: [],
    damageResistances: [],
    damageVulnerabilities: [],
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

function validateConditions(conditions: readonly ConditionConfig[]) {
  for (const condition of conditions) {
    if (!CONDITION_TYPES.includes(condition.type)) {
      throw new RangeError('Condition must be vex or sap')
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

function validateCombatantState(state: CombatantState) {
  validateDamageTypes(state.damageImmunities, 'Damage immunities')
  validateDamageTypes(state.damageResistances, 'Damage resistances')
  validateDamageTypes(state.damageVulnerabilities, 'Damage vulnerabilities')
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
  const resistant = state.damageResistances.includes(type)
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
      ].join(':')
    })
    .join('|')
}

function transitionKey(transition: EventTransition) {
  return [
    stateKey(transition.state),
    transition.success,
    transition.critical,
    transition.exactDamage,
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
      const appliedConditions = [
        ...new Set(config.hitConditions.map((condition) => condition.type)),
      ]
      const stateAfterConditions = applyConditions(
        stateAfterD20,
        target,
        appliedConditions,
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
            stateAfterConditions,
            attacker,
            damage.inspirationSpent,
          ),
          success: true,
          critical,
          exactDamage: damage.damage,
          appliedConditions,
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
  const succeeds = (roll: number) =>
    roll + config.saveModifier + bonus >= config.saveDc
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
      const success = !automaticFailure && succeeds(roll)
      const d20Spent = !initialSuccess && canRerollD20
      const stateAfterD20 = spendInspiration(state, target, d20Spent)
      const consequence = success ? config.successDamage : config.failureDamage
      const appliedConditions = [
        ...new Set(
          (success ? config.successConditions : config.failureConditions).map(
            (condition) => condition.type,
          ),
        ),
      ]
      const stateAfterConditions = applyConditions(
        stateAfterD20,
        target,
        appliedConditions,
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
            stateAfterConditions,
            source,
            damage.inspirationSpent,
          ),
          success,
          critical: false,
          exactDamage: damage.damage,
          appliedConditions,
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
  validateCombatantState(config.initialState.player)
  validateCombatantState(config.initialState.enemy)
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
