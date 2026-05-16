import { readFileSync } from 'fs'
import { join } from 'path'
import { month01PackSchema, type Month01Pack } from './month01-types'

/** Canonical curriculum content: content/curriculum/month-01-professional-foundation.json */
export function loadMonth01ProfessionalFoundation(): Month01Pack {
  const p = join(
    process.cwd(),
    'content',
    'curriculum',
    'month-01-professional-foundation.json'
  )
  const raw = readFileSync(p, 'utf-8')
  const json = JSON.parse(raw)
  return month01PackSchema.parse(json)
}
