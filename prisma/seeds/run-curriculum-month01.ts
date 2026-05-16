/**
 * Run: npx tsx prisma/seeds/run-curriculum-month01.ts
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { seedMonth01ProfessionalFoundation } from './seed-curriculum-month-01'

const prisma = new PrismaClient()

function assertGeneratedClientHasCurriculumDelegates(client: PrismaClient): void {
  const curriculumMonth = Reflect.get(client, 'curriculumMonth') as { upsert?: unknown } | undefined
  const curriculumMission = Reflect.get(client, 'curriculumMission') as { upsert?: unknown } | undefined

  if (typeof curriculumMonth?.upsert !== 'function') {
    console.error(
      '[db:seed:month01] Client Prisma sem delegate `curriculumMonth` (geração desatualizada ou schema antigo).\n' +
        'Corre: `npx prisma migrate deploy` (ou `migrate dev`), depois `npx prisma generate`.'
    )
    process.exit(1)
  }

  if (typeof curriculumMission?.upsert !== 'function') {
    console.error('[db:seed:month01] Delegate `curriculumMission` em falta — mesmo procedimento que acima.')
    process.exit(1)
  }
}

async function main() {
  assertGeneratedClientHasCurriculumDelegates(prisma)
  await seedMonth01ProfessionalFoundation(prisma)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
