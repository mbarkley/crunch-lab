import {
  calculateSequence,
  type SequenceConfig,
  type SequenceResult,
} from './probability/event'

export interface SequenceCalculationRequest {
  readonly requestId: number
  readonly config: SequenceConfig
}

export interface SequenceCalculationSuccess {
  readonly requestId: number
  readonly sequence: SequenceResult
}

export interface SequenceCalculationFailure {
  readonly requestId: number
  readonly error: string
}

export type SequenceCalculationResponse =
  SequenceCalculationSuccess | SequenceCalculationFailure

/** Kept separate from the Worker global so its request handling is unit-testable. */
export function calculateSequenceRequest(
  request: SequenceCalculationRequest,
): SequenceCalculationResponse {
  try {
    return {
      requestId: request.requestId,
      sequence: calculateSequence(request.config),
    }
  } catch (error) {
    return {
      requestId: request.requestId,
      error:
        error instanceof Error
          ? error.message
          : 'Unable to calculate sequence.',
    }
  }
}

if (typeof document === 'undefined') {
  self.onmessage = (event: MessageEvent<SequenceCalculationRequest>) => {
    self.postMessage(calculateSequenceRequest(event.data))
  }
}
