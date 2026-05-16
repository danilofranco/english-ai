'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Send, Mic, MicOff, Loader2 } from 'lucide-react'

interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null
  onend: (() => void) | null
}

interface SpeechRecognitionResultEventLike {
  results: ArrayLike<{
    0: { transcript: string }
  }>
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

export default function VoiceChatPage() {
  const { data: session } = useSession()
  const params = useParams()
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<{ role: string; content: string; feedback?: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [, setIsListening] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  useEffect(() => {
    async function startSession() {
      setLoading(true)
      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            levelCode: params.code,
            moduleId: params.moduleId,
            topic: 'daily life',
            action: 'start',
          }),
        })

        if (res.ok) {
          const data = await res.json()
          setSessionId(data.sessionId)
          setMessages([{ role: 'assistant', content: data.message }])
        }
      } catch (error) {
        console.error('Error starting session:', error)
      } finally {
        setLoading(false)
      }
    }
    if (session && params.code) {
      startSession()
    }

    // Setup speech recognition
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const speechWindow = window as unknown as {
        SpeechRecognition?: SpeechRecognitionConstructor
        webkitSpeechRecognition?: SpeechRecognitionConstructor
      }
      const SpeechRecognition =
        speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition

      if (!SpeechRecognition) return

      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = true

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join('')
        setMessage(transcript)
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }
  }, [session, params.code, params.moduleId])

  const sendMessage = async () => {
    if (!message.trim() || !sessionId) return

    const userMessage = message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setMessage('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          levelCode: params.code,
          topic: 'daily life',
          voiceSessionId: sessionId,
          action: 'continue',
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: data.response, feedback: data.feedback },
        ])
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop()
      setIsRecording(false)
    } else {
      recognitionRef.current?.start()
      setIsRecording(true)
    }
  }

  const endSession = async () => {
    if (!sessionId) return

    try {
      await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voiceSessionId: sessionId,
          action: 'end',
        }),
      })
    } catch (error) {
      console.error('Error ending session:', error)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/levels/${params.code}/module/${params.moduleId}`} className="btn btn-ghost" onClick={endSession}>
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold">Voice Practice</h1>
                <p className="text-sm text-muted-foreground">Level {params.code}</p>
              </div>
            </div>
            <button onClick={endSession} className="btn btn-ghost">
              End Session
            </button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="container mx-auto max-w-2xl">
          {messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] p-4 rounded-lg ${
                msg.role === 'user' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted'
              }`}>
                <p>{msg.content}</p>
                {msg.role === 'assistant' && msg.feedback && (
                  <p className="text-sm text-green-500 mt-2">
                    Correction: {msg.feedback}
                  </p>
                )}
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted p-4 rounded-lg">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-card border-t border-border p-4">
        <div className="container mx-auto max-w-2xl">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleRecording}
              className={`btn ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'btn-secondary'}`}
              disabled={loading}
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder={isRecording ? 'Listening...' : 'Type a message or use microphone...'}
              className="input flex-1"
              disabled={loading || isRecording}
            />
            
            <button
              onClick={sendMessage}
              disabled={loading || !message.trim()}
              className="btn btn-primary"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          
          {isRecording && (
            <p className="text-center text-sm text-red-500 mt-2">
              Speak now... Click microphone to stop
            </p>
          )}
        </div>
      </div>
    </div>
  )
}