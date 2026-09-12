/**
 * Exact finite probability distributions.
 *
 * The enumeration and aggregation approach is ported from mbarkley/jsim,
 * licensed under Apache License 2.0.
 */

export type OutcomeKey = string | number | symbol

export interface Outcome<T> {
  readonly value: T
  readonly probability: number
}

export type KeyOf<T> = (value: T) => OutcomeKey

const PROBABILITY_TOLERANCE = 1e-12

function assertFiniteInteger(value: number, name: string, minimum: number) {
  if (!Number.isInteger(value) || value < minimum) {
    throw new RangeError(
      `${name} must be an integer greater than or equal to ${minimum}`,
    )
  }
}

function assertProbability(probability: number) {
  if (!Number.isFinite(probability) || probability < 0) {
    throw new RangeError(
      'Outcome probabilities must be finite, non-negative numbers',
    )
  }
}

function aggregate<T>(outcomes: Iterable<Outcome<T>>, keyOf: KeyOf<T>) {
  const aggregated = new Map<OutcomeKey, Outcome<T>>()

  for (const outcome of outcomes) {
    assertProbability(outcome.probability)
    const key = keyOf(outcome.value)
    const existing = aggregated.get(key)
    aggregated.set(key, {
      value: existing?.value ?? outcome.value,
      probability: (existing?.probability ?? 0) + outcome.probability,
    })
  }

  return [...aggregated.values()].filter((outcome) => outcome.probability > 0)
}

export class Distribution<T> {
  readonly outcomes: readonly Outcome<T>[]

  private constructor(outcomes: readonly Outcome<T>[]) {
    this.outcomes = outcomes
  }

  static from<T>(
    outcomes: Iterable<Outcome<T>>,
    keyOf: KeyOf<T>,
  ): Distribution<T> {
    const aggregated = aggregate(outcomes, keyOf)
    if (aggregated.length === 0) {
      throw new RangeError(
        'A distribution must contain at least one positive-probability outcome',
      )
    }

    const total = aggregated.reduce(
      (sum, outcome) => sum + outcome.probability,
      0,
    )
    if (Math.abs(total - 1) > PROBABILITY_TOLERANCE) {
      throw new RangeError(
        `Outcome probabilities must total 1; received ${total}`,
      )
    }

    return new Distribution(aggregated)
  }

  static constant<T>(value: T, keyOf: KeyOf<T>): Distribution<T> {
    return Distribution.from([{ value, probability: 1 }], keyOf)
  }

  static uniform<T>(values: readonly T[], keyOf: KeyOf<T>): Distribution<T> {
    if (values.length === 0) {
      throw new RangeError('A uniform distribution requires at least one value')
    }

    const probability = 1 / values.length
    return Distribution.from(
      values.map((value) => ({ value, probability })),
      keyOf,
    )
  }

  static die(sides: number): Distribution<number> {
    assertFiniteInteger(sides, 'Die sides', 2)
    return Distribution.uniform(
      Array.from({ length: sides }, (_, index) => index + 1),
      (value) => value,
    )
  }

  map<U>(mapper: (value: T) => U, keyOf: KeyOf<U>): Distribution<U> {
    return Distribution.from(
      this.outcomes.map((outcome) => ({
        value: mapper(outcome.value),
        probability: outcome.probability,
      })),
      keyOf,
    )
  }

  combine<U, V>(
    other: Distribution<U>,
    combiner: (left: T, right: U) => V,
    keyOf: KeyOf<V>,
  ): Distribution<V> {
    const outcomes: Outcome<V>[] = []
    for (const left of this.outcomes) {
      for (const right of other.outcomes) {
        outcomes.push({
          value: combiner(left.value, right.value),
          probability: left.probability * right.probability,
        })
      }
    }
    return Distribution.from(outcomes, keyOf)
  }

  flatMap<U>(
    mapper: (value: T) => Distribution<U>,
    keyOf: KeyOf<U>,
  ): Distribution<U> {
    const outcomes: Outcome<U>[] = []
    for (const outcome of this.outcomes) {
      for (const mapped of mapper(outcome.value).outcomes) {
        outcomes.push({
          value: mapped.value,
          probability: outcome.probability * mapped.probability,
        })
      }
    }
    return Distribution.from(outcomes, keyOf)
  }

  probabilityOf(predicate: (value: T) => boolean): number {
    return this.outcomes.reduce(
      (sum, outcome) =>
        sum + (predicate(outcome.value) ? outcome.probability : 0),
      0,
    )
  }

  expectedValue(project: (value: T) => number): number {
    return this.outcomes.reduce(
      (sum, outcome) => sum + project(outcome.value) * outcome.probability,
      0,
    )
  }
}

export function sumDice(count: number, sides: number): Distribution<number> {
  assertFiniteInteger(count, 'Dice count', 1)
  const die = Distribution.die(sides)
  let total = die
  for (let index = 1; index < count; index += 1) {
    total = total.combine(
      die,
      (left, right) => left + right,
      (value) => value,
    )
  }
  return total
}

function selectedDice(
  count: number,
  sides: number,
  keep: number,
  descending: boolean,
): Distribution<number> {
  assertFiniteInteger(count, 'Dice count', 1)
  assertFiniteInteger(keep, 'Keep count', 1)
  if (keep > count) {
    throw new RangeError('Keep count cannot exceed dice count')
  }

  const die = Distribution.die(sides)
  let rolls: Distribution<readonly number[]> = die.map(
    (value) => [value],
    (value) => value.join(','),
  )
  for (let index = 1; index < count; index += 1) {
    rolls = rolls.combine(
      die,
      (values, value) => [...values, value],
      (values) => values.join(','),
    )
  }

  return rolls.map(
    (values) =>
      [...values]
        .sort((left, right) => (descending ? right - left : left - right))
        .slice(0, keep)
        .reduce((sum, value) => sum + value, 0),
    (value) => value,
  )
}

export function keepHighest(
  count: number,
  sides: number,
  keep: number,
): Distribution<number> {
  return selectedDice(count, sides, keep, true)
}

export function keepLowest(
  count: number,
  sides: number,
  keep: number,
): Distribution<number> {
  return selectedDice(count, sides, keep, false)
}
