import { prisma } from '@/lib/db'

export async function refreshUserProgressSnapshot(userId: string) {
  const attempts = await prisma.attempt.findMany({
    where: { userId, status: 'evaluated' },
    include: {
      practiceTask: { include: { cefrLevel: true } },
      evaluation: true,
    },
  })

  const evaluations = attempts
    .map((a) => a.evaluation)
    .filter((e): e is NonNullable<typeof e> => e != null)

  const totalMinutes = Math.round(
    attempts.reduce((s, a) => s + (a.durationSec || 0), 0) / 60
  )

  const lastEst =
    evaluations.length > 0
      ? evaluations.sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        )[0].estimatedCefr
      : null

  await prisma.userProgressSnapshot.upsert({
    where: { userId },
    create: {
      userId,
      estimatedOverallLevel: lastEst,
      totalPracticeMinutes: totalMinutes,
      totalAttempts: attempts.length,
      weeklyConsistency: 0,
    },
    update: {
      estimatedOverallLevel: lastEst,
      totalPracticeMinutes: totalMinutes,
      totalAttempts: attempts.length,
    },
  })
}
