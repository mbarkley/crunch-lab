import { Distribution, sumDice } from './distribution'

export interface DamageRollConfig {
  readonly damageDiceCount: number
  readonly damageDieSides: number
  readonly damageModifier: number
}

interface BaseEventConfig extends DamageRollConfig {
  readonly id: string
}

export interface PlayerAttackConfig extends BaseEventConfig {
  readonly type: 'player-attack'
  readonly armorClass: number
  readonly attackModifier: number
}

export interface EnemyAttackConfig extends BaseEventConfig {
  readonly type: 'enemy-attack'
  readonly armorClass: number
  readonly attackModifier: number
}

export type AttackConfig = PlayerAttackConfig | EnemyAttackConfig
export type DamageConsequence = 'none' | 'half' | 'full'

interface BaseSavingThrowConfig extends BaseEventConfig {
  readonly saveDc: number
  readonly saveModifier: number
  readonly failureDamage: DamageConsequence
  readonly successDamage: DamageConsequence
}

export interface PlayerSavingThrowConfig extends BaseSavingThrowConfig {
  readonly type: 'player-saving-throw'
}

export interface EnemySavingThrowConfig extends BaseSavingThrowConfig {
  readonly type: 'enemy-saving-throw'
}

export type SavingThrowConfig = PlayerSavingThrowConfig | EnemySavingThrowConfig

export type EventConfig = AttackConfig | SavingThrowConfig

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

export interface EventResult {
  readonly successProbability: number
  readonly outcome: Outcome
}

export interface SequenceResult {
  readonly eventResults: readonly EventResult[]
  readonly outcomes: readonly Outcome[]
}

const CALCULATION_PRECISION = 1e12
function normalizeCalculation(value: number) {
  return Math.round(value * CALCULATION_PRECISION) / CALCULATION_PRECISION
}

const DAMAGE_CONSEQUENCES: readonly DamageConsequence[] = [
  'none',
  'half',
  'full',
]

function assertInteger(value: number, name: string, minimum?: number) {
  if (!Number.isInteger(value) || (minimum !== undefined && value < minimum)) {
    const lowerBound = minimum === undefined ? '' : ` of at least ${minimum}`
    throw new RangeError(`${name} must be an integer${lowerBound}`)
  }
}

function validateDamageRoll(config: DamageRollConfig) {
  assertInteger(config.damageDiceCount, 'Damage dice count', 1)
  assertInteger(config.damageDieSides, 'Damage die sides', 2)
  assertInteger(config.damageModifier, 'Damage modifier')
}

function damageDistribution(config: DamageRollConfig) {
  validateDamageRoll(config)
  return sumDice(config.damageDiceCount, config.damageDieSides).map(
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

export function calculateAttack(config: AttackConfig): EventResult {
  assertInteger(config.armorClass, 'Armor class', 1)
  assertInteger(config.attackModifier, 'Attack modifier')
  const damage = damageDistribution(config)
  const successProbability = Distribution.die(20).probabilityOf(
    (roll) =>
      roll === 20 ||
      (roll !== 1 && roll + config.attackModifier >= config.armorClass),
  )

  return {
    successProbability,
    outcome: damageOutcome(
      config.type === 'player-attack' ? 'enemies' : 'players',
      successProbability * expectedDamage(damage, 'full'),
    ),
  }
}

export function calculateSavingThrow(config: SavingThrowConfig): EventResult {
  assertInteger(config.saveDc, 'Save DC', 1)
  assertInteger(config.saveModifier, 'Save modifier')
  if (!DAMAGE_CONSEQUENCES.includes(config.failureDamage)) {
    throw new RangeError('Failure damage must be none, half, or full')
  }
  if (!DAMAGE_CONSEQUENCES.includes(config.successDamage)) {
    throw new RangeError('Success damage must be none, half, or full')
  }

  const damage = damageDistribution(config)
  const saveRoll = Distribution.die(20)
  const successProbability = saveRoll.probabilityOf(
    (roll) => roll + config.saveModifier >= config.saveDc,
  )
  const failureProbability = saveRoll.probabilityOf(
    (roll) => roll + config.saveModifier < config.saveDc,
  )
  const averageDamage =
    failureProbability * expectedDamage(damage, config.failureDamage) +
    successProbability * expectedDamage(damage, config.successDamage)

  return {
    successProbability,
    outcome: damageOutcome(
      config.type === 'enemy-saving-throw' ? 'enemies' : 'players',
      averageDamage,
    ),
  }
}

export function calculateEvent(config: EventConfig): EventResult {
  switch (config.type) {
    case 'player-attack':
    case 'enemy-attack':
      return calculateAttack(config)
    case 'player-saving-throw':
    case 'enemy-saving-throw':
      return calculateSavingThrow(config)
  }
}

export function calculateSequence(
  events: readonly EventConfig[],
): SequenceResult {
  const eventResults = events.map(calculateEvent)
  const totals = new Map<Outcome['type'], number>()

  for (const result of eventResults) {
    totals.set(
      result.outcome.type,
      (totals.get(result.outcome.type) ?? 0) + result.outcome.expectedDamage,
    )
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
  }
}
