'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ConnectButton } from '@/components/auth/ConnectButton'
import { CATEGORIES } from '@/lib/categories'

const NAV = [
  { href: '/request', label: 'Request' },
  { href: '/#how', label: 'How it works' },
  { href: '/#pay', label: 'Paying in crypto' },
  { href: '/account', label: 'My bookings' },
]

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // A route change should never leave the drawer hanging open.
  useEffect(() => setMenuOpen(false), [pathname])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setMenuOpen(false)
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-500 ease ${
        scrolled || menuOpen ? 'border-b border-line bg-bg/85 backdrop-blur-xl' : 'border-b border-transparent'
      }`}
    >
      <div className="mx-auto flex h-[72px] max-w-shell items-center justify-between px-[var(--shell-x)]">
        <Link href="/" className="group flex items-baseline gap-2.5" aria-label="Solcierge home">
          <span className="display text-2xl text-ink">Solcierge</span>
          <span className="hidden text-[0.5625rem] tracking-label uppercase text-faint transition-colors duration-500 ease group-hover:text-accent sm:inline">
            Est. 2026
          </span>
        </Link>

        <nav className="hidden items-center gap-9 lg:flex" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[0.8125rem] tracking-wide text-muted transition-colors duration-400 ease hover:text-accent-soft"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <ConnectButton compact />
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            className="flex h-10 w-10 flex-col items-center justify-center gap-[5px] lg:hidden"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            <span
              className={`block h-[1px] w-5 bg-ink transition-transform duration-400 ease ${
                menuOpen ? 'translate-y-[6px] rotate-45' : ''
              }`}
            />
            <span
              className={`block h-[1px] w-5 bg-ink transition-opacity duration-300 ease ${
                menuOpen ? 'opacity-0' : ''
              }`}
            />
            <span
              className={`block h-[1px] w-5 bg-ink transition-transform duration-400 ease ${
                menuOpen ? '-translate-y-[6px] -rotate-45' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="max-h-[calc(100dvh-72px)] overflow-y-auto border-t border-line bg-bg px-[var(--shell-x)] pb-10 pt-6 lg:hidden">
          <nav className="flex flex-col" aria-label="Mobile">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="border-b border-line py-4 text-base text-ink transition-colors duration-300 ease hover:text-accent-soft"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <p className="eyebrow mt-8">Categories</p>
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3">
            {CATEGORIES.map((category) => (
              <Link
                key={category.slug}
                href={`/request/${category.slug}`}
                className="text-sm text-muted transition-colors duration-300 ease hover:text-accent-soft"
              >
                {category.name}
              </Link>
            ))}
          </div>

          <div className="mt-8 sm:hidden">
            <ConnectButton />
          </div>
        </div>
      ) : null}
    </header>
  )
}
