import { Calculator, Plus, Shield, Swords, Trash2, X } from 'lucide-react'
import { useRef, useState } from 'react'
import type {
  DamageConsequence,
  EventConfig,
  EventResult,
  Outcome,
} from './probability/event'
import { calculateEvent, calculateSequence } from './probability/event'
import './App.css'

const DAMAGE_DIE_SIDES = [4, 6, 8, 10, 12, 20] as const
const DAMAGE_CONSEQUENCES: readonly {
  value: DamageConsequence
  label: string
}[] = [
  { value: 'none', label: 'No damage' },
  { value: 'half', label: 'Half damage' },
  { value: 'full', label: 'Full damage' },
]

type EventType = EventConfig['type']
type OutcomeType = Outcome['type']

interface DamageDraft {
  readonly damageDiceCount: string
  readonly damageDieSides: string
  readonly damageModifier: string
}

interface AttackDraft extends DamageDraft {
  readonly id: string
  readonly type: 'player-attack' | 'enemy-attack'
  readonly armorClass: string
  readonly attackModifier: string
}

interface SavingThrowDraft extends DamageDraft {
  readonly id: string
  readonly type: 'player-saving-throw' | 'enemy-saving-throw'
  readonly saveDc: string
  readonly saveModifier: string
  readonly failureDamage: DamageConsequence
  readonly successDamage: DamageConsequence
}

type EventDraft = AttackDraft | SavingThrowDraft
type EventField =
  | keyof DamageDraft
  | 'armorClass'
  | 'attackModifier'
  | 'saveDc'
  | 'saveModifier'
  | 'failureDamage'
  | 'successDamage'
type EventErrors = Partial<Record<EventField, string>>

interface EventEvaluation {
  readonly errors: EventErrors
  readonly config?: EventConfig
  readonly result?: EventResult
}

const DEFAULT_DAMAGE: DamageDraft = {
  damageDiceCount: '1',
  damageDieSides: '8',
  damageModifier: '0',
}

const EVENT_LABELS: Record<EventType, string> = {
  'player-attack': 'Player attack',
  'enemy-attack': 'Enemy attack',
  'player-saving-throw': 'Player saving throw',
  'enemy-saving-throw': 'Enemy saving throw',
}

const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
})
const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 2,
})

function createEvent(type: EventType, id: string): EventDraft {
  if (type === 'player-attack' || type === 'enemy-attack') {
    return {
      id,
      type,
      armorClass: '12',
      attackModifier: '0',
      ...DEFAULT_DAMAGE,
    }
  }
  return {
    id,
    type,
    saveDc: '12',
    saveModifier: '0',
    failureDamage: 'full',
    successDamage: 'half',
    ...DEFAULT_DAMAGE,
  }
}

function parseInteger(value: string) {
  if (value.trim() === '') return undefined
  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : undefined
}

function isAttackDraft(draft: EventDraft): draft is AttackDraft {
  return draft.type === 'player-attack' || draft.type === 'enemy-attack'
}

function evaluateEvent(draft: EventDraft): EventEvaluation {
  const damageDiceCount = parseInteger(draft.damageDiceCount)
  const damageDieSides = parseInteger(draft.damageDieSides)
  const damageModifier = parseInteger(draft.damageModifier)
  const errors: EventErrors = {}

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

  if (isAttackDraft(draft)) {
    const armorClass = parseInteger(draft.armorClass)
    const attackModifier = parseInteger(draft.attackModifier)
    if (armorClass === undefined || armorClass < 1) {
      errors.armorClass = 'Enter a whole number of at least 1.'
    }
    if (attackModifier === undefined) {
      errors.attackModifier = 'Enter a whole number.'
    }
    if (Object.keys(errors).length > 0) return { errors }

    const config: EventConfig = {
      id: draft.id,
      type: draft.type,
      armorClass: armorClass!,
      attackModifier: attackModifier!,
      damageDiceCount: damageDiceCount!,
      damageDieSides: damageDieSides!,
      damageModifier: damageModifier!,
    }
    return { errors, config, result: calculateEvent(config) }
  }

  const saveDc = parseInteger(draft.saveDc)
  const saveModifier = parseInteger(draft.saveModifier)
  if (saveDc === undefined || saveDc < 1) {
    errors.saveDc = 'Enter a whole number of at least 1.'
  }
  if (saveModifier === undefined) {
    errors.saveModifier = 'Enter a whole number.'
  }
  if (Object.keys(errors).length > 0) return { errors }

  const config: EventConfig = {
    id: draft.id,
    type: draft.type,
    saveDc: saveDc!,
    saveModifier: saveModifier!,
    damageDiceCount: damageDiceCount!,
    damageDieSides: damageDieSides!,
    damageModifier: damageModifier!,
    failureDamage: draft.failureDamage,
    successDamage: draft.successDamage,
  }
  return { errors, config, result: calculateEvent(config) }
}

