'use client'

import { SessionProvider } from 'next-auth/react'
import { ReactNode, Suspense } from 'react'
import SoloAutoLogin from '@/components/solo-auto-login'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <Suspense fallback={null}>
        <SoloAutoLogin />
      </Suspense>
      {children}
    </SessionProvider>
  )
}
