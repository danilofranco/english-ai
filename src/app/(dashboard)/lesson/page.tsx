'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Legacy route — product is path/library/practice driven, not “lessons”. */
export default function LessonRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/library')
  }, [router])
  return (
    <div className="min-h-[30vh] flex items-center justify-center text-muted-foreground">
      Redirecting to library…
    </div>
  )
}