function outcomeTypeFor(event: EventDraft): OutcomeType {
  return event.type === 'player-attack' || event.type === 'enemy-saving-throw'
    ? 'expected-damage-against-enemies'
    : 'expected-damage-against-players'
}

interface FieldProps {
  event: EventDraft
  errors: EventErrors
  update: (field: EventField, value: string) => void
}

function DamageFields({ event, errors, update }: FieldProps) {
  const prefix = event.id
  return (
    <fieldset className="damage-section">
      <legend>
        {event.type === 'player-attack' || event.type === 'enemy-attack'
          ? 'Damage on hit'
          : 'Damage roll'}
      </legend>
      <div className="damage-expression">
        <div className="field">
          <label htmlFor={`${prefix}-dice-count`}>Dice</label>
          <input
            id={`${prefix}-dice-count`}
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            value={event.damageDiceCount}
            aria-invalid={Boolean(errors.damageDiceCount)}
            aria-describedby={
              errors.damageDiceCount ? `${prefix}-dice-count-error` : undefined
            }
            onChange={(change) =>
              update('damageDiceCount', change.target.value)
            }
          />
          {errors.damageDiceCount && (
            <span className="field-error" id={`${prefix}-dice-count-error`}>
              {errors.damageDiceCount}
            </span>
          )}
        </div>
        <span className="operator" aria-hidden="true">
          d
        </span>
        <div className="field">
          <label htmlFor={`${prefix}-die-sides`}>Die size</label>
          <select
            id={`${prefix}-die-sides`}
            value={event.damageDieSides}
            onChange={(change) => update('damageDieSides', change.target.value)}
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
          <label htmlFor={`${prefix}-damage-modifier`}>Modifier</label>
          <input
            id={`${prefix}-damage-modifier`}
            type="number"
            inputMode="numeric"
            step="1"
            value={event.damageModifier}
            aria-invalid={Boolean(errors.damageModifier)}
            aria-describedby={
              errors.damageModifier
                ? `${prefix}-damage-modifier-error`
                : undefined
            }
            onChange={(change) => update('damageModifier', change.target.value)}
          />
          {errors.damageModifier && (
            <span
              className="field-error"
              id={`${prefix}-damage-modifier-error`}
            >
              {errors.damageModifier}
            </span>
          )}
        </div>
      </div>
    </fieldset>
  )
}

function AttackRollFields({ event, errors, update }: FieldProps) {
  if (event.type !== 'player-attack' && event.type !== 'enemy-attack') {
    return null
  }
  return (
    <fieldset className="roll-section">
      <legend>Attack roll</legend>
      <Swords aria-hidden="true" size={20} />
      <div className="roll-fields">
        <div className="field">
          <label htmlFor={`${event.id}-armor-class`}>Target AC</label>
          <input
            id={`${event.id}-armor-class`}
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            value={event.armorClass}
            aria-invalid={Boolean(errors.armorClass)}
            aria-describedby={
              errors.armorClass ? `${event.id}-armor-class-error` : undefined
            }
            onChange={(change) => update('armorClass', change.target.value)}
          />
          {errors.armorClass && (
            <span className="field-error" id={`${event.id}-armor-class-error`}>
              {errors.armorClass}
            </span>
          )}
        </div>
        <div className="field">
          <label htmlFor={`${event.id}-attack-modifier`}>Attack modifier</label>
          <input
            id={`${event.id}-attack-modifier`}
            type="number"
            inputMode="numeric"
            step="1"
            value={event.attackModifier}
            aria-invalid={Boolean(errors.attackModifier)}
            aria-describedby={
              errors.attackModifier
                ? `${event.id}-attack-modifier-error`
                : undefined
            }
            onChange={(change) => update('attackModifier', change.target.value)}
          />
          {errors.attackModifier && (
            <span
              className="field-error"
              id={`${event.id}-attack-modifier-error`}
            >
              {errors.attackModifier}
            </span>
          )}
        </div>
      </div>
    </fieldset>
  )
}

