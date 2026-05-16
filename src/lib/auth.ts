import NextAuth, { DefaultSession, NextAuthOptions, User } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { prisma } from '@/lib/db'
import type { SessionStrategy } from 'next-auth'
import type { JWT } from 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      levelId: string | null
      xp: number
      streak: number
    } & DefaultSession['user']
  }

  interface User {
    levelId?: string | null
    xp: number
    streak: number
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    levelId: string | null
    xp: number
    streak: number
  }
}

type RawCredentials =
  | Record<'email' | 'password', string>
  | (Record<'email' | 'password', string> & { mode?: string })
  | undefined

const authorizeFn = async (
  credentials: RawCredentials
): Promise<User | null> => {
  const c = credentials as Record<string, string> | undefined
  const soloEnabled = process.env.SOLO_AUTO_LOGIN === 'true'
  const soloRequest = soloEnabled && c?.mode === 'solo'

  if (soloRequest) {
    const fixedEmail = process.env.SOLO_LOGIN_EMAIL?.trim()
    const user = fixedEmail
      ? await prisma.user.findUnique({
          where: { email: fixedEmail },
        })
      : await prisma.user.findFirst({
          orderBy: { createdAt: 'asc' },
        })

    if (!user) {
      console.warn('[auth] SOLO_AUTO_LOGIN: nenhum utilizador encontrado')
      return null
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      levelId: user.levelId,
      xp: user.xp,
      streak: user.streak,
    }
  }

  if (!credentials?.email || !credentials?.password) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { email: credentials.email },
  })

  if (!user) {
    return null
  }

  const isPasswordValid = await compare(
    credentials.password,
    user.password
  )

  if (!isPasswordValid) {
    return null
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    levelId: user.levelId,
    xp: user.xp,
    streak: user.streak,
  }
}

const nextAuthOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        mode: { label: 'Mode', type: 'hidden' },
      },
      authorize: authorizeFn as (
        credentials: Record<string, string> | undefined
      ) => Promise<User | null>,
    }),
  ],
  session: {
    strategy: 'jwt' as SessionStrategy,
    maxAge: 365 * 24 * 60 * 60, // 1 year — uso pessoal; reduz prompts de login
  },
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        token.id = user.id
        token.levelId = user.levelId ?? null
        token.xp = user.xp
        token.streak = user.streak
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id
        session.user.levelId = token.levelId ?? null
        session.user.xp = token.xp
        session.user.streak = token.streak
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
}

import { getServerSession as nextAuthGetServerSession } from 'next-auth/next'

export default NextAuth(nextAuthOptions)
export { nextAuthOptions }
export const getServerSession = (opts: NextAuthOptions = nextAuthOptions) =>
  nextAuthGetServerSession(opts)