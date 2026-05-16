'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useParams } from 'next/navigation'
import { ArrowLeft, CheckCircle, XCircle, Send, Loader2 } from 'lucide-react'

interface Question {
  id: string
  questionType: string
  skill: string
  question: string
  options: string[]
  correctAnswer: string
  explanation?: string
}

interface Evaluation {
  id: string
  title: string
  skills: string
  questions: Question[]
}

interface QuizResult {
  score: number
  feedback?: string
  corrections?: string
  correctAnswer?: string
  explanation?: string
}

export default function QuizPage() {
  const { data: session } = useSession()
  const params = useParams()
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [results, setResults] = useState<Record<string, QuizResult>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showResults, setShowResults] = useState(false)

  useEffect(() => {
    async function startQuiz() {
      try {
        const res = await fetch('/api/ai/quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            levelCode: params.code,
            action: 'generate',
            skills: ['grammar', 'vocabulary', 'reading', 'writing', 'listening', 'speaking'],
          }),
        })
        
        if (res.ok) {
          const data = await res.json()
          setEvaluation({
            id: data.evaluationId,
            title: `${params.code} Level Assessment`,
            skills: 'grammar,vocabulary,reading,writing,listening,speaking',
            questions: data.questions || [],
          })
        }
      } catch (error) {
        console.error('Error starting quiz:', error)
      } finally {
        setLoading(false)
      }
    }
    if (session && params.code) {
      startQuiz()
    }
  }, [session, params.code])

  const handleAnswer = async (answer: string) => {
    const currentQ = evaluation?.questions[currentIndex]
    if (!currentQ) return

    setAnswers(prev => ({ ...prev, [currentQ.id]: answer }))
    setSubmitting(true)

    try {
      const res = await fetch('/api/ai/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          levelCode: params.code,
          action: 'correct',
          evaluationId: evaluation?.id,
          questionId: currentQ.id,
          answer,
        }),
      })

      if (res.ok) {
        const result = await res.json()
        setResults(prev => ({ ...prev, [currentQ.id]: result }))
      }
    } catch (error) {
      console.error('Error submitting answer:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleNext = () => {
    if (currentIndex < (evaluation?.questions.length || 0) - 1) {
      setCurrentIndex(prev => prev + 1)
    } else {
      setShowResults(true)
    }
  }

  const getScore = () => {
    const correct = Object.values(results).filter((r) => r.score >= 70).length
    return Math.round((correct / Object.keys(results).length) * 100)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Generating quiz questions...</p>
        </div>
      </div>
    )
  }

  const currentQuestion = evaluation?.questions[currentIndex]

  if (showResults || !currentQuestion) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-border">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Link href={`/levels/${params.code}`} className="btn btn-ghost">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-2xl font-bold">Assessment Results</h1>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="card text-center py-8">
            <div className="text-6xl font-bold mb-2">{getScore()}%</div>
            <p className="text-muted-foreground mb-4">Score</p>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="p-4 bg-green-500/10 rounded-lg">
                <div className="text-2xl font-bold text-green-500">
                  {Object.values(results).filter((r) => r.score >= 70).length}
                </div>
                <p className="text-sm">Correct</p>
              </div>
              <div className="p-4 bg-red-500/10 rounded-lg">
                <div className="text-2xl font-bold text-red-500">
                  {Object.values(results).filter((r) => r.score < 70).length}
                </div>
                <p className="text-sm">Needs Improvement</p>
              </div>
            </div>

            <Link href={`/levels/${params.code}`} className="btn btn-primary">
              Back to Level
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/levels/${params.code}`} className="btn btn-ghost">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold">{evaluation?.title}</h1>
                <p className="text-sm text-muted-foreground">
                  Question {currentIndex + 1} of {evaluation?.questions.length}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Skill:</span>
              <span className="text-sm font-medium capitalize">{currentQuestion?.skill}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="card">
          <div className="mb-6">
            <span className="text-sm text-primary font-medium uppercase">
              {currentQuestion?.questionType.replace('_', ' ')}
            </span>
            <h2 className="text-xl font-semibold mt-2">{currentQuestion?.question}</h2>
          </div>

          {/* Multiple Choice Options */}
          {currentQuestion?.options && currentQuestion.options.length > 0 && (
            <div className="space-y-3">
              {currentQuestion.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswer(option)}
                  disabled={submitting}
                  className={`w-full p-4 rounded-lg border text-left transition-colors ${
                    answers[currentQuestion.id] === option
                      ? answers[currentQuestion.id] === currentQuestion.correctAnswer
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-red-500 bg-red-500/10'
                      : answers[currentQuestion.id]
                      ? 'opacity-50'
                      : 'border-border hover:border-primary'
                  }`}
                >
                  <span className="font-medium">{option}</span>
                </button>
              ))}
            </div>
          )}

          {/* Writing Input */}
          {currentQuestion?.questionType === 'writing' && (
            <div>
              <textarea
                placeholder="Write your response here..."
                className="input min-h-[200px]"
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => setAnswers(prev => ({ ...prev, [currentQuestion.id]: e.target.value }))}
              />
              <button
                onClick={() => handleAnswer(answers[currentQuestion.id] || '')}
                disabled={submitting || !answers[currentQuestion.id]}
                className="btn btn-primary mt-4"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Submit Answer
              </button>
            </div>
          )}

          {/* Feedback */}
          {results[currentQuestion?.id] && (
            <div className="mt-6 p-4 rounded-lg bg-muted">
              <div className="flex items-center gap-2 mb-2">
                {results[currentQuestion.id].score >= 70 ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <span className="font-medium">Score: {results[currentQuestion.id].score}/100</span>
              </div>
              <p className="text-sm">{results[currentQuestion.id].feedback}</p>
              {results[currentQuestion.id].score < 70 && results[currentQuestion.id].corrections && (
                <p className="text-sm mt-2 text-primary">
                  Correction: {results[currentQuestion.id].corrections}
                </p>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            <button
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="btn btn-ghost"
            >
              Previous
            </button>
            <button
              onClick={handleNext}
              disabled={!answers[currentQuestion?.id] || submitting}
              className="btn btn-primary"
            >
              {currentIndex === (evaluation?.questions.length || 0) - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}