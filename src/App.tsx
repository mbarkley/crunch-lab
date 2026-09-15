import {
  Calculator,
  ChevronDown,
  ChevronUp,
  Copy,
  GripVertical,
  Plus,
  Shield,
  Swords,
  Trash2,
  X,
} from 'lucide-react'
import { type DragEvent, useRef, useState } from 'react'
import type {
  Ability,
  AttackRollMode,
  ConditionConfig,
  ConditionTarget,
  ConditionType,
  Cover,
  DamageConsequence,
  DamageType,
  EventConfig,
  EventResult,
  HeroicInspirationPolicy,
  Outcome,
  SavingThrowRollMode,
} from './probability/event'
import {
  calculateEvent,
  calculateSequence,
  INITIAL_SEQUENCE_STATE,
} from './probability/event'
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
const ATTACK_ROLL_MODES: readonly {
  value: AttackRollMode
  label: string
}[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'advantage', label: 'Advantage' },
  { value: 'disadvantage', label: 'Disadvantage' },
]
const SAVE_ROLL_MODES: readonly {
  value: SavingThrowRollMode
  label: string
}[] = [
  ...ATTACK_ROLL_MODES,
  { value: 'automatic-failure', label: 'Automatic failure' },
]
const ABILITIES: readonly { value: Ability; label: string }[] = [
  { value: 'strength', label: 'Strength' },
  { value: 'dexterity', label: 'Dexterity' },
  { value: 'constitution', label: 'Constitution' },
  { value: 'intelligence', label: 'Intelligence' },
  { value: 'wisdom', label: 'Wisdom' },
  { value: 'charisma', label: 'Charisma' },
]
const COVER_OPTIONS: readonly { value: Cover; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'half', label: 'Half (+2)' },
  { value: 'three-quarters', label: 'Three-quarters (+5)' },
]
const DAMAGE_TYPES: readonly { value: DamageType; label: string }[] = [
  { value: 'acid', label: 'Acid' },
  { value: 'bludgeoning', label: 'Bludgeoning' },
  { value: 'cold', label: 'Cold' },
  { value: 'fire', label: 'Fire' },
  { value: 'force', label: 'Force' },
  { value: 'lightning', label: 'Lightning' },
  { value: 'necrotic', label: 'Necrotic' },
  { value: 'piercing', label: 'Piercing' },
  { value: 'poison', label: 'Poison' },
  { value: 'psychic', label: 'Psychic' },
  { value: 'radiant', label: 'Radiant' },
  { value: 'slashing', label: 'Slashing' },
  { value: 'thunder', label: 'Thunder' },
]
const CONDITION_TYPES: readonly ConditionType[] = ['vex', 'sap']
const CONDITION_LABELS: Record<ConditionType, string> = {
  vex: 'Vex',
  sap: 'Sap',
}

type EventType = EventConfig['type']
type OutcomeType = Outcome['type']

interface DamagePoolDraft {
  readonly id: string
  readonly diceCount: string
  readonly dieSides: string
  readonly modifier: string
  readonly damageType: DamageType
}

interface DamageDraft {
  readonly damagePools: readonly DamagePoolDraft[]
}

type InspirationMode = 'none' | HeroicInspirationPolicy['type']

interface InspirationDraft {
  readonly heroicInspirationMode: InspirationMode
  readonly heroicInspirationPoolId: string
  readonly heroicInspirationThreshold: string
}

interface AttackDraft extends DamageDraft, InspirationDraft {
  readonly id: string
  readonly type: 'player-attack' | 'enemy-attack'
  readonly armorClass: string
  readonly attackModifier: string
  readonly rollMode: AttackRollMode
  readonly cover: Cover
  readonly hitConditions: readonly ConditionConfig[]
}

interface SavingThrowDraft extends DamageDraft, InspirationDraft {
  readonly id: string
  readonly type: 'player-saving-throw' | 'enemy-saving-throw'
  readonly saveDc: string
  readonly saveModifier: string
  readonly saveAbility: Ability
  readonly rollMode: SavingThrowRollMode
  readonly cover: Cover
  readonly failureDamage: DamageConsequence
  readonly successDamage: DamageConsequence
  readonly failureConditions: readonly ConditionConfig[]
  readonly successConditions: readonly ConditionConfig[]
}

