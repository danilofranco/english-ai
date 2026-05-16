import OpenAI from 'openai'

export type ApaPhase = 'acquire' | 'practice' | 'adjust'

const deepseekApiKey = process.env.DEEPSEEK_API_KEY
const deepseekBaseURL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'
const openaiApiKey = process.env.OPENAI_API_KEY

const deepseek = deepseekApiKey
  ? new OpenAI({
      apiKey: deepseekApiKey,
      baseURL: deepseekBaseURL,
    })
  : null

const openai = openaiApiKey
  ? new OpenAI({
      apiKey: openaiApiKey,
    })
  : null

export interface MissionEvalContext {
  missionKey: string
  weekTitle: string
  learningObjective: string
  scenario: string
  prompt: string
  requiredElements: string[]
  successCriteria: string[]
  evaluationWeights?: Record<string, number>
}

export interface EvaluationResult {
  overallScore: number
  cefrEstimate: string
  grammarScore: number
  vocabularyScore: number
  clarityScore: number
  coherenceScore: number
  taskCompletionScore: number
  strengths: string[]
  weaknesses: string[]
  corrections: { original: string; corrected: string }[]
  rewrittenAnswer: string
  suggestedVocabulary: { word: string; meaning: string }[]
  nextStep: string
  apaPhase: ApaPhase
  apaReason: string
  apaMicroGoal: string
}

function normalizeApaPhase(value: unknown): ApaPhase | null {
  if (value === 'acquire' || value === 'practice' || value === 'adjust') {
    return value
  }

  return null
}

function resolveApaRecommendation(result: {
  grammarScore: number
  vocabularyScore: number
  clarityScore: number
  coherenceScore: number
  taskCompletionScore: number
}): Pick<EvaluationResult, 'apaPhase' | 'apaReason' | 'apaMicroGoal'> {
  if (result.grammarScore < 65 || result.vocabularyScore < 65) {
    return {
      apaPhase: 'acquire',
      apaReason:
        'The answer shows gaps in the language input needed before heavier production.',
      apaMicroGoal:
        'Review one short piece of related content and collect 5 useful phrases before retrying.',
    }
  }

  if (result.clarityScore < 70 || result.coherenceScore < 70) {
    return {
      apaPhase: 'practice',
      apaReason:
        'The core language is present, but the response needs more controlled production.',
      apaMicroGoal:
        'Retry the same task once, focusing on slower delivery and clearer connectors.',
    }
  }

  if (result.taskCompletionScore < 75) {
    return {
      apaPhase: 'practice',
      apaReason:
        'The response needs tighter alignment with the task before moving forward.',
      apaMicroGoal:
        'Answer every bullet in the task instructions in a 60-90 second response.',
    }
  }

  return {
    apaPhase: 'adjust',
    apaReason:
      'The response is strong enough to refine accuracy, naturalness, and range.',
    apaMicroGoal:
      'Use the rewritten answer as a model and record a more natural version.',
  }
}

