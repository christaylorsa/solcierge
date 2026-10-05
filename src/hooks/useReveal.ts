'use client'

import { useEffect, useRef } from 'react'

/**
 * One IntersectionObserver for the entire site.
 *
 * Every scroll animation, fade-ups, staggered headlines, drawing dividers, is a CSS
 * end-state keyed off the `.in-view` class this adds. Elements are unobserved once
 * revealed, so nothing accumulates as the page grows.
 */
let shared: IntersectionObserver | null = null

function observer(): IntersectionObserver | null {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return null
  if (shared) return shared

  shared = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('in-view')
        shared?.unobserve(entry.target)
      }
    },
    { threshold: 0.15, rootMargin: '0px 0px -60px 0px' },
  )
  return shared
}

export function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const io = observer()
    if (!io) {
      // No observer support: show the content rather than leaving it invisible.
      element.classList.add('in-view')
      return
    }

    io.observe(element)
    return () => io.unobserve(element)
  }, [])

  return ref
}
