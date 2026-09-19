import {
  Ban,
  BatteryLow,
  CircleOff,
  Eye,
  EyeOff,
  Footprints,
  Gem,
  Ghost,
  Link,
  LockKeyhole,
  ShieldMinus,
  ShieldOff,
  Skull,
  Sparkles,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { ConditionType } from '../probability/conditions'

/** Compact, text-backed icons for every supported condition or effect. */
export const CONDITION_ICONS: Record<ConditionType, LucideIcon> = {
  blinded: EyeOff,
  poisoned: CircleOff,
  restrained: LockKeyhole,
  stunned: Zap,
  paralyzed: Ban,
  unconscious: Skull,
  prone: Footprints,
  grappled: Link,
  frightened: Ghost,
  petrified: Gem,
  incapacitated: Ban,
  invisible: Eye,
  exhaustion: BatteryLow,
  vex: Sparkles,
  sap: ShieldMinus,
  dodging: ShieldOff,
}

export function ConditionIcon({
  condition,
  label,
  size = 16,
}: {
  readonly condition: ConditionType
  readonly label?: string
  readonly size?: number
}) {
  const Icon = CONDITION_ICONS[condition]
  return (
    <Icon
      aria-hidden={label === undefined}
      aria-label={label}
      role={label ? 'img' : undefined}
      size={size}
      strokeWidth={2.1}
    />
  )
}