function getSystemPrompt(
  task: {
    title: string
    cefrLevel: string
    instructions: string
    mission?: MissionEvalContext | null
  }
): string {
  const missionBlock =
    task.mission != null
      ? `\n\n## Curriculum mission (prioritise alignment with these)\n- Mission id: ${task.mission.missionKey}\n- Week focus: ${task.mission.weekTitle}\n- Learning objective: ${task.mission.learningObjective}\n- Scenario: ${task.mission.scenario}\n- Interviewer/host prompt to answer: "${task.mission.prompt}"\n- Required elements your evaluation MUST check explicitly: ${JSON.stringify(task.mission.requiredElements)}\n- Official success criteria: ${task.mission.successCriteria.map((s) => `\n  - ${s}`).join('')}\n- When scoring **taskCompletionScore**, penalise omissions of required elements severely.\n- If you cannot verify coverage of any required element from the transcript, mention it in weaknesses.\n`
      : ''

  return `You are an expert English language evaluator. Your task is to evaluate a user's spoken response to a practice task.

## Task Information
- Title: ${task.title}
- CEFR Level: ${task.cefrLevel}
- Instructions: ${task.instructions}
${missionBlock}
## Evaluation Criteria
Evaluate the response in 5 dimensions:
1. Grammar (0-100): Grammar accuracy and variety
2. Vocabulary (0-100): Word choice, range, and appropriateness
3. Clarity (0-100): How easily understandable the speech is
4. Coherence (0-100): How well ideas flow and connect
5. Task Completion (0-100): How well the response addresses the task

## APA Learning Cycle
Choose the next phase using this framework:
- acquire: the learner needs more input before retrying (grammar, vocabulary, useful chunks, examples)
- practice: the learner has enough input but needs guided production/repetition
- adjust: the learner performed well and should refine accuracy, naturalness, or range

## Output Format
Provide your evaluation in this exact JSON format:
{
  "overallScore": number (0-100),
  "cefrEstimate": "A1" | "A2" | "B1" | "B2" | "C1" | "C2",
  "grammarScore": number (0-100),
  "vocabularyScore": number (0-100),
  "clarityScore": number (0-100),
  "coherenceScore": number (0-100),
  "taskCompletionScore": number (0-100),
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "corrections": [{"original": "incorrect phrase", "corrected": "correct phrase"}],
  "rewrittenAnswer": "improved version of the response",
  "suggestedVocabulary": [{"word": "useful word", "meaning": "meaning in context"}],
  "nextStep": "specific actionable advice for improvement",
  "apaPhase": "acquire" | "practice" | "adjust",
  "apaReason": "why this APA phase is the right next step",
  "apaMicroGoal": "one concrete micro-goal for the next session"
}

Be critical but fair. Provide specific, actionable feedback.`
}

async function callLLM(
  prompt: string,
  provider: 'deepseek' | 'openai' = 'deepseek'
): Promise<string> {
  const client = provider === 'deepseek' ? deepseek : openai

  if (!client) {
    throw new Error(`Provider ${provider} not configured`)
  }

  const response = await client.chat.completions.create({
    model: provider === 'deepseek' ? (process.env.DEEPSEEK_MODEL || 'deepseek-chat') : 'gpt-4o-mini',
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: 'Please evaluate this response.' },
    ],
    temperature: 0.3,
  })

  return response.choices[0]?.message?.content || ''
}

export function resolveLlmLabel(): string {
  if (deepseek) return process.env.DEEPSEEK_MODEL || 'deepseek-chat'
  if (openai) return 'gpt-4o-mini'
  return 'mock'
}

export async function evaluateResponse(
  transcript: string,
  task: {
    title: string
    cefrLevel: string
    instructions: string
    mission?: MissionEvalContext | null
  }
): Promise<EvaluationResult> {
  const systemPrompt = getSystemPrompt(task)

  let response = ''

  if (deepseek) {
    try {
      response = await callLLM(
        systemPrompt + '\n\nUser Response:\n' + transcript,
        'deepseek'
      )
    } catch (error) {
      console.error('DeepSeek failed, trying OpenAI:', error)
    }
  }

  if (!response && openai) {
    try {
      response = await callLLM(
        systemPrompt + '\n\nUser Response:\n' + transcript,
        'openai'
      )
    } catch (error) {
      console.error('OpenAI also failed:', error)
    }
  }

  if (!response) {
    return getMockEvaluation(task.cefrLevel)
  }

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }

    const parsed = JSON.parse(jsonMatch[0])
    const scores = {
      grammarScore: parsed.grammarScore ?? 50,
      vocabularyScore: parsed.vocabularyScore ?? 50,
      clarityScore: parsed.clarityScore ?? 50,
      coherenceScore: parsed.coherenceScore ?? 50,
      taskCompletionScore: parsed.taskCompletionScore ?? 50,
    }
    const fallbackApa = resolveApaRecommendation(scores)

    return {
      overallScore: parsed.overallScore ?? 50,
      cefrEstimate: parsed.cefrEstimate || task.cefrLevel,
      ...scores,
      strengths: parsed.strengths || [],
      weaknesses: parsed.weaknesses || [],
      corrections: parsed.corrections || [],
      rewrittenAnswer: parsed.rewrittenAnswer || transcript,
      suggestedVocabulary: parsed.suggestedVocabulary || [],
      nextStep: parsed.nextStep || 'Keep practicing!',
      apaPhase:
        normalizeApaPhase(parsed.apaPhase) ??
        normalizeApaPhase(parsed.apaNextStep?.phase) ??
        fallbackApa.apaPhase,
      apaReason:
        parsed.apaReason || parsed.apaNextStep?.reason || fallbackApa.apaReason,
      apaMicroGoal:
        parsed.apaMicroGoal ||
        parsed.apaNextStep?.microGoal ||
        fallbackApa.apaMicroGoal,
    }
  } catch (error) {
    console.error('Error parsing evaluation:', error)
    return getMockEvaluation(task.cefrLevel)
  }
}

