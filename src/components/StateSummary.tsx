import type { CombatantState } from '../probability/event'

export interface StateSummaryProps {
  readonly label: string
  readonly state?: CombatantState
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
      {state ? (
        <span>{state.conditions.length} active conditions</span>
      ) : (
        <span>
          State summaries will appear when sequence results include them.
        </span>
      )}
    </div>
  )
}
