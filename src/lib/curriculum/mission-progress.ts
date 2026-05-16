import { prisma } from '@/lib/db'

export type CurriculumMissionLean = {
  id: string
  missionKey: string
  weekNumber: number
  orderInWeek: number
  weekTitle: string
  practiceTaskId: string
  learningObjective: string
  targetCEFR: string
  scenario: string
  prompt: string
  timeTargetSec: number
  passOverallThreshold: number
  requiredElements: string[]
  usefulPhrases: string[]
  successCriteria: string[]
  reviewDrills: {
    id: string
    type: string
    title: string
    instructions: string
  }[]
  modelAnswer: string
  evaluationWeights: Record<string, number>
}

function safeJsonArray<T>(s: string): T[] {
  try {
    const v = JSON.parse(s || '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

export async function getMonthMissions(monthKey: string): Promise<
  CurriculumMissionLean[]
> {
  const missions = await prisma.curriculumMission.findMany({
    where: { curriculumMonth: { monthKey } },
    orderBy: [{ weekNumber: 'asc' }, { orderInWeek: 'asc' }],
  })
  return missions.map((m) => ({
    id: m.id,
    missionKey: m.missionKey,
    weekNumber: m.weekNumber,
    orderInWeek: m.orderInWeek,
    weekTitle: m.weekTitle,
    practiceTaskId: m.practiceTaskId,
    learningObjective: m.learningObjective,
    targetCEFR: m.targetCEFR,
    scenario: m.scenario,
    prompt: m.prompt,
    timeTargetSec: m.timeTargetSec,
    passOverallThreshold: m.passOverallThreshold,
    requiredElements: safeJsonArray<string>(m.requiredElementsJson),
    usefulPhrases: safeJsonArray<string>(m.usefulPhrasesJson),
    successCriteria: safeJsonArray<string>(m.successCriteriaJson),
    reviewDrills: safeJsonArray<{
      id: string
      type: string
      title: string
      instructions: string
    }>(m.reviewDrillsJson),
    modelAnswer: m.modelAnswer,
    evaluationWeights: (() => {
      try {
        return JSON.parse(m.evaluationWeightsJson || '{}') as Record<string, number>
      } catch {
        return {}
      }
    })(),
  }))
}

export async function isMissionCompleteForUser(
  userId: string,
  practiceTaskId: string,
  passOverallThreshold: number
): Promise<boolean> {
  const row = await prisma.evaluation.findFirst({
    where: {
      userId,
      attempt: { practiceTaskId },
      overallScore: { gte: passOverallThreshold },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })
  return !!row
}

/** Any evaluated attempt counts as “attempted” (for model-answer gating, etc.) */
export async function hasEvaluatedAttempt(
  userId: string,
  practiceTaskId: string
): Promise<boolean> {
  const row = await prisma.evaluation.findFirst({
    where: { userId, attempt: { practiceTaskId } },
    select: { id: true },
  })
  return !!row
}

export async function getRecommendedMission(
  userId: string,
  monthKey: string
): Promise<{
  mission: CurriculumMissionLean | null
  currentWeek: number | null
  completedCount: number
  total: number
  monthComplete: boolean
}> {
  const missions = await getMonthMissions(monthKey)
  if (missions.length === 0) {
    return {
      mission: null,
      currentWeek: null,
      completedCount: 0,
      total: 0,
      monthComplete: false,
    }
  }

  let completed = 0
  let firstIncomplete: CurriculumMissionLean | null = null
  for (const m of missions) {
    const done = await isMissionCompleteForUser(
      userId,
      m.practiceTaskId,
      m.passOverallThreshold
    )
    if (done) completed++
    else if (!firstIncomplete) firstIncomplete = m
  }

  const monthComplete = completed >= missions.length
  const mission = monthComplete ? null : firstIncomplete

  const currentWeek =
    mission?.weekNumber ??
    (monthComplete ? missions[missions.length - 1]!.weekNumber : null)

  return {
    mission,
    currentWeek,
    completedCount: completed,
    total: missions.length,
    monthComplete,
  }
}

export async function getMissionByPracticeTaskId(
  practiceTaskId: string
): Promise<CurriculumMissionLean | null> {
  const m = await prisma.curriculumMission.findUnique({
    where: { practiceTaskId },
  })
  if (!m) return null
  return {
    id: m.id,
    missionKey: m.missionKey,
    weekNumber: m.weekNumber,
    orderInWeek: m.orderInWeek,
    weekTitle: m.weekTitle,
    practiceTaskId: m.practiceTaskId,
    learningObjective: m.learningObjective,
    targetCEFR: m.targetCEFR,
    scenario: m.scenario,
    prompt: m.prompt,
    timeTargetSec: m.timeTargetSec,
    passOverallThreshold: m.passOverallThreshold,
    requiredElements: safeJsonArray<string>(m.requiredElementsJson),
    usefulPhrases: safeJsonArray<string>(m.usefulPhrasesJson),
    successCriteria: safeJsonArray<string>(m.successCriteriaJson),
    reviewDrills: safeJsonArray<{
      id: string
      type: string
      title: string
      instructions: string
    }>(m.reviewDrillsJson),
    modelAnswer: m.modelAnswer,
    evaluationWeights: (() => {
      try {
        return JSON.parse(m.evaluationWeightsJson || '{}') as Record<string, number>
      } catch {
        return {}
      }
    })(),
  }
}
