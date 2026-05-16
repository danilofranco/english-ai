import { z } from 'zod'

const speakingMissionSchema = z.object({
  id: z.string(),
  scenario: z.string(),
  prompt: z.string(),
  timeTargetSec: z.number().optional(),
  requiredElements: z.array(z.string()),
})

const reviewDrillSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  targetWeakness: z.string().optional(),
  instructions: z.string(),
})

export const month01PackSchema = z.object({
  monthId: z.string(),
  title: z.string(),
  durationWeeks: z.number(),
  targetBand: z.string().optional(),
  learnerProfile: z.record(z.unknown()).optional(),
  designNotes: z.record(z.unknown()).optional(),
  rubricTemplates: z.record(z.unknown()).optional(),
  weeks: z.array(
    z.object({
      weekNumber: z.number(),
      slug: z.string(),
      title: z.string(),
      learningObjective: z.string(),
      targetCEFR: z.string(),
      businessContext: z.array(z.string()).optional(),
      grammarFocus: z.array(z.string()).optional(),
      vocabularyList: z.array(z.string()).optional(),
      usefulPhrases: z.array(z.string()).optional(),
      speakingMissions: z.array(speakingMissionSchema),
      writingMission: z.record(z.unknown()).optional(),
      successCriteria: z.array(z.string()),
      evaluationRubricRef: z.string().optional(),
      evaluationWeights: z.record(z.number()).optional(),
      reviewDrills: z.array(reviewDrillSchema),
      modelAnswer: z.string().optional(),
    })
  ),
})

export type Month01Pack = z.infer<typeof month01PackSchema>

export type SpeakingMission = z.infer<typeof speakingMissionSchema>
export type ReviewDrill = z.infer<typeof reviewDrillSchema>
