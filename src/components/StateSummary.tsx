import type {
  CombatantState,
  SequenceState,
  StateProbability,
} from '../probability/event'

export interface StateSummaryProps {
  readonly label: string
  readonly state?: readonly StateProbability[]
}

export interface StateTransitionProps {
  readonly before: readonly StateProbability[]
  readonly after: readonly StateProbability[]
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

function percentage(probability: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    maximumFractionDigits: 2,
  }).format(probability)
}

function StateFlowStage({
  label,
  state,
}: {
  readonly label: string
  readonly state: readonly StateProbability[]
}) {
  return (
    <div className="state-flow-stage" aria-label={`${label} state`}>
      <span className="state-flow-label">{label}</span>
      <ol
        className="state-flow-branches"
        aria-label={`${label} state branches`}
      >
        {state.map((branch, index) => (
          <li className="state-flow-branch" key={index}>
            <strong>{percentage(branch.probability)}</strong>
            <span>{combatantSummary('Player', branch.state.player)}</span>
            <span>{combatantSummary('Enemy', branch.state.enemy)}</span>
          </li>
        ))}
      </ol>
    </div>
  )
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
              <strong>Probability: {percentage(branch.probability)}</strong>
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

/** A compact, linked view of an event's state probabilities. */
export function StateTransition({ before, after }: StateTransitionProps) {
  return (
    <section className="state-transition" aria-label="State transition">
      <div className="state-transition-heading">
        <strong>State transition</strong>
        <span>Before and after this event</span>
      </div>
      <div className="state-flow">
        <StateFlowStage label="Before" state={before} />
        <span className="state-flow-arrow" aria-hidden="true">
          →
        </span>
        <StateFlowStage label="After" state={after} />
      </div>
    </section>
  )
}
