import {
  Calculator,
  ChevronDown,
  ChevronUp,
  CircleMinus,
  CirclePlay,
  CirclePlus,
  CircleStop,
  Copy,
  GripVertical,
  Hand,
  HeartPulse,
  Plus,
  Shield,
  ShieldCheck,
  ShieldOff,
  Swords,
  Sparkles,
  Trash2,
  Unlink2,
  Wand,
  WandSparkles,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  ConditionPicker,
  type ConditionPickerOption,
} from './components/ConditionPicker'
import { ConditionIcon } from './components/ConditionIcon'
import { StateSummary, StateTransition } from './components/StateSummary'
import type {
  Ability,
  ActivityType,
  AttackRollMode,
  Combatant,
  ConditionConfig,
  ConditionInstance,
  ConditionRemovalConfig,
  ConditionTarget,
  ConditionType,
  Cover,
  DamageConsequence,
  DamageType,
  EventConfig,
  EventResult,
  GeneratedBoundaryResult,
  HeroicInspirationPolicy,
  Outcome,
  PersistentConditionType,
  TurnBoundary,
  SavingThrowRollMode,
} from './probability/event'
import {
  PERSISTENT_CONDITION_TYPES,
  calculateEvent,
  calculateSequence,
  INITIAL_SEQUENCE_STATE,
  MAX_DAMAGE_DICE,
} from './probability/event'
import { isPersistentConditionType } from './probability/conditions'
import type { CombatantState, StateProbability } from './probability/event'
import './App.css'

