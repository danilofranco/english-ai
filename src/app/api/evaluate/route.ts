import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  evaluateResponse,
  resolveLlmLabel,
  type MissionEvalContext,
} from '@/lib/ai/evaluation'
import { refreshUserProgressSnapshot } from '@/lib/progress'
import {
  buildReviewReason,
  shouldCreateReviewFromScores,
} from '@/lib/evolution'
import { getServerSession } from '@/lib/auth'
import { getMissionByPracticeTaskId } from '@/lib/curriculum/mission-progress'
import {
  analyzeRequiredElements,
  analyzeUsefulPhrases,
} from '@/lib/curriculum/transcript-phrases'
import { looksLikePlaceholderTranscript } from '@/lib/transcription-validation'

export async function POST(request: Request) {
  try {
    const session = (await getServerSession()) as { user?: { id: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { attemptId } = body

    if (!attemptId) {
      return NextResponse.json({ error: 'Missing attemptId' }, { status: 400 })
    }

    const attempt = await db.attempt.findUnique({
      where: { id: attemptId },
      include: {
        practiceTask: { include: { cefrLevel: true } },
      },
    })

    if (!attempt?.practiceTask?.cefrLevel) {
      return NextResponse.json({ error: 'Attempt or task not found' }, { status: 404 })
    }

    if (attempt.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!attempt.transcriptText) {
      return NextResponse.json(
        { error: 'No transcription to evaluate' },
        { status: 400 }
      )
    }

    if (looksLikePlaceholderTranscript(attempt.transcriptText)) {
      return NextResponse.json(
        {
          error:
            'Cannot evaluate placeholder/mock transcription. Re-record with Whisper configured or paste a real transcript.',
        },
        { status: 400 }
      )
    }

    const task = attempt.practiceTask
    const missionLean = await getMissionByPracticeTaskId(task.id)

    let mission: MissionEvalContext | null = null
    if (missionLean) {
      const w = missionLean.evaluationWeights
      mission = {
        missionKey: missionLean.missionKey,
        weekTitle: missionLean.weekTitle,
        learningObjective: missionLean.learningObjective,
        scenario: missionLean.scenario,
        prompt: missionLean.prompt,
        requiredElements: missionLean.requiredElements,
        successCriteria: missionLean.successCriteria,
        evaluationWeights: Object.keys(w).length > 0 ? w : undefined,
      }
    }

    const result = await evaluateResponse(attempt.transcriptText, {
      title: task.title,
      cefrLevel: task.cefrLevel.code,
      instructions: task.instructions,
      mission,
    })

    const llmModel = resolveLlmLabel()

    const requiredChecks = missionLean
      ? analyzeRequiredElements(attempt.transcriptText, missionLean.requiredElements)
      : []
    const phraseChecks = missionLean
      ? analyzeUsefulPhrases(attempt.transcriptText, missionLean.usefulPhrases)
      : []

    const meetsMissionThreshold =
      missionLean != null
        ? result.overallScore >= missionLean.passOverallThreshold
        : null

    const overallProxyOn30Approx =
      Math.round(((result.overallScore / 100) * 30 + Number.EPSILON) * 10) /
      10
    const passThresholdApproxOn30 =
      missionLean != null
        ? Math.round((missionLean.passOverallThreshold / 100) * 30)
        : null

    const feedbackPayload = {
      missionKey: missionLean?.missionKey ?? null,
      passOverallThreshold: missionLean?.passOverallThreshold ?? null,
      passThresholdApproxOn30,
      overallProxyOn30Approx,
      meetsMissionThreshold,
      requiredElementsAutoCheck: requiredChecks,
      usefulPhrasesAutoCheck: phraseChecks,
      heuristicNote:
        'Checks de elementos/frases são automáticos e aproximados; rever com o áudio. Proxy /30 = proporcional ao overall 0–100 (não é soma oficial das 6×0–5 do JSON até o avaliador as devolver explicitamente.',
      scoresLegacy0to100: {
        overallScore: result.overallScore,
        taskCompletionScore: result.taskCompletionScore,
      },
      mappingNote:
        'O currículo fala em /30 ponderado e dimensões 0–5; a app mantém avaliação 0–100. overallProxyOn30Approx e passThresholdApproxOn30 são só leitura linear para comparar mentalmente com o brief.',
    }

    const evaluation = await db.evaluation.create({
      data: {
        attemptId,
        userId: attempt.userId,
        overallScore: result.overallScore,
        estimatedCefr: result.cefrEstimate,
        grammarScore: result.grammarScore,
        vocabularyScore: result.vocabularyScore,
        clarityScore: result.clarityScore,
        coherenceScore: result.coherenceScore,
        taskCompletionScore: result.taskCompletionScore,
        strengths: JSON.stringify(result.strengths),
        weaknesses: JSON.stringify(result.weaknesses),
        mainCorrections: JSON.stringify(result.corrections),
        rewrittenAnswer: result.rewrittenAnswer,
        suggestedVocabulary: JSON.stringify(result.suggestedVocabulary),
        nextStep: result.nextStep,
        apaPhase: result.apaPhase,
        apaReason: result.apaReason,
        apaMicroGoal: result.apaMicroGoal,
        llmModel,
        curriculumMissionKey: missionLean?.missionKey ?? null,
        feedbackJson: JSON.stringify(feedbackPayload),
      },
    })

    await db.attempt.update({
      where: { id: attemptId },
      data: { status: 'evaluated' },
    })

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)

    const needsReviewQueue =
      shouldCreateReviewFromScores(result) ||
      (missionLean != null && result.overallScore < missionLean.passOverallThreshold)

    if (needsReviewQueue && missionLean && missionLean.reviewDrills.length > 0) {
      const drills = missionLean.reviewDrills.slice(0, 3)
      for (const d of drills) {
        await db.reviewItem.create({
          data: {
            userId: attempt.userId,
            attemptId: attempt.id,
            practiceTaskId: task.id,
            dueAt: tomorrow,
            reason: `drill:${d.type}:${missionLean.missionKey}`,
            status: 'pending',
            drillId: d.id,
            drillType: d.type,
            drillTitle: d.title,
            drillInstructions: d.instructions,
          },
        })
      }
    } else if (needsReviewQueue) {
      await db.reviewItem.create({
        data: {
          userId: attempt.userId,
          attemptId: attempt.id,
          practiceTaskId: task.id,
          dueAt: tomorrow,
          reason: buildReviewReason(result),
          status: 'pending',
        },
      })
    }

    await refreshUserProgressSnapshot(attempt.userId)

    return NextResponse.json({
      ...evaluation,
      parsed: result,
      missionFeedback: feedbackPayload,
    })
  } catch (error) {
    console.error('Error evaluating attempt:', error)
    return NextResponse.json({ error: 'Failed to evaluate attempt' }, { status: 500 })
  }
}
