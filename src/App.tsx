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
import { useRef, useState } from 'react'
import type {
  Ability,
  ActivityType,
  AttackRollMode,
  Combatant,
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

interface ActivityDraft {
  readonly id: string
  readonly type: ActivityType
  readonly owner: Combatant
  readonly events: readonly EventDraft[]
}

interface TurnDraft {
  readonly id: string
  readonly owner: Combatant
  readonly activities: readonly ActivityDraft[]
}

interface RoundDraft {
  readonly id: string
  readonly turns: readonly TurnDraft[]
}

interface ActivityPath {
  readonly roundId: string
  readonly turnId: string
  readonly activityId: string
}
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
  const [rounds, setRounds] = useState<RoundDraft[]>([
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
              events: [createEvent('player-attack', 'event-1')],
            },
          ],
        },
      ],
    },
  ])
  const [chooserActivityId, setChooserActivityId] = useState<string>()
  const [draggedEvent, setDraggedEvent] = useState<
    { readonly activityId: string; readonly eventId: string } | undefined
  >()
  const [dragOverEventId, setDragOverEventId] = useState<string>()
  const [reorderAnnouncement, setReorderAnnouncement] = useState('')
  const nextRoundId = useRef(2)
  const nextTurnId = useRef(2)
  const nextActivityId = useRef(2)
  const nextEventId = useRef(2)
  const nextDamagePoolId = useRef(1)

  const events = rounds.flatMap((round) =>
    round.turns.flatMap((turn) =>
      turn.activities.flatMap((activity) => activity.events),
    ),
  )
  const evaluations = new Map(
    events.map((event) => [event.id, evaluateEvent(event)] as const),
  )
  const isSequenceValid = [...evaluations.values()].every(
    (evaluation) => evaluation.config,
  )
  const sequence = isSequenceValid
    ? calculateSequence({
        initialState: INITIAL_SEQUENCE_STATE,
        rounds: rounds.map((round) => ({
          id: round.id,
          turns: round.turns.map((turn) => ({
            id: turn.id,
            owner: turn.owner,
            activities: turn.activities.map((activity) => ({
              id: activity.id,
              type: activity.type,
              owner: activity.owner,
              events: activity.events.map(
                (event) => evaluations.get(event.id)!.config!,
              ),
            })),
          })),
        })),
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
  const eventPositions = new Map(
    events.map((event, index) => [event.id, index + 1] as const),
  )

  function createEventId() {
    const id = `event-${nextEventId.current}`
    nextEventId.current += 1
    return id
  }

  function createPoolId() {
    const id = `damage-${nextDamagePoolId.current}`
    nextDamagePoolId.current += 1
    return id
  }

  function createActivity(owner: Combatant, type: ActivityType): ActivityDraft {
    const id = `activity-${nextActivityId.current}`
    nextActivityId.current += 1
    return { id, type, owner, events: [] }
  }

  function createTurn(owner: Combatant): TurnDraft {
    const id = `turn-${nextTurnId.current}`
    nextTurnId.current += 1
    return { id, owner, activities: [] }
  }

  function cloneActivity(activity: ActivityDraft): ActivityDraft {
    const id = `activity-${nextActivityId.current}`
    nextActivityId.current += 1
    return {
      ...activity,
      id,
      events: activity.events.map((event) =>
        duplicateEvent(event, createEventId(), createPoolId),
      ),
    }
  }

  function cloneTurn(turn: TurnDraft): TurnDraft {
    const id = `turn-${nextTurnId.current}`
    nextTurnId.current += 1
    return {
      ...turn,
      id,
      activities: turn.activities.map(cloneActivity),
    }
  }

  function updateActivity(
    path: ActivityPath,
    update: (activity: ActivityDraft) => ActivityDraft,
  ) {
    setRounds((current) =>
      current.map((round) =>
        round.id !== path.roundId
          ? round
          : {
              ...round,
              turns: round.turns.map((turn) =>
                turn.id !== path.turnId
                  ? turn
                  : {
                      ...turn,
                      activities: turn.activities.map((activity) =>
                        activity.id === path.activityId
                          ? update(activity)
                          : activity,
                      ),
                    },
              ),
            },
      ),
    )
  }

  function updateEvent(
    path: ActivityPath,
    id: string,
    field: EventField,
    value: EventFieldValue,
  ) {
    updateActivity(path, (activity) => ({
      ...activity,
      events: activity.events.map((event) =>
        event.id === id ? ({ ...event, [field]: value } as EventDraft) : event,
      ),
    }))
  }

  function updateDamagePool(
    path: ActivityPath,
    eventId: string,
    poolId: string,
    field: DamagePoolField,
    value: string,
  ) {
    updateActivity(path, (activity) => ({
      ...activity,
      events: activity.events.map((event) =>
        event.id === eventId
          ? {
              ...event,
              damagePools: event.damagePools.map((pool) =>
                pool.id === poolId ? { ...pool, [field]: value } : pool,
              ),
            }
          : event,
      ),
    }))
  }

  function addDamagePool(path: ActivityPath, eventId: string) {
    const id = createPoolId()
    updateActivity(path, (activity) => ({
      ...activity,
      events: activity.events.map((event) =>
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
    }))
  }

  function removeDamagePool(
    path: ActivityPath,
    eventId: string,
    poolId: string,
  ) {
    updateActivity(path, (activity) => ({
      ...activity,
      events: activity.events.map((event) =>
        event.id === eventId && event.damagePools.length > 1
          ? {
              ...event,
              damagePools: event.damagePools.filter(
                (pool) => pool.id !== poolId,
              ),
            }
          : event,
      ),
    }))
  }

  function addEvent(path: ActivityPath, type: EventType) {
    updateActivity(path, (activity) => ({
      ...activity,
      events: [...activity.events, createEvent(type, createEventId())],
    }))
    setChooserActivityId(undefined)
  }

  function removeEvent(path: ActivityPath, id: string) {
    updateActivity(path, (activity) => ({
      ...activity,
      events: activity.events.filter((event) => event.id !== id),
    }))
  }

  function copyEvent(path: ActivityPath, id: string) {
    updateActivity(path, (activity) => {
      const index = activity.events.findIndex((event) => event.id === id)
      if (index === -1) return activity
      const updated = [...activity.events]
      updated.splice(
        index + 1,
        0,
        duplicateEvent(updated[index], createEventId(), createPoolId),
      )
      return { ...activity, events: updated }
    })
  }

  function moveEvent(path: ActivityPath, fromIndex: number, toIndex: number) {
    updateActivity(path, (activity) => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= activity.events.length ||
        toIndex >= activity.events.length
      ) {
        return activity
      }
      const updated = [...activity.events]
      const [moved] = updated.splice(fromIndex, 1)
      updated.splice(toIndex, 0, moved)
      setReorderAnnouncement(
        `${EVENT_LABELS[moved.type]} moved to position ${toIndex + 1} in its activity.`,
      )
      return { ...activity, events: updated }
    })
  }

  function dropEvent(path: ActivityPath, targetId: string) {
    if (!draggedEvent || draggedEvent.activityId !== path.activityId) return
    const activity = rounds
      .find((round) => round.id === path.roundId)
      ?.turns.find((turn) => turn.id === path.turnId)
      ?.activities.find((item) => item.id === path.activityId)
    if (!activity) return
    moveEvent(
      path,
      activity.events.findIndex((event) => event.id === draggedEvent.eventId),
      activity.events.findIndex((event) => event.id === targetId),
    )
    setDraggedEvent(undefined)
    setDragOverEventId(undefined)
  }

  function moveRound(index: number, direction: -1 | 1) {
    setRounds((current) => {
      const target = index + direction
      if (target < 0 || target >= current.length) return current
      const updated = [...current]
      const [moved] = updated.splice(index, 1)
      updated.splice(target, 0, moved)
      setReorderAnnouncement(`Round moved to position ${target + 1}.`)
      return updated
    })
  }

  function addRound() {
    const id = `round-${nextRoundId.current}`
    nextRoundId.current += 1
    setRounds((current) => [...current, { id, turns: [] }])
  }

  function duplicateRound(index: number) {
    setRounds((current) => {
      const source = current[index]
      if (!source) return current
      const id = `round-${nextRoundId.current}`
      nextRoundId.current += 1
      const copy: RoundDraft = {
        id,
        turns: source.turns.map(cloneTurn),
      }
      const updated = [...current]
      updated.splice(index + 1, 0, copy)
      return updated
    })
  }

  function moveTurn(roundId: string, index: number, direction: -1 | 1) {
    setRounds((current) =>
      current.map((round) => {
        if (round.id !== roundId) return round
        const target = index + direction
        if (target < 0 || target >= round.turns.length) return round
        const turns = [...round.turns]
        const [moved] = turns.splice(index, 1)
        turns.splice(target, 0, moved)
        setReorderAnnouncement(
          `${moved.owner === 'player' ? 'Player' : 'Enemy'} turn moved to position ${target + 1} in its round.`,
        )
        return { ...round, turns }
      }),
    )
  }

  function addTurn(roundId: string, owner: Combatant) {
    setRounds((current) =>
      current.map((round) =>
        round.id === roundId
          ? { ...round, turns: [...round.turns, createTurn(owner)] }
          : round,
      ),
    )
  }

  function duplicateTurn(roundId: string, index: number) {
    setRounds((current) =>
      current.map((round) => {
        if (round.id !== roundId || !round.turns[index]) return round
        const turns = [...round.turns]
        turns.splice(index + 1, 0, cloneTurn(round.turns[index]))
        return { ...round, turns }
      }),
    )
  }

  function moveActivity(
    roundId: string,
    turnId: string,
    index: number,
    direction: -1 | 1,
  ) {
    setRounds((current) =>
      current.map((round) =>
        round.id !== roundId
          ? round
          : {
              ...round,
              turns: round.turns.map((turn) => {
                if (turn.id !== turnId) return turn
                const target = index + direction
                if (target < 0 || target >= turn.activities.length) return turn
                const activities = [...turn.activities]
                const [moved] = activities.splice(index, 1)
                activities.splice(target, 0, moved)
                setReorderAnnouncement(
                  `${moved.type === 'action' ? 'Action' : 'Bonus action'} moved to position ${target + 1} in its turn.`,
                )
                return { ...turn, activities }
              }),
            },
      ),
    )
  }

  function addActivity(
    roundId: string,
    turnId: string,
    owner: Combatant,
    type: ActivityType,
  ) {
    setRounds((current) =>
      current.map((round) =>
        round.id !== roundId
          ? round
          : {
              ...round,
              turns: round.turns.map((turn) =>
                turn.id === turnId
                  ? {
                      ...turn,
                      activities: [
                        ...turn.activities,
                        createActivity(owner, type),
                      ],
                    }
                  : turn,
              ),
            },
      ),
    )
  }

  function duplicateActivity(roundId: string, turnId: string, index: number) {
    setRounds((current) =>
      current.map((round) =>
        round.id !== roundId
          ? round
          : {
              ...round,
              turns: round.turns.map((turn) => {
                if (turn.id !== turnId || !turn.activities[index]) return turn
                const activities = [...turn.activities]
                activities.splice(
                  index + 1,
                  0,
                  cloneActivity(turn.activities[index]),
                )
                return { ...turn, activities }
              }),
            },
      ),
    )
  }

  return (
    <main className="app-shell">
      <header className="masthead">
        <div className="brand">
          <Calculator aria-hidden="true" size={24} />
          <span>Crunch Lab</span>
        </div>
        <span className="status">Turn sequence</span>
      </header>

      <section className="intro" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">Dice probability workbench</p>
          <h1 id="page-title">Build your combat timeline.</h1>
          <p className="intro-copy">
            Arrange rounds, turns, actions, and events. Outcomes update as you
            work.
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
            <h2 id="sequence-title">Combat timeline</h2>
          </div>
          <span className="workspace-note">
            Rounds resolve from top to bottom
          </span>
        </div>
        <p className="visually-hidden" aria-live="polite">
          {reorderAnnouncement}
        </p>

        <div className="round-list">
          {rounds.map((round, roundIndex) => (
            <section
              className="round-card"
              aria-labelledby={`${round.id}-title`}
              key={round.id}
            >
              <header className="timeline-heading round-heading">
                <div>
                  <p className="timeline-kicker">Round {roundIndex + 1}</p>
                  <h3 id={`${round.id}-title`}>Round {roundIndex + 1}</h3>
                </div>
                <div className="event-actions">
                  <button
                    className="icon-button"
                    type="button"
                    aria-label={`Move round ${roundIndex + 1} up`}
                    disabled={roundIndex === 0}
                    onClick={() => moveRound(roundIndex, -1)}
                  >
                    <ChevronUp aria-hidden="true" size={18} />
                  </button>
                  <button
                    className="icon-button"
                    type="button"
                    aria-label={`Move round ${roundIndex + 1} down`}
                    disabled={roundIndex === rounds.length - 1}
                    onClick={() => moveRound(roundIndex, 1)}
                  >
                    <ChevronDown aria-hidden="true" size={18} />
                  </button>
                  <button
                    className="icon-button"
                    type="button"
                    aria-label={`Duplicate round ${roundIndex + 1}`}
                    onClick={() => duplicateRound(roundIndex)}
                  >
                    <Copy aria-hidden="true" size={17} />
                  </button>
                  <button
                    className="icon-button remove-event-button"
                    type="button"
                    aria-label={`Remove round ${roundIndex + 1}`}
                    onClick={() =>
                      setRounds((current) =>
                        current.filter((item) => item.id !== round.id),
                      )
                    }
                  >
                    <Trash2 aria-hidden="true" size={18} />
                  </button>
                </div>
              </header>

              <div className="turn-list">
                {round.turns.map((turn, turnIndex) => (
                  <section
                    className={`turn-card ${turn.owner}-turn`}
                    aria-labelledby={`${turn.id}-title`}
                    key={turn.id}
                  >
                    <header className="timeline-heading turn-heading">
                      <div>
                        <p className="timeline-kicker">Turn {turnIndex + 1}</p>
                        <h4 id={`${turn.id}-title`}>
                          {turn.owner === 'player'
                            ? 'Player turn'
                            : 'Enemy turn'}
                        </h4>
                      </div>
                      <div className="event-actions">
                        <button
                          className="icon-button"
                          type="button"
                          aria-label={`Move ${turn.owner} turn ${turnIndex + 1} up`}
                          disabled={turnIndex === 0}
                          onClick={() => moveTurn(round.id, turnIndex, -1)}
                        >
                          <ChevronUp aria-hidden="true" size={17} />
                        </button>
                        <button
                          className="icon-button"
                          type="button"
                          aria-label={`Move ${turn.owner} turn ${turnIndex + 1} down`}
                          disabled={turnIndex === round.turns.length - 1}
                          onClick={() => moveTurn(round.id, turnIndex, 1)}
                        >
                          <ChevronDown aria-hidden="true" size={17} />
                        </button>
                        <button
                          className="icon-button"
                          type="button"
                          aria-label={`Duplicate ${turn.owner} turn ${turnIndex + 1}`}
                          onClick={() => duplicateTurn(round.id, turnIndex)}
                        >
                          <Copy aria-hidden="true" size={16} />
                        </button>
                        <button
                          className="icon-button remove-event-button"
                          type="button"
                          aria-label={`Remove ${turn.owner} turn ${turnIndex + 1}`}
                          onClick={() =>
                            setRounds((current) =>
                              current.map((item) =>
                                item.id === round.id
                                  ? {
                                      ...item,
                                      turns: item.turns.filter(
                                        (candidate) => candidate.id !== turn.id,
                                      ),
                                    }
                                  : item,
                              ),
                            )
                          }
                        >
                          <Trash2 aria-hidden="true" size={17} />
                        </button>
                      </div>
                    </header>

                    <div className="activity-list">
                      {turn.activities.map((activity, activityIndex) => {
                        const path: ActivityPath = {
                          roundId: round.id,
                          turnId: turn.id,
                          activityId: activity.id,
                        }
                        return (
                          <section
                            className="activity-card"
                            aria-labelledby={`${activity.id}-title`}
                            key={activity.id}
                          >
                            <header className="timeline-heading activity-heading">
                              <div>
                                <p className="timeline-kicker">
                                  Activity {activityIndex + 1}
                                </p>
                                <h5 id={`${activity.id}-title`}>
                                  {activity.type === 'action'
                                    ? 'Action'
                                    : 'Bonus action'}
                                </h5>
                              </div>
                              <div className="event-actions">
                                <button
                                  className="icon-button"
                                  type="button"
                                  aria-label={`Move activity ${activityIndex + 1} up`}
                                  disabled={activityIndex === 0}
                                  onClick={() =>
                                    moveActivity(
                                      round.id,
                                      turn.id,
                                      activityIndex,
                                      -1,
                                    )
                                  }
                                >
                                  <ChevronUp aria-hidden="true" size={16} />
                                </button>
                                <button
                                  className="icon-button"
                                  type="button"
                                  aria-label={`Move activity ${activityIndex + 1} down`}
                                  disabled={
                                    activityIndex === turn.activities.length - 1
                                  }
                                  onClick={() =>
                                    moveActivity(
                                      round.id,
                                      turn.id,
                                      activityIndex,
                                      1,
                                    )
                                  }
                                >
                                  <ChevronDown aria-hidden="true" size={16} />
                                </button>
                                <button
                                  className="icon-button"
                                  type="button"
                                  aria-label={`Duplicate activity ${activityIndex + 1}`}
                                  onClick={() =>
                                    duplicateActivity(
                                      round.id,
                                      turn.id,
                                      activityIndex,
                                    )
                                  }
                                >
                                  <Copy aria-hidden="true" size={15} />
                                </button>
                                <button
                                  className="icon-button remove-event-button"
                                  type="button"
                                  aria-label={`Remove activity ${activityIndex + 1}`}
                                  onClick={() =>
                                    setRounds((current) =>
                                      current.map((item) =>
                                        item.id !== round.id
                                          ? item
                                          : {
                                              ...item,
                                              turns: item.turns.map(
                                                (candidate) =>
                                                  candidate.id !== turn.id
                                                    ? candidate
                                                    : {
                                                        ...candidate,
                                                        activities:
                                                          candidate.activities.filter(
                                                            (entry) =>
                                                              entry.id !==
                                                              activity.id,
                                                          ),
                                                      },
                                              ),
                                            },
                                      ),
                                    )
                                  }
                                >
                                  <Trash2 aria-hidden="true" size={16} />
                                </button>
                              </div>
                            </header>

                            <ol className="attack-list">
                              {activity.events.map((event, eventIndex) => {
                                const evaluation = evaluations.get(event.id)!
                                const result =
                                  sequence?.eventResults[event.id] ??
                                  evaluation.result
                                const isAttack =
                                  event.type === 'player-attack' ||
                                  event.type === 'enemy-attack'
                                const target =
                                  outcomeTypeFor(event) ===
                                  'expected-damage-against-enemies'
                                    ? 'enemies'
                                    : 'players'
                                const position = eventPositions.get(event.id)!
                                return (
                                  <li
                                    className={`attack-step${draggedEvent?.eventId === event.id ? ' is-dragging' : ''}${dragOverEventId === event.id && draggedEvent?.eventId !== event.id ? ' is-drag-over' : ''}`}
                                    key={event.id}
                                    onDragOver={(dragEvent) => {
                                      if (
                                        draggedEvent?.activityId !== activity.id
                                      )
                                        return
                                      dragEvent.preventDefault()
                                      dragEvent.dataTransfer.dropEffect = 'move'
                                      setDragOverEventId(event.id)
                                    }}
                                    onDragLeave={() =>
                                      setDragOverEventId((current) =>
                                        current === event.id
                                          ? undefined
                                          : current,
                                      )
                                    }
                                    onDrop={(dragEvent) => {
                                      dragEvent.preventDefault()
                                      dropEvent(path, event.id)
                                    }}
                                  >
                                    <div
                                      className="step-marker"
                                      aria-hidden="true"
                                    >
                                      {eventIndex + 1}
                                    </div>
                                    <article
                                      className="attack-card"
                                      aria-labelledby={`${event.id}-title`}
                                    >
                                      <div className="attack-heading">
                                        <div>
                                          <p className="attack-kicker">
                                            Event {eventIndex + 1}
                                          </p>
                                          <h6 id={`${event.id}-title`}>
                                            {EVENT_LABELS[event.type]}
                                          </h6>
                                        </div>
                                        <div className="event-actions">
                                          <button
                                            className="drag-handle"
                                            type="button"
                                            draggable
                                            aria-label={`Drag to reorder event ${position}`}
                                            title="Drag to reorder within this activity"
                                            onDragStart={(dragEvent) => {
                                              dragEvent.dataTransfer.effectAllowed =
                                                'move'
                                              dragEvent.dataTransfer.setData(
                                                'text/plain',
                                                event.id,
                                              )
                                              setDraggedEvent({
                                                activityId: activity.id,
                                                eventId: event.id,
                                              })
                                            }}
                                            onDragEnd={() => {
                                              setDraggedEvent(undefined)
                                              setDragOverEventId(undefined)
                                            }}
                                          >
                                            <GripVertical
                                              aria-hidden="true"
                                              size={18}
                                            />
                                          </button>
                                          <button
                                            className="icon-button"
                                            type="button"
                                            aria-label={`Move event ${position} up`}
                                            disabled={eventIndex === 0}
                                            onClick={() =>
                                              moveEvent(
                                                path,
                                                eventIndex,
                                                eventIndex - 1,
                                              )
                                            }
                                          >
                                            <ChevronUp
                                              aria-hidden="true"
                                              size={18}
                                            />
                                          </button>
                                          <button
                                            className="icon-button"
                                            type="button"
                                            aria-label={`Move event ${position} down`}
                                            disabled={
                                              eventIndex ===
                                              activity.events.length - 1
                                            }
                                            onClick={() =>
                                              moveEvent(
                                                path,
                                                eventIndex,
                                                eventIndex + 1,
                                              )
                                            }
                                          >
                                            <ChevronDown
                                              aria-hidden="true"
                                              size={18}
                                            />
                                          </button>
                                          <button
                                            className="icon-button"
                                            type="button"
                                            aria-label={`Duplicate event ${position}`}
                                            onClick={() =>
                                              copyEvent(path, event.id)
                                            }
                                          >
                                            <Copy
                                              aria-hidden="true"
                                              size={17}
                                            />
                                          </button>
                                          <button
                                            className="icon-button remove-event-button"
                                            type="button"
                                            aria-label={`Remove event ${position}`}
                                            onClick={() =>
                                              removeEvent(path, event.id)
                                            }
                                          >
                                            <Trash2
                                              aria-hidden="true"
                                              size={18}
                                            />
                                          </button>
                                        </div>
                                      </div>

                                      <div
                                        className={
                                          isAttack
                                            ? 'attack-body'
                                            : 'saving-body'
                                        }
                                      >
                                        {isAttack ? (
                                          <AttackRollFields
                                            event={event}
                                            errors={evaluation.errors}
                                            update={(field, value) =>
                                              updateEvent(
                                                path,
                                                event.id,
                                                field,
                                                value,
                                              )
                                            }
                                          />
                                        ) : (
                                          <SavingThrowFields
                                            event={event}
                                            errors={evaluation.errors}
                                            update={(field, value) =>
                                              updateEvent(
                                                path,
                                                event.id,
                                                field,
                                                value,
                                              )
                                            }
                                          />
                                        )}
                                        <DamageFields
                                          event={event}
                                          errors={evaluation.errors}
                                          update={(field, value) =>
                                            updateEvent(
                                              path,
                                              event.id,
                                              field,
                                              value,
                                            )
                                          }
                                          updatePool={(poolId, field, value) =>
                                            updateDamagePool(
                                              path,
                                              event.id,
                                              poolId,
                                              field,
                                              value,
                                            )
                                          }
                                          addPool={() =>
                                            addDamagePool(path, event.id)
                                          }
                                          removePool={(poolId) =>
                                            removeDamagePool(
                                              path,
                                              event.id,
                                              poolId,
                                            )
                                          }
                                        />
                                        <InspirationFields
                                          event={event}
                                          errors={evaluation.errors}
                                          update={(field, value) =>
                                            updateEvent(
                                              path,
                                              event.id,
                                              field,
                                              value,
                                            )
                                          }
                                        />
                                        <ConditionFields
                                          event={event}
                                          update={(field, value) =>
                                            updateEvent(
                                              path,
                                              event.id,
                                              field,
                                              value,
                                            )
                                          }
                                        />
                                      </div>

                                      <div
                                        className="attack-results"
                                        aria-live="polite"
                                      >
                                        <span>
                                          {isAttack
                                            ? 'Hit chance'
                                            : 'Save chance'}
                                          <strong>
                                            {result
                                              ? percentFormatter.format(
                                                  result.successProbability,
                                                )
                                              : '—'}
                                          </strong>
                                        </span>
                                        {isAttack ? (
                                          <span>
                                            Critical chance
                                            <strong>
                                              {result
                                                ? percentFormatter.format(
                                                    result.criticalProbability ??
                                                      0,
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
                                        {result?.conditionApplications.map(
                                          (application) => (
                                            <span key={application.condition}>
                                              {
                                                CONDITION_LABELS[
                                                  application.condition
                                                ]
                                              }{' '}
                                              applied
                                              <strong>
                                                {percentFormatter.format(
                                                  application.probability,
                                                )}
                                              </strong>
                                            </span>
                                          ),
                                        )}
                                      </div>
                                    </article>
                                  </li>
                                )
                              })}
                            </ol>

                            <div
                              className={
                                activity.events.length === 0
                                  ? 'activity-empty'
                                  : 'add-event'
                              }
                            >
                              {activity.events.length === 0 && (
                                <p>No events in this activity yet.</p>
                              )}
                              <button
                                className="add-button"
                                type="button"
                                aria-expanded={
                                  chooserActivityId === activity.id
                                }
                                aria-controls={`${activity.id}-event-chooser`}
                                onClick={() =>
                                  setChooserActivityId((current) =>
                                    current === activity.id
                                      ? undefined
                                      : activity.id,
                                  )
                                }
                              >
                                {chooserActivityId === activity.id ? (
                                  <X aria-hidden="true" size={19} />
                                ) : (
                                  <Plus aria-hidden="true" size={19} />
                                )}
                                {chooserActivityId === activity.id
                                  ? 'Close'
                                  : 'Add event'}
                              </button>
                              {chooserActivityId === activity.id && (
                                <div
                                  className="event-chooser"
                                  id={`${activity.id}-event-chooser`}
                                >
                                  <EventTypeButtons
                                    onSelect={(type) => addEvent(path, type)}
                                  />
                                </div>
                              )}
                            </div>
                          </section>
                        )
                      })}
                    </div>
                    {turn.activities.length === 0 && (
                      <p className="nested-empty">
                        No activities in this turn yet.
                      </p>
                    )}
                    <div
                      className="nested-add-actions"
                      aria-label={`Add activity to ${turn.owner} turn`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          addActivity(round.id, turn.id, turn.owner, 'action')
                        }
                      >
                        <Plus aria-hidden="true" size={16} />
                        Add action
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          addActivity(
                            round.id,
                            turn.id,
                            turn.owner,
                            'bonus-action',
                          )
                        }
                      >
                        <Plus aria-hidden="true" size={16} />
                        Add bonus action
                      </button>
                    </div>
                  </section>
                ))}
              </div>
              {round.turns.length === 0 && (
                <p className="nested-empty">No turns in this round yet.</p>
              )}
              <div
                className="nested-add-actions"
                aria-label={`Add turn to round ${roundIndex + 1}`}
              >
                <button
                  type="button"
                  onClick={() => addTurn(round.id, 'player')}
                >
                  <Plus aria-hidden="true" size={16} />
                  Add player turn
                </button>
                <button
                  type="button"
                  onClick={() => addTurn(round.id, 'enemy')}
                >
                  <Plus aria-hidden="true" size={16} />
                  Add enemy turn
                </button>
              </div>
            </section>
          ))}
        </div>

        {rounds.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Plus aria-hidden="true" size={24} />
            </div>
            <h3>Start your combat timeline</h3>
            <p>Add a round, then choose its turns, activities, and events.</p>
          </div>
        )}
        <div className="add-round">
          <button className="add-button" type="button" onClick={addRound}>
            <Plus aria-hidden="true" size={19} />
            Add round
          </button>
        </div>
      </section>
    </main>
  )
}

export default App
