import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const session = (await getServerSession()) as {
      user?: { id?: string }
    } | null

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message, topic, level } = await request.json()

    const systemPrompt = `You are an English tutor helping a ${level} level student. 
    - Correct their grammar and suggest better phrasing
    - Keep responses appropriate for their level
    - Provide feedback on vocabulary and expressions
    - Be encouraging and patient
    ${topic ? `Current topic: ${topic}` : ''}`

    const deepseekKey = process.env.DEEPSEEK_API_KEY
    const deepseekModel = process.env.DEEPSEEK_MODEL || 'deepseek-chat'

    if (!deepseekKey) {
      return NextResponse.json({
        response: "AI is not configured yet. Please set DEEPSEEK_API_KEY in your environment variables.",
        feedback: "Configure the AI to start practicing!"
      })
    }

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepseekKey}`,
      },
      body: JSON.stringify({
        model: deepseekModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      throw new Error('DeepSeek API error')
    }

    const data = await response.json()
    const aiResponse = data.choices?.[0]?.message?.content || 'No response'

    let feedback = ''
    const feedbackMatch = aiResponse.match(/\[FEEDBACK\](.*?)\[\/FEEDBACK\]/s)
    if (feedbackMatch) {
      feedback = feedbackMatch[1].trim()
    }

    const cleanResponse = aiResponse.replace(/\[FEEDBACK\](.*?)\[\/FEEDBACK\]/s, '').trim()

    return NextResponse.json({
      response: cleanResponse,
      feedback: feedback || 'Great effort! Keep practicing to improve.',
    })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json({ 
      response: "Sorry, I couldn't process your message. Please try again.",
      feedback: "Connection error. Please check your settings."
    }, { status: 500 })
  }
}