const DAMAGE_DIE_SIDES = [4, 6, 8, 10, 12, 20] as const
const DAMAGE_CONSEQUENCES: readonly {
  value: DamageConsequence
  label: string
}[] = [
  { value: 'none', label: 'None' },
  { value: 'half', label: 'Half' },
  { value: 'full', label: 'Full' },
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
  { value: 'automatic-failure', label: 'Automatic Failure' },
]
const ABILITIES: readonly { value: Ability; label: string }[] = [
  { value: 'strength', label: 'STR' },
  { value: 'dexterity', label: 'DEX' },
  { value: 'constitution', label: 'CON' },
  { value: 'intelligence', label: 'INT' },
  { value: 'wisdom', label: 'WIS' },
  { value: 'charisma', label: 'CHA' },
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
const CONDITION_LABELS: Record<ConditionType, string> = {
  blinded: 'Blinded',
  poisoned: 'Poisoned',
  restrained: 'Restrained',
  stunned: 'Stunned',
  paralyzed: 'Paralyzed',
  unconscious: 'Unconscious',
  prone: 'Prone',
  grappled: 'Grappled',
  frightened: 'Frightened',
  petrified: 'Petrified',
  incapacitated: 'Incapacitated',
  invisible: 'Invisible',
  exhaustion: 'Exhaustion',
  vex: 'Vex',
  sap: 'Sap',
  dodging: 'Dodging',
}
const STATE_CONDITION_OPTIONS: readonly ConditionPickerOption<ConditionType>[] =
  ([...PERSISTENT_CONDITION_TYPES, 'vex', 'sap', 'dodging'] as const).map(
    (type) => ({
      value: type,
      label: CONDITION_LABELS[type],
    }),
  )
const CONDITION_OPTIONS: readonly ConditionPickerOption<PersistentConditionType>[] =
  PERSISTENT_CONDITION_TYPES.map((type) => ({
    value: type,
    label: CONDITION_LABELS[type],
  }))
const CONDITION_IMMUNITY_OPTIONS: readonly ConditionPickerOption<PersistentConditionType>[] =
  PERSISTENT_CONDITION_TYPES.map((type) => ({
    value: type,
    label: CONDITION_LABELS[type],
  }))
const DAMAGE_TYPE_OPTIONS: readonly ConditionPickerOption<DamageType>[] =
  DAMAGE_TYPES

interface StateDraft {
  readonly armorClass: string
  readonly attackModifier: string
  readonly saveDc: string
  readonly saveModifiers: Record<Ability, string>
  readonly vex: boolean
  readonly sap: boolean
  readonly helped: boolean
  readonly helpSource: Combatant | null
  readonly dodging: boolean
  readonly heroicInspiration: boolean
  readonly damageImmunities: readonly DamageType[]
  readonly damageResistances: readonly DamageType[]
  readonly damageVulnerabilities: readonly DamageType[]
  readonly conditions: readonly ConditionInstance[]
  readonly conditionImmunities: readonly PersistentConditionType[]
  readonly exhaustion: string
  readonly concentration: boolean
}

type EventType = EventDraft['type']
type OutcomeType = Outcome['type'] | undefined

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

interface BaseEventDraft extends DamageDraft, InspirationDraft {
  readonly id: string
  readonly type: EventType
  readonly conditionGate?: ConditionGateDraft
}

interface ConditionGateDraft {
  readonly target: Combatant
  readonly mustHave: readonly ConditionRemovalConfig[]
  readonly mustNotHave: readonly ConditionRemovalConfig[]
}

interface AttackDraft extends BaseEventDraft {
  readonly type: 'player-attack' | 'enemy-attack'
  readonly armorClass: string
  readonly attackModifier: string
  readonly rollMode: AttackRollMode
  readonly cover: Cover
  readonly hitConditions: readonly ConditionConfig[]
  readonly hitSaveEnabled: boolean
  readonly hitSaveDc: string
  readonly hitSaveModifier: string
  readonly hitSaveAbility: Ability
  readonly hitSaveRollMode: SavingThrowRollMode
  readonly hitSaveCover: Cover
  readonly hitSaveFailureConditions: readonly ConditionConfig[]
  readonly hitSaveSuccessConditions: readonly ConditionConfig[]
}

interface SavingThrowDraft extends BaseEventDraft {
  readonly id: string
  readonly type: 'player-saving-throw' | 'enemy-saving-throw'
  readonly overrideSaveDc: boolean
  readonly overrideSaveModifier: boolean
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

interface AbilityCheckDraft extends BaseEventDraft {
  readonly type: 'player-ability-check' | 'enemy-ability-check'
  readonly ability: Ability
  readonly dc: string
  readonly modifier: string
  readonly rollMode: AttackRollMode
  readonly sightDependent: boolean
  readonly successConditions: readonly ConditionConfig[]
  readonly failureConditions: readonly ConditionConfig[]
  readonly successRemovals: readonly ConditionRemovalConfig[]
  readonly failureRemovals: readonly ConditionRemovalConfig[]
}

interface InitiativeDraft extends BaseEventDraft {
  readonly type: 'player-initiative' | 'enemy-initiative'
  readonly ability: Ability
  readonly modifier: string
  readonly rollMode: AttackRollMode
}

interface StandaloneDamageDraft extends BaseEventDraft {
  readonly type: 'player-damage' | 'enemy-damage'
  readonly target: Combatant
}

interface GrappleOrShoveDraft extends BaseEventDraft {
  readonly type:
    'player-grapple' | 'enemy-grapple' | 'player-shove' | 'enemy-shove'
  readonly saveDc: string
  readonly targetSaveModifier: string
  readonly targetSaveAbility: 'strength' | 'dexterity'
  readonly useTargetSaveOverride: boolean
  readonly rollMode: SavingThrowRollMode
  readonly cover: Cover
}

interface ConditionalDraft extends BaseEventDraft {
  readonly type: 'conditional'
  readonly target: Combatant
  readonly mustHave: readonly ConditionRemovalConfig[]
  readonly mustNotHave: readonly ConditionRemovalConfig[]
  readonly events: readonly EventDraft[]
}

interface ApplyConditionDraft extends BaseEventDraft {
  readonly type: 'apply-condition'
  readonly source: Combatant
  readonly target: Combatant
  readonly conditions: readonly ConditionConfig[]
}

interface ApplyEffectDraft extends BaseEventDraft {
  readonly type: 'apply-effect'
  readonly source: Combatant
  readonly target: Combatant
  readonly effects: readonly ConditionConfig[]
}

interface RemoveConditionDraft extends BaseEventDraft {
  readonly type: 'remove-condition'
  readonly target: Combatant
  readonly conditions: readonly ConditionRemovalConfig[]
}

interface RemoveEffectDraft extends BaseEventDraft {
  readonly type: 'remove-effect'
  readonly target: Combatant
  readonly effects: readonly ConditionRemovalConfig[]
}

interface HelpDraft extends BaseEventDraft {
  readonly type: 'help'
  readonly owner: Combatant
  readonly target: Combatant
}

interface DodgeDraft extends BaseEventDraft {
  readonly type: 'dodge'
  readonly owner: Combatant
}

interface GrappledEscapeDraft extends BaseEventDraft {
  readonly type: 'grappled-escape'
  readonly owner: Combatant
  readonly ability: Ability
  readonly dc: string
  readonly modifier: string
  readonly rollMode: AttackRollMode
  readonly sightDependent: boolean
  readonly grappledConditionId: string
  readonly successConditions: readonly ConditionConfig[]
  readonly failureConditions: readonly ConditionConfig[]
  readonly successRemovals: readonly ConditionRemovalConfig[]
  readonly failureRemovals: readonly ConditionRemovalConfig[]
}

interface StartConcentrationDraft extends BaseEventDraft {
  readonly type: 'start-concentration'
  readonly owner: Combatant
  readonly constitutionModifier: string
}

interface StopConcentrationDraft extends BaseEventDraft {
  readonly type: 'stop-concentration'
  readonly owner: Combatant
}

type EventDraft =
  | AttackDraft
  | SavingThrowDraft
  | AbilityCheckDraft
  | InitiativeDraft
  | StandaloneDamageDraft
  | GrappleOrShoveDraft
  | ConditionalDraft
  | ApplyConditionDraft
  | ApplyEffectDraft
  | RemoveConditionDraft
  | RemoveEffectDraft
  | HelpDraft
  | DodgeDraft
  | GrappledEscapeDraft
  | StartConcentrationDraft
  | StopConcentrationDraft

interface ActivityDraft {
  readonly id: string
  readonly type: ActivityType
  readonly owner: Combatant
  readonly conditionGate?: ConditionGateDraft
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

interface ScenarioDraft {
  readonly rounds: RoundDraft[]
  readonly stateDrafts: Record<Combatant, StateDraft>
}

interface SavedProfile {
  readonly id: string
  readonly name: string
  readonly draft: ScenarioDraft
}

const PROFILE_STORAGE_KEY = 'crunch-lab.scenario-profiles.v1'
const PROFILE_EXPORT_FORMAT = 'crunch-lab-profile'
const PROFILE_EXPORT_VERSION = 1

interface ProfileExport {
  readonly format: typeof PROFILE_EXPORT_FORMAT
  readonly version: typeof PROFILE_EXPORT_VERSION
  readonly exportedAt: string
  readonly profile: {
    readonly name: string
    readonly draft: ScenarioDraft
  }
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
  | 'overrideSaveDc'
  | 'overrideSaveModifier'
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
  | 'ability'
  | 'dc'
  | 'modifier'
  | 'sightDependent'
  | 'successRemovals'
  | 'failureRemovals'
  | 'source'
  | 'target'
  | 'conditions'
  | 'effects'
  | 'owner'
  | 'grappledConditionId'
  | 'constitutionModifier'
  | 'targetSaveModifier'
  | 'targetSaveAbility'
  | 'useTargetSaveOverride'
  | 'mustHave'
  | 'mustNotHave'
  | 'events'
  | 'conditionGate'
  | 'hitSaveEnabled'
  | 'hitSaveDc'
  | 'hitSaveModifier'
  | 'hitSaveAbility'
  | 'hitSaveRollMode'
  | 'hitSaveCover'
  | 'hitSaveFailureConditions'
  | 'hitSaveSuccessConditions'
type EventFieldValue =
  | string
  | boolean
  | Combatant
  | Ability
  | readonly ConditionConfig[]
  | readonly ConditionRemovalConfig[]
  | readonly EventDraft[]
  | ConditionGateDraft
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
  dc?: string
  modifier?: string
  constitutionModifier?: string
  heroicInspiration?: string
}

interface EventEvaluation {
  readonly errors: EventErrors
  readonly config?: EventConfig
  readonly result?: EventResult
}

interface RenderableEventResult extends EventResult {
  readonly stateBefore?: readonly StateProbability[]
  readonly stateAfter?: readonly StateProbability[]
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
  'player-attack': 'Player Attack',
  'enemy-attack': 'Enemy Attack',
  'player-saving-throw': 'Player Saving Throw',
  'enemy-saving-throw': 'Enemy Saving Throw',
  'player-ability-check': 'Player Ability Check',
  'enemy-ability-check': 'Enemy Ability Check',
  'player-initiative': 'Player Initiative',
  'enemy-initiative': 'Enemy Initiative',
  'player-damage': 'Damage to Player',
  'enemy-damage': 'Damage to Enemy',
  'player-grapple': 'Player Grapple',
  'enemy-grapple': 'Enemy Grapple',
  'player-shove': 'Player Shove',
  'enemy-shove': 'Enemy Shove',
  conditional: 'Conditional',
  'apply-condition': 'Apply Condition',
  'apply-effect': 'Apply Effect',
  'remove-condition': 'Remove Condition',
  'remove-effect': 'Remove Effect',
  help: 'Help',
  dodge: 'Dodge',
  'grappled-escape': 'Grappled Escape',
  'start-concentration': 'Start Concentration',
  'stop-concentration': 'Stop Concentration',
}

const EVENT_ICONS: Record<EventType, LucideIcon> = {
  'player-attack': Swords,
  'enemy-attack': Swords,
  'player-saving-throw': Shield,
  'enemy-saving-throw': Shield,
  'player-ability-check': Calculator,
  'enemy-ability-check': Calculator,
  'player-initiative': Sparkles,
  'enemy-initiative': Sparkles,
  'player-damage': HeartPulse,
  'enemy-damage': HeartPulse,
  'player-grapple': Hand,
  'enemy-grapple': Hand,
  'player-shove': Hand,
  'enemy-shove': Hand,
  conditional: Calculator,
  'apply-condition': CirclePlus,
  'apply-effect': WandSparkles,
  'remove-condition': CircleMinus,
  'remove-effect': Wand,
  help: Hand,
  dodge: ShieldCheck,
  'grappled-escape': Unlink2,
  'start-concentration': CirclePlay,
  'stop-concentration': CircleStop,
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
      armorClass: '',
      attackModifier: '',
      rollMode: 'normal',
      cover: 'none',
      hitConditions: [],
      hitSaveEnabled: false,
      hitSaveDc: '',
      hitSaveModifier: '',
      hitSaveAbility: 'dexterity',
      hitSaveRollMode: 'normal',
      hitSaveCover: 'none',
      hitSaveFailureConditions: [],
      hitSaveSuccessConditions: [],
      ...createDefaultDamage(id),
      ...createDefaultInspiration(id),
    }
  }
  if (type === 'player-saving-throw' || type === 'enemy-saving-throw') {
    return {
      id,
      type,
      overrideSaveDc: false,
      overrideSaveModifier: false,
      saveDc: '',
      saveModifier: '',
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
  if (type === 'player-ability-check' || type === 'enemy-ability-check') {
    return {
      id,
      type,
      ability: 'dexterity',
      dc: '12',
      modifier: '0',
      rollMode: 'normal',
      sightDependent: false,
      successConditions: [],
      failureConditions: [],
      successRemovals: [],
      failureRemovals: [],
      ...createDefaultDamage(id),
      ...createDefaultInspiration(id),
    }
  }
  if (type === 'player-initiative' || type === 'enemy-initiative') {
    return {
      id,
      type,
      ability: 'dexterity',
      modifier: '0',
      rollMode: 'normal',
      ...createDefaultDamage(id),
      ...createDefaultInspiration(id),
    }
  }
  if (type === 'player-damage' || type === 'enemy-damage') {
    return {
      id,
      type,
      target: type === 'player-damage' ? 'player' : 'enemy',
      ...createDefaultDamage(id),
      ...createDefaultInspiration(id),
    }
  }
  if (
    type === 'player-grapple' ||
    type === 'enemy-grapple' ||
    type === 'player-shove' ||
    type === 'enemy-shove'
  ) {
    return {
      id,
      type,
      saveDc: '',
      targetSaveModifier: '',
      targetSaveAbility: 'strength',
      useTargetSaveOverride: false,
      rollMode: 'normal',
      cover: 'none',
      ...createDefaultDamage(id),
      ...createDefaultInspiration(id),
    }
  }
  if (type === 'conditional') {
    return {
      id,
      type,
      target: 'enemy',
      mustHave: [],
      mustNotHave: [],
      events: [],
      ...createDefaultDamage(id),
      ...createDefaultInspiration(id),
    }
  }
  if (type === 'apply-condition') {
    return {
      id,
      type,
      source: 'player',
      target: 'enemy',
      conditions: [],
      ...createDefaultDamage(id),
      ...createDefaultInspiration(id),
    }
  }
  if (type === 'apply-effect') {
    return {
      id,
      type,
      source: 'player',
      target: 'enemy',
      effects: [],
      ...createDefaultDamage(id),
      ...createDefaultInspiration(id),
    }
  }
  if (type === 'remove-condition') {
    return {
      id,
      type,
      target: 'enemy',
      conditions: [],
      ...createDefaultDamage(id),
      ...createDefaultInspiration(id),
    }
  }
  if (type === 'remove-effect') {
    return {
      id,
      type,
      target: 'enemy',
      effects: [],
      ...createDefaultDamage(id),
      ...createDefaultInspiration(id),
    }
  }
  if (type === 'help') {
    return {
      id,
      type,
      owner: 'player',
      target: 'enemy',
      ...createDefaultDamage(id),
      ...createDefaultInspiration(id),
    }
  }
  if (type === 'dodge') {
    return {
      id,
      type,
      owner: 'player',
      ...createDefaultDamage(id),
      ...createDefaultInspiration(id),
    }
  }
  if (type === 'grappled-escape') {
    return {
      id,
      type,
      owner: 'player',
      ability: 'strength',
      dc: '',
      modifier: '',
      rollMode: 'normal',
      sightDependent: false,
      grappledConditionId: '',
      successConditions: [],
      failureConditions: [],
      successRemovals: [],
      failureRemovals: [],
      ...createDefaultDamage(id),
      ...createDefaultInspiration(id),
    }
  }
  if (type === 'start-concentration') {
    return {
      id,
      type,
      owner: 'player',
      constitutionModifier: '0',
      ...createDefaultDamage(id),
      ...createDefaultInspiration(id),
    }
  }
  if (type === 'stop-concentration') {
    return {
      id,
      type,
      owner: 'player',
      ...createDefaultDamage(id),
      ...createDefaultInspiration(id),
    }
  }
  throw new Error(`Unsupported event type: ${type}`)
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
    ...(event.type === 'conditional'
      ? {
          events: event.events.map((child, index) =>
            duplicateEvent(
              child,
              `${id}-child-${index + 1}`,
              createDamagePoolId,
            ),
          ),
        }
      : {}),
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

function isSavingThrowDraft(draft: EventDraft): draft is SavingThrowDraft {
  return (
    draft.type === 'player-saving-throw' || draft.type === 'enemy-saving-throw'
  )
}

function isDamageDraft(
  draft: EventDraft,
): draft is AttackDraft | SavingThrowDraft | StandaloneDamageDraft {
  return (
    isAttackDraft(draft) ||
    isSavingThrowDraft(draft) ||
    draft.type === 'player-damage' ||
    draft.type === 'enemy-damage'
  )
}

function isAbilityCheckDraft(
  draft: EventDraft,
): draft is AbilityCheckDraft | GrappledEscapeDraft {
  return (
    draft.type === 'player-ability-check' ||
    draft.type === 'enemy-ability-check' ||
    draft.type === 'grappled-escape'
  )
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

  const usesDamage =
    isAttackDraft(draft) ||
    draft.type === 'player-saving-throw' ||
    draft.type === 'enemy-saving-throw' ||
    draft.type === 'player-damage' ||
    draft.type === 'enemy-damage'
  for (const pool of usesDamage ? draft.damagePools : []) {
    const diceCount = parseInteger(pool.diceCount)
    const dieSides = parseInteger(pool.dieSides)
    const modifier = parseInteger(pool.modifier)
    const poolErrors: DamagePoolErrors = {}
    if (
      diceCount === undefined ||
      diceCount < 1 ||
      diceCount > MAX_DAMAGE_DICE
    ) {
      poolErrors.diceCount = `Enter a whole number from 1 through ${MAX_DAMAGE_DICE}.`
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
    if (armorClass !== undefined && armorClass < 1) {
      errors.armorClass = 'Enter a whole number of at least 1.'
    }
    if (draft.attackModifier !== '' && attackModifier === undefined) {
      errors.attackModifier = 'Enter a whole number.'
    }
    const hitSaveDc = parseInteger(draft.hitSaveDc)
    const hitSaveModifier = parseInteger(draft.hitSaveModifier)
    if (
      draft.hitSaveEnabled &&
      draft.hitSaveDc !== '' &&
      (hitSaveDc === undefined || hitSaveDc < 1)
    )
      errors.saveDc = 'Enter a whole number of at least 1.'
    if (
      draft.hitSaveEnabled &&
      draft.hitSaveModifier !== '' &&
      hitSaveModifier === undefined
    )
      errors.saveModifier = 'Enter a whole number.'
    const heroicInspiration = inspirationPolicyFor(draft, errors)
    if (Object.keys(errors).length > 0) return { errors }

    const config: EventConfig = {
      id: draft.id,
      type: draft.type,
      ...(armorClass !== undefined ? { armorClass } : {}),
      ...(attackModifier !== undefined ? { attackModifier } : {}),
      rollMode: draft.rollMode,
      cover: draft.cover,
      hitConditions: draft.hitConditions,
      ...(draft.hitSaveEnabled
        ? {
            hitSave: {
              ...(hitSaveDc === undefined ? {} : { saveDc: hitSaveDc }),
              ...(hitSaveModifier === undefined
                ? {}
                : { saveModifier: hitSaveModifier }),
              saveAbility: draft.hitSaveAbility,
              rollMode: draft.hitSaveRollMode,
              cover: draft.hitSaveCover,
              failureConditions: draft.hitSaveFailureConditions,
              successConditions: draft.hitSaveSuccessConditions,
            },
          }
        : {}),
      damagePools,
      heroicInspiration,
    }
    return { errors, config, result: calculateEvent(config) }
  }

  if (
    draft.type === 'player-saving-throw' ||
    draft.type === 'enemy-saving-throw'
  ) {
    const saveDc = parseInteger(draft.saveDc)
    const saveModifier = parseInteger(draft.saveModifier)
    if (draft.overrideSaveDc && (saveDc === undefined || saveDc < 1)) {
      errors.saveDc = 'Enter a whole number of at least 1.'
    }
    if (draft.overrideSaveModifier && saveModifier === undefined)
      errors.saveModifier = 'Enter a whole number.'
    const heroicInspiration = inspirationPolicyFor(draft, errors)
    if (Object.keys(errors).length > 0) return { errors }
    const config: EventConfig = {
      id: draft.id,
      type: draft.type,
      ...(draft.overrideSaveDc ? { saveDc: saveDc! } : {}),
      ...(draft.overrideSaveModifier ? { saveModifier: saveModifier! } : {}),
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

  if (
    draft.type === 'player-ability-check' ||
    draft.type === 'enemy-ability-check'
  ) {
    const dc = parseInteger(draft.dc)
    const modifier = parseInteger(draft.modifier)
    if (dc === undefined || dc < 1)
      errors.dc = 'Enter a whole number of at least 1.'
    if (modifier === undefined) errors.modifier = 'Enter a whole number.'
    if (Object.keys(errors).length > 0) return { errors }
    const config: EventConfig = {
      id: draft.id,
      type: draft.type,
      ability: draft.ability,
      dc: dc!,
      modifier: modifier!,
      rollMode: draft.rollMode,
      sightDependent: draft.sightDependent,
      successConditions: draft.successConditions,
      failureConditions: draft.failureConditions,
      successRemovals: draft.successRemovals,
      failureRemovals: draft.failureRemovals,
    }
    return { errors, config, result: calculateEvent(config) }
  }

  if (draft.type === 'grappled-escape') {
    const dc = parseInteger(draft.dc)
    const modifier = parseInteger(draft.modifier)
    if (draft.dc !== '' && (dc === undefined || dc < 1))
      errors.dc = 'Enter a whole number of at least 1.'
    if (draft.modifier !== '' && modifier === undefined)
      errors.modifier = 'Enter a whole number.'
    if (Object.keys(errors).length > 0) return { errors }
    const config: EventConfig = {
      id: draft.id,
      type: draft.type,
      owner: draft.owner,
      ability: draft.ability,
      ...(dc === undefined ? {} : { dc }),
      ...(modifier === undefined ? {} : { modifier }),
      rollMode: draft.rollMode,
      sightDependent: draft.sightDependent,
      grappledConditionId: draft.grappledConditionId || undefined,
      successConditions: draft.successConditions,
      failureConditions: draft.failureConditions,
      successRemovals: draft.successRemovals,
      failureRemovals: draft.failureRemovals,
    }
    return { errors, config, result: calculateEvent(config) }
  }

  if (draft.type === 'player-initiative' || draft.type === 'enemy-initiative') {
    const modifier = parseInteger(draft.modifier)
    if (modifier === undefined) errors.modifier = 'Enter a whole number.'
    if (Object.keys(errors).length > 0) return { errors }
    const config: EventConfig = {
      id: draft.id,
      type: draft.type,
      ability: draft.ability,
      modifier: modifier!,
      rollMode: draft.rollMode,
    }
    return { errors, config, result: calculateEvent(config) }
  }

  if (draft.type === 'player-damage' || draft.type === 'enemy-damage') {
    const heroicInspiration = inspirationPolicyFor(draft, errors)
    if (Object.keys(errors).length > 0) return { errors }
    const config: EventConfig = {
      id: draft.id,
      type: draft.type,
      target: draft.target,
      damagePools,
      heroicInspiration,
    }
    return { errors, config, result: calculateEvent(config) }
  }

  if (draft.type === 'conditional') {
    const children = draft.events.map(evaluateEvent)
    if (children.some((child) => child.config === undefined)) return { errors }
    const config: EventConfig = {
      id: draft.id,
      type: 'conditional',
      target: draft.target,
      mustHave: draft.mustHave,
      mustNotHave: draft.mustNotHave,
      events: children.map((child) => child.config!),
    }
    return { errors, config, result: calculateEvent(config) }
  }

  if (
    draft.type === 'player-grapple' ||
    draft.type === 'enemy-grapple' ||
    draft.type === 'player-shove' ||
    draft.type === 'enemy-shove'
  ) {
    const saveDc = parseInteger(draft.saveDc)
    const targetSaveModifier = parseInteger(draft.targetSaveModifier)
    if (draft.saveDc !== '' && (saveDc === undefined || saveDc < 1))
      errors.saveDc = 'Enter a whole number of at least 1.'
    if (draft.useTargetSaveOverride && targetSaveModifier === undefined)
      errors.saveModifier = 'Enter a whole number.'
    if (Object.keys(errors).length > 0) return { errors }
    const config: EventConfig = {
      id: draft.id,
      type: draft.type,
      ...(saveDc === undefined ? {} : { saveDc }),
      ...(draft.useTargetSaveOverride
        ? {
            targetSaveModifier: targetSaveModifier!,
            targetSaveAbility: draft.targetSaveAbility,
          }
        : {}),
      rollMode: draft.rollMode,
      cover: draft.cover,
    }
    return { errors, config, result: calculateEvent(config) }
  }

  let config: EventConfig
  if (draft.type === 'apply-condition') {
    config = {
      id: draft.id,
      type: draft.type,
      source: draft.source,
      target: draft.target,
      conditions: draft.conditions,
    }
  } else if (draft.type === 'apply-effect') {
    config = {
      id: draft.id,
      type: draft.type,
      source: draft.source,
      target: draft.target,
      effects: draft.effects,
    }
  } else if (draft.type === 'remove-condition') {
    config = {
      id: draft.id,
      type: draft.type,
      target: draft.target,
      conditions: draft.conditions,
    }
  } else if (draft.type === 'remove-effect') {
    config = {
      id: draft.id,
      type: draft.type,
      target: draft.target,
      effects: draft.effects,
    }
  } else if (draft.type === 'help') {
    config = {
      id: draft.id,
      type: draft.type,
      owner: draft.owner,
      target: draft.target,
    }
  } else if (draft.type === 'dodge') {
    config = { id: draft.id, type: draft.type, owner: draft.owner }
  } else if (draft.type === 'start-concentration') {
    const constitutionModifier = parseInteger(draft.constitutionModifier)
    if (constitutionModifier === undefined) {
      errors.constitutionModifier = 'Enter a whole number.'
      return { errors }
    }
    config = {
      id: draft.id,
      type: draft.type,
      owner: draft.owner,
      constitutionModifier,
    }
  } else if (draft.type === 'stop-concentration') {
    config = { id: draft.id, type: draft.type, owner: draft.owner }
  } else {
    return { errors }
  }
  return { errors, config, result: calculateEvent(config) }
}

function outcomeTypeFor(event: EventDraft): OutcomeType {
  if (
    event.type === 'player-attack' ||
    event.type === 'enemy-saving-throw' ||
    event.type === 'enemy-damage'
  ) {
    return 'expected-damage-against-enemies'
  }
  if (
    event.type === 'enemy-attack' ||
    event.type === 'player-saving-throw' ||
    event.type === 'player-damage'
  ) {
    return 'expected-damage-against-players'
  }
  return undefined
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
  if (!isDamageDraft(event)) return null
  const prefix = event.id
  return (
    <fieldset className="damage-section">
      <legend>
        {event.type === 'player-attack' || event.type === 'enemy-attack'
          ? 'Damage on Hit'
          : 'Damage Roll'}
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
                <div className="damage-formula">
                  <div className="field">
                    <label htmlFor={prefix + '-' + pool.id + '-dice-count'}>
                      Dice (1–{MAX_DAMAGE_DICE})
                    </label>
                    <input
                      id={prefix + '-' + pool.id + '-dice-count'}
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max={MAX_DAMAGE_DICE}
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
                      Die Size
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
                </div>
                <div className="damage-details">
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
                      Damage Type
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
  if (!isDamageDraft(event)) return null
  const thresholdId = `${event.id}-inspiration-threshold`
  const poolId = `${event.id}-inspiration-pool`
  return (
    <fieldset className="roll-section inspiration-section">
      <legend>Heroic Inspiration</legend>
      <div className="roll-fields">
        <div className="field">
          <label htmlFor={`${event.id}-inspiration-mode`}>Reroll Policy</label>
          <select
            id={`${event.id}-inspiration-mode`}
            value={event.heroicInspirationMode}
            onChange={(change) =>
              update('heroicInspirationMode', change.target.value)
            }
          >
            <option value="none">Do Not Spend</option>
            <option value="d20-after-failure">Failed D20</option>
            <option value="damage-pool-threshold">Damage Die Threshold</option>
          </select>
        </div>
        {event.heroicInspirationMode === 'damage-pool-threshold' && (
          <div className="dependent-fields">
            <div className="field">
              <label htmlFor={poolId}>Damage Pool</label>
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
              <label htmlFor={thresholdId}>Reroll Threshold (1–20)</label>
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
          </div>
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
    <fieldset className="roll-section attack-roll-section">
      <legend>Attack Roll</legend>
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
            placeholder="Inherited AC"
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
          <label htmlFor={`${event.id}-attack-modifier`}>Attack Modifier</label>
          <input
            id={`${event.id}-attack-modifier`}
            type="number"
            inputMode="numeric"
            step="1"
            value={event.attackModifier}
            placeholder="Inherited modifier"
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
          <label htmlFor={`${event.id}-roll-mode`}>Roll Mode</label>
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
        <legend>Saving Throw</legend>
        <Shield aria-hidden="true" size={20} />
        <div className="roll-fields">
          <div className="field">
            <label htmlFor={`${event.id}-save-dc`}>DC</label>
            <input
              id={`${event.id}-save-dc`}
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              value={event.saveDc}
              placeholder="Inherited"
              aria-invalid={Boolean(errors.saveDc)}
              aria-describedby={
                errors.saveDc ? `${event.id}-save-dc-error` : undefined
              }
              onChange={(change) => {
                update('overrideSaveDc', change.target.value !== '')
                update('saveDc', change.target.value)
              }}
            />
            {errors.saveDc && (
              <span className="field-error" id={`${event.id}-save-dc-error`}>
                {errors.saveDc}
              </span>
            )}
          </div>
          <div className="field">
            <label htmlFor={`${event.id}-save-modifier`}>Save Modifier</label>
            <input
              id={`${event.id}-save-modifier`}
              type="number"
              inputMode="numeric"
              step="1"
              value={event.saveModifier}
              placeholder="Inherited"
              aria-invalid={Boolean(errors.saveModifier)}
              aria-describedby={
                errors.saveModifier
                  ? `${event.id}-save-modifier-error`
                  : undefined
              }
              onChange={(change) => {
                update('overrideSaveModifier', change.target.value !== '')
                update('saveModifier', change.target.value)
              }}
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
            <label htmlFor={`${event.id}-save-ability`}>Ability</label>
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
            <label htmlFor={`${event.id}-save-roll-mode`}>Roll Mode</label>
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
        <legend>Damage Consequences</legend>
        <div className="consequence-fields">
          <div className="field">
            <label htmlFor={`${event.id}-failure-damage`}>On Failure</label>
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
            <label htmlFor={`${event.id}-success-damage`}>On Success</label>
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

function GrappleOrShoveFields({ event, errors, update }: FieldProps) {
  if (
    ![
      'player-grapple',
      'enemy-grapple',
      'player-shove',
      'enemy-shove',
    ].includes(event.type)
  )
    return null
  const action = event as GrappleOrShoveDraft
  return (
    <fieldset className="condition-section hit-save-section">
      <legend>Target Saving Throw</legend>
      <div className="roll-fields">
        <div className="field">
          <label htmlFor={`${event.id}-action-dc`}>DC</label>
          <input
            id={`${event.id}-action-dc`}
            type="number"
            placeholder="Inherited"
            value={action.saveDc}
            onChange={(change) => update('saveDc', change.target.value)}
            aria-invalid={Boolean(errors.saveDc)}
          />
        </div>
        <div className="field">
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={action.useTargetSaveOverride}
              onChange={(change) =>
                update('useTargetSaveOverride', change.target.checked)
              }
            />
            Custom target save
          </label>
          <label htmlFor={`${event.id}-target-save`}>Modifier</label>
          <input
            id={`${event.id}-target-save`}
            type="number"
            disabled={!action.useTargetSaveOverride}
            value={action.targetSaveModifier}
            onChange={(change) =>
              update('targetSaveModifier', change.target.value)
            }
          />
        </div>
        <div className="field">
          <label htmlFor={`${event.id}-target-ability`}>Ability</label>
          <select
            id={`${event.id}-target-ability`}
            disabled={!action.useTargetSaveOverride}
            value={action.targetSaveAbility}
            onChange={(change) =>
              update('targetSaveAbility', change.target.value)
            }
          >
            <option value="strength">STR</option>
            <option value="dexterity">DEX</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${event.id}-action-roll`}>Roll Mode</label>
          <select
            id={`${event.id}-action-roll`}
            value={action.rollMode}
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
          <label htmlFor={`${event.id}-action-cover`}>Cover</label>
          <select
            id={`${event.id}-action-cover`}
            value={action.cover}
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

function HitSaveFields({ event, errors, update }: FieldProps) {
  if (!isAttackDraft(event)) return null
  return (
    <fieldset className="roll-section">
      <legend>Saving Throw on Hit</legend>
      <label className="checkbox-field">
        <input
          id={`${event.id}-hit-save-enabled`}
          type="checkbox"
          checked={event.hitSaveEnabled}
          onChange={(change) => update('hitSaveEnabled', change.target.checked)}
        />
        Resolve a saving throw after a hit
      </label>
      {event.hitSaveEnabled && (
        <div className="hit-save-details">
          <div className="roll-fields">
            <div className="field">
              <label htmlFor={`${event.id}-hit-save-dc`}>DC</label>
              <input
                id={`${event.id}-hit-save-dc`}
                type="number"
                min="1"
                placeholder="Inherited"
                value={event.hitSaveDc}
                aria-invalid={Boolean(errors.saveDc)}
                onChange={(change) => update('hitSaveDc', change.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor={`${event.id}-hit-save-modifier`}>
                Save Modifier
              </label>
              <input
                id={`${event.id}-hit-save-modifier`}
                type="number"
                placeholder="Inherited"
                value={event.hitSaveModifier}
                aria-invalid={Boolean(errors.saveModifier)}
                onChange={(change) =>
                  update('hitSaveModifier', change.target.value)
                }
              />
            </div>
            <div className="field">
              <label htmlFor={`${event.id}-hit-save-ability`}>Ability</label>
              <select
                id={`${event.id}-hit-save-ability`}
                value={event.hitSaveAbility}
                onChange={(change) =>
                  update('hitSaveAbility', change.target.value)
                }
              >
                {ABILITIES.map((ability) => (
                  <option key={ability.value} value={ability.value}>
                    {ability.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor={`${event.id}-hit-save-roll-mode`}>
                Roll Mode
              </label>
              <select
                id={`${event.id}-hit-save-roll-mode`}
                value={event.hitSaveRollMode}
                onChange={(change) =>
                  update('hitSaveRollMode', change.target.value)
                }
              >
                {SAVE_ROLL_MODES.map((mode) => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor={`${event.id}-hit-save-cover`}>Cover</label>
              <select
                id={`${event.id}-hit-save-cover`}
                value={event.hitSaveCover}
                onChange={(change) =>
                  update('hitSaveCover', change.target.value)
                }
              >
                {COVER_OPTIONS.map((cover) => (
                  <option key={cover.value} value={cover.value}>
                    {cover.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="condition-groups">
            <ConditionChoices
              id={`${event.id}-hit-save-failure`}
              field="hitSaveFailureConditions"
              label="On save failure"
              selected={event.hitSaveFailureConditions}
              update={update}
            />
            <ConditionChoices
              id={`${event.id}-hit-save-success`}
              field="hitSaveSuccessConditions"
              label="On save success"
              selected={event.hitSaveSuccessConditions}
              update={update}
            />
          </div>
        </div>
      )}
    </fieldset>
  )
}

type ConditionField =
  | 'hitConditions'
  | 'hitSaveFailureConditions'
  | 'hitSaveSuccessConditions'
  | 'failureConditions'
  | 'successConditions'
  | 'conditions'
  | 'effects'

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
  const selectedValues = selected.map((condition) => condition.type)
  const pickerOptions = [
    ...CONDITION_OPTIONS,
    { value: 'vex' as const, label: CONDITION_LABELS.vex },
    { value: 'sap' as const, label: CONDITION_LABELS.sap },
    { value: 'exhaustion' as const, label: CONDITION_LABELS.exhaustion },
  ] satisfies readonly ConditionPickerOption<ConditionType>[]

  function updateSelected(values: readonly ConditionType[]) {
    update(
      field,
      values.map((type) => {
        const existing = selected.find((condition) => condition.type === type)
        return (
          existing ?? {
            type,
            ...(type === 'exhaustion' ? { exhaustionLevels: 1 } : {}),
          }
        )
      }),
    )
  }

  return (
    <ConditionPicker
      id={`${id}-picker`}
      label={label}
      options={pickerOptions}
      selected={selectedValues}
      onChange={updateSelected}
      closeOnSelect
      removeLabel={(option) => `Remove ${option.label} ${label.toLowerCase()}`}
    />
  )
}

function ConditionFields({ event, update }: Omit<FieldProps, 'errors'>) {
  if (isAttackDraft(event)) {
    return (
      <fieldset className="condition-section">
        <legend>Conditions on Hit</legend>
        <ConditionChoices
          id={event.id + '-hit'}
          field="hitConditions"
          label="Target Conditions"
          selected={event.hitConditions}
          update={update}
        />
      </fieldset>
    )
  }
  if (isSavingThrowDraft(event)) {
    return (
      <fieldset className="condition-section">
        <legend>Conditions on Target</legend>
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
  if (isAbilityCheckDraft(event)) {
    return (
      <fieldset className="condition-section">
        <legend>Conditions And Removals</legend>
        <div className="condition-groups">
          <ConditionChoices
            id={event.id + '-failure'}
            field="failureConditions"
            label="On Failure: Add Conditions"
            selected={event.failureConditions}
            update={update}
          />
          <ConditionChoices
            id={event.id + '-success'}
            field="successConditions"
            label="On Success: Add Conditions"
            selected={event.successConditions}
            update={update}
          />
          <ConditionRemovalChoices
            id={event.id + '-failure-removals'}
            label="On Failure: Remove Conditions"
            selected={event.failureRemovals}
            onChange={(failureRemovals) =>
              update('failureRemovals', failureRemovals)
            }
          />
          <ConditionRemovalChoices
            id={event.id + '-success-removals'}
            label="On Success: Remove Conditions"
            selected={event.successRemovals}
            onChange={(successRemovals) =>
              update('successRemovals', successRemovals)
            }
          />
        </div>
      </fieldset>
    )
  }
  return null
}

function ConditionRemovalChoices({
  id,
  label,
  selected,
  onChange,
}: {
  id: string
  label: string
  selected: readonly ConditionRemovalConfig[]
  onChange: (values: readonly ConditionRemovalConfig[]) => void
}) {
  const selectedValues = selected.map((condition) => condition.type)
  return (
    <ConditionPicker
      id={`${id}-picker`}
      label={label}
      options={STATE_CONDITION_OPTIONS}
      selected={selectedValues}
      onChange={(values) => onChange(values.map((type) => ({ type })))}
      closeOnSelect
      removeLabel={(option) => `Remove ${option.label} ${label.toLowerCase()}`}
    />
  )
}

function ConditionalFields({
  event,
  update,
  addChild,
}: Omit<FieldProps, 'errors'> & { addChild: (type: EventType) => void }) {
  if (event.type !== 'conditional') return null
  return (
    <fieldset className="condition-section">
      <legend>Only when state matches</legend>
      <div className="field">
        <label htmlFor={`${event.id}-conditional-target`}>
          Inspect combatant
        </label>
        <select
          id={`${event.id}-conditional-target`}
          value={event.target}
          onChange={(change) => update('target', change.target.value)}
        >
          <option value="player">Player</option>
          <option value="enemy">Enemy</option>
        </select>
      </div>
      <div className="condition-groups">
        <ConditionRemovalChoices
          id={`${event.id}-must-have`}
          label="Must have (all)"
          selected={event.mustHave}
          onChange={(mustHave) => update('mustHave', mustHave)}
        />
        <ConditionRemovalChoices
          id={`${event.id}-must-not-have`}
          label="Must not have (all)"
          selected={event.mustNotHave}
          onChange={(mustNotHave) => update('mustNotHave', mustNotHave)}
        />
      </div>
      <div className="nested-events" aria-label="Conditional events">
        <strong>Then run, in order</strong>
        {event.events.length === 0 ? (
          <p className="empty-state">No child events yet.</p>
        ) : (
          <ol>
            {event.events.map((child) => (
              <li key={child.id}>{EVENT_LABELS[child.type]}</li>
            ))}
          </ol>
        )}
        <div className="event-type-buttons">
          <button type="button" onClick={() => addChild('player-attack')}>
            Add player attack
          </button>
          <button type="button" onClick={() => addChild('player-grapple')}>
            Add grapple
          </button>
          <button type="button" onClick={() => addChild('player-shove')}>
            Add shove
          </button>
        </div>
      </div>
    </fieldset>
  )
}

function StateEventFields({ event, update }: Omit<FieldProps, 'errors'>) {
  if (
    event.type !== 'apply-condition' &&
    event.type !== 'apply-effect' &&
    event.type !== 'remove-condition' &&
    event.type !== 'remove-effect' &&
    event.type !== 'help' &&
    event.type !== 'dodge' &&
    event.type !== 'start-concentration' &&
    event.type !== 'stop-concentration'
  ) {
    return null
  }
  const ownerLabel =
    event.type === 'help' ||
    event.type === 'dodge' ||
    event.type.includes('concentration')
  const targetLabel =
    event.type === 'apply-condition' ||
    event.type === 'apply-effect' ||
    event.type === 'remove-condition' ||
    event.type === 'remove-effect'
  const selected =
    event.type === 'apply-condition'
      ? event.conditions
      : event.type === 'apply-effect'
        ? event.effects
        : event.type === 'remove-condition'
          ? event.conditions
          : event.type === 'remove-effect'
            ? event.effects
            : []
  const options = [
    ...CONDITION_OPTIONS,
    { value: 'vex' as const, label: CONDITION_LABELS.vex },
    { value: 'sap' as const, label: CONDITION_LABELS.sap },
    { value: 'exhaustion' as const, label: CONDITION_LABELS.exhaustion },
  ] satisfies readonly ConditionPickerOption<ConditionType>[]
  return (
    <fieldset className="state-event-fields">
      <legend>State Change</legend>
      {ownerLabel &&
        (event.type === 'help' ||
          event.type === 'dodge' ||
          event.type === 'start-concentration' ||
          event.type === 'stop-concentration') && (
          <div className="field">
            <label htmlFor={`${event.id}-owner`}>Owner</label>
            <select
              id={`${event.id}-owner`}
              value={event.owner}
              onChange={(change) => update('owner', change.target.value)}
            >
              <option value="player">Player</option>
              <option value="enemy">Enemy</option>
            </select>
          </div>
        )}
      {targetLabel && (
        <div className="field">
          <label htmlFor={`${event.id}-target`}>Target</label>
          <select
            id={`${event.id}-target`}
            value={event.target}
            onChange={(change) => update('target', change.target.value)}
          >
            <option value="player">Player</option>
            <option value="enemy">Enemy</option>
          </select>
        </div>
      )}
      {(event.type === 'apply-condition' || event.type === 'apply-effect') && (
        <div className="field">
          <label htmlFor={`${event.id}-source`}>Source</label>
          <select
            id={`${event.id}-source`}
            value={event.source}
            onChange={(change) => update('source', change.target.value)}
          >
            <option value="player">Player</option>
            <option value="enemy">Enemy</option>
          </select>
        </div>
      )}
      {(event.type === 'apply-condition' ||
        event.type === 'apply-effect' ||
        event.type === 'remove-condition' ||
        event.type === 'remove-effect') && (
        <ConditionPicker
          id={`${event.id}-state-picker`}
          label={event.type.includes('effect') ? 'Effects' : 'Conditions'}
          options={options}
          selected={selected.map((condition) => condition.type)}
          onChange={(values) => {
            const conditions = values.map((type) => ({ type }))
            update(
              event.type === 'apply-condition' ||
                event.type === 'remove-condition'
                ? 'conditions'
                : 'effects',
              conditions,
            )
          }}
          closeOnSelect
        />
      )}
      {event.type === 'start-concentration' && (
        <div className="field">
          <label htmlFor={`${event.id}-constitution-modifier`}>
            Concentration Constitution modifier
          </label>
          <input
            id={`${event.id}-constitution-modifier`}
            type="number"
            step="1"
            value={event.constitutionModifier}
            onChange={(change) =>
              update('constitutionModifier', change.target.value)
            }
          />
        </div>
      )}
    </fieldset>
  )
}

function AbilityCheckFields({ event, errors, update }: FieldProps) {
  if (!isAbilityCheckDraft(event)) return null
  return (
    <fieldset
      className={
        event.type === 'grappled-escape'
          ? 'roll-section grappled-escape-roll-section'
          : 'roll-section'
      }
    >
      <legend>
        {event.type === 'grappled-escape'
          ? 'Grappled escape check'
          : 'Ability check'}
      </legend>
      {event.type === 'grappled-escape' && (
        <div className="field">
          <label htmlFor={`${event.id}-owner`}>Owner</label>
          <select
            id={`${event.id}-owner`}
            value={event.owner}
            onChange={(change) => update('owner', change.target.value)}
          >
            <option value="player">Player</option>
            <option value="enemy">Enemy</option>
          </select>
        </div>
      )}
      <div className="roll-fields">
        <div className="field">
          <label htmlFor={`${event.id}-dc`}>DC</label>
          <input
            id={`${event.id}-dc`}
            type="number"
            min="1"
            step="1"
            value={event.dc}
            placeholder="Inherited"
            aria-invalid={Boolean(errors.dc)}
            onChange={(change) => update('dc', change.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor={`${event.id}-modifier`}>Modifier</label>
          <input
            id={`${event.id}-modifier`}
            type="number"
            step="1"
            value={event.modifier}
            placeholder="Inherited"
            aria-invalid={Boolean(errors.modifier)}
            onChange={(change) => update('modifier', change.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor={`${event.id}-ability`}>Ability</label>
          <select
            id={`${event.id}-ability`}
            value={event.ability}
            onChange={(change) => update('ability', change.target.value)}
          >
            {ABILITIES.map((ability) => (
              <option key={ability.value} value={ability.value}>
                {ability.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${event.id}-roll-mode`}>Roll Mode</label>
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
      </div>
      <label className="checkbox-field">
        <input
          type="checkbox"
          checked={event.sightDependent}
          onChange={(change) => update('sightDependent', change.target.checked)}
        />
        Sight dependent
      </label>
    </fieldset>
  )
}

function InitiativeFields({ event, errors, update }: FieldProps) {
  if (event.type !== 'player-initiative' && event.type !== 'enemy-initiative')
    return null
  return (
    <fieldset className="roll-section">
      <legend>Initiative Roll</legend>
      <div className="roll-fields">
        <div className="field">
          <label htmlFor={`${event.id}-ability`}>Ability</label>
          <select
            id={`${event.id}-ability`}
            value={event.ability}
            onChange={(change) => update('ability', change.target.value)}
          >
            {ABILITIES.map((ability) => (
              <option key={ability.value} value={ability.value}>
                {ability.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${event.id}-modifier`}>Modifier</label>
          <input
            id={`${event.id}-modifier`}
            type="number"
            step="1"
            value={event.modifier}
            aria-invalid={Boolean(errors.modifier)}
            onChange={(change) => update('modifier', change.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor={`${event.id}-roll-mode`}>Roll Mode</label>
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
      </div>
    </fieldset>
  )
}

interface ShownConditionTotal {
  readonly condition: ConditionType
  readonly target: ConditionTarget
}

function conditionTargetFor(event: EventDraft): ConditionTarget | undefined {
  if (event.type === 'apply-condition' || event.type === 'apply-effect') {
    return event.target === 'enemy' ? 'enemies' : 'players'
  }
  if (
    event.type === 'player-attack' ||
    event.type === 'enemy-saving-throw' ||
    event.type === 'player-ability-check' ||
    event.type === 'grappled-escape'
  )
    return 'enemies'
  if (
    event.type === 'enemy-attack' ||
    event.type === 'player-saving-throw' ||
    event.type === 'enemy-ability-check'
  )
    return 'players'
  return undefined
}

function configuredConditionTotals(
  event: EventDraft,
): readonly ShownConditionTotal[] {
  const conditions = eventConditionConfigs(event).map(
    (condition) => condition.type,
  )
  const target = conditionTargetFor(event)
  if (target === undefined) return []
  return [...new Set(conditions)].map((condition) => ({ condition, target }))
}

function eventConditionConfigs(event: EventDraft): readonly ConditionConfig[] {
  if (isAttackDraft(event))
    return [
      ...event.hitConditions,
      ...event.hitSaveFailureConditions,
      ...event.hitSaveSuccessConditions,
    ]
  if (isSavingThrowDraft(event) || isAbilityCheckDraft(event)) {
    return [...event.failureConditions, ...event.successConditions]
  }
  if (event.type === 'apply-condition') return event.conditions
  if (event.type === 'apply-effect') return event.effects
  return []
}

interface StateErrors {
  armorClass?: string
  attackModifier?: string
  saveDc?: string
  exhaustion?: string
}

function createStateDraft(combatant: Combatant): StateDraft {
  const state = INITIAL_SEQUENCE_STATE[combatant]
  return {
    armorClass: String(state.armorClass ?? 12),
    attackModifier: String(state.attackModifier ?? 0),
    saveDc: String(state.saveDc ?? 12),
    saveModifiers: Object.fromEntries(
      ABILITIES.map((ability) => [
        ability.value,
        String(state.saveModifiers?.[ability.value] ?? 0),
      ]),
    ) as Record<Ability, string>,
    vex: state.vex,
    sap: state.sap,
    helped: state.helped,
    helpSource:
      state.helpSource ?? (combatant === 'player' ? 'enemy' : 'player'),
    dodging: state.dodging,
    heroicInspiration: state.heroicInspiration,
    damageImmunities: [...state.damageImmunities],
    damageResistances: [...state.damageResistances],
    damageVulnerabilities: [...state.damageVulnerabilities],
    conditions: [...state.conditions],
    conditionImmunities: [...state.conditionImmunities],
    exhaustion: String(state.exhaustion),
    concentration: state.concentration !== null,
  }
}

function stateConfigForDraft(draft: StateDraft): {
  readonly state?: CombatantState
  readonly errors: StateErrors
} {
  const errors: StateErrors = {}
  const armorClass = parseInteger(draft.armorClass)
  const attackModifier = parseInteger(draft.attackModifier)
  const saveDc = parseInteger(draft.saveDc)
  const saveModifiers = Object.fromEntries(
    ABILITIES.map((ability) => [
      ability.value,
      parseInteger(draft.saveModifiers[ability.value]),
    ]),
  ) as Record<Ability, number | undefined>
  if (armorClass === undefined || armorClass < 1)
    errors.armorClass = 'Enter a whole number of at least 1.'
  if (attackModifier === undefined)
    errors.attackModifier = 'Enter a whole number.'
  if (saveDc === undefined || saveDc < 1)
    errors.saveDc = 'Enter a whole number of at least 1.'
  if (Object.values(saveModifiers).some((modifier) => modifier === undefined))
    errors.saveDc = 'Enter whole-number save modifiers.'
  const exhaustion = parseInteger(draft.exhaustion)
  if (exhaustion === undefined || exhaustion < 0 || exhaustion > 6) {
    errors.exhaustion = 'Choose an exhaustion level from 0 through 6.'
  }
  if (Object.keys(errors).length > 0) return { errors }
  return {
    errors,
    state: {
      armorClass: armorClass!,
      attackModifier: attackModifier!,
      saveDc: saveDc!,
      saveModifiers: saveModifiers as Record<Ability, number>,
      vex: draft.vex,
      sap: draft.sap,
      helped: draft.helped,
      helpSource: draft.helped ? draft.helpSource : null,
      dodging: draft.dodging,
      heroicInspiration: draft.heroicInspiration,
      damageImmunities: draft.damageImmunities,
      damageResistances: draft.damageResistances,
      damageVulnerabilities: draft.damageVulnerabilities,
      conditions: draft.conditions,
      conditionImmunities: draft.conditionImmunities,
      exhaustion: exhaustion as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      concentration: draft.concentration
        ? { constitutionModifier: saveModifiers.constitution! }
        : null,
    },
  }
}

function prepareSequence(draft: ScenarioDraft) {
  const events = draft.rounds.flatMap((round) =>
    round.turns.flatMap((turn) =>
      turn.activities.flatMap((activity) => activity.events),
    ),
  )
  const evaluations = new Map(
    events.map((event) => [event.id, evaluateEvent(event)] as const),
  )
  const playerStateEvaluation = stateConfigForDraft(draft.stateDrafts.player)
  const enemyStateEvaluation = stateConfigForDraft(draft.stateDrafts.enemy)
  const valid =
    [...evaluations.values()].every((evaluation) => evaluation.config) &&
    playerStateEvaluation.state &&
    enemyStateEvaluation.state
  const sequence = valid
    ? calculateSequence({
        initialState: {
          player: playerStateEvaluation.state!,
          enemy: enemyStateEvaluation.state!,
        },
        rounds: draft.rounds.map((round) => ({
          id: round.id,
          turns: round.turns.map((turn) => ({
            id: turn.id,
            owner: turn.owner,
            activities: turn.activities.map((activity) => ({
              id: activity.id,
              type: activity.type,
              owner: activity.owner,
              ...(activity.conditionGate
                ? { conditionGate: activity.conditionGate }
                : {}),
              events: activity.events.map((event) => ({
                ...evaluations.get(event.id)!.config!,
                ...(event.conditionGate
                  ? { conditionGate: event.conditionGate }
                  : {}),
              })),
            })),
          })),
        })),
      })
    : undefined
  return {
    events,
    evaluations,
    playerStateEvaluation,
    enemyStateEvaluation,
    sequence,
    valid: Boolean(valid),
  }
}

function loadProfiles(): SavedProfile[] {
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is SavedProfile =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as SavedProfile).id === 'string' &&
        typeof (item as SavedProfile).name === 'string' &&
        typeof (item as SavedProfile).draft === 'object' &&
        (item as SavedProfile).draft !== null &&
        Array.isArray((item as SavedProfile).draft.rounds) &&
        typeof (item as SavedProfile).draft.stateDrafts === 'object' &&
        (item as SavedProfile).draft.stateDrafts !== null,
    )
  } catch {
    return []
  }
}

function isScenarioDraft(value: unknown): value is ScenarioDraft {
  if (typeof value !== 'object' || value === null) return false
  const draft = value as Partial<ScenarioDraft>
  if (!Array.isArray(draft.rounds)) return false
  if (typeof draft.stateDrafts !== 'object' || draft.stateDrafts === null) {
    return false
  }
  const states = draft.stateDrafts as Partial<Record<Combatant, unknown>>
  if (
    typeof states.player !== 'object' ||
    states.player === null ||
    typeof states.enemy !== 'object' ||
    states.enemy === null
  ) {
    return false
  }
  return draft.rounds.every(
    (round) =>
      typeof round === 'object' &&
      round !== null &&
      typeof (round as RoundDraft).id === 'string' &&
      Array.isArray((round as RoundDraft).turns),
  )
}

function importedProfile(
  value: unknown,
): Pick<SavedProfile, 'name' | 'draft'> | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const profileExport = value as Partial<ProfileExport>
  if (
    profileExport.format !== PROFILE_EXPORT_FORMAT ||
    profileExport.version !== PROFILE_EXPORT_VERSION ||
    typeof profileExport.profile !== 'object' ||
    profileExport.profile === null ||
    typeof profileExport.profile.name !== 'string' ||
    !isScenarioDraft(profileExport.profile.draft)
  ) {
    return undefined
  }
  return {
    name: profileExport.profile.name.trim() || 'Imported Profile',
    draft: profileExport.profile.draft,
  }
}

function cloneDraft(draft: ScenarioDraft): ScenarioDraft {
  return JSON.parse(JSON.stringify(draft)) as ScenarioDraft
}

function profileFileName(name: string) {
  const base = name
    .trim()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
  return `${base || 'crunch-lab-profile'}.json`
}

function profileId() {
  return `profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function ConditionInstanceEditor({
  condition,
  onChange,
}: {
  readonly condition: ConditionInstance
  readonly onChange: (change: Partial<ConditionInstance>) => void
}) {
  const duration = condition.duration
  const trigger = duration?.repeatedSave
    ? 'repeated-save'
    : duration?.ongoingDamage
      ? 'ongoing-damage'
      : 'none'
  const updateDuration = (
    change: Partial<NonNullable<ConditionInstance['duration']>>,
  ) => {
    const next = duration ?? {
      remainingTurns: 1,
      boundary: 'end' as TurnBoundary,
      turnOwner: condition.recipient,
    }
    onChange({ duration: { ...next, ...change } })
  }
  const updateTrigger = (value: string) => {
    if (value === 'none') {
      if (!duration) return
      onChange({
        duration: {
          remainingTurns: duration.remainingTurns,
          boundary: duration.boundary,
          turnOwner: duration.turnOwner,
        },
      })
      return
    }
    if (value === 'repeated-save') {
      updateDuration({
        ongoingDamage: undefined,
        repeatedSave: duration?.repeatedSave ?? {
          ability: 'constitution',
          dc: 12,
          saveModifier: 0,
        },
      })
      return
    }
    updateDuration({
      repeatedSave: undefined,
      ongoingDamage: duration?.ongoingDamage ?? {
        damageType: 'fire',
        diceCount: 1,
        dieSides: 6,
        modifier: 0,
      },
    })
  }
  return (
    <div
      className="condition-instance-editor"
      aria-label={`${CONDITION_LABELS[condition.type]} condition details`}
    >
      <div className="condition-instance-fields">
        <div className="field">
          <label htmlFor={`${condition.id}-source`}>Source</label>
          <select
            id={`${condition.id}-source`}
            value={condition.source}
            onChange={(event) =>
              onChange({ source: event.target.value as Combatant })
            }
          >
            <option value="player">Player</option>
            <option value="enemy">Enemy</option>
          </select>
        </div>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={duration !== undefined}
            aria-label={`${CONDITION_LABELS[condition.type]} has duration`}
            onChange={(event) =>
              event.target.checked
                ? updateDuration({})
                : onChange({ duration: undefined })
            }
          />
          Has Duration
        </label>
        {duration && (
          <div className="condition-instance-dependent-fields">
            <div className="field">
              <label htmlFor={`${condition.id}-duration`}>
                Duration (Turns)
              </label>
              <input
                id={`${condition.id}-duration`}
                type="number"
                min="1"
                step="1"
                value={duration.remainingTurns}
                onChange={(event) =>
                  updateDuration({ remainingTurns: Number(event.target.value) })
                }
              />
            </div>
            <div className="field">
              <label htmlFor={`${condition.id}-turn-owner`}>Turn Owner</label>
              <select
                id={`${condition.id}-turn-owner`}
                value={duration.turnOwner}
                onChange={(event) =>
                  updateDuration({ turnOwner: event.target.value as Combatant })
                }
              >
                <option value="player">Player</option>
                <option value="enemy">Enemy</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor={`${condition.id}-boundary`}>
                Expiry Boundary
              </label>
              <select
                id={`${condition.id}-boundary`}
                value={duration.boundary}
                onChange={(event) =>
                  updateDuration({
                    boundary: event.target.value as TurnBoundary,
                  })
                }
              >
                <option value="start">Start of Turn</option>
                <option value="end">End of Turn</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor={`${condition.id}-trigger`}>
                Boundary Trigger
              </label>
              <select
                id={`${condition.id}-trigger`}
                value={trigger}
                onChange={(event) => updateTrigger(event.target.value)}
              >
                <option value="none">None</option>
                <option value="repeated-save">Repeated Save</option>
                <option value="ongoing-damage">Ongoing Damage</option>
              </select>
            </div>
            {trigger === 'repeated-save' && duration.repeatedSave && (
              <>
                <div className="field">
                  <label htmlFor={`${condition.id}-save-ability`}>
                    Repeated Save Ability
                  </label>
                  <select
                    id={`${condition.id}-save-ability`}
                    value={duration.repeatedSave.ability}
                    onChange={(event) =>
                      updateDuration({
                        repeatedSave: {
                          ...duration.repeatedSave!,
                          ability: event.target.value,
                        },
                      })
                    }
                  >
                    {ABILITIES.map((ability) => (
                      <option key={ability.value} value={ability.value}>
                        {ability.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor={`${condition.id}-save-dc`}>
                    Repeated Save DC
                  </label>
                  <input
                    id={`${condition.id}-save-dc`}
                    type="number"
                    min="1"
                    step="1"
                    value={duration.repeatedSave.dc}
                    onChange={(event) =>
                      updateDuration({
                        repeatedSave: {
                          ...duration.repeatedSave!,
                          dc: Number(event.target.value),
                        },
                      })
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor={`${condition.id}-save-modifier`}>
                    Repeated Save Modifier
                  </label>
                  <input
                    id={`${condition.id}-save-modifier`}
                    type="number"
                    step="1"
                    value={duration.repeatedSave.saveModifier}
                    onChange={(event) =>
                      updateDuration({
                        repeatedSave: {
                          ...duration.repeatedSave!,
                          saveModifier: Number(event.target.value),
                        },
                      })
                    }
                  />
                </div>
              </>
            )}
            {trigger === 'ongoing-damage' && duration.ongoingDamage && (
              <>
                <div className="field">
                  <label htmlFor={`${condition.id}-ongoing-type`}>
                    Ongoing Damage Type
                  </label>
                  <select
                    id={`${condition.id}-ongoing-type`}
                    value={duration.ongoingDamage.damageType}
                    onChange={(event) =>
                      updateDuration({
                        ongoingDamage: {
                          ...duration.ongoingDamage!,
                          damageType: event.target.value,
                        },
                      })
                    }
                  >
                    {DAMAGE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor={`${condition.id}-ongoing-dice`}>
                    Ongoing Damage Dice
                  </label>
                  <input
                    id={`${condition.id}-ongoing-dice`}
                    type="number"
                    min="1"
                    step="1"
                    value={duration.ongoingDamage.diceCount}
                    onChange={(event) =>
                      updateDuration({
                        ongoingDamage: {
                          ...duration.ongoingDamage!,
                          diceCount: Number(event.target.value),
                        },
                      })
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor={`${condition.id}-ongoing-sides`}>
                    Ongoing Die Size
                  </label>
                  <select
                    id={`${condition.id}-ongoing-sides`}
                    value={duration.ongoingDamage.dieSides}
                    onChange={(event) =>
                      updateDuration({
                        ongoingDamage: {
                          ...duration.ongoingDamage!,
                          dieSides: Number(event.target.value),
                        },
                      })
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
                  <label htmlFor={`${condition.id}-ongoing-modifier`}>
                    Ongoing Damage Modifier
                  </label>
                  <input
                    id={`${condition.id}-ongoing-modifier`}
                    type="number"
                    step="1"
                    value={duration.ongoingDamage.modifier}
                    onChange={(event) =>
                      updateDuration({
                        ongoingDamage: {
                          ...duration.ongoingDamage!,
                          modifier: Number(event.target.value),
                        },
                      })
                    }
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function CombatantStatePanel({
  combatant,
  state,
  errors,
  onChange,
}: {
  combatant: Combatant
  state: StateDraft
  errors: StateErrors
  onChange: (change: Partial<StateDraft>) => void
}) {
  const label = combatant === 'player' ? 'Player' : 'Enemy'
  const stateId = `${combatant}-state`
  const selectedConditions: readonly ConditionType[] = [
    ...state.conditions.map((condition) => condition.type),
    ...(state.vex ? (['vex'] as const) : []),
    ...(state.sap ? (['sap'] as const) : []),
    ...(state.dodging ? (['dodging'] as const) : []),
  ]

  function updateConditions(values: readonly ConditionType[]) {
    const existing = new Map(
      state.conditions.map((condition) => [condition.type, condition]),
    )
    onChange({
      vex: values.includes('vex'),
      sap: values.includes('sap'),
      dodging: values.includes('dodging'),
      conditions: values.filter(isPersistentConditionType).map(
        (type) =>
          existing.get(type) ?? {
            id: `${combatant}-initial-${type}`,
            type,
            source: combatant,
            recipient: combatant,
          },
      ),
    })
  }

  function updateCondition(id: string, change: Partial<ConditionInstance>) {
    onChange({
      conditions: state.conditions.map((condition) =>
        condition.id === id ? { ...condition, ...change } : condition,
      ),
    })
  }

  return (
    <section
      className="combatant-state-panel"
      aria-labelledby={`${stateId}-title`}
    >
      <div className="state-panel-heading">
        <div>
          <p className="eyebrow">Initial state</p>
          <h3 id={`${stateId}-title`}>{label} state</h3>
        </div>
        <span className="state-panel-note">Used before Round 1</span>
      </div>
      <div className="state-toggle-grid">
        <div className="field">
          <label htmlFor={`${stateId}-armor-class`}>Armor Class</label>
          <input
            id={`${stateId}-armor-class`}
            type="number"
            min="1"
            step="1"
            value={state.armorClass}
            onChange={(event) => onChange({ armorClass: event.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor={`${stateId}-attack-modifier`}>Attack Modifier</label>
          <input
            id={`${stateId}-attack-modifier`}
            type="number"
            step="1"
            value={state.attackModifier}
            onChange={(event) =>
              onChange({ attackModifier: event.target.value })
            }
          />
        </div>
        <div className="field">
          <label htmlFor={`${stateId}-save-dc`}>DC</label>
          <input
            id={`${stateId}-save-dc`}
            type="number"
            min="1"
            step="1"
            value={state.saveDc}
            onChange={(event) => onChange({ saveDc: event.target.value })}
          />
        </div>
        <fieldset className="state-save-modifiers">
          <legend>Save Modifiers</legend>
          <div className="state-save-modifier-grid">
            {ABILITIES.map((ability) => (
              <div className="field" key={ability.value}>
                <label htmlFor={`${stateId}-save-${ability.value}`}>
                  {ability.label}
                </label>
                <input
                  id={`${stateId}-save-${ability.value}`}
                  type="number"
                  step="1"
                  value={state.saveModifiers[ability.value]}
                  onChange={(event) =>
                    onChange({
                      saveModifiers: {
                        ...state.saveModifiers,
                        [ability.value]: event.target.value,
                      },
                    })
                  }
                />
              </div>
            ))}
          </div>
        </fieldset>
        <label className="checkbox-field">
          <input
            type="checkbox"
            aria-label={`${label} has Help`}
            checked={state.helped}
            onChange={(event) => onChange({ helped: event.target.checked })}
          />
          Help
        </label>
        <div className="field">
          <label htmlFor={`${stateId}-help-source`}>Help Source</label>
          <select
            id={`${stateId}-help-source`}
            disabled={!state.helped}
            value={
              state.helpSource ?? (combatant === 'player' ? 'enemy' : 'player')
            }
            onChange={(event) =>
              onChange({ helpSource: event.target.value as Combatant })
            }
          >
            <option value="player">Player</option>
            <option value="enemy">Enemy</option>
          </select>
        </div>
        <label className="checkbox-field">
          <input
            type="checkbox"
            aria-label={`${label} has Heroic Inspiration`}
            checked={state.heroicInspiration}
            onChange={(event) =>
              onChange({ heroicInspiration: event.target.checked })
            }
          />
          Heroic Inspiration
        </label>
      </div>
      <div className="state-field-grid">
        <div className="field">
          <label htmlFor={`${stateId}-exhaustion`}>Exhaustion (0–6)</label>
          <input
            id={`${stateId}-exhaustion`}
            type="number"
            min="0"
            max="6"
            step="1"
            value={state.exhaustion}
            aria-invalid={Boolean(errors.exhaustion)}
            onChange={(event) => onChange({ exhaustion: event.target.value })}
          />
          {errors.exhaustion && (
            <span className="field-error">{errors.exhaustion}</span>
          )}
        </div>
        <label className="checkbox-field state-concentration-toggle">
          <input
            type="checkbox"
            aria-label={`${label} is concentrating`}
            checked={state.concentration}
            onChange={(event) =>
              onChange({ concentration: event.target.checked })
            }
          />
          Concentrating
        </label>
      </div>
      <div className="state-picker-grid">
        <ConditionPicker
          id={`${stateId}-conditions`}
          label="Conditions"
          options={STATE_CONDITION_OPTIONS}
          selected={selectedConditions}
          onChange={updateConditions}
        />
        <div
          className="condition-instance-list"
          aria-label={`${label} condition details`}
        >
          {state.conditions.map((condition) => (
            <ConditionInstanceEditor
              key={condition.id}
              condition={condition}
              onChange={(change) => updateCondition(condition.id, change)}
            />
          ))}
        </div>
        <ConditionPicker
          id={`${stateId}-condition-immunities`}
          label="Condition Immunities"
          options={CONDITION_IMMUNITY_OPTIONS}
          selected={state.conditionImmunities}
          onChange={(conditionImmunities) => onChange({ conditionImmunities })}
          addLabel="Add immunity"
        />
        <ConditionPicker
          id={`${stateId}-damage-immunities`}
          label="Damage Immunities"
          options={DAMAGE_TYPE_OPTIONS}
          selected={state.damageImmunities}
          onChange={(damageImmunities) => onChange({ damageImmunities })}
          addLabel="Add immunity"
        />
        <ConditionPicker
          id={`${stateId}-damage-resistances`}
          label="Damage Resistances"
          options={DAMAGE_TYPE_OPTIONS}
          selected={state.damageResistances}
          onChange={(damageResistances) => onChange({ damageResistances })}
          addLabel="Add resistance"
        />
        <ConditionPicker
          id={`${stateId}-damage-vulnerabilities`}
          label="Damage Vulnerabilities"
          options={DAMAGE_TYPE_OPTIONS}
          selected={state.damageVulnerabilities}
          onChange={(damageVulnerabilities) =>
            onChange({ damageVulnerabilities })
          }
          addLabel="Add vulnerability"
        />
      </div>
    </section>
  )
}

function EventTypeButtons({
  onSelect,
}: {
  onSelect: (type: EventType) => void
}) {
  return (Object.keys(EVENT_LABELS) as EventType[])
    .filter((type) => type !== 'conditional')
    .map((type) => {
      const Icon = EVENT_ICONS[type]
      return (
        <button key={type} type="button" onClick={() => onSelect(type)}>
          <Icon aria-hidden="true" size={18} />
          {EVENT_LABELS[type]}
        </button>
      )
    })
}

function conditionGateSummary(gate: ConditionGateDraft) {
  const labels = (items: readonly ConditionRemovalConfig[]) =>
    items.map((item) => CONDITION_LABELS[item.type].toLowerCase())
  return [
    ...labels(gate.mustHave),
    ...labels(gate.mustNotHave).map((label) => `not ${label}`),
  ].join(' and ')
}

function ConditionGateModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: ConditionGateDraft
  onSave: (gate: ConditionGateDraft) => void
  onClose: () => void
}) {
  const [gate, setGate] = useState<ConditionGateDraft>(
    initial ?? { target: 'enemy', mustHave: [], mustNotHave: [] },
  )
  return (
    <div className="condition-modal-backdrop" role="presentation">
      <section
        className="condition-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="condition-modal-title"
      >
        <h2 id="condition-modal-title">Condition</h2>
        <p>
          Run this section only when the selected combatant’s state matches.
        </p>
        <label className="field">
          Inspect combatant
          <select
            value={gate.target}
            onChange={(event) =>
              setGate({ ...gate, target: event.target.value as Combatant })
            }
          >
            <option value="player">Player</option>
            <option value="enemy">Enemy</option>
          </select>
        </label>
        <ConditionRemovalChoices
          id="modal-must-have"
          label="Must have (all)"
          selected={gate.mustHave}
          onChange={(mustHave) => setGate({ ...gate, mustHave })}
        />
        <ConditionRemovalChoices
          id="modal-must-not-have"
          label="Must not have (all)"
          selected={gate.mustNotHave}
          onChange={(mustNotHave) => setGate({ ...gate, mustNotHave })}
        />
        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            disabled={gate.mustHave.length + gate.mustNotHave.length === 0}
            onClick={() => onSave(gate)}
          >
            Save condition
          </button>
        </div>
      </section>
    </div>
  )
}

const GENERATED_RESULT_LABELS: Record<GeneratedBoundaryResult['type'], string> =
  {
    'repeated-save': 'Repeated save',
    'ongoing-damage': 'Ongoing damage',
    'concentration-save': 'Concentration save',
  }

function GeneratedBoundaryResults({
  results,
}: {
  readonly results: readonly GeneratedBoundaryResult[]
}) {
  if (results.length === 0) return null
  return (
    <section
      className="generated-boundary-results"
      aria-labelledby="generated-boundary-results-title"
    >
      <div className="workspace-heading">
        <div>
          <p className="eyebrow">Scheduler</p>
          <h2 id="generated-boundary-results-title">
            Generated boundary results
          </h2>
        </div>
        <span className="workspace-note">Triggered at turn boundaries</span>
      </div>
      <div className="generated-boundary-list">
        {results.map((generated) => {
          const outcome = generated.result.outcome
          return (
            <article
              className="generated-boundary-card"
              key={generated.id}
              aria-labelledby={`${generated.id}-title`}
            >
              <h3 id={`${generated.id}-title`}>
                {GENERATED_RESULT_LABELS[generated.type]} ·{' '}
                {generated.owner === 'player' ? 'Player' : 'Enemy'} ·{' '}
                {generated.boundary} boundary
              </h3>
              <div className="attack-results" aria-live="polite">
                <span>
                  Execution Chance
                  <strong>
                    {percentFormatter.format(
                      generated.result.executionProbability,
                    )}
                  </strong>
                </span>
                <span>
                  Success Chance
                  <strong>
                    {percentFormatter.format(
                      generated.result.successProbability,
                    )}
                  </strong>
                </span>
                {outcome.type === 'expected-initiative' ? (
                  <span>
                    Expected Initiative
                    <strong>
                      {numberFormatter.format(outcome.expectedTotal)}
                    </strong>
                  </span>
                ) : outcome.type === 'expected-damage-against-enemies' ||
                  outcome.type === 'expected-damage-against-players' ? (
                  <span>
                    Expected Damage
                    <strong>
                      {numberFormatter.format(outcome.expectedDamage)}
                    </strong>
                  </span>
                ) : (
                  <span>
                    Damage Outcome
                    <strong>No Damage</strong>
                  </span>
                )}
              </div>
              {generated.result.stateBefore && (
                <StateSummary
                  label="State before"
                  state={generated.result.stateBefore}
                />
              )}
              {generated.result.stateAfter && (
                <StateSummary
                  label="State after"
                  state={generated.result.stateAfter}
                />
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}

function SequenceEvaluator({
  profiles,
}: {
  readonly profiles: SavedProfile[]
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [pickerId, setPickerId] = useState('')
  const selected = profiles.filter((profile) =>
    selectedIds.includes(profile.id),
  )
  const valid = selected.map((profile) => ({
    profile,
    prepared: prepareSequence(profile.draft),
  }))
  const evaluable = valid.filter((item) => item.prepared.valid)
  const roundCount = Math.max(
    0,
    ...evaluable.map(
      (item) => item.prepared.sequence!.expectedEnemyDamageByRound.length,
    ),
  )
  const hasDamage = evaluable.some((item) =>
    item.prepared.sequence!.expectedEnemyDamageByRound.some(
      (damage) => damage > 0,
    ),
  )
  const largestDamage = Math.max(
    0,
    ...evaluable.flatMap(
      (item) => item.prepared.sequence!.expectedEnemyDamageByRound,
    ),
  )
  // Round to a readable ceiling so every group uses a visible shared scale.
  const chartMaximum = Math.max(1, Math.ceil((largestDamage * 1.15) / 5) * 5)
  const chartTicks = Array.from(
    { length: 5 },
    (_, index) => chartMaximum - (chartMaximum / 4) * index,
  )
  const cumulativeDamage = evaluable.map(({ profile, prepared }) => {
    let total = 0
    return {
      profile,
      values: prepared.sequence!.expectedEnemyDamageByRound.map((damage) => {
        total += damage
        return total
      }),
    }
  })
  const cumulativeLargestDamage = Math.max(
    0,
    ...cumulativeDamage.flatMap((series) => series.values),
  )
  const cumulativeMaximum = Math.max(
    1,
    Math.ceil((cumulativeLargestDamage * 1.15) / 5) * 5,
  )
  const cumulativeTicks = Array.from(
    { length: 5 },
    (_, index) => cumulativeMaximum - (cumulativeMaximum / 4) * index,
  )
  const colors = ['#7156cc', '#16806c', '#d66b35', '#3971c1', '#a33c77']
  return (
    <section className="evaluator" aria-labelledby="evaluator-title">
      <p className="eyebrow">Saved scenarios</p>
      <h1 id="evaluator-title">Sequence evaluator</h1>
      <p className="intro-copy">Compare expected damage to enemies by round.</p>
      <div className="profile-picker">
        <label>
          Saved profile
          <select
            value={pickerId}
            onChange={(event) => setPickerId(event.target.value)}
          >
            <option value="">Choose a profile</option>
            {profiles.map((profile) => (
              <option
                key={profile.id}
                value={profile.id}
                disabled={selectedIds.includes(profile.id)}
              >
                {profile.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={!pickerId || selectedIds.includes(pickerId)}
          onClick={() => {
            setSelectedIds((current) => [...current, pickerId])
            setPickerId('')
          }}
        >
          Add profile
        </button>
      </div>
      {selected.length > 0 && (
        <div className="profile-chips" aria-label="Selected profiles">
          {selected.map((profile) => (
            <span className="profile-chip" key={profile.id}>
              {profile.name}
              <button
                type="button"
                aria-label={`Remove ${profile.name}`}
                onClick={() =>
                  setSelectedIds((ids) => ids.filter((id) => id !== profile.id))
                }
              >
                <X aria-hidden="true" size={14} />
              </button>
            </span>
          ))}
        </div>
      )}
      {selected.length === 0 ? (
        <p className="empty-state">
          Select saved profiles to compare their damage.
        </p>
      ) : (
        <>
          {valid
            .filter((item) => !item.prepared.valid)
            .map(({ profile }) => (
              <p className="profile-warning" key={profile.id}>
                {profile.name} is incomplete or invalid and cannot be evaluated.
              </p>
            ))}
          {evaluable.length > 0 && !hasDamage && (
            <p className="empty-state">
              The selected valid profiles do not deal damage to enemies.
            </p>
          )}
          {hasDamage && (
            <div
              className="comparison-chart"
              role="img"
              aria-label="Expected enemy damage by round comparison"
            >
              <div className="chart-axis" aria-hidden="true">
                {chartTicks.map((tick) => (
                  <span key={tick}>{numberFormatter.format(tick)}</span>
                ))}
              </div>
              <div className="chart-groups">
                {Array.from({ length: roundCount }, (_, roundIndex) => (
                  <div className="chart-round" key={roundIndex}>
                    <strong>Round {roundIndex + 1}</strong>
                    <div className="chart-bars">
                      {evaluable.map(({ profile, prepared }, index) => {
                        const value =
                          prepared.sequence!.expectedEnemyDamageByRound[
                            roundIndex
                          ]
                        if (value === undefined) return null
                        return (
                          <span
                            className="chart-bar"
                            key={profile.id}
                            style={
                              {
                                '--bar-height': `${Math.max(3, (value / chartMaximum) * 100)}%`,
                                '--bar-color': colors[index % colors.length],
                              } as CSSProperties
                            }
                            title={`${profile.name}: ${numberFormatter.format(value)}`}
                          >
                            <i />
                            <small>{numberFormatter.format(value)}</small>
                          </span>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="chart-legend">
                {evaluable.map(({ profile }, index) => (
                  <span key={profile.id}>
                    <i style={{ background: colors[index % colors.length] }} />
                    {profile.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          {evaluable.length > 0 && (
            <table className="comparison-table">
              <caption>Expected damage to enemies by round</caption>
              <thead>
                <tr>
                  <th>Round</th>
                  {evaluable.map(({ profile }) => (
                    <th key={profile.id}>{profile.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: roundCount }, (_, index) => (
                  <tr key={index}>
                    <th>Round {index + 1}</th>
                    {evaluable.map(({ profile, prepared }) => (
                      <td key={profile.id}>
                        {prepared.sequence!.expectedEnemyDamageByRound[
                          index
                        ] === undefined
                          ? '—'
                          : numberFormatter.format(
                              prepared.sequence!.expectedEnemyDamageByRound[
                                index
                              ],
                            )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {hasDamage && (
            <>
              <h2 className="comparison-heading">
                Cumulative expected damage to enemies
              </h2>
              <div
                className="comparison-chart"
                role="img"
                aria-label="Cumulative expected enemy damage by round comparison"
              >
                <div className="chart-axis" aria-hidden="true">
                  {cumulativeTicks.map((tick) => (
                    <span key={tick}>{numberFormatter.format(tick)}</span>
                  ))}
                </div>
                <div className="chart-groups">
                  {Array.from({ length: roundCount }, (_, roundIndex) => (
                    <div className="chart-round" key={roundIndex}>
                      <strong>Round {roundIndex + 1}</strong>
                      <div className="chart-bars">
                        {cumulativeDamage.map(({ profile, values }, index) => {
                          const value = values[roundIndex]
                          if (value === undefined) return null
                          return (
                            <span
                              className="chart-bar"
                              key={profile.id}
                              style={
                                {
                                  '--bar-height': `${Math.max(3, (value / cumulativeMaximum) * 100)}%`,
                                  '--bar-color': colors[index % colors.length],
                                } as CSSProperties
                              }
                              title={`${profile.name}: ${numberFormatter.format(value)}`}
                            >
                              <i />
                              <small>{numberFormatter.format(value)}</small>
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="chart-legend">
                  {cumulativeDamage.map(({ profile }, index) => (
                    <span key={profile.id}>
                      <i
                        style={{ background: colors[index % colors.length] }}
                      />
                      {profile.name}
                    </span>
                  ))}
                </div>
              </div>
              <table className="comparison-table">
                <caption>
                  Cumulative expected damage to enemies by round
                </caption>
                <thead>
                  <tr>
                    <th>Round</th>
                    {cumulativeDamage.map(({ profile }) => (
                      <th key={profile.id}>{profile.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: roundCount }, (_, index) => (
                    <tr key={index}>
                      <th>Round {index + 1}</th>
                      {cumulativeDamage.map(({ profile, values }) => (
                        <td key={profile.id}>
                          {values[index] === undefined
                            ? '—'
                            : numberFormatter.format(values[index])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </>
      )}
    </section>
  )
}

function App() {
  const [activeTab, setActiveTab] = useState<'builder' | 'evaluator'>('builder')
  const [profiles, setProfiles] = useState<SavedProfile[]>(loadProfiles)
  const [loadedProfileId, setLoadedProfileId] = useState<string>()
  const [profileTransferMessage, setProfileTransferMessage] = useState('')
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
  const [stateDrafts, setStateDrafts] = useState<Record<Combatant, StateDraft>>(
    () => ({
      player: createStateDraft('player'),
      enemy: createStateDraft('enemy'),
    }),
  )
  const [chooserActivityId, setChooserActivityId] = useState<string>()
  const [draggedEvent, setDraggedEvent] = useState<
    { readonly activityId: string; readonly eventId: string } | undefined
  >()
  const [dragOverEventId, setDragOverEventId] = useState<string>()
  const [reorderAnnouncement, setReorderAnnouncement] = useState('')
  const [conditionEditor, setConditionEditor] = useState<
    | {
        readonly kind: 'event'
        readonly path: ActivityPath
        readonly id: string
        readonly gate?: ConditionGateDraft
      }
    | {
        readonly kind: 'activity'
        readonly path: ActivityPath
        readonly gate?: ConditionGateDraft
      }
  >()
  const nextRoundId = useRef(2)
  const nextTurnId = useRef(2)
  const nextActivityId = useRef(2)
  const nextEventId = useRef(2)
  const nextDamagePoolId = useRef(1)
  const importProfileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profiles))
    } catch {
      // Storage can be unavailable (private browsing or a full quota).
    }
  }, [profiles])

  useEffect(() => {
    if (!conditionEditor) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [conditionEditor])

  function updateState(combatant: Combatant, change: Partial<StateDraft>) {
    setStateDrafts((current) => ({
      ...current,
      [combatant]: { ...current[combatant], ...change },
    }))
  }

  const prepared = prepareSequence({ rounds, stateDrafts })
  const {
    events,
    evaluations,
    playerStateEvaluation,
    enemyStateEvaluation,
    sequence,
  } = prepared
  const shownOutcomeTypes = [
    ...new Set(
      events
        .map(outcomeTypeFor)
        .filter((type): type is Outcome['type'] => type !== undefined),
    ),
  ]
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

  function resyncIds(draft: ScenarioDraft) {
    const nestedEvents = (
      events: readonly EventDraft[],
    ): readonly EventDraft[] =>
      events.flatMap((event) =>
        event.type === 'conditional'
          ? [event, ...nestedEvents(event.events)]
          : [event],
      )
    const highest = (prefix: string) => {
      const ids = [
        ...draft.rounds.map((round) => round.id),
        ...draft.rounds.flatMap((round) => round.turns.map((turn) => turn.id)),
        ...draft.rounds.flatMap((round) =>
          round.turns.flatMap((turn) =>
            turn.activities.flatMap((activity) => [
              activity.id,
              ...nestedEvents(activity.events).flatMap((event) => [
                event.id,
                ...event.damagePools.map((pool) => pool.id),
              ]),
            ]),
          ),
        ),
      ]
      return (
        Math.max(
          0,
          ...ids.map(
            (id) => Number(id.match(new RegExp(`^${prefix}-(\\d+)`))?.[1]) || 0,
          ),
        ) + 1
      )
    }
    nextRoundId.current = highest('round')
    nextTurnId.current = highest('turn')
    nextActivityId.current = highest('activity')
    nextEventId.current = highest('event')
    nextDamagePoolId.current = highest('damage')
  }

  function saveProfile() {
    const loaded = profiles.find((profile) => profile.id === loadedProfileId)
    const overwrite =
      loaded &&
      window.confirm(
        `Overwrite ${loaded.name}? Choose Cancel to save as a new profile.`,
      )
    const name = overwrite ? loaded.name : window.prompt('Profile name')?.trim()
    if (!name) return
    const draft = cloneDraft({ rounds, stateDrafts })
    if (overwrite) {
      setProfiles((items) =>
        items.map((profile) =>
          profile.id === loaded.id ? { ...profile, draft } : profile,
        ),
      )
    } else {
      const profile = { id: profileId(), name, draft }
      setProfiles((items) => [...items, profile])
      setLoadedProfileId(profile.id)
    }
  }

  function loadProfile(id: string) {
    const profile = profiles.find((item) => item.id === id)
    if (!profile) return
    const draft = cloneDraft(profile.draft)
    setRounds(draft.rounds)
    setStateDrafts(draft.stateDrafts)
    resyncIds(draft)
    setLoadedProfileId(profile.id)
  }

  function exportProfile() {
    const loaded = profiles.find((profile) => profile.id === loadedProfileId)
    const name = loaded?.name ?? 'Untitled Scenario'
    const profileExport: ProfileExport = {
      format: PROFILE_EXPORT_FORMAT,
      version: PROFILE_EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      profile: {
        name,
        draft: cloneDraft({ rounds, stateDrafts }),
      },
    }
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(profileExport, null, 2)], {
        type: 'application/json',
      }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = profileFileName(name)
    link.click()
    URL.revokeObjectURL(url)
    setProfileTransferMessage(`Exported ${name}.`)
  }

  async function importProfile(file: File | undefined) {
    if (!file) return
    try {
      const imported = importedProfile(JSON.parse(await file.text()))
      if (!imported) throw new Error('Invalid profile')
      const draft = cloneDraft(imported.draft)
      const profile: SavedProfile = {
        id: profileId(),
        name: imported.name,
        draft,
      }
      setProfiles((items) => [...items, profile])
      setRounds(draft.rounds)
      setStateDrafts(draft.stateDrafts)
      resyncIds(draft)
      setLoadedProfileId(profile.id)
      setProfileTransferMessage(`Imported and loaded ${profile.name}.`)
    } catch {
      setProfileTransferMessage(
        'Could not import that file. Choose a Crunch Lab profile JSON file.',
      )
    } finally {
      if (importProfileInput.current) importProfileInput.current.value = ''
    }
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
    value: EventFieldValue | undefined,
  ) {
    updateActivity(path, (activity) => ({
      ...activity,
      events: activity.events.map((event) =>
        event.id === id ? ({ ...event, [field]: value } as EventDraft) : event,
      ),
    }))
  }

  function saveConditionGate(gate: ConditionGateDraft) {
    if (!conditionEditor) return
    if (conditionEditor.kind === 'event') {
      updateEvent(
        conditionEditor.path,
        conditionEditor.id,
        'conditionGate' as EventField,
        gate as EventFieldValue,
      )
    } else {
      updateActivity(conditionEditor.path, (activity) => ({
        ...activity,
        conditionGate: gate,
      }))
    }
    setConditionEditor(undefined)
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
                const label =
                  moved.type === 'action'
                    ? 'Action'
                    : moved.type === 'bonus-action'
                      ? 'Bonus action'
                      : 'Generic timeline'
                setReorderAnnouncement(
                  `${label} moved to position ${target + 1} in its turn.`,
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

      <div className="app-tabs" role="tablist" aria-label="Crunch Lab views">
        <button
          role="tab"
          type="button"
          aria-selected={activeTab === 'builder'}
          onClick={() => setActiveTab('builder')}
        >
          Sequence Builder
        </button>
        <button
          role="tab"
          type="button"
          aria-selected={activeTab === 'evaluator'}
          onClick={() => setActiveTab('evaluator')}
        >
          Sequence Evaluator
        </button>
      </div>

      {activeTab === 'builder' ? (
        <>
          <div className="profile-actions">
            <button type="button" onClick={saveProfile}>
              Save profile
            </button>
            <label>
              Load profile
              <select
                aria-label="Load profile"
                value={loadedProfileId ?? ''}
                onChange={(event) => loadProfile(event.target.value)}
              >
                <option value="">Choose saved profile</option>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={exportProfile}>
              Export profile
            </button>
            <button
              type="button"
              onClick={() => importProfileInput.current?.click()}
            >
              Import profile
            </button>
            <input
              className="visually-hidden"
              ref={importProfileInput}
              type="file"
              accept="application/json,.json"
              aria-label="Import profile file"
              onChange={(event) => importProfile(event.target.files?.[0])}
            />
          </div>
          <p className="visually-hidden" aria-live="polite">
            {profileTransferMessage}
          </p>

          <section className="intro" aria-labelledby="page-title">
            <div>
              <p className="eyebrow">Dice probability workbench</p>
              <h1 id="page-title">Build your combat timeline.</h1>
              <p className="intro-copy">
                Arrange rounds, turns, timeline entries, and events. Outcomes
                update as you work.
              </p>
            </div>
            <div className="totals" aria-live="polite">
              {shownOutcomeTypes.map((type) => {
                const outcome = sequence?.outcomes.find(
                  (item) => item.type === type,
                )
                const againstEnemies =
                  type === 'expected-damage-against-enemies'
                return (
                  <aside className="total-card" key={type}>
                    <span>
                      Expected damage against{' '}
                      {againstEnemies ? 'enemies' : 'players'}
                    </span>
                    <strong>
                      {outcome === undefined
                        ? '—'
                        : numberFormatter.format(outcome.expectedDamage ?? 0)}
                    </strong>
                    <small>
                      {events.length} {events.length === 1 ? 'event' : 'events'}
                    </small>
                  </aside>
                )
              })}
              {shownConditionTotals.map(({ condition, target }) => {
                const total = sequence?.expectedConditionApplications.find(
                  (item) =>
                    item.condition === condition && item.target === target,
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

          <section
            className="state-panels"
            aria-label="Initial combatant state"
          >
            <CombatantStatePanel
              combatant="player"
              state={stateDrafts.player}
              errors={playerStateEvaluation.errors}
              onChange={(change) => updateState('player', change)}
            />
            <CombatantStatePanel
              combatant="enemy"
              state={stateDrafts.enemy}
              errors={enemyStateEvaluation.errors}
              onChange={(change) => updateState('enemy', change)}
            />
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
                            <p className="timeline-kicker">
                              Turn {turnIndex + 1}
                            </p>
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
                                            (candidate) =>
                                              candidate.id !== turn.id,
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
                                        : activity.type === 'bonus-action'
                                          ? 'Bonus action'
                                          : 'Turn timeline'}
                                    </h5>
                                    {activity.conditionGate && (
                                      <span className="condition-gate-tag">
                                        {conditionGateSummary(
                                          activity.conditionGate,
                                        )}
                                      </span>
                                    )}
                                  </div>
                                  <div className="event-actions">
                                    {(activity.type === 'action' ||
                                      activity.type === 'bonus-action') && (
                                      <>
                                        <button
                                          type="button"
                                          className="condition-gate-button"
                                          onClick={() =>
                                            setConditionEditor({
                                              kind: 'activity',
                                              path,
                                              gate: activity.conditionGate,
                                            })
                                          }
                                        >
                                          {activity.conditionGate
                                            ? 'Edit condition'
                                            : 'Add sequence condition'}
                                        </button>
                                        {activity.conditionGate && (
                                          <button
                                            type="button"
                                            className="condition-gate-button"
                                            aria-label="Remove activity condition"
                                            onClick={() =>
                                              updateActivity(
                                                path,
                                                (current) => ({
                                                  ...current,
                                                  conditionGate: undefined,
                                                }),
                                              )
                                            }
                                          >
                                            Remove condition
                                          </button>
                                        )}
                                      </>
                                    )}
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
                                        activityIndex ===
                                        turn.activities.length - 1
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
                                      <ChevronDown
                                        aria-hidden="true"
                                        size={16}
                                      />
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
                                    const evaluation = evaluations.get(
                                      event.id,
                                    )!
                                    const result =
                                      sequence?.eventResults[event.id] ??
                                      evaluation.result
                                    const renderableResult = result as
                                      RenderableEventResult | undefined
                                    const isAttack =
                                      event.type === 'player-attack' ||
                                      event.type === 'enemy-attack'
                                    const target =
                                      outcomeTypeFor(event) ===
                                      'expected-damage-against-enemies'
                                        ? 'enemies'
                                        : 'players'
                                    const position = eventPositions.get(
                                      event.id,
                                    )!
                                    return (
                                      <li
                                        className={`attack-step${draggedEvent?.eventId === event.id ? ' is-dragging' : ''}${dragOverEventId === event.id && draggedEvent?.eventId !== event.id ? ' is-drag-over' : ''}`}
                                        key={event.id}
                                        onDragOver={(dragEvent) => {
                                          if (
                                            draggedEvent?.activityId !==
                                            activity.id
                                          )
                                            return
                                          dragEvent.preventDefault()
                                          dragEvent.dataTransfer.dropEffect =
                                            'move'
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
                                              {event.conditionGate && (
                                                <span className="condition-gate-tag">
                                                  {conditionGateSummary(
                                                    event.conditionGate,
                                                  )}
                                                </span>
                                              )}
                                            </div>
                                            <div className="event-actions">
                                              <button
                                                type="button"
                                                className="condition-gate-button"
                                                onClick={() =>
                                                  setConditionEditor({
                                                    kind: 'event',
                                                    path,
                                                    id: event.id,
                                                    gate: event.conditionGate,
                                                  })
                                                }
                                              >
                                                {event.conditionGate
                                                  ? 'Edit condition'
                                                  : 'Add sequence condition'}
                                              </button>
                                              {event.conditionGate && (
                                                <button
                                                  type="button"
                                                  className="condition-gate-button"
                                                  aria-label={`Remove condition from ${EVENT_LABELS[event.type]}`}
                                                  onClick={() =>
                                                    updateEvent(
                                                      path,
                                                      event.id,
                                                      'conditionGate',
                                                      undefined,
                                                    )
                                                  }
                                                >
                                                  Remove condition
                                                </button>
                                              )}
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
                                                : 'saving-body event-body'
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
                                            ) : isSavingThrowDraft(event) ? (
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
                                            ) : null}
                                            <GrappleOrShoveFields
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
                                            <AbilityCheckFields
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
                                            <InitiativeFields
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
                                            <StateEventFields
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
                                            <ConditionalFields
                                              event={event}
                                              update={(field, value) =>
                                                updateEvent(
                                                  path,
                                                  event.id,
                                                  field,
                                                  value,
                                                )
                                              }
                                              addChild={(type) => {
                                                if (
                                                  event.type !== 'conditional'
                                                )
                                                  return
                                                updateEvent(
                                                  path,
                                                  event.id,
                                                  'events',
                                                  [
                                                    ...event.events,
                                                    createEvent(
                                                      type,
                                                      createEventId(),
                                                    ),
                                                  ],
                                                )
                                              }}
                                            />
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
                                              updatePool={(
                                                poolId,
                                                field,
                                                value,
                                              ) =>
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

                                          <HitSaveFields
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

                                          <div
                                            className="attack-results"
                                            aria-live="polite"
                                          >
                                            <div className="event-result-metrics">
                                              <span
                                                className="metric-execution"
                                                title="Execution Chance"
                                              >
                                                <Calculator
                                                  aria-hidden="true"
                                                  size={15}
                                                />
                                                Execution Chance
                                                <strong>
                                                  {result
                                                    ? percentFormatter.format(
                                                        result.executionProbability,
                                                      )
                                                    : '—'}
                                                </strong>
                                              </span>
                                              {event.type ===
                                                'player-initiative' ||
                                              event.type ===
                                                'enemy-initiative' ? (
                                                <span
                                                  className="metric-initiative"
                                                  title="Expected Initiative"
                                                >
                                                  <Sparkles
                                                    aria-hidden="true"
                                                    size={15}
                                                  />
                                                  Expected Initiative
                                                  <strong>
                                                    {result?.outcome.type ===
                                                    'expected-initiative'
                                                      ? numberFormatter.format(
                                                          result.outcome
                                                            .expectedTotal,
                                                        )
                                                      : '—'}
                                                  </strong>
                                                </span>
                                              ) : null}
                                              <span
                                                className="metric-success"
                                                title={
                                                  isAttack
                                                    ? 'Hit Chance'
                                                    : 'Success Chance'
                                                }
                                              >
                                                {isAttack ? (
                                                  <Swords
                                                    aria-hidden="true"
                                                    size={15}
                                                  />
                                                ) : (
                                                  <Shield
                                                    aria-hidden="true"
                                                    size={15}
                                                  />
                                                )}
                                                {isAttack
                                                  ? 'Hit Chance'
                                                  : event.type ===
                                                        'player-saving-throw' ||
                                                      event.type ===
                                                        'enemy-saving-throw' ||
                                                      isAbilityCheckDraft(event)
                                                    ? 'Success Chance'
                                                    : 'Result'}
                                                <strong>
                                                  {result &&
                                                  (isAttack ||
                                                    isSavingThrowDraft(event) ||
                                                    isAbilityCheckDraft(event))
                                                    ? percentFormatter.format(
                                                        result.successProbability,
                                                      )
                                                    : result?.outcome.type ===
                                                        'no-damage'
                                                      ? 'Completed'
                                                      : '—'}
                                                </strong>
                                              </span>
                                              {isAttack ? (
                                                <span
                                                  className="metric-critical"
                                                  title="Critical Chance"
                                                >
                                                  <Zap
                                                    aria-hidden="true"
                                                    size={15}
                                                  />
                                                  Critical Chance
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
                                              {result?.outcome.type ===
                                                'expected-damage-against-enemies' ||
                                              result?.outcome.type ===
                                                'expected-damage-against-players' ? (
                                                <span
                                                  className="metric-damage"
                                                  title="Expected Damage"
                                                >
                                                  <HeartPulse
                                                    aria-hidden="true"
                                                    size={15}
                                                  />
                                                  Expected Damage against{' '}
                                                  {target}
                                                  <strong>
                                                    {numberFormatter.format(
                                                      result.outcome
                                                        .expectedDamage,
                                                    )}
                                                  </strong>
                                                </span>
                                              ) : result?.outcome.type ===
                                                'no-damage' ? (
                                                <span
                                                  className="metric-damage"
                                                  title="Damage Outcome"
                                                >
                                                  <ShieldOff
                                                    aria-hidden="true"
                                                    size={15}
                                                  />
                                                  Damage Outcome
                                                  <strong>No Damage</strong>
                                                </span>
                                              ) : null}
                                              {result?.conditionApplications.map(
                                                (application) => (
                                                  <span
                                                    className="metric-condition"
                                                    key={application.condition}
                                                    title={`${CONDITION_LABELS[application.condition]} Applied`}
                                                  >
                                                    <ConditionIcon
                                                      condition={
                                                        application.condition
                                                      }
                                                      label={`${CONDITION_LABELS[application.condition]} Applied`}
                                                      size={15}
                                                    />
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
                                          </div>
                                          {renderableResult?.stateBefore &&
                                            renderableResult.stateAfter && (
                                              <StateTransition
                                                before={
                                                  renderableResult.stateBefore
                                                }
                                                after={
                                                  renderableResult.stateAfter
                                                }
                                              />
                                            )}
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
                                        onSelect={(type) =>
                                          addEvent(path, type)
                                        }
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
                              addActivity(
                                round.id,
                                turn.id,
                                turn.owner,
                                'action',
                              )
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
                          <button
                            type="button"
                            onClick={() =>
                              addActivity(
                                round.id,
                                turn.id,
                                turn.owner,
                                'generic',
                              )
                            }
                          >
                            <Plus aria-hidden="true" size={16} />
                            Add turn event timeline
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
                <p>
                  Add a round, then choose its turns, activities, and events.
                </p>
              </div>
            )}
            <div className="add-round">
              <button className="add-button" type="button" onClick={addRound}>
                <Plus aria-hidden="true" size={19} />
                Add round
              </button>
            </div>
          </section>
          <GeneratedBoundaryResults
            results={sequence?.generatedResults ?? []}
          />
        </>
      ) : (
        <SequenceEvaluator profiles={profiles} />
      )}
      {conditionEditor && (
        <ConditionGateModal
          initial={conditionEditor.gate}
          onSave={saveConditionGate}
          onClose={() => setConditionEditor(undefined)}
        />
      )}
    </main>
  )
}

export default App
