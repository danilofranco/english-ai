import { NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, name } = registerSchema.parse(body)

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      )
    }

    const hashedPassword = await hash(password, 12)

    const defaultLevel = await prisma.level.findUnique({ where: { code: 'A1' } })

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        levelId: defaultLevel?.id ?? undefined,
      },
    })

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Dados de cadastro inválidos" },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
