export type Combatant = 'player' | 'enemy'

export const PERSISTENT_CONDITION_TYPES = [
  'blinded',
  'poisoned',
  'restrained',
  'stunned',
  'paralyzed',
  'unconscious',
  'prone',
  'grappled',
  'frightened',
  'petrified',
  'incapacitated',
  'invisible',
] as const

export type PersistentConditionType =
  (typeof PERSISTENT_CONDITION_TYPES)[number]
export const TRANSIENT_EFFECT_TYPES = ['vex', 'sap'] as const
export type TransientEffectType = (typeof TRANSIENT_EFFECT_TYPES)[number]
export type ConditionCatalogType = PersistentConditionType | 'exhaustion'
export const CONDITION_CATALOG_TYPES: readonly ConditionCatalogType[] = [
  ...PERSISTENT_CONDITION_TYPES,
  'exhaustion',
]
export type ConditionType = ConditionCatalogType | TransientEffectType
export type ExhaustionLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6
export type TurnBoundary = 'start' | 'end'

/** A save made by a persistent condition at one of its duration boundaries. */
export interface RepeatedSaveTrigger {
  readonly ability: string
  readonly dc: number
}

/** Typed damage dealt by a persistent condition at one of its duration boundaries. */
export interface OngoingDamageTrigger {
  readonly damagePools?: readonly {
    readonly id: string
    readonly diceCount: number
    readonly dieSides: number
    readonly modifier: number
    readonly damageType: string
  }[]
  readonly damageType?: string
  readonly diceCount?: number
  readonly dieSides?: number
  readonly modifier?: number
}

export interface ConditionDuration {
  readonly remainingTurns: number
  readonly boundary: TurnBoundary
  readonly turnOwner: Combatant
  readonly repeatedSave?: RepeatedSaveTrigger
  readonly ongoingDamage?: OngoingDamageTrigger
}

export interface ConditionInstance {
  readonly id: string
  readonly type: PersistentConditionType
  readonly source: Combatant
  readonly recipient: Combatant
  readonly duration?: ConditionDuration
}

export interface ConditionDefinition {
  readonly type: ConditionCatalogType
  readonly label: string
  readonly includes: readonly PersistentConditionType[]
  readonly conditionImmunities: readonly PersistentConditionType[]
}

function definition(
  type: ConditionCatalogType,
  label: string,
  includes: readonly PersistentConditionType[] = [],
  conditionImmunities: readonly PersistentConditionType[] = [],
): ConditionDefinition {
  return { type, label, includes, conditionImmunities }
}

export const CONDITION_CATALOG: Readonly<
  Record<ConditionCatalogType, ConditionDefinition>
> = {
  blinded: definition('blinded', 'Blinded'),
  poisoned: definition('poisoned', 'Poisoned'),
  restrained: definition('restrained', 'Restrained'),
  stunned: definition('stunned', 'Stunned', ['incapacitated']),
  paralyzed: definition('paralyzed', 'Paralyzed', ['incapacitated']),
  unconscious: definition('unconscious', 'Unconscious', [
    'incapacitated',
    'prone',
  ]),
  prone: definition('prone', 'Prone'),
  grappled: definition('grappled', 'Grappled'),
  frightened: definition('frightened', 'Frightened'),
  petrified: definition(
    'petrified',
    'Petrified',
    ['incapacitated'],
    ['poisoned'],
  ),
  incapacitated: definition('incapacitated', 'Incapacitated'),
  invisible: definition('invisible', 'Invisible'),
  exhaustion: definition('exhaustion', 'Exhaustion'),
}

export function isPersistentConditionType(
  value: string,
): value is PersistentConditionType {
  return (PERSISTENT_CONDITION_TYPES as readonly string[]).includes(value)
}

export function isConditionCatalogType(
  value: string,
): value is ConditionCatalogType {
  return (CONDITION_CATALOG_TYPES as readonly string[]).includes(value)
}

export function isTransientEffectType(
  value: string,
): value is TransientEffectType {
  return (TRANSIENT_EFFECT_TYPES as readonly string[]).includes(value)
}

export function effectiveConditionTypes(
  instances: readonly ConditionInstance[],
): ReadonlySet<PersistentConditionType> {
  const effective = new Set<PersistentConditionType>()
  const pending = instances.map((instance) => instance.type)

  while (pending.length > 0) {
    const condition = pending.pop()
    if (condition === undefined || effective.has(condition)) continue
    effective.add(condition)
    pending.push(...CONDITION_CATALOG[condition].includes)
  }

  return effective
}

export function hasEffectiveCondition(
  instances: readonly ConditionInstance[],
  condition: PersistentConditionType,
) {
  return effectiveConditionTypes(instances).has(condition)
}

export function isConditionImmune(
  instances: readonly ConditionInstance[],
  immunities: readonly PersistentConditionType[],
  condition: PersistentConditionType,
) {
  if (immunities.includes(condition)) return true
  for (const active of effectiveConditionTypes(instances)) {
    if (CONDITION_CATALOG[active].conditionImmunities.includes(condition)) {
      return true
    }
  }
  return false
}