type EventDraft = AttackDraft | SavingThrowDraft
type EventField =
  | 'armorClass'
  | 'attackModifier'
  | 'saveDc'
  | 'saveModifier'
  | 'failureDamage'
  | 'successDamage'
  | 'rollMode'
  | 'hitConditions'
  | 'failureConditions'
  | 'successConditions'
  | 'saveAbility'
  | 'cover'
  | 'heroicInspirationMode'
  | 'heroicInspirationPoolId'
  | 'heroicInspirationThreshold'
type EventFieldValue = string | readonly ConditionConfig[]
type DamagePoolField = 'diceCount' | 'dieSides' | 'modifier' | 'damageType'

interface DamagePoolErrors {
  diceCount?: string
  dieSides?: string
  modifier?: string
}

interface EventErrors {
  damagePools?: Readonly<Record<string, DamagePoolErrors>>
  armorClass?: string
  attackModifier?: string
  saveDc?: string
  saveModifier?: string
  heroicInspiration?: string
}

interface EventEvaluation {
  readonly errors: EventErrors
  readonly config?: EventConfig
  readonly result?: EventResult
}

function createDefaultDamage(eventId: string): DamageDraft {
  return {
    damagePools: [
      {
        id: eventId + '-damage-0',
        diceCount: '1',
        dieSides: '8',
        modifier: '0',
        damageType: 'slashing',
      },
    ],
  }
}

function createDefaultInspiration(eventId: string): InspirationDraft {
  return {
    heroicInspirationMode: 'none',
    heroicInspirationPoolId: eventId + '-damage-0',
    heroicInspirationThreshold: '1',
  }
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
      rollMode: 'normal',
      cover: 'none',
      hitConditions: [],
      ...createDefaultDamage(id),
      ...createDefaultInspiration(id),
    }
  }
  return {
    id,
    type,
    saveDc: '12',
    saveModifier: '0',
    saveAbility: 'dexterity',
    rollMode: 'normal',
    cover: 'none',
    failureDamage: 'full',
    successDamage: 'half',
    failureConditions: [],
    successConditions: [],
    ...createDefaultDamage(id),
    ...createDefaultInspiration(id),
  }
}

function duplicateEvent(
  event: EventDraft,
  id: string,
  createDamagePoolId: () => string,
): EventDraft {
  const poolIds = new Map<string, string>()
  const damagePools = event.damagePools.map((pool) => {
    const nextId = createDamagePoolId()
    poolIds.set(pool.id, nextId)
    return { ...pool, id: nextId }
  })
  return {
    ...event,
    id,
    damagePools,
    heroicInspirationPoolId:
      poolIds.get(event.heroicInspirationPoolId) ?? damagePools[0].id,
    ...(isAttackDraft(event)
      ? {
          hitConditions: event.hitConditions.map((condition) => ({
            ...condition,
          })),
        }
      : {
          failureConditions: event.failureConditions.map((condition) => ({
            ...condition,
          })),
          successConditions: event.successConditions.map((condition) => ({
            ...condition,
          })),
        }),
  } as EventDraft
}

function parseInteger(value: string) {
  if (value.trim() === '') return undefined
  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : undefined
}

function isAttackDraft(draft: EventDraft): draft is AttackDraft {
  return draft.type === 'player-attack' || draft.type === 'enemy-attack'
}

function inspirationPolicyFor(
  draft: EventDraft,
  errors: EventErrors,
): HeroicInspirationPolicy | undefined {
  if (draft.heroicInspirationMode === 'none') return undefined
  if (draft.heroicInspirationMode === 'd20-after-failure') {
    return { type: 'd20-after-failure' }
  }
  const threshold = parseInteger(draft.heroicInspirationThreshold)
  if (
    threshold === undefined ||
    threshold < 1 ||
    threshold > 20 ||
    !draft.damagePools.some((pool) => pool.id === draft.heroicInspirationPoolId)
  ) {
    errors.heroicInspiration =
      'Choose a damage pool and a threshold from 1 through 20.'
    return undefined
  }
  return {
    type: 'damage-pool-threshold',
    damagePoolId: draft.heroicInspirationPoolId,
    threshold,
  }
}

