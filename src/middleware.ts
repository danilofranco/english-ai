import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware() {
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/practice/:path*',
    '/levels/:path*',
    '/library/:path*',
    '/history/:path*',
    '/reviews/:path*',
    '/progress/:path*',
    '/paths/:path*',
    '/lesson/:path*',
    '/chat/:path*',
    '/api/content/file',
    '/api/attempts',
    '/api/attempts/:path*',
    '/api/evaluate',
    '/api/transcribe',
    '/api/evaluations',
    '/api/curriculum/:path*',
    '/api/progress',
    '/api/progress/:path*',
    '/api/reviews',
    '/api/reviews/:path*',
    '/api/tasks',
    '/api/tasks/:path*',
  ],
}
