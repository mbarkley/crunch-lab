import { Distribution, sumDice } from './distribution'

export interface AttackConfig {
  readonly id: string
  readonly hitThreshold: number
  readonly damageDiceCount: number
  readonly damageDieSides: number
  readonly damageModifier: number
}

export interface AttackResult {
  readonly hitProbability: number
  readonly expectedDamage: number
}

function assertIntegerInRange(
  value: number,
  name: string,
  minimum: number,
  maximum?: number,
) {
  if (
    !Number.isInteger(value) ||
    value < minimum ||
    (maximum !== undefined && value > maximum)
  ) {
    const upperBound = maximum === undefined ? '' : ` and ${maximum}`
    throw new RangeError(
      `${name} must be an integer between ${minimum}${upperBound}`,
    )
  }
}

export function calculateAttack(config: AttackConfig): AttackResult {
  assertIntegerInRange(config.hitThreshold, 'Hit threshold', 1, 20)
  assertIntegerInRange(config.damageDiceCount, 'Damage dice count', 1)
  assertIntegerInRange(config.damageDieSides, 'Damage die sides', 2)
  if (!Number.isInteger(config.damageModifier)) {
    throw new RangeError('Damage modifier must be an integer')
  }

  const hitProbability = Distribution.die(20).probabilityOf(
    (roll) => roll >= config.hitThreshold,
  )
  const expectedDamageOnHit = sumDice(
    config.damageDiceCount,
    config.damageDieSides,
  ).expectedValue((damage) => Math.max(0, damage + config.damageModifier))

  return {
    hitProbability,
    expectedDamage: hitProbability * expectedDamageOnHit,
  }
}

export function calculateSequence(attacks: readonly AttackConfig[]) {
  const attackResults = attacks.map(calculateAttack)
  return {
    attackResults,
    expectedDamage: attackResults.reduce(
      (total, attack) => total + attack.expectedDamage,
      0,
    ),
  }
}
