import { Calculator, Plus, Target, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import type { AttackConfig, AttackResult } from './probability/attack'
import { calculateAttack } from './probability/attack'
import './App.css'

const DAMAGE_DIE_SIDES = [4, 6, 8, 10, 12, 20] as const

interface AttackDraft {
  readonly id: string
  readonly hitThreshold: string
  readonly damageDiceCount: string
  readonly damageDieSides: string
  readonly damageModifier: string
}

type AttackField = Exclude<keyof AttackDraft, 'id'>
type AttackErrors = Partial<Record<AttackField, string>>

interface AttackEvaluation {
  readonly errors: AttackErrors
  readonly result?: AttackResult
}

const DEFAULT_ATTACK: AttackDraft = {
  id: 'attack-1',
  hitThreshold: '12',
  damageDiceCount: '1',
  damageDieSides: '8',
  damageModifier: '0',
}

const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
})
const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 2,
})

function parseInteger(value: string) {
  if (value.trim() === '') return undefined
  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : undefined
}

function evaluateAttack(draft: AttackDraft): AttackEvaluation {
  const hitThreshold = parseInteger(draft.hitThreshold)
  const damageDiceCount = parseInteger(draft.damageDiceCount)
  const damageDieSides = parseInteger(draft.damageDieSides)
  const damageModifier = parseInteger(draft.damageModifier)
  const errors: AttackErrors = {}

  if (hitThreshold === undefined || hitThreshold < 1 || hitThreshold > 20) {
    errors.hitThreshold = 'Enter a whole number from 1 to 20.'
  }
  if (damageDiceCount === undefined || damageDiceCount < 1) {
    errors.damageDiceCount = 'Enter a whole number of at least 1.'
  }
  if (
    damageDieSides === undefined ||
    !DAMAGE_DIE_SIDES.includes(
      damageDieSides as (typeof DAMAGE_DIE_SIDES)[number],
    )
  ) {
    errors.damageDieSides = 'Choose an available die size.'
  }
  if (damageModifier === undefined) {
    errors.damageModifier = 'Enter a whole number.'
  }

  if (Object.keys(errors).length > 0) return { errors }

  const config: AttackConfig = {
    id: draft.id,
    hitThreshold: hitThreshold!,
    damageDiceCount: damageDiceCount!,
    damageDieSides: damageDieSides!,
    damageModifier: damageModifier!,
  }
  return { errors, result: calculateAttack(config) }
}

