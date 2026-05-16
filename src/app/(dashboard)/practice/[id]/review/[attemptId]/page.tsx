'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, Lightbulb, Trophy, Zap } from 'lucide-react'

interface EvaluationRow {
  id: string
  overallScore: number
  estimatedCefr: string
  grammarScore: number
  vocabularyScore: number
  clarityScore: number
  coherenceScore: number
  taskCompletionScore: number
  strengths: string
  weaknesses: string
  mainCorrections: string
  rewrittenAnswer: string
  suggestedVocabulary: string
  nextStep: string
  apaPhase: string
  apaReason: string
  apaMicroGoal: string
  curriculumMissionKey?: string | null
  feedbackJson?: string | null
  transcriptText?: string | null
}

function parseJson<T>(s: string, fallback: T): T {
  try {
    return JSON.parse(s) as T
  } catch {
    return fallback
  }
}

/** PT + explicit about auto scan vs LLM (mitigação phrase-check) */
function scanStatusPt(status: string): string {
  switch (status) {
    case 'detected':
      return 'Detectado no texto (scan automático)'
    case 'uncertain':
      return 'Sinal fraco — scan não confirma nem nega'
    case 'missing':
      return 'Não encontrado no texto (scan automático)'
    default:
      return status
  }
}

export default function ReviewPage({
  params,
}: {
  params: Promise<{ id: string; attemptId: string }>
}) {
  const { id, attemptId } = use(params)
  const [evaluation, setEvaluation] = useState<EvaluationRow | null>(null)
  const [loading, setLoading] = useState(true)
  const apaLabels: Record<string, string> = {
    acquire: 'Adquirir',
    practice: 'Praticar',
    adjust: 'Ajustar',
  }

  useEffect(() => {
    async function fetchEvaluation() {
      if (!attemptId) return
      try {
        const res = await fetch(`/api/evaluations?attemptId=${attemptId}`, {
          credentials: 'include',
        })
        if (res.ok) {
          const data = await res.json()
          setEvaluation(data)
        }
      } catch (error) {
        console.error('Failed to fetch evaluation:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchEvaluation()
  }, [attemptId])

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-500'
    if (score >= 60) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    )
  }

  const strengths = evaluation
    ? parseJson<string[]>(evaluation.strengths, [])
    : []
  const weaknesses = evaluation
    ? parseJson<string[]>(evaluation.weaknesses, [])
    : []
  const corrections = evaluation
    ? parseJson<{ original: string; corrected: string }[]>(
        evaluation.mainCorrections,
        []
      )
    : []
  const vocab = evaluation
    ? parseJson<{ word: string; meaning: string }[]>(
        evaluation.suggestedVocabulary,
        []
      )
    : []

  const missionFeedback =
    evaluation?.feedbackJson != null && evaluation.feedbackJson !== ''
      ? parseJson<{
          meetsMissionThreshold: boolean | null
          passOverallThreshold: number | null
          passThresholdApproxOn30?: number | null
          overallProxyOn30Approx?: number | null
          mappingNote?: string
          requiredElementsAutoCheck: { label: string; status: string }[]
          usefulPhrasesAutoCheck?: { phrase: string; status: string }[]
          heuristicNote?: string
        }>(evaluation.feedbackJson, {})
      : null

  /** Retrocompatível com avaliações antigas sem chaves novas em feedbackJson */
  const curriculumProxyOverall =
    evaluation && evaluation.curriculumMissionKey
      ? typeof missionFeedback?.overallProxyOn30Approx === 'number'
        ? missionFeedback.overallProxyOn30Approx
        : Math.round(((evaluation.overallScore / 100) * 30 + Number.EPSILON) * 10) / 10
      : null

  const curriculumProxyPassOn30 =
    typeof missionFeedback?.passOverallThreshold === 'number'
      ? typeof missionFeedback.passThresholdApproxOn30 === 'number'
        ? missionFeedback.passThresholdApproxOn30
        : Math.round((missionFeedback.passOverallThreshold / 100) * 30)
      : null

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-3xl mx-auto">
        <Link
          href={`/practice/${id}`}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to practice
        </Link>

        <div className="text-center mb-8">
          <Trophy
            className={`w-16 h-16 mx-auto mb-4 ${
              evaluation && evaluation.overallScore >= 80
                ? 'text-yellow-400'
                : 'text-gray-600'
            }`}
          />
          <h1 className="text-3xl font-bold">Evaluation</h1>
          {evaluation && (
            <p className="text-gray-500 mt-2">
              Estimated CEFR from this answer:{' '}
              <span className="text-primary font-semibold">
                {evaluation.estimatedCefr}
              </span>
            </p>
          )}
        </div>

        {evaluation && (
          <>
            {evaluation.transcriptText ? (
              <details className="mb-8 max-w-xl mx-auto rounded-xl border border-gray-700 bg-gray-900/60 p-4 text-left">
                <summary className="cursor-pointer text-sm font-medium text-gray-300">
                  Ver transcrição enviada
                </summary>
                <p className="mt-3 text-sm text-gray-400 whitespace-pre-wrap leading-relaxed">
                  {evaluation.transcriptText}
                </p>
              </details>
            ) : null}

            <div className="flex items-center justify-center gap-8 mb-8">
              <div className="text-center">
                <div
                  className={`text-5xl font-bold ${getScoreColor(evaluation.overallScore)}`}
                >
                  {evaluation.overallScore}
                </div>
                <div className="text-gray-500">Overall</div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
              {(
                [
                  ['Grammar', evaluation.grammarScore],
                  ['Vocabulary', evaluation.vocabularyScore],
                  ['Clarity', evaluation.clarityScore],
                  ['Coherence', evaluation.coherenceScore],
                  ['Task', evaluation.taskCompletionScore],
                ] as const
              ).map(([label, score]) => (
                <div key={label} className="bg-gray-900 rounded-xl p-4 text-center">
                  <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
                    {score}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{label}</div>
                  <div className={`h-1 mt-2 rounded ${getScoreBg(score)}`} />
                </div>
              ))}
            </div>

            {evaluation.curriculumMissionKey &&
            curriculumProxyOverall != null ? (
              <div className="rounded-xl border border-amber-500/25 bg-amber-950/15 p-4 mb-8 text-sm text-left">
                <h2 className="text-amber-200 font-semibold mb-2">
                  Leitura dupla: 0–100 (avaliador) vs /30 do currículo (proxy)
                </h2>
                <p className="text-gray-400 mb-3">
                  Os cartões acima são sempre <strong className="text-gray-200">0–100</strong> (contrato
                  atual do modelo). O programa Mês 1 fala em conceito <strong className="text-gray-200">/30</strong>
                  — abaixo há um <em>proxy linear</em> só para comparar com o brief; não substitui uma
                  rubrica 6×0–5 somada no servidor.
                </p>
                <ul className="space-y-1 text-gray-300 font-mono text-xs sm:text-sm">
                  <li>
                    Proxy da tua resposta: ~{curriculumProxyOverall}/30 &nbsp;
                    <span className="text-gray-500 font-sans">
                      (a partir de overall {evaluation.overallScore}/100)
                    </span>
                  </li>
                  {curriculumProxyPassOn30 != null &&
                  typeof missionFeedback?.passOverallThreshold === 'number' ? (
                    <li>
                      Barreira da semana (~conceito /30): objetivo ≥ ~
                      {curriculumProxyPassOn30}/30 &nbsp;
                      <span className="text-gray-500 font-sans">
                        (= ≥ {missionFeedback.passOverallThreshold}/100 no avaliador)
                      </span>
                    </li>
                  ) : null}
                </ul>
                {missionFeedback?.mappingNote ? (
                  <p className="text-xs text-gray-500 mt-3">{missionFeedback.mappingNote}</p>
                ) : null}
              </div>
            ) : null}

            {missionFeedback &&
            (missionFeedback.requiredElementsAutoCheck?.length ||
              missionFeedback.usefulPhrasesAutoCheck?.length) ? (
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-5 mb-8">
                <h2 className="text-lg font-semibold mb-2 text-cyan-300">
                  Checklist da missão + frases (scan híbrido)
                </h2>
                <p className="text-xs text-gray-400 mb-3">
                  <span className="text-cyan-400/90">Heurística no servidor</span> — não é o mesmo que o
                  juízo da LLM sobre o conteúdo. Se o scan diz &quot;falta&quot; mas a gravação parece
                  correta, confia no áudio/transcrição e no feedback qualitativo acima.
                  {missionFeedback.heuristicNote ? (
                    <span className="block mt-2 text-gray-500">{missionFeedback.heuristicNote}</span>
                  ) : null}
                  {evaluation?.curriculumMissionKey ? (
                    <span className="block mt-1 text-gray-500">
                      Mission: {evaluation.curriculumMissionKey}
                      {typeof missionFeedback.passOverallThreshold === 'number'
                        ? ` · Pass no avaliador: ${missionFeedback.passOverallThreshold}/100`
                        : ''}
                      {typeof missionFeedback.meetsMissionThreshold === 'boolean'
                        ? ` · Passa limiar: ${missionFeedback.meetsMissionThreshold ? 'sim' : 'não'}`
                        : ''}
                    </span>
                  ) : null}
                </p>
                {missionFeedback.requiredElementsAutoCheck?.length ? (
                <ul className="space-y-2 text-sm mb-4">
                  {missionFeedback.requiredElementsAutoCheck.map((e) => (
                    <li
                      key={e.label}
                      className="flex justify-between gap-4 border-b border-gray-800 pb-2"
                    >
                      <span className="text-gray-200">{e.label}</span>
                      <span
                        className={
                          e.status === 'detected'
                            ? 'text-emerald-400'
                            : e.status === 'uncertain'
                              ? 'text-yellow-400'
                              : 'text-red-400'
                        }
                      >
                        {scanStatusPt(e.status)}
                      </span>
                    </li>
                  ))}
                </ul>
                ) : null}
                {missionFeedback.usefulPhrasesAutoCheck?.length ? (
                  <details open className="text-sm text-gray-400">
                    <summary className="cursor-pointer text-gray-300 mb-2">
                      Frases úteis amostradas (scan)
                    </summary>
                    <ul className="mt-2 space-y-1">
                      {missionFeedback.usefulPhrasesAutoCheck.slice(0, 8).map((p) => (
                        <li key={p.phrase} className="flex justify-between gap-3">
                          <span className="truncate mr-2">{p.phrase}</span>
                          <span
                            className={
                              p.status === 'detected'
                                ? 'text-emerald-400 shrink-0'
                                : p.status === 'uncertain'
                                  ? 'text-yellow-400 shrink-0'
                                  : 'text-red-400 shrink-0'
                            }
                          >
                            {scanStatusPt(p.status)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </div>
            ) : null}

            {strengths.length > 0 && (
              <div className="bg-gray-900 rounded-xl p-6 mb-4">
                <div className="flex items-center gap-2 text-green-400 mb-3">
                  <Zap className="w-5 h-5" />
                  <h2 className="text-lg font-semibold">Strengths</h2>
                </div>
                <ul className="list-disc list-inside text-gray-300 space-y-1">
                  {strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {weaknesses.length > 0 && (
              <div className="bg-gray-900 rounded-xl p-6 mb-4">
                <div className="flex items-center gap-2 text-yellow-400 mb-3">
                  <Lightbulb className="w-5 h-5" />
                  <h2 className="text-lg font-semibold">Weaknesses</h2>
                </div>
                <ul className="list-disc list-inside text-gray-300 space-y-1">
                  {weaknesses.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {corrections.length > 0 && (
              <div className="bg-gray-900 rounded-xl p-6 mb-4">
                <h2 className="text-lg font-semibold mb-2">Corrections</h2>
                <ul className="space-y-2 text-sm">
                  {corrections.map((c, i) => (
                    <li key={i} className="text-gray-300">
                      <span className="text-red-400 line-through">{c.original}</span>
                      {' → '}
                      <span className="text-green-400">{c.corrected}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-gray-900 rounded-xl p-6 mb-4">
              <h2 className="text-lg font-semibold mb-2">Rewritten answer (model)</h2>
              <p className="text-gray-300 whitespace-pre-wrap">
                {evaluation.rewrittenAnswer}
              </p>
            </div>

            {vocab.length > 0 && (
              <div className="bg-gray-900 rounded-xl p-6 mb-4">
                <h2 className="text-lg font-semibold mb-2">Suggested vocabulary</h2>
                <ul className="text-sm text-gray-300 space-y-1">
                  {vocab.map((v, i) => (
                    <li key={i}>
                      <strong>{v.word}</strong> — {v.meaning}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-gray-900 rounded-xl p-6 mb-8">
              <div className="flex items-center gap-2 text-blue-400 mb-3">
                <CheckCircle className="w-5 h-5" />
                <h2 className="text-lg font-semibold">APA next step</h2>
              </div>
              <div className="inline-flex rounded-full bg-blue-500/10 px-3 py-1 text-sm font-medium text-blue-300 mb-3">
                {apaLabels[evaluation.apaPhase] ?? evaluation.apaPhase}
              </div>
              <p className="text-gray-300">{evaluation.apaReason}</p>
              <p className="text-white font-medium mt-3">{evaluation.apaMicroGoal}</p>
            </div>

            <div className="bg-gray-900 rounded-xl p-6 mb-8">
              <div className="flex items-center gap-2 text-blue-400 mb-3">
                <CheckCircle className="w-5 h-5" />
                <h2 className="text-lg font-semibold">Next step</h2>
              </div>
              <p className="text-gray-300">{evaluation.nextStep}</p>
            </div>

            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href={`/practice/${id}`}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium"
              >
                Retry this task
              </Link>
              <Link
                href="/library"
                className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium"
              >
                Library (support)
              </Link>
              <Link
                href="/practice"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium"
              >
                Other tasks
              </Link>
            </div>
          </>
        )}

        {!evaluation && (
          <div className="text-center py-12">
            <p className="text-gray-400">Evaluation not found.</p>
            <Link href="/practice" className="mt-4 inline-block text-blue-500">
              Go to practice
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