function SavingThrowFields({ event, errors, update }: FieldProps) {
  if (
    event.type !== 'player-saving-throw' &&
    event.type !== 'enemy-saving-throw'
  ) {
    return null
  }
  return (
    <>
      <fieldset className="roll-section">
        <legend>Saving throw</legend>
        <Shield aria-hidden="true" size={20} />
        <div className="roll-fields">
          <div className="field">
            <label htmlFor={`${event.id}-save-dc`}>Save DC</label>
            <input
              id={`${event.id}-save-dc`}
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              value={event.saveDc}
              aria-invalid={Boolean(errors.saveDc)}
              aria-describedby={
                errors.saveDc ? `${event.id}-save-dc-error` : undefined
              }
              onChange={(change) => update('saveDc', change.target.value)}
            />
            {errors.saveDc && (
              <span className="field-error" id={`${event.id}-save-dc-error`}>
                {errors.saveDc}
              </span>
            )}
          </div>
          <div className="field">
            <label htmlFor={`${event.id}-save-modifier`}>Save modifier</label>
            <input
              id={`${event.id}-save-modifier`}
              type="number"
              inputMode="numeric"
              step="1"
              value={event.saveModifier}
              aria-invalid={Boolean(errors.saveModifier)}
              aria-describedby={
                errors.saveModifier
                  ? `${event.id}-save-modifier-error`
                  : undefined
              }
              onChange={(change) => update('saveModifier', change.target.value)}
            />
            {errors.saveModifier && (
              <span
                className="field-error"
                id={`${event.id}-save-modifier-error`}
              >
                {errors.saveModifier}
              </span>
            )}
          </div>
        </div>
      </fieldset>
      <fieldset className="consequence-section">
        <legend>Damage consequences</legend>
        <div className="consequence-fields">
          <div className="field">
            <label htmlFor={`${event.id}-failure-damage`}>On failure</label>
            <select
              id={`${event.id}-failure-damage`}
              value={event.failureDamage}
              onChange={(change) =>
                update('failureDamage', change.target.value)
              }
            >
              {DAMAGE_CONSEQUENCES.map((consequence) => (
                <option key={consequence.value} value={consequence.value}>
                  {consequence.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor={`${event.id}-success-damage`}>On success</label>
            <select
              id={`${event.id}-success-damage`}
              value={event.successDamage}
              onChange={(change) =>
                update('successDamage', change.target.value)
              }
            >
              {DAMAGE_CONSEQUENCES.map((consequence) => (
                <option key={consequence.value} value={consequence.value}>
                  {consequence.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>
    </>
  )
}

function App() {
  const [events, setEvents] = useState<EventDraft[]>([
    createEvent('player-attack', 'event-1'),
  ])
  const [isChooserOpen, setChooserOpen] = useState(false)
  const nextEventId = useRef(2)
  const evaluations = events.map(evaluateEvent)
  const isSequenceValid = evaluations.every((evaluation) => evaluation.config)
  const sequence = isSequenceValid
    ? calculateSequence(evaluations.map((evaluation) => evaluation.config!))
    : undefined
  const shownOutcomeTypes = [...new Set(events.map(outcomeTypeFor))]

  function updateEvent(id: string, field: EventField, value: string) {
    setEvents((current) =>
      current.map((event) =>
        event.id === id ? ({ ...event, [field]: value } as EventDraft) : event,
      ),
    )
  }

  function addEvent(type: EventType) {
    const id = `event-${nextEventId.current}`
    nextEventId.current += 1
    setEvents((current) => [...current, createEvent(type, id)])
    setChooserOpen(false)
  }

  function removeEvent(id: string) {
    setEvents((current) => current.filter((event) => event.id !== id))
  }

  return (
    <main className="app-shell">
      <header className="masthead">
        <div className="brand">
          <Calculator aria-hidden="true" size={24} />
          <span>Crunch Lab</span>
        </div>
        <span className="status">Event sequence</span>
      </header>

      <section className="intro" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">Dice probability workbench</p>
          <h1 id="page-title">Build your event sequence.</h1>
          <p className="intro-copy">
            Combine attacks and saving throws from either side. Outcomes update
            as you work.
          </p>
        </div>

        <div className="totals" aria-live="polite">
          {shownOutcomeTypes.map((type) => {
            const outcome = sequence?.outcomes.find(
              (item) => item.type === type,
            )
            const againstEnemies = type === 'expected-damage-against-enemies'
            return (
              <aside className="total-card" key={type}>
                <span>
                  Expected damage against{' '}
                  {againstEnemies ? 'enemies' : 'players'}
                </span>
                <strong>
                  {outcome === undefined
                    ? '—'
                    : numberFormatter.format(outcome.expectedDamage)}
                </strong>
                <small>
                  {events.length} {events.length === 1 ? 'event' : 'events'}
                </small>
              </aside>
            )
          })}
        </div>
      </section>

      <section className="workspace" aria-labelledby="sequence-title">
        <div className="workspace-heading">
          <div>
            <p className="eyebrow">Sequence</p>
            <h2 id="sequence-title">Events</h2>
          </div>
          <span className="workspace-note">Each event rolls independently</span>
        </div>

        <ol className="attack-list">
          {events.map((event, index) => {
            const evaluation = evaluations[index]
            const isAttack =
              event.type === 'player-attack' || event.type === 'enemy-attack'
            const target =
              outcomeTypeFor(event) === 'expected-damage-against-enemies'
                ? 'enemies'
                : 'players'
            return (
              <li className="attack-step" key={event.id}>
                <div className="step-marker" aria-hidden="true">
                  {index + 1}
                </div>
                <article
                  className="attack-card"
                  aria-labelledby={`${event.id}-title`}
                >
                  <div className="attack-heading">
                    <div>
                      <p className="attack-kicker">Event {index + 1}</p>
                      <h3 id={`${event.id}-title`}>
                        {EVENT_LABELS[event.type]}
                      </h3>
                    </div>
                    <button
                      className="icon-button"
                      type="button"
                      aria-label={`Remove event ${index + 1}`}
                      disabled={events.length === 1}
                      onClick={() => removeEvent(event.id)}
                    >
                      <Trash2 aria-hidden="true" size={18} />
                    </button>
                  </div>

                  <div className={isAttack ? 'attack-body' : 'saving-body'}>
                    {isAttack ? (
                      <AttackRollFields
                        event={event}
                        errors={evaluation.errors}
                        update={(field, value) =>
                          updateEvent(event.id, field, value)
                        }
                      />
                    ) : (
                      <SavingThrowFields
                        event={event}
                        errors={evaluation.errors}
                        update={(field, value) =>
                          updateEvent(event.id, field, value)
                        }
                      />
                    )}
                    <DamageFields
                      event={event}
                      errors={evaluation.errors}
                      update={(field, value) =>
                        updateEvent(event.id, field, value)
                      }
                    />
                  </div>

                  <div className="attack-results" aria-live="polite">
                    <span>
                      {isAttack ? 'Hit chance' : 'Save chance'}
                      <strong>
                        {evaluation.result
                          ? percentFormatter.format(
                              evaluation.result.successProbability,
                            )
                          : '—'}
                      </strong>
                    </span>
                    <span>
                      Expected damage against {target}
                      <strong>
                        {evaluation.result
                          ? numberFormatter.format(
                              evaluation.result.outcome.expectedDamage,
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

        <div className="add-event">
          <button
            className="add-button"
            type="button"
            aria-expanded={isChooserOpen}
            aria-controls="event-chooser"
            onClick={() => setChooserOpen((current) => !current)}
          >
            {isChooserOpen ? (
              <X aria-hidden="true" size={19} />
            ) : (
              <Plus aria-hidden="true" size={19} />
            )}
            {isChooserOpen ? 'Close' : 'Add event'}
          </button>
          {isChooserOpen && (
            <div className="event-chooser" id="event-chooser">
              {(Object.keys(EVENT_LABELS) as EventType[]).map((type) => (
                <button key={type} type="button" onClick={() => addEvent(type)}>
                  {type.includes('attack') ? (
                    <Swords aria-hidden="true" size={18} />
                  ) : (
                    <Shield aria-hidden="true" size={18} />
                  )}
                  {EVENT_LABELS[type]}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

export default App
