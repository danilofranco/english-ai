'use client'

import { useEffect, useState, use } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, CheckCircle, XCircle, Clock
} from 'lucide-react'
import AudioRecorder from '@/components/audio-recorder'

interface PracticeTask {
  id: string
  title: string
  description: string
  instructions: string
  cefrLevel: { code: string; title: string }
  skillType: string
  category: string
  estimatedDurationSec: number
  contents?: {
    learningContent: { id: string; title: string; localPath: string; type: string }
  }[]
  curriculumMission?: {
    missionKey: string
    weekNumber: number
    weekTitle: string
    learningObjective: string
    targetCEFR: string
    scenario: string
    prompt: string
    timeTargetSec: number
    passOverallThreshold: number
    requiredElementsJson: string
    usefulPhrasesJson: string
    successCriteriaJson: string
    modelAnswer: string
  } | null
}

interface Attempt {
  id: string
  status: string
  transcriptText: string | null
  audioPath: string | null
  createdAt: string
  evaluation?: {
    overallScore: number
  } | null
}

export default function PracticePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: session } = useSession()
  const router = useRouter()
  const [task, setTask] = useState<PracticeTask | null>(null)
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [loading, setLoading] = useState(true)
  const [transcribing, setTranscribing] = useState(false)
  const [evaluating, setEvaluating] = useState(false)

  useEffect(() => {
    async function fetchTask() {
      if (!session?.user?.id || !id) return

      try {
        const res = await fetch(`/api/tasks/${id}`, { credentials: 'include' })
        const data = await res.json()
        setTask(data.task)
        setAttempts(data.attempts || [])
      } catch (error) {
        console.error('Failed to fetch task:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTask()
  }, [session?.user?.id, id])

  async function handleTranscribe(audioBlob: Blob) {
    if (!session?.user?.id) return null

    setTranscribing(true)
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob)

      const res = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      const data = (await res.json().catch(() => ({}))) as {
        transcription?: string
        source?: string
        error?: string
      }

      if (!res.ok) {
        console.error('Transcription failed', data)
        alert(
          typeof data.error === 'string'
            ? data.error
            : 'Falha na transcrição. Verifica a consola ou OPENAI_API_KEY.'
        )
        return null
      }

      return {
        text: data.transcription ?? '',
        source: data.source ?? 'mock',
      }
    } catch (error) {
      console.error('Transcription error:', error)
      alert('Erro de rede ao transcrever.')
      return null
    } finally {
      setTranscribing(false)
    }
  }

  async function handleSubmit(audioBlob: Blob, transcription: string, durationSec: number) {
    if (!session?.user?.id || !task) return
    
    setEvaluating(true)
    try {
      const formData = new FormData()
      formData.append('taskId', task.id)
      formData.append('audio', audioBlob)
      formData.append('transcription', transcription)
      formData.append('durationSec', String(durationSec))

      const res = await fetch('/api/attempts', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      const attemptPayload = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(
          typeof attemptPayload.error === 'string'
            ? attemptPayload.error
            : 'Falha ao guardar attempt.'
        )
        return
      }

      const attempt = attemptPayload as { id: string }

      const evalRes = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ attemptId: attempt.id }),
      })

      if (evalRes.ok) {
        await evalRes.json()
        router.push(`/practice/${id}/review/${attempt.id}`)
      } else {
        const errBody = await evalRes.json().catch(() => ({}))
        alert(
          typeof errBody.error === 'string'
            ? errBody.error
            : 'Avaliação falhou.'
        )
        router.push(`/practice/${id}`)
      }
    } catch (error) {
      console.error('Submit error:', error)
    } finally {
      setEvaluating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold">Task not found</h2>
          <button 
            onClick={() => router.push('/practice')}
            className="mt-4 px-4 py-2 bg-blue-600 rounded-lg"
          >
            Back to Library
          </button>
        </div>
      </div>
    )
  }

  const cm = task.curriculumMission
  let reqElements: string[] = []
  if (cm?.requiredElementsJson) {
    try {
      const p = JSON.parse(cm.requiredElementsJson)
      reqElements = Array.isArray(p) ? p : []
    } catch {
      reqElements = []
    }
  }
  const evaluatedOnce = attempts.some((a) => a.evaluation != null)

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-3xl mx-auto">
        <button 
          onClick={() => router.push('/practice')}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Library
        </button>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs px-2 py-0.5 bg-gray-800 rounded text-gray-400">
              {task.cefrLevel.code}
            </span>
            <span className="text-xs px-2 py-0.5 bg-gray-800 rounded text-gray-400">
              {task.category}
            </span>
            <span className="text-xs px-2 py-0.5 bg-gray-800 rounded text-gray-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {Math.ceil(task.estimatedDurationSec / 60)} min
            </span>
          </div>
          
          <h1 className="text-2xl font-bold mb-2">{task.title}</h1>
          <p className="text-gray-400 mb-4">{task.description}</p>
          
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Instructions</h3>
            <p className="text-white">{task.instructions}</p>
          </div>

          {task.contents && task.contents.length > 0 && (
            <div className="mt-4 rounded-lg border border-gray-700 p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Related from your library</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                {task.contents.map((c) => (
                  <li key={c.learningContent.id}>
                    <span className="text-primary">{c.learningContent.title}</span>
                    <span className="text-gray-500 text-xs ml-2">{c.learningContent.localPath}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {cm && (
          <div className="mb-6 rounded-xl border border-indigo-500/35 bg-indigo-950/30 p-5">
            <p className="text-xs uppercase tracking-wide text-indigo-400 font-semibold">
              Month 1 mission · Week {cm.weekNumber}
            </p>
            <h2 className="text-lg font-bold mt-1 text-white">{cm.weekTitle}</h2>
            <p className="text-sm text-gray-400 mt-1">{cm.learningObjective}</p>
            <p className="text-sm mt-3 text-gray-200">
              <span className="text-gray-500">Scenario:</span> {cm.scenario}
            </p>
            <p className="text-sm italic text-gray-300 mt-1">&quot;{cm.prompt}&quot;</p>
            <div className="flex flex-wrap gap-2 mt-3 text-xs text-gray-400">
              <span>Target ~{cm.timeTargetSec}s</span>
              <span>Pass when overall ≥ {cm.passOverallThreshold}/100</span>
            </div>
            {reqElements.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-gray-500 uppercase">Required elements</p>
                <ul className="mt-2 list-disc ml-5 text-sm text-gray-300 space-y-1">
                  {reqElements.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {cm?.modelAnswer && evaluatedOnce ? (
          <details className="mb-6 rounded-lg border border-gray-700 bg-gray-900/80 p-4">
            <summary className="cursor-pointer text-sm font-medium text-emerald-400">
              Reference model answer
            </summary>
            <p className="mt-3 text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
              {cm.modelAnswer}
            </p>
          </details>
        ) : cm?.modelAnswer ? (
          <p className="text-xs text-gray-500 mb-4">
            Record and submit once; after evaluation you unlock the curated model answer.
          </p>
        ) : null}

        <AudioRecorder
          onTranscribe={handleTranscribe}
          onSubmit={handleSubmit}
          isTranscribing={transcribing}
          isEvaluating={evaluating}
        />

        {attempts.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-4">Previous Attempts</h2>
            <div className="space-y-3">
              {attempts.map((attempt) => (
                <div 
                  key={attempt.id}
                  className="flex items-center gap-4 p-4 bg-gray-900 border border-gray-800 rounded-lg"
                >
                  <div className={`p-2 rounded-lg ${
                    attempt.status === 'evaluated' 
                      ? 'bg-green-900/30 text-green-400' 
                      : 'bg-yellow-900/30 text-yellow-400'
                  }`}>
                    {attempt.status === 'evaluated' ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <Clock className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-400">
                      {new Date(attempt.createdAt).toLocaleDateString()}
                    </p>
                    {attempt.transcriptText && (
                      <p className="text-sm text-gray-300 truncate mt-1">
                        {attempt.transcriptText.slice(0, 100)}...
                      </p>
                    )}
                  </div>
                  {attempt.evaluation && (
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-lg font-bold text-green-400">
                        {attempt.evaluation.overallScore}/100
                      </span>
                      <Link
                        href={`/practice/${id}/review/${attempt.id}`}
                        className="text-xs text-emerald-400 hover:text-emerald-300 underline-offset-2 hover:underline"
                      >
                        Ver avaliação
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}