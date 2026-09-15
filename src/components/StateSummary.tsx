import type {
  CombatantState,
  SequenceState,
  StateProbability,
} from '../probability/event'

export interface StateSummaryProps {
  readonly label: string
  readonly state?: readonly StateProbability[]
}

const CONDITION_LABELS: Record<string, string> = {
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
}

function stateLabels(state: CombatantState) {
  const labels = state.conditions.map(
    (condition) => CONDITION_LABELS[condition.type] ?? condition.type,
  )
  if (state.vex) labels.push('Vex')
  if (state.sap) labels.push('Sap')
  if (state.helped) labels.push('Helped')
  if (state.dodging) labels.push('Dodging')
  if (state.exhaustion > 0) labels.push(`Exhaustion ${state.exhaustion}`)
  if (state.concentration) labels.push('Concentrating')
  return labels
}

function combatantSummary(label: string, state: SequenceState['player']) {
  const labels = stateLabels(state)
  return `${label}: ${labels.length > 0 ? labels.join(', ') : 'No active conditions'}`
}

/**
 * A small render target for state snapshots once sequence results expose them.
 * It intentionally accepts an optional engine state instead of deriving one
 * from the editor, so the UI cannot present an invented post-event state.
 */
export function StateSummary({ label, state }: StateSummaryProps) {
  return (
    <div className="state-summary" aria-label={`${label} state summary`}>
      <strong>{label} state summary</strong>
      {state && state.length > 0 ? (
        <ol aria-label={`${label} state branches`}>
          {state.map((branch, index) => (
            <li key={index}>
              <strong>
                Probability:{' '}
                {new Intl.NumberFormat('en-US', {
                  style: 'percent',
                  maximumFractionDigits: 2,
                }).format(branch.probability)}
              </strong>
              <span>{combatantSummary('Player', branch.state.player)}</span>
              <span>{combatantSummary('Enemy', branch.state.enemy)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <span>
          State summaries will appear when sequence results include them.
        </span>
      )}
    </div>
  )
}
