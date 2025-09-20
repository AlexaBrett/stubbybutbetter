export type FieldCheck = {
  field: string
  expected?: string
  actual?: string
  matched: boolean
  reason?: string
}

export type CandidateEvaluation = {
  id: number | string
  sourceOrder?: number
  source?: { file?: string, lineStart?: number, lineEnd?: number }
  checks: FieldCheck[]
  summary?: { allPassed: boolean, firstFail?: { field: string, reason: string } }
}

export type MatchTrace = {
  id: string
  timestamp: string
  request: {
    method: string
    url: string
    path: string
    query?: Record<string, string>
    headers: Record<string, string>
    bodyText?: string
    bodyTruncated?: boolean
  }
  candidates: CandidateEvaluation[]
  selected?: { id: number | string, sourceOrder?: number } | null
  response?: {
    status: number
    headers: Record<string, string>
    latencyMs?: number
    bodySummary?: string
  } | null
  timing?: { receivedAt: number, matchedAt?: number, respondedAt?: number }
}