function evaluateEvent(draft: EventDraft): EventEvaluation {
  const damagePoolErrors: Record<string, DamagePoolErrors> = {}
  const errors: EventErrors = {}

  for (const pool of draft.damagePools) {
    const diceCount = parseInteger(pool.diceCount)
    const dieSides = parseInteger(pool.dieSides)
    const modifier = parseInteger(pool.modifier)
    const poolErrors: DamagePoolErrors = {}
    if (diceCount === undefined || diceCount < 1) {
      poolErrors.diceCount = 'Enter a whole number of at least 1.'
    }
    if (
      dieSides === undefined ||
      !DAMAGE_DIE_SIDES.includes(dieSides as (typeof DAMAGE_DIE_SIDES)[number])
    ) {
      poolErrors.dieSides = 'Choose an available die size.'
    }
    if (modifier === undefined) {
      poolErrors.modifier = 'Enter a whole number.'
    }
    if (Object.keys(poolErrors).length > 0) {
      damagePoolErrors[pool.id] = poolErrors
    }
  }
  if (Object.keys(damagePoolErrors).length > 0) {
    errors.damagePools = damagePoolErrors
  }

  const damagePools = draft.damagePools.map((pool) => ({
    id: pool.id,
    diceCount: parseInteger(pool.diceCount)!,
    dieSides: parseInteger(pool.dieSides)!,
    modifier: parseInteger(pool.modifier)!,
    damageType: pool.damageType,
  }))

  if (isAttackDraft(draft)) {
    const armorClass = parseInteger(draft.armorClass)
    const attackModifier = parseInteger(draft.attackModifier)
    if (armorClass === undefined || armorClass < 1) {
      errors.armorClass = 'Enter a whole number of at least 1.'
    }
    if (attackModifier === undefined) {
      errors.attackModifier = 'Enter a whole number.'
    }
    const heroicInspiration = inspirationPolicyFor(draft, errors)
    if (Object.keys(errors).length > 0) return { errors }

    const config: EventConfig = {
      id: draft.id,
      type: draft.type,
      armorClass: armorClass!,
      attackModifier: attackModifier!,
      rollMode: draft.rollMode,
      cover: draft.cover,
      hitConditions: draft.hitConditions,
      damagePools,
      heroicInspiration,
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
  const heroicInspiration = inspirationPolicyFor(draft, errors)
  if (Object.keys(errors).length > 0) return { errors }

  const config: EventConfig = {
    id: draft.id,
    type: draft.type,
    saveDc: saveDc!,
    saveModifier: saveModifier!,
    saveAbility: draft.saveAbility,
    rollMode: draft.rollMode,
    cover: draft.cover,
    damagePools,
    failureDamage: draft.failureDamage,
    successDamage: draft.successDamage,
    failureConditions: draft.failureConditions,
    successConditions: draft.successConditions,
    heroicInspiration,
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
  update: (field: EventField, value: EventFieldValue) => void
}

function DamageFields({
  event,
  errors,
  updatePool,
  addPool,
  removePool,
}: FieldProps & {
  updatePool: (poolId: string, field: DamagePoolField, value: string) => void
  addPool: () => void
  removePool: (poolId: string) => void
}) {
  const prefix = event.id
  return (
    <fieldset className="damage-section">
      <legend>
        {event.type === 'player-attack' || event.type === 'enemy-attack'
          ? 'Damage on hit'
          : 'Damage roll'}
      </legend>
      <div className="damage-pools">
        {event.damagePools.map((pool, index) => {
          const poolErrors = errors.damagePools?.[pool.id]
          return (
            <div className="damage-pool-row" key={pool.id}>
              {index > 0 && (
                <span className="pool-operator" aria-hidden="true">
                  +
                </span>
              )}
              <div className="damage-expression">
                <div className="field">
                  <label htmlFor={prefix + '-' + pool.id + '-dice-count'}>
                    Dice
                  </label>
                  <input
                    id={prefix + '-' + pool.id + '-dice-count'}
                    type="number"
                    inputMode="numeric"
                    min="1"
                    step="1"
                    value={pool.diceCount}
                    aria-invalid={Boolean(poolErrors?.diceCount)}
                    aria-describedby={
                      poolErrors?.diceCount
                        ? prefix + '-' + pool.id + '-dice-count-error'
                        : undefined
                    }
                    onChange={(change) =>
                      updatePool(pool.id, 'diceCount', change.target.value)
                    }
                  />
                  {poolErrors?.diceCount && (
                    <span
                      className="field-error"
                      id={prefix + '-' + pool.id + '-dice-count-error'}
                    >
                      {poolErrors.diceCount}
                    </span>
                  )}
                </div>
                <span className="operator" aria-hidden="true">
                  d
                </span>
                <div className="field">
                  <label htmlFor={prefix + '-' + pool.id + '-die-sides'}>
                    Die size
                  </label>
                  <select
                    id={prefix + '-' + pool.id + '-die-sides'}
                    value={pool.dieSides}
                    onChange={(change) =>
                      updatePool(pool.id, 'dieSides', change.target.value)
                    }
                  >
                    {DAMAGE_DIE_SIDES.map((sides) => (
                      <option key={sides} value={sides}>
                        {sides}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor={prefix + '-' + pool.id + '-modifier'}>
                    Modifier
                  </label>
                  <input
                    id={prefix + '-' + pool.id + '-modifier'}
                    type="number"
                    inputMode="numeric"
                    step="1"
                    value={pool.modifier}
                    aria-invalid={Boolean(poolErrors?.modifier)}
                    aria-describedby={
                      poolErrors?.modifier
                        ? prefix + '-' + pool.id + '-modifier-error'
                        : undefined
                    }
                    onChange={(change) =>
                      updatePool(pool.id, 'modifier', change.target.value)
                    }
                  />
                  {poolErrors?.modifier && (
                    <span
                      className="field-error"
                      id={prefix + '-' + pool.id + '-modifier-error'}
                    >
                      {poolErrors.modifier}
                    </span>
                  )}
                </div>
                <div className="field">
                  <label htmlFor={prefix + '-' + pool.id + '-damage-type'}>
                    Damage type
                  </label>
                  <select
                    id={prefix + '-' + pool.id + '-damage-type'}
                    value={pool.damageType}
                    onChange={(change) =>
                      updatePool(pool.id, 'damageType', change.target.value)
                    }
                  >
                    {DAMAGE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                className="inline-icon-button"
                type="button"
                aria-label={'Remove damage pool ' + (index + 1)}
                disabled={event.damagePools.length === 1}
                onClick={() => removePool(pool.id)}
              >
                <Trash2 aria-hidden="true" size={16} />
              </button>
            </div>
          )
        })}
      </div>
      <button className="secondary-add-button" type="button" onClick={addPool}>
        <Plus aria-hidden="true" size={16} />
        Add dice pool
      </button>
    </fieldset>
  )
}

function InspirationFields({ event, update }: FieldProps) {
  const thresholdId = `${event.id}-inspiration-threshold`
  const poolId = `${event.id}-inspiration-pool`
  return (
    <fieldset className="roll-section inspiration-section">
      <legend>Heroic Inspiration</legend>
      <div className="roll-fields">
        <div className="field">
          <label htmlFor={`${event.id}-inspiration-mode`}>Reroll policy</label>
          <select
            id={`${event.id}-inspiration-mode`}
            value={event.heroicInspirationMode}
            onChange={(change) =>
              update('heroicInspirationMode', change.target.value)
            }
          >
            <option value="none">Do not spend</option>
            <option value="d20-after-failure">Failed d20</option>
            <option value="damage-pool-threshold">Damage die threshold</option>
          </select>
        </div>
        {event.heroicInspirationMode === 'damage-pool-threshold' && (
          <>
            <div className="field">
              <label htmlFor={poolId}>Damage pool</label>
              <select
                id={poolId}
                value={event.heroicInspirationPoolId}
                onChange={(change) =>
                  update('heroicInspirationPoolId', change.target.value)
                }
              >
                {event.damagePools.map((pool, index) => (
                  <option key={pool.id} value={pool.id}>
                    Pool {index + 1}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor={thresholdId}>Reroll at or below</label>
              <input
                id={thresholdId}
                type="number"
                min="1"
                max="20"
                step="1"
                value={event.heroicInspirationThreshold}
                onChange={(change) =>
                  update('heroicInspirationThreshold', change.target.value)
                }
              />
            </div>
          </>
        )}
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
        <div className="field">
          <label htmlFor={`${event.id}-roll-mode`}>Roll mode</label>
          <select
            id={`${event.id}-roll-mode`}
            value={event.rollMode}
            onChange={(change) => update('rollMode', change.target.value)}
          >
            {ATTACK_ROLL_MODES.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${event.id}-cover`}>Cover</label>
          <select
            id={`${event.id}-cover`}
            value={event.cover}
            onChange={(change) => update('cover', change.target.value)}
          >
            {COVER_OPTIONS.map((cover) => (
              <option key={cover.value} value={cover.value}>
                {cover.label}
              </option>
            ))}
          </select>
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
          <div className="field">
            <label htmlFor={`${event.id}-save-ability`}>Save ability</label>
            <select
              id={`${event.id}-save-ability`}
              value={event.saveAbility}
              onChange={(change) => update('saveAbility', change.target.value)}
            >
              {ABILITIES.map((ability) => (
                <option key={ability.value} value={ability.value}>
                  {ability.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor={`${event.id}-save-roll-mode`}>Roll mode</label>
            <select
              id={`${event.id}-save-roll-mode`}
              value={event.rollMode}
              onChange={(change) => update('rollMode', change.target.value)}
            >
              {SAVE_ROLL_MODES.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor={`${event.id}-save-cover`}>Cover</label>
            <select
              id={`${event.id}-save-cover`}
              value={event.cover}
              onChange={(change) => update('cover', change.target.value)}
            >
              {COVER_OPTIONS.map((cover) => (
                <option key={cover.value} value={cover.value}>
                  {cover.label}
                </option>
              ))}
            </select>
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

type ConditionField =
  'hitConditions' | 'failureConditions' | 'successConditions'

function ConditionChoices({
  id,
  field,
  label,
  selected,
  update,
}: {
  id: string
  field: ConditionField
  label: string
  selected: readonly ConditionConfig[]
  update: (field: EventField, value: EventFieldValue) => void
}) {
  const [isChooserOpen, setChooserOpen] = useState(false)
  const availableConditions = CONDITION_TYPES.filter(
    (type) => !selected.some((condition) => condition.type === type),
  )
  const chooserId = id + '-condition-chooser'

  function addCondition(type: ConditionType) {
    update(field, [...selected, { type }])
    setChooserOpen(false)
  }

  function removeCondition(type: ConditionType) {
    update(
      field,
      selected.filter((condition) => condition.type !== type),
    )
  }

  return (
    <div className="condition-group" role="group" aria-label={label}>
      <span>{label}</span>
      {selected.length > 0 && (
        <div className="condition-entries">
          {selected.map((condition) => (
            <div className="condition-entry" key={condition.type}>
              <span>{CONDITION_LABELS[condition.type]}</span>
              <button
                className="inline-icon-button"
                type="button"
                aria-label={
                  'Remove ' + CONDITION_LABELS[condition.type] + ' ' + label
                }
                onClick={() => removeCondition(condition.type)}
              >
                <X aria-hidden="true" size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="condition-add">
        <button
          className="secondary-add-button"
          type="button"
          aria-expanded={isChooserOpen}
          aria-controls={chooserId}
          disabled={availableConditions.length === 0}
          onClick={() => setChooserOpen((current) => !current)}
        >
          {isChooserOpen ? (
            <X aria-hidden="true" size={16} />
          ) : (
            <Plus aria-hidden="true" size={16} />
          )}
          {isChooserOpen ? 'Close' : 'Add condition'}
        </button>
        {isChooserOpen && (
          <div className="condition-chooser" id={chooserId}>
            {availableConditions.map((condition) => (
              <button
                key={condition}
                type="button"
                onClick={() => addCondition(condition)}
              >
                {CONDITION_LABELS[condition]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ConditionFields({ event, update }: Omit<FieldProps, 'errors'>) {
  if (isAttackDraft(event)) {
    return (
      <fieldset className="condition-section">
        <legend>Conditions on hit</legend>
        <ConditionChoices
          id={event.id + '-hit'}
          field="hitConditions"
          label="Apply to target"
          selected={event.hitConditions}
          update={update}
        />
      </fieldset>
    )
  }
  return (
    <fieldset className="condition-section">
      <legend>Conditions on target</legend>
      <div className="condition-groups">
        <ConditionChoices
          id={event.id + '-failure'}
          field="failureConditions"
          label="On failure"
          selected={event.failureConditions}
          update={update}
        />
        <ConditionChoices
          id={event.id + '-success'}
          field="successConditions"
          label="On success"
          selected={event.successConditions}
          update={update}
        />
      </div>
    </fieldset>
  )
}

interface ShownConditionTotal {
  readonly condition: ConditionType
  readonly target: ConditionTarget
}

function conditionTargetFor(event: EventDraft): ConditionTarget {
  return outcomeTypeFor(event) === 'expected-damage-against-enemies'
    ? 'enemies'
    : 'players'
}

function configuredConditionTotals(
  event: EventDraft,
): readonly ShownConditionTotal[] {
  const conditions = [
    ...new Set(
      isAttackDraft(event)
        ? event.hitConditions.map((condition) => condition.type)
        : [...event.failureConditions, ...event.successConditions].map(
            (condition) => condition.type,
          ),
    ),
  ]
  const target = conditionTargetFor(event)
  return conditions.map((condition) => ({ condition, target }))
}

function EventTypeButtons({
  onSelect,
}: {
  onSelect: (type: EventType) => void
}) {
  return (Object.keys(EVENT_LABELS) as EventType[]).map((type) => (
    <button key={type} type="button" onClick={() => onSelect(type)}>
      {type.includes('attack') ? (
        <Swords aria-hidden="true" size={18} />
      ) : (
        <Shield aria-hidden="true" size={18} />
      )}
      {EVENT_LABELS[type]}
    </button>
  ))
}

function App() {
  const [events, setEvents] = useState<EventDraft[]>([
    createEvent('player-attack', 'event-1'),
  ])
  const [isChooserOpen, setChooserOpen] = useState(false)
  const [draggedEventId, setDraggedEventId] = useState<string>()
  const [dragOverEventId, setDragOverEventId] = useState<string>()
  const [reorderAnnouncement, setReorderAnnouncement] = useState('')
  const nextEventId = useRef(2)
  const nextDamagePoolId = useRef(1)
  const evaluations = events.map(evaluateEvent)
  const isSequenceValid = evaluations.every((evaluation) => evaluation.config)
  const sequence = isSequenceValid
    ? calculateSequence({
        initialState: INITIAL_SEQUENCE_STATE,
        rounds: [
          {
            id: 'round-1',
            turns: [
              {
                id: 'turn-1',
                owner: 'player',
                activities: [
                  {
                    id: 'activity-1',
                    type: 'action',
                    owner: 'player',
                    events: evaluations.map((evaluation) => evaluation.config!),
                  },
                ],
              },
            ],
          },
        ],
      })
    : undefined
  const shownOutcomeTypes = [...new Set(events.map(outcomeTypeFor))]
  const shownConditionTotals = [
    ...new Map(
      events
        .flatMap(configuredConditionTotals)
        .map((total) => [`${total.condition}:${total.target}`, total] as const),
    ).values(),
  ]

  function updateEvent(id: string, field: EventField, value: EventFieldValue) {
    setEvents((current) =>
      current.map((event) =>
        event.id === id ? ({ ...event, [field]: value } as EventDraft) : event,
      ),
    )
  }

  function updateDamagePool(
    eventId: string,
    poolId: string,
    field: DamagePoolField,
    value: string,
  ) {
    setEvents((current) =>
      current.map((event) =>
        event.id === eventId
          ? {
              ...event,
              damagePools: event.damagePools.map((pool) =>
                pool.id === poolId ? { ...pool, [field]: value } : pool,
              ),
            }
          : event,
      ),
    )
  }

  function addDamagePool(eventId: string) {
    const id = 'damage-' + nextDamagePoolId.current
    nextDamagePoolId.current += 1
    setEvents((current) =>
      current.map((event) =>
        event.id === eventId
          ? {
              ...event,
              damagePools: [
                ...event.damagePools,
                {
                  id,
                  diceCount: '1',
                  dieSides: '8',
                  modifier: '0',
                  damageType: 'slashing',
                },
              ],
            }
          : event,
      ),
    )
  }

  function removeDamagePool(eventId: string, poolId: string) {
    setEvents((current) =>
      current.map((event) =>
        event.id === eventId && event.damagePools.length > 1
          ? {
              ...event,
              damagePools: event.damagePools.filter(
                (pool) => pool.id !== poolId,
              ),
            }
          : event,
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

  function copyEvent(id: string) {
    const newId = `event-${nextEventId.current}`
    nextEventId.current += 1
    setEvents((current) => {
      const index = current.findIndex((event) => event.id === id)
      if (index === -1) return current
      const copy = duplicateEvent(current[index], newId, () => {
        const poolId = `damage-${nextDamagePoolId.current}`
        nextDamagePoolId.current += 1
        return poolId
      })
      const updated = [...current]
      updated.splice(index + 1, 0, copy)
      return updated
    })
  }

  function moveEvent(fromIndex: number, toIndex: number) {
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= events.length ||
      toIndex >= events.length
    ) {
      return
    }
    const movedLabel = EVENT_LABELS[events[fromIndex].type]
    setEvents((current) => {
      const updated = [...current]
      const [moved] = updated.splice(fromIndex, 1)
      updated.splice(toIndex, 0, moved)
      return updated
    })
    setReorderAnnouncement(`${movedLabel} moved to position ${toIndex + 1}.`)
  }

  function dropEvent(targetId: string) {
    if (!draggedEventId) return
    const fromIndex = events.findIndex((event) => event.id === draggedEventId)
    const toIndex = events.findIndex((event) => event.id === targetId)
    moveEvent(fromIndex, toIndex)
    setDraggedEventId(undefined)
    setDragOverEventId(undefined)
  }

  function startDragging(event: DragEvent, id: string) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', id)
    setDraggedEventId(id)
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
          {shownConditionTotals.map(({ condition, target }) => {
            const total = sequence?.expectedConditionApplications.find(
              (item) => item.condition === condition && item.target === target,
            )
            return (
              <aside
                className="total-card condition-total"
                key={`${condition}:${target}`}
              >
                <span>
                  Expected {CONDITION_LABELS[condition]} applications to{' '}
                  {target}
                </span>
                <strong>
                  {total === undefined
                    ? '—'
                    : numberFormatter.format(total.expectedApplications)}
                </strong>
                <small>Across the sequence</small>
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
          <span className="workspace-note">Events resolve in sequence</span>
        </div>

        <p className="visually-hidden" aria-live="polite">
          {reorderAnnouncement}
        </p>

        <ol className="attack-list">
          {events.map((event, index) => {
            const evaluation = evaluations[index]
            const result = sequence?.eventResults[event.id] ?? evaluation.result
            const isAttack =
              event.type === 'player-attack' || event.type === 'enemy-attack'
            const target =
              outcomeTypeFor(event) === 'expected-damage-against-enemies'
                ? 'enemies'
                : 'players'
            return (
              <li
                className={`attack-step${draggedEventId === event.id ? ' is-dragging' : ''}${dragOverEventId === event.id && draggedEventId !== event.id ? ' is-drag-over' : ''}`}
                key={event.id}
                onDragOver={(dragEvent) => {
                  dragEvent.preventDefault()
                  dragEvent.dataTransfer.dropEffect = 'move'
                  setDragOverEventId(event.id)
                }}
                onDragLeave={() =>
                  setDragOverEventId((current) =>
                    current === event.id ? undefined : current,
                  )
                }
                onDrop={(dragEvent) => {
                  dragEvent.preventDefault()
                  dropEvent(event.id)
                }}
              >
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
                    <div className="event-actions">
                      <button
                        className="drag-handle"
                        type="button"
                        draggable
                        aria-label={`Drag to reorder event ${index + 1}`}
                        title="Drag to reorder"
                        onDragStart={(dragEvent) =>
                          startDragging(dragEvent, event.id)
                        }
                        onDragEnd={() => {
                          setDraggedEventId(undefined)
                          setDragOverEventId(undefined)
                        }}
                      >
                        <GripVertical aria-hidden="true" size={18} />
                      </button>
                      <button
                        className="icon-button"
                        type="button"
                        aria-label={`Move event ${index + 1} up`}
                        title="Move up"
                        disabled={index === 0}
                        onClick={() => moveEvent(index, index - 1)}
                      >
                        <ChevronUp aria-hidden="true" size={18} />
                      </button>
                      <button
                        className="icon-button"
                        type="button"
                        aria-label={`Move event ${index + 1} down`}
                        title="Move down"
                        disabled={index === events.length - 1}
                        onClick={() => moveEvent(index, index + 1)}
                      >
                        <ChevronDown aria-hidden="true" size={18} />
                      </button>
                      <button
                        className="icon-button"
                        type="button"
                        aria-label={`Duplicate event ${index + 1}`}
                        title="Duplicate"
                        onClick={() => copyEvent(event.id)}
                      >
                        <Copy aria-hidden="true" size={17} />
                      </button>
                      <button
                        className="icon-button remove-event-button"
                        type="button"
                        aria-label={`Remove event ${index + 1}`}
                        title="Delete"
                        onClick={() => removeEvent(event.id)}
                      >
                        <Trash2 aria-hidden="true" size={18} />
                      </button>
                    </div>
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
                      updatePool={(poolId, field, value) =>
                        updateDamagePool(event.id, poolId, field, value)
                      }
                      addPool={() => addDamagePool(event.id)}
                      removePool={(poolId) =>
                        removeDamagePool(event.id, poolId)
                      }
                    />
                    <InspirationFields
                      event={event}
                      errors={evaluation.errors}
                      update={(field, value) =>
                        updateEvent(event.id, field, value)
                      }
                    />
                    <ConditionFields
                      event={event}
                      update={(field, value) =>
                        updateEvent(event.id, field, value)
                      }
                    />
                  </div>

                  <div className="attack-results" aria-live="polite">
                    <span>
                      {isAttack ? 'Hit chance' : 'Save chance'}
                      <strong>
                        {result
                          ? percentFormatter.format(result.successProbability)
                          : '—'}
                      </strong>
                    </span>
                    {isAttack ? (
                      <span>
                        Critical chance
                        <strong>
                          {result
                            ? percentFormatter.format(
                                result.criticalProbability ?? 0,
                              )
                            : '—'}
                        </strong>
                      </span>
                    ) : null}
                    <span>
                      Expected damage against {target}
                      <strong>
                        {result
                          ? numberFormatter.format(
                              result.outcome.expectedDamage,
                            )
                          : '—'}
                      </strong>
                    </span>
                    {result?.conditionApplications.map((application) => (
                      <span key={application.condition}>
                        {CONDITION_LABELS[application.condition]} applied
                        <strong>
                          {percentFormatter.format(application.probability)}
                        </strong>
                      </span>
                    ))}
                  </div>
                </article>
              </li>
            )
          })}
        </ol>

        {events.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Plus aria-hidden="true" size={24} />
            </div>
            <h3>Start your sequence</h3>
            <p>Choose the first event you want to model.</p>
            <div className="empty-event-options">
              <EventTypeButtons onSelect={addEvent} />
            </div>
          </div>
        ) : (
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
                <EventTypeButtons onSelect={addEvent} />
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  )
}

export default App
