import { Prisma } from '@prisma/client'

/** P2021 = table does not exist (migration not applied). */
export function isPrismaMissingTableError(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2021'
}
