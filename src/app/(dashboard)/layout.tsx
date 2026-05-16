'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const nav = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/practice', label: 'Practice' },
  { href: '/reviews', label: 'Reviews' },
  { href: '/progress', label: 'Progress' },
  { href: '/library', label: 'Library' },
  { href: '/levels', label: 'Levels' },
]

export default function DashboardShellLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <Link href="/dashboard" className="text-xl font-bold text-primary">
            English AI
          </Link>
          <nav className="flex flex-wrap gap-1">
            {nav.map((n) => {
              const active =
                n.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname === n.href || pathname.startsWith(n.href + '/')
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`btn btn-ghost text-sm ${active ? 'bg-muted font-medium' : ''}`}
                >
                  {n.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </header>
      {children}
    </div>
  )
}
