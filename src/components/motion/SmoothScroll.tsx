'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Lenis from 'lenis'

/**
 * Inertial smooth scroll.
 *
 * Lenis drives the native scroll position rather than transforming a wrapper, so
 * everything already built on top of scrolling keeps working: the IntersectionObserver
 * reveals still fire, `position: sticky` still sticks, and Framer's useScroll still
 * reads real offsets.
 *
 * Deliberately restrained settings. The default Lenis feel is a long, floaty glide
 * that fights the reader; lerp 0.09 gives about a quarter second of weight, which
 * reads as a heavy door closing rather than as ice.
 *
 * Off entirely for prefers-reduced-motion (hijacked scrolling is a genuine
 * accessibility and motion-sickness problem, not a decorative effect) and off on
 * touch, where the platform's own momentum is better than anything we can fake.
 */
export function SmoothScroll() {
  const pathname = usePathname()

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const lenis = new Lenis({
      lerp: 0.09,
      wheelMultiplier: 0.9,
      // The platform already does this better on touch.
      syncTouch: false,
      touchMultiplier: 1,
    })

    let frame = 0
    const raf = (time: number) => {
      lenis.raf(time)
      frame = requestAnimationFrame(raf)
    }
    frame = requestAnimationFrame(raf)

    // In-page anchors have to go through Lenis, or the browser's instant jump fights it.
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest('a[href*="#"]')
      if (!(anchor instanceof HTMLAnchorElement)) return

      const url = new URL(anchor.href, window.location.href)
      if (url.pathname !== window.location.pathname || !url.hash) return

      const target = document.querySelector(url.hash)
      if (!target) return

      event.preventDefault()
      // Matches html { scroll-padding-top } so the heading clears the fixed header.
      lenis.scrollTo(target as HTMLElement, { offset: -96, duration: 1.1 })
      history.pushState(null, '', url.hash)
    }

    document.addEventListener('click', onClick)

    return () => {
      document.removeEventListener('click', onClick)
      cancelAnimationFrame(frame)
      lenis.destroy()
    }
  }, [])

  // A client-side route change must reset scroll itself, since Lenis owns the position.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}
