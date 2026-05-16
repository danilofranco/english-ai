import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import { practiceTasks } from './practice-tasks'
import { seedMonth01ProfessionalFoundation } from './seed-curriculum-month-01'

const prisma = new PrismaClient()

const LEVELS = [
  {
    code: 'A1',
    title: 'A1 — Beginner',
    description: 'Can understand and use familiar everyday expressions.',
    expectedCapabilities: '- Basic personal details\n- Simple questions when spoken slowly',
    expectedSkills: 'listening:basic|speaking:basic|reading:basic|writing:minimal',
    order: 1,
  },
  {
    code: 'A2',
    title: 'A2 — Elementary',
    description: 'Can communicate in simple routine tasks.',
    expectedCapabilities: '- Simple direct exchange of information\n- Short descriptions of background and environment',
    expectedSkills: 'listening:elementary|speaking:elementary|reading:simple|writing:short',
    order: 2,
  },
  {
    code: 'B1',
    title: 'B1 — Intermediate',
    description: 'Can deal with most travel situations and describe experiences.',
    expectedCapabilities: '- Main points of familiar matters\n- Simple connected text on topics of personal interest',
    expectedSkills: 'listening:standard|speaking:connected|reading:general|writing:simple',
    order: 3,
  },
  {
    code: 'B2',
    title: 'B2 — Upper intermediate',
    description: 'Can interact with fluency and spontaneity with native speakers.',
    expectedCapabilities: '- Detailed text on wide range of subjects\n- Advantages and disadvantages of topical issues',
    expectedSkills: 'listening:complex|speaking:fluent|reading:detailed|writing:structured',
    order: 4,
  },
  {
    code: 'C1',
    title: 'C1 — Advanced',
    description: 'Can use language flexibly and effectively for social and professional purposes.',
    expectedCapabilities: '- Implicit meaning\n- Well-structured detailed text on complex subjects',
    expectedSkills: 'listening:native-like|speaking:precise|reading:sophisticated|writing:professional',
    order: 5,
  },
  {
    code: 'C2',
    title: 'C2 — Proficient',
    description: 'Can understand virtually everything heard or read.',
    expectedCapabilities: '- Summarise information from different sources\n- Reconstruct arguments coherently',
    expectedSkills: 'listening:full|speaking:nuanced|reading:any|writing:any',
    order: 6,
  },
] as const

