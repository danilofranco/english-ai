import { NextResponse } from 'next/server'

/**
 * Liga auto-login apenas no servidor (<code>SOLO_AUTO_LOGIN</code> não vai para o cliente).
 */
export async function GET() {
  const enabled = process.env.SOLO_AUTO_LOGIN === 'true'
  return NextResponse.json(
    { enabled },
    {
      headers: {
        // evita caches agressivas entre toggles de env
        'Cache-Control': 'private, max-age=0, must-revalidate',
      },
    }
  )
}
