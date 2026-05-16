import type { EvaluationResult } from '@/lib/ai/evaluation'

const REVIEW_THRESHOLD = 72

export function shouldCreateReviewFromScores(result: EvaluationResult): boolean {
  if (result.overallScore < REVIEW_THRESHOLD) return true
  return result.weaknesses.length >= 2
}

export function buildReviewReason(result: EvaluationResult): string {
  const parts: string[] = []
  if (result.grammarScore < REVIEW_THRESHOLD) parts.push('grammar')
  if (result.vocabularyScore < REVIEW_THRESHOLD) parts.push('vocabulary')
  if (result.clarityScore < REVIEW_THRESHOLD) parts.push('clarity')
  if (result.taskCompletionScore < REVIEW_THRESHOLD) parts.push('task_completion')
  if (parts.length === 0) return `apa:${result.apaPhase}:general_improvement`
  return `apa:${result.apaPhase}:retry_focus:${parts.join(',')}`
}
