import { describe, expect, it } from 'vitest'
import { Distribution, keepHighest, keepLowest, sumDice } from './distribution'

describe('Distribution', () => {
  it('enumerates a fair die exactly', () => {
    const die = Distribution.die(6)

    expect(die.outcomes).toEqual([
      { value: 1, probability: 1 / 6 },
      { value: 2, probability: 1 / 6 },
      { value: 3, probability: 1 / 6 },
      { value: 4, probability: 1 / 6 },
      { value: 5, probability: 1 / 6 },
      { value: 6, probability: 1 / 6 },
    ])
  })

  it('aggregates equivalent mapped outcomes', () => {
    const parity = Distribution.die(6).map(
      (value) => value % 2 === 0,
      (value) => String(value),
    )

    expect(parity.outcomes).toEqual([
      { value: false, probability: 1 / 2 },
      { value: true, probability: 1 / 2 },
    ])
  })

  it('calculates the 2d6 distribution and a comparison probability', () => {
    const result = sumDice(2, 6)

    expect(
      result.outcomes.find((outcome) => outcome.value === 2)?.probability,
    ).toBeCloseTo(1 / 36)
    expect(
      result.outcomes.find((outcome) => outcome.value === 7)?.probability,
    ).toBeCloseTo(6 / 36)
    expect(
      result.outcomes.find((outcome) => outcome.value === 12)?.probability,
    ).toBeCloseTo(1 / 36)
    expect(result.probabilityOf((value) => value > 10)).toBeCloseTo(3 / 36)
  })

  it('keeps the selected highest and lowest dice', () => {
    expect(
      keepHighest(2, 20, 1).probabilityOf((value) => value >= 12),
    ).toBeCloseTo(0.6975)
    expect(keepLowest(2, 6, 1).expectedValue((value) => value)).toBeCloseTo(
      91 / 36,
    )
  })

  it('models the Vex attack sequence from the guided-sequence reference', () => {
    type AttackState = { vexed: boolean; hits: number; damage: number }
    const stateKey = (state: AttackState) =>
      `${state.vexed}:${state.hits}:${state.damage}`
    let sequence = Distribution.constant<AttackState>(
      { vexed: false, hits: 0, damage: 0 },
      stateKey,
    )

    for (let attack = 0; attack < 5; attack += 1) {
      sequence = sequence.flatMap((state) => {
        const roll = state.vexed ? keepHighest(2, 20, 1) : Distribution.die(20)
        return roll.flatMap((value) => {
          if (value < 12) {
            return Distribution.constant({ ...state, vexed: false }, stateKey)
          }
          return Distribution.die(8).map(
            (damage) => ({
              vexed: true,
              hits: state.hits + 1,
              damage: state.damage + damage,
            }),
            stateKey,
          )
        }, stateKey)
      }, stateKey)
    }

    expect(sequence.expectedValue((state) => state.hits)).toBeCloseTo(
      2.79352931486133,
      8,
    )
    expect(sequence.expectedValue((state) => state.damage)).toBeCloseTo(
      12.570881916875985,
      8,
    )
  })

  it('rejects invalid probability and dice inputs', () => {
    expect(() =>
      Distribution.from([{ value: 'hit', probability: 0.8 }], (value) => value),
    ).toThrow(/total 1/)
    expect(() => Distribution.die(1)).toThrow(/Die sides/)
    expect(() => sumDice(0, 6)).toThrow(/Dice count/)
    expect(() => keepHighest(2, 20, 3)).toThrow(/cannot exceed/)
  })
})
