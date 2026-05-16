/**
 * Idempotent Month 01 Professional Foundation importer.
 * Source of truth: content/curriculum/month-01-professional-foundation.json
 */
import type { PrismaClient } from '@prisma/client'
import { loadMonth01ProfessionalFoundation } from '../../src/lib/curriculum/load-month01-json'

function parsePassThreshold(successCriteria: string[]): number {
  for (const line of successCriteria) {
    const m = /(\d+)\s*out of\s*30/i.exec(line)
    if (m) {
      const n = parseInt(m[1], 10)
      return Math.round((n / 30) * 100)
    }
  }
  return 60
}

function mapWeekToLevelCode(targetCEFR: string): string {
  const u = targetCEFR.toUpperCase()
  if (u.includes('B1+')) return 'B2'
  return 'B1'
}

export async function seedMonth01ProfessionalFoundation(prisma: PrismaClient): Promise<void> {
  const pack = loadMonth01ProfessionalFoundation()
  const levels = await prisma.level.findMany()
  const byCode = Object.fromEntries(levels.map((l) => [l.code, l.id])) as Record<
    string,
    string
  >

  const monthRow = await prisma.curriculumMonth.upsert({
    where: { monthKey: pack.monthId },
    create: {
      monthKey: pack.monthId,
      title: pack.title,
      durationWeeks: pack.durationWeeks,
      targetBand: pack.targetBand ?? null,
      learnerJson: JSON.stringify(pack.learnerProfile ?? {}),
      designNotesJson: JSON.stringify(pack.designNotes ?? {}),
      rubricTemplatesJson: JSON.stringify(pack.rubricTemplates ?? {}),
    },
    update: {
      title: pack.title,
      durationWeeks: pack.durationWeeks,
      targetBand: pack.targetBand ?? null,
      learnerJson: JSON.stringify(pack.learnerProfile ?? {}),
      designNotesJson: JSON.stringify(pack.designNotes ?? {}),
      rubricTemplatesJson: JSON.stringify(pack.rubricTemplates ?? {}),
    },
  })

  let orderBase = 10_000

  for (const week of pack.weeks) {
    const passOverallThreshold = parsePassThreshold(week.successCriteria)
    const levelId = byCode[mapWeekToLevelCode(week.targetCEFR)]
    if (!levelId) {
      console.warn('Month01 seed: missing level', week.targetCEFR)
      continue
    }

    const instructionsBlock = [
      `Week theme: ${week.title}`,
      '',
      week.learningObjective,
      '',
      '---',
      '',
    ].join('\n')

    let mi = 0
    for (const sm of week.speakingMissions) {
      const instructions = [
        `Prompt: "${sm.prompt}"`,
        '',
        `Target time (seconds): ${sm.timeTargetSec ?? ''}`,
        '',
        'Required elements (your answer must address these):',
        ...sm.requiredElements.map((el) => `- ${el}`),
        '',
      ].join('\n')

      const fullInstructions = `${instructionsBlock}\n${instructions}`

      const title = `[M1/W${week.weekNumber}] ${sm.scenario}`
      const description = week.learningObjective

      const existing = await prisma.curriculumMission.findUnique({
        where: { missionKey: sm.id },
      })

      let taskId: string
      if (existing) {
        await prisma.practiceTask.update({
          where: { id: existing.practiceTaskId },
          data: {
            title,
            description,
            instructions: fullInstructions,
            cefrLevelId: levelId,
            estimatedDurationSec: sm.timeTargetSec ?? week.speakingMissions[mi]?.timeTargetSec ?? 90,
            scenarioType: 'professional_foundation',
            category: 'professional_foundation_month01',
          },
        })
        taskId = existing.practiceTaskId
      } else {
        const task = await prisma.practiceTask.create({
          data: {
            title,
            description,
            instructions: fullInstructions,
            cefrLevelId: levelId,
            skillType: 'speaking',
            scenarioType: 'professional_foundation',
            category: 'professional_foundation_month01',
            estimatedDurationSec: sm.timeTargetSec ?? 120,
            orderIndex: orderBase++,
            evaluationRubric: JSON.stringify({
              weights: week.evaluationWeights ?? {},
              ref: week.evaluationRubricRef,
            }),
            promptTemplate: `MISSION_KEY:${sm.id}`,
          },
        })
        taskId = task.id
      }

      await prisma.curriculumMission.upsert({
        where: { missionKey: sm.id },
        create: {
          missionKey: sm.id,
          curriculumMonthId: monthRow.id,
          practiceTaskId: taskId,
          weekNumber: week.weekNumber,
          orderInWeek: mi,
          weekSlug: week.slug,
          weekTitle: week.title,
          learningObjective: week.learningObjective,
          targetCEFR: week.targetCEFR,
          scenario: sm.scenario,
          prompt: sm.prompt,
          timeTargetSec: sm.timeTargetSec ?? 90,
          passOverallThreshold,
          requiredElementsJson: JSON.stringify(sm.requiredElements),
          usefulPhrasesJson: JSON.stringify(week.usefulPhrases ?? []),
          successCriteriaJson: JSON.stringify(week.successCriteria ?? []),
          reviewDrillsJson: JSON.stringify(week.reviewDrills ?? []),
          evaluationWeightsJson: JSON.stringify(week.evaluationWeights ?? {}),
          modelAnswer: week.modelAnswer ?? '',
        },
        update: {
          curriculumMonthId: monthRow.id,
          practiceTaskId: taskId,
          weekNumber: week.weekNumber,
          orderInWeek: mi,
          weekSlug: week.slug,
          weekTitle: week.title,
          learningObjective: week.learningObjective,
          targetCEFR: week.targetCEFR,
          scenario: sm.scenario,
          prompt: sm.prompt,
          timeTargetSec: sm.timeTargetSec ?? 90,
          passOverallThreshold,
          requiredElementsJson: JSON.stringify(sm.requiredElements),
          usefulPhrasesJson: JSON.stringify(week.usefulPhrases ?? []),
          successCriteriaJson: JSON.stringify(week.successCriteria ?? []),
          reviewDrillsJson: JSON.stringify(week.reviewDrills ?? []),
          evaluationWeightsJson: JSON.stringify(week.evaluationWeights ?? {}),
          modelAnswer: week.modelAnswer ?? '',
        },
      })
      mi++
    }
  }

  console.log('Month 01 Professional Foundation curriculum seeded.')
}
