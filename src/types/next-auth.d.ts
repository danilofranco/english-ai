import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      levelId: string | null
      xp: number
      streak: number
    }
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