/** Curated tasks from product spec (two per band) */
const SPEC_FOCUS = [
  {
    title: 'Introduce yourself',
    description: 'Basic self-presentation',
    instructions:
      'Introduce yourself clearly: name, where you live, what you do, and one hobby. 60–90 seconds.',
    cefrLevel: 'A1',
    skillType: 'speaking',
    category: 'general-fluency',
    estimatedDurationSec: 90,
  },
  {
    title: 'Talk about your routine',
    description: 'Daily habits',
    instructions:
      'Describe a typical day: morning to evening. Use simple time expressions and connectors.',
    cefrLevel: 'A1',
    skillType: 'speaking',
    category: 'general-fluency',
    estimatedDurationSec: 90,
  },
  {
    title: 'Describe your last weekend',
    description: 'Past events',
    instructions:
      'Talk about what you did last weekend: places, people, and how you felt.',
    cefrLevel: 'A2',
    skillType: 'speaking',
    category: 'general-fluency',
    estimatedDurationSec: 120,
  },
  {
    title: 'Talk about something you like',
    description: 'Preferences',
    instructions:
      'Explain something you enjoy (sport, book, hobby). Say why and give one example.',
    cefrLevel: 'A2',
    skillType: 'speaking',
    category: 'general-fluency',
    estimatedDurationSec: 120,
  },
  {
    title: 'Describe your current job',
    description: 'Work context',
    instructions:
      'Describe your role, team, and one responsibility. Aim for 2 minutes.',
    cefrLevel: 'B1',
    skillType: 'speaking',
    category: 'career',
    estimatedDurationSec: 180,
  },
  {
    title: 'Explain a simple challenge you solved',
    description: 'Problem / solution',
    instructions:
      'Describe a small problem at work or study and how you solved it: context, action, result.',
    cefrLevel: 'B1',
    skillType: 'speaking',
    category: 'career',
    estimatedDurationSec: 180,
  },
  {
    title: 'Explain a project you led',
    description: 'Ownership narrative',
    instructions:
      'Walk through a project you led: goal, stakeholders, trade-offs, outcome.',
    cefrLevel: 'B2',
    skillType: 'speaking',
    category: 'career',
    estimatedDurationSec: 180,
  },
  {
    title: 'Defend a decision you made',
    description: 'Justification',
    instructions:
      'Pick a real decision. Explain options considered, your choice, and risks you accepted.',
    cefrLevel: 'B2',
    skillType: 'speaking',
    category: 'career',
    estimatedDurationSec: 180,
  },
  {
    title: 'Present a product strategy',
    description: 'Strategic pitch',
    instructions:
      'Outline a product strategy: user problem, vision, metrics, and next bets.',
    cefrLevel: 'C1',
    skillType: 'speaking',
    category: 'product-tech',
    estimatedDurationSec: 240,
  },
  {
    title: 'Explain trade-offs in a complex decision',
    description: 'Analytical speaking',
    instructions:
      'Discuss a complex decision with multiple stakeholders. Make trade-offs explicit.',
    cefrLevel: 'C1',
    skillType: 'speaking',
    category: 'product-tech',
    estimatedDurationSec: 240,
  },
  {
    title: 'Argue for a strategic change',
    description: 'Persuasion',
    instructions:
      'Make a concise case for a strategic change in an organisation: rationale, risks, rollout.',
    cefrLevel: 'C2',
    skillType: 'speaking',
    category: 'career',
    estimatedDurationSec: 240,
  },
  {
    title: 'Give a nuanced opinion on a professional topic',
    description: 'Precision and tone',
    instructions:
      'Take a stance on a professional topic. Acknowledge counterarguments and qualify your view.',
    cefrLevel: 'C2',
    skillType: 'speaking',
    category: 'content-reflection',
    estimatedDurationSec: 240,
  },
] as const

function mapScenario(category: string): string {
  const c = category.toLowerCase()
  if (c.includes('career')) return 'career'
  if (c.includes('product') || c.includes('tech')) return 'product_tech'
  if (c.includes('reflection') || c.includes('content')) return 'content_reflection'
  return 'general_fluency'
}

function normalizeCategory(cat: string): string {
  return cat.replace(/-/g, '_').toLowerCase()
}