function App() {
  const [attacks, setAttacks] = useState<AttackDraft[]>([DEFAULT_ATTACK])
  const nextAttackId = useRef(2)
  const evaluations = attacks.map(evaluateAttack)
  const isSequenceValid = evaluations.every((evaluation) => evaluation.result)
  const totalExpectedDamage = isSequenceValid
    ? evaluations.reduce(
        (total, evaluation) => total + evaluation.result!.expectedDamage,
        0,
      )
    : undefined

  function updateAttack(id: string, field: AttackField, value: string) {
    setAttacks((current) =>
      current.map((attack) =>
        attack.id === id ? { ...attack, [field]: value } : attack,
      ),
    )
  }

  function addAttack() {
    const previous = attacks.at(-1) ?? DEFAULT_ATTACK
    const id = `attack-${nextAttackId.current}`
    nextAttackId.current += 1
    setAttacks((current) => [...current, { ...previous, id }])
  }

  function removeAttack(id: string) {
    setAttacks((current) => current.filter((attack) => attack.id !== id))
  }

  return (
    <main className="app-shell">
      <header className="masthead">
        <div className="brand">
          <Calculator aria-hidden="true" size={24} />
          <span>Crunch Lab</span>
        </div>
        <span className="status">Attack sequence</span>
      </header>

      <section className="intro" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">Dice probability workbench</p>
          <h1 id="page-title">Build your attack sequence.</h1>
          <p className="intro-copy">
            Configure each d20 roll and the damage it deals on a hit. Results
            update as you work.
          </p>
        </div>

        <aside className="total-card" aria-live="polite">
          <span>Expected damage</span>
          <strong>
            {totalExpectedDamage === undefined
              ? '—'
              : numberFormatter.format(totalExpectedDamage)}
          </strong>
          <small>
            {attacks.length} {attacks.length === 1 ? 'attack' : 'attacks'}
          </small>
        </aside>
      </section>

      <section className="workspace" aria-labelledby="sequence-title">
        <div className="workspace-heading">
          <div>
            <p className="eyebrow">Sequence</p>
            <h2 id="sequence-title">Attacks</h2>
          </div>
          <span className="workspace-note">
            Each attack rolls independently
          </span>
        </div>

        <ol className="attack-list">
          {attacks.map((attack, index) => {
            const evaluation = evaluations[index]
            const prefix = attack.id
            return (
              <li className="attack-step" key={attack.id}>
                <div className="step-marker" aria-hidden="true">
                  {index + 1}
                </div>
                <article
                  className="attack-card"
                  aria-labelledby={`${prefix}-title`}
                >
                  <div className="attack-heading">
                    <div>
                      <p className="attack-kicker">Attack {index + 1}</p>
                      <h3 id={`${prefix}-title`}>Roll a d20 to hit</h3>
                    </div>
                    <button
                      className="icon-button"
                      type="button"
                      aria-label={`Remove attack ${index + 1}`}
                      disabled={attacks.length === 1}
                      onClick={() => removeAttack(attack.id)}
                    >
                      <Trash2 aria-hidden="true" size={18} />
                    </button>
                  </div>

                  <div className="attack-body">
                    <div className="roll-section">
                      <Target aria-hidden="true" size={20} />
                      <label htmlFor={`${prefix}-threshold`}>
                        Minimum roll to hit
                      </label>
                      <input
                        id={`${prefix}-threshold`}
                        type="number"
                        inputMode="numeric"
                        min="1"
                        max="20"
                        step="1"
                        value={attack.hitThreshold}
                        aria-invalid={Boolean(evaluation.errors.hitThreshold)}
                        aria-describedby={
                          evaluation.errors.hitThreshold
                            ? `${prefix}-threshold-error`
                            : undefined
                        }
                        onChange={(event) =>
                          updateAttack(
                            attack.id,
                            'hitThreshold',
                            event.target.value,
                          )
                        }
                      />
                      <span className="roll-suffix">or higher on d20</span>
                      {evaluation.errors.hitThreshold && (
                        <span
                          className="field-error"
                          id={`${prefix}-threshold-error`}
                        >
                          {evaluation.errors.hitThreshold}
                        </span>
                      )}
                    </div>

                    <fieldset className="damage-section">
                      <legend>Damage on hit</legend>
                      <div className="damage-expression">
                        <div className="field">
                          <label htmlFor={`${prefix}-dice-count`}>Dice</label>
                          <input
                            id={`${prefix}-dice-count`}
                            type="number"
                            inputMode="numeric"
                            min="1"
                            step="1"
                            value={attack.damageDiceCount}
                            aria-invalid={Boolean(
                              evaluation.errors.damageDiceCount,
                            )}
                            aria-describedby={
                              evaluation.errors.damageDiceCount
                                ? `${prefix}-dice-count-error`
                                : undefined
                            }
                            onChange={(event) =>
                              updateAttack(
                                attack.id,
                                'damageDiceCount',
                                event.target.value,
                              )
                            }
                          />
                          {evaluation.errors.damageDiceCount && (
                            <span
                              className="field-error"
                              id={`${prefix}-dice-count-error`}
                            >
                              {evaluation.errors.damageDiceCount}
                            </span>
                          )}
                        </div>
                        <span className="operator" aria-hidden="true">
                          d
                        </span>
                        <div className="field">
                          <label htmlFor={`${prefix}-die-sides`}>
                            Die size
                          </label>
                          <select
                            id={`${prefix}-die-sides`}
                            value={attack.damageDieSides}
                            onChange={(event) =>
                              updateAttack(
                                attack.id,
                                'damageDieSides',
                                event.target.value,
                              )
                            }
                          >
                            {DAMAGE_DIE_SIDES.map((sides) => (
                              <option key={sides} value={sides}>
                                {sides}
                              </option>
                            ))}
                          </select>
                        </div>
                        <span className="operator" aria-hidden="true">
                          +
                        </span>
                        <div className="field">
                          <label htmlFor={`${prefix}-modifier`}>Modifier</label>
                          <input
                            id={`${prefix}-modifier`}
                            type="number"
                            inputMode="numeric"
                            step="1"
                            value={attack.damageModifier}
                            aria-invalid={Boolean(
                              evaluation.errors.damageModifier,
                            )}
                            aria-describedby={
                              evaluation.errors.damageModifier
                                ? `${prefix}-modifier-error`
                                : undefined
                            }
                            onChange={(event) =>
                              updateAttack(
                                attack.id,
                                'damageModifier',
                                event.target.value,
                              )
                            }
                          />
                          {evaluation.errors.damageModifier && (
                            <span
                              className="field-error"
                              id={`${prefix}-modifier-error`}
                            >
                              {evaluation.errors.damageModifier}
                            </span>
                          )}
                        </div>
                      </div>
                    </fieldset>
                  </div>

                  <div className="attack-results" aria-live="polite">
                    <span>
                      Hit chance
                      <strong>
                        {evaluation.result
                          ? percentFormatter.format(
                              evaluation.result.hitProbability,
                            )
                          : '—'}
                      </strong>
                    </span>
                    <span>
                      Expected damage
                      <strong>
                        {evaluation.result
                          ? numberFormatter.format(
                              evaluation.result.expectedDamage,
                            )
                          : '—'}
                      </strong>
                    </span>
                  </div>
                </article>
              </li>
            )
          })}
        </ol>

        <button className="add-button" type="button" onClick={addAttack}>
          <Plus aria-hidden="true" size={19} />
          Add attack
        </button>
      </section>
    </main>
  )
}

export default App