export async function voiceChat(
  messages: { role: string; content: string }[],
  audioTranscript: string
): Promise<{ response: string; suggestions?: string[] }> {
  const prompt = `You are a friendly English conversation partner. The user said: "${audioTranscript}"
  
Previous conversation: ${messages.map((m) => `${m.role}: ${m.content}`).join('\n')}

Respond as a conversational English partner. Keep it natural and brief (1-3 sentences).
Also suggest what the user could say next (1-2 suggestions).

Return JSON:
{
  "response": "your response",
  "suggestions": ["suggestion 1", "suggestion 2"]
}`

  let response = ''

  if (deepseek) {
    try {
      response = await callLLM(prompt, 'deepseek')
    } catch (error) {
      console.error('DeepSeek failed:', error)
    }
  }

  if (!response && openai) {
    try {
      response = await callLLM(prompt, 'openai')
    } catch (error) {
      console.error('OpenAI failed:', error)
    }
  }

  if (!response) {
    return {
      response: "That's interesting! Tell me more about that.",
      suggestions: ['What do you think about...?', 'Have you ever tried...?'],
    }
  }

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found')
    return JSON.parse(jsonMatch[0])
  } catch {
    return { response: "Interesting! Could you tell me more?" }
  }
}

export async function evaluateSpeaking(
  audioTranscript: string,
  question: string
): Promise<EvaluationResult> {
  return evaluateResponse(audioTranscript, {
    title: 'Speaking Practice',
    cefrLevel: 'B1',
    instructions: question,
  })
}

function getMockEvaluation(cefrFallback: string): EvaluationResult {
  return {
    overallScore: 75,
    cefrEstimate: cefrFallback || 'B1',
    grammarScore: 80,
    vocabularyScore: 70,
    clarityScore: 75,
    coherenceScore: 72,
    taskCompletionScore: 78,
    strengths: [
      'Good vocabulary range for the level',
      'Clear pronunciation',
      'Well-structured response',
    ],
    weaknesses: [
      'Some grammar issues with verb tenses',
      'Could use more transition words',
    ],
    corrections: [
      { original: 'I go to work yesterday', corrected: 'I went to work yesterday' },
    ],
    rewrittenAnswer:
      'This is a sample rewritten answer that demonstrates improved grammar and vocabulary.',
    suggestedVocabulary: [
      { word: 'furthermore', meaning: 'in addition to what has been said' },
      { word: 'consequently', meaning: 'as a result of something' },
    ],
    nextStep:
      'Focus on practicing past tense verbs and adding transition words to improve coherence.',
    apaPhase: 'practice',
    apaReason:
      'The sample answer has enough base language, but it needs more controlled production.',
    apaMicroGoal:
      'Record the same answer again using at least 3 transition words and correct past tense verbs.',
  }
}