async function main() {
  console.log('Seeding CEFR levels…')
  for (const L of LEVELS) {
    await prisma.level.upsert({
      where: { code: L.code },
      create: { ...L },
      update: {
        title: L.title,
        description: L.description,
        expectedCapabilities: L.expectedCapabilities,
        expectedSkills: L.expectedSkills,
        order: L.order,
      },
    })
  }

  const levelsByCode = Object.fromEntries(
    (await prisma.level.findMany()).map((l) => [l.code, l])
  ) as Record<string, { id: string; code: string }>

  console.log('Seeding learning content placeholders…')
  for (const L of LEVELS) {
    const lev = levelsByCode[L.code]
    await prisma.learningContent.upsert({
      where: { localPath: `content/${L.code}/.library-placeholder` },
      create: {
        title: `Local library — ${L.code}`,
        description: 'Add your files under content/; run npm run content:sync',
        type: 'text',
        localPath: `content/${L.code}/.library-placeholder`,
        folderPath: L.code,
        cefrLevelId: lev.id,
        skillType: 'reading',
        topic: 'library',
        source: 'local',
        sourceType: 'folder',
        tags: '[]',
        difficulty: 'unspecified',
        estimatedMinutes: 15,
      },
      update: {
        cefrLevelId: lev.id,
        folderPath: L.code,
      },
    })
  }

  const inbox = await prisma.learningContent.upsert({
    where: { localPath: 'content/inbox/.inbox-placeholder' },
    create: {
      title: 'Inbox — unclassified',
      description: 'Drop files here before sorting by CEFR level.',
      type: 'text',
      localPath: 'content/inbox/.inbox-placeholder',
      folderPath: 'inbox',
      skillType: 'mixed',
      topic: 'inbox',
      source: 'local',
      sourceType: 'inbox',
      tags: '[]',
    },
    update: { folderPath: 'inbox' },
  })

  console.log('Seeding practice tasks…')
  const seen = new Set<string>()
  let order = 0

  type RawTask = {
    title: string
    description: string
    instructions: string
    cefrLevel: string
    skillType: string
    category: string
    estimatedDurationSec: number
  }
  const combined: RawTask[] = [...SPEC_FOCUS, ...practiceTasks] as RawTask[]

  for (const raw of combined) {
    const titleKey = raw.title.trim().toLowerCase()
    if (seen.has(titleKey)) continue
    seen.add(titleKey)

    const lev = levelsByCode[raw.cefrLevel]
    if (!lev) {
      console.warn('Skip task, unknown level', raw.cefrLevel, raw.title)
      continue
    }

    const skill =
      'skillType' in raw && raw.skillType === 'fluency'
        ? 'speaking'
        : raw.skillType || 'speaking'

    await prisma.practiceTask.create({
      data: {
        title: raw.title,
        description: raw.description,
        instructions: raw.instructions,
        cefrLevelId: lev.id,
        skillType: skill,
        scenarioType: mapScenario(raw.category),
        category: normalizeCategory(raw.category),
        estimatedDurationSec: raw.estimatedDurationSec,
        orderIndex: order++,
        evaluationRubric: null,
        promptTemplate: null,
      },
    })
  }

  console.log('Linking sample content ↔ tasks…')
  const tasks = await prisma.practiceTask.findMany({
    include: { cefrLevel: true },
  })
  const contents = await prisma.learningContent.findMany({
    where: { NOT: { id: inbox.id } },
  })

  for (const t of tasks) {
    const match = contents.find((c) => c.cefrLevelId === t.cefrLevelId)
    if (match) {
      await prisma.practiceTaskContent
        .create({
          data: {
            practiceTaskId: t.id,
            learningContentId: match.id,
          },
        })
        .catch(() => {})
    }
  }

  console.log('Seeding example learning paths…')
  for (const code of ['A1', 'B1'] as const) {
    const lev = levelsByCode[code]
    const path = await prisma.learningPath.create({
      data: {
        title: `${code}: study → practise → retry`,
        description: 'Consume one local item, then speak, then review feedback.',
        levelId: lev.id,
      },
    })
    const lc = contents.find((c) => c.cefrLevelId === lev.id)
    const pt = tasks.find((t) => t.cefrLevelId === lev.id)
    if (lc && pt) {
      await prisma.learningPathStep.createMany({
        data: [
          {
            learningPathId: path.id,
            stepType: 'content',
            referenceId: lc.id,
            order: 0,
          },
          {
            learningPathId: path.id,
            stepType: 'practice',
            referenceId: pt.id,
            order: 1,
          },
          {
            learningPathId: path.id,
            stepType: 'review',
            referenceId: pt.id,
            order: 2,
          },
        ],
      })
    }
  }

  console.log('Seeding demo user…')
  const hashedPassword = await hash('demo123', 10)
  const a1 = levelsByCode['A1']
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@english.ai' },
    update: { levelId: a1.id },
    create: {
      email: 'demo@english.ai',
      name: 'Demo User',
      password: hashedPassword,
      streak: 3,
      xp: 150,
      levelId: a1.id,
    },
  })

  await prisma.userProgressSnapshot.upsert({
    where: { userId: demoUser.id },
    create: {
      userId: demoUser.id,
      estimatedOverallLevel: 'A2',
      totalPracticeMinutes: 0,
      totalAttempts: 0,
    },
    update: {},
  })

  console.log('Seeding Month 01 curriculum...')
  await seedMonth01ProfessionalFoundation(prisma)

  console.log('Done.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
