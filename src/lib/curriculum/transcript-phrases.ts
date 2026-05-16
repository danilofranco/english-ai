/** Light-touch checks — do not pretend to be NLU; mark uncertain when weak signal. */

export type PhraseSignal = 'detected' | 'missing' | 'uncertain'

export interface ElementCheck {
  label: string
  status: PhraseSignal
  matchedHint?: string
}

export function analyzeRequiredElements(
  transcript: string,
  requiredElements: string[]
): ElementCheck[] {
  const t = transcript.toLowerCase()
  return requiredElements.map((label) => {
    const norm = label.toLowerCase().trim()
    const words = norm.split(/\s+/).filter((w) => w.length > 2)

    if (t.includes(norm)) {
      return { label, status: 'detected' as const, matchedHint: norm }
    }

    const hits = words.filter((w) => t.includes(w))
    if (hits.length >= Math.ceil(words.length * 0.6) && words.length > 0) {
      return {
        label,
        status: 'uncertain' as const,
        matchedHint: hits.slice(0, 3).join(', '),
      }
    }

    if (words.some((w) => t.includes(w))) {
      return { label, status: 'uncertain' as const }
    }

    return { label, status: 'missing' as const }
  })
}

export interface PhraseUseCheck {
  phrase: string
  status: PhraseSignal
}

export function analyzeUsefulPhrases(
  transcript: string,
  phrases: string[],
  maxChecks = 8
): PhraseUseCheck[] {
  const t = transcript.toLowerCase()
  const slice = phrases.slice(0, maxChecks)
  return slice.map((phrase) => {
    const p = phrase.toLowerCase().replace(/…/g, ' ').trim()
    const stem = p.replace(/\.+$/, '').trim()
    const key = stem.replace(/^i['']?m\s+/i, '').slice(0, 24)
    if (stem.length < 4) return { phrase, status: 'uncertain' as const }
    if (t.includes(stem) || (key.length > 4 && t.includes(key))) {
      return { phrase, status: 'detected' as const }
    }
    return { phrase, status: 'missing' as const }
  })
}
