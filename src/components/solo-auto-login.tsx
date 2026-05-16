'use client'

import { signIn, useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'

/**
 * Se SOLO_AUTO_LOGIN=true no servidor, ao carregar páginas com sessão inválida
 * faz sign-in Credentials com mode=solo (sem password na rede).
 *
 * ⚠️ Só usar em uso pessoal / local. Remove ou define SOLO_AUTO_LOGIN≠true em hosts públicos.
 */
export default function SoloAutoLogin() {
  const { status } = useSession()
  const params = useSearchParams()
  const tried = useRef(false)

  useEffect(() => {
    if (status !== 'unauthenticated' || tried.current) return
    tried.current = true

    void (async () => {
      try {
        const res = await fetch('/api/auth/solo-status')
        const data = (await res.json()) as { enabled?: boolean }
        if (!data.enabled) return

        const rawCallback = params.get('callbackUrl') ?? params.get('from')
        const callbackUrl =
          rawCallback?.startsWith('/') && !rawCallback.startsWith('//')
            ? rawCallback
            : '/dashboard'

        const result = await signIn('credentials', {
          mode: 'solo',
          email: '_solo',
          password: '_solo',
          redirect: false,
          callbackUrl,
        })

        if (result?.error) {
          console.warn('[solo-auto-login]', result.error)
          return
        }

        window.location.href = callbackUrl.startsWith('/') ? callbackUrl : '/dashboard'
      } catch (e) {
        console.warn('[solo-auto-login]', e)
      }
    })()
  }, [status, params])

  return null
}
