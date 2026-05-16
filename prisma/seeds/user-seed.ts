import { hash } from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await hash('demo123', 10)
  
  const user = await prisma.user.upsert({
    where: { email: 'demo@english.ai' },
    update: {},
    create: {
      email: 'demo@english.ai',
      name: 'Demo User',
      password: hashedPassword,
      streak: 3,
      xp: 150,
    },
  })

  console.log('Created demo user:', user.email)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })