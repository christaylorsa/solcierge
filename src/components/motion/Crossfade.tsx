'use client'

import { useEffect, useRef, useState } from 'react'

export type CrossfadeImage = { src: string; alt: string }

type Props = {
  images: CrossfadeImage[]
  width: number
  height: number
  /** Milliseconds each frame holds. */
  interval?: number
  /** Offsets this instance's cycle so a grid of them never beats in unison. */
  startDelay?: number
  className?: string
  imageClassName?: string
}

/**
 * Stacked images that dissolve into one another.
 *
 * Three details do the work: explicit width and height on every frame so nothing
 * shifts as they load, a symmetric ease-in-out (a fade using the site's --ease
 * curve looks lopsided), and its own observer that stops the timer whenever the
 * carousel is off-screen.
 */
export function Crossfade({
  images,
  width,
  height,
  interval = 5200,
  startDelay = 0,
  className = '',
  imageClassName = '',
}: Props) {
  const [index, setIndex] = useState(0)
  const hostRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (images.length < 2) return
    const host = hostRef.current
    if (!host) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let timer: ReturnType<typeof setInterval> | null = null
    let kickoff: ReturnType<typeof setTimeout> | null = null

    const start = () => {
      if (timer) return
      kickoff = setTimeout(() => {
        kickoff = null
        setIndex((current) => (current + 1) % images.length)
        timer = setInterval(() => setIndex((current) => (current + 1) % images.length), interval)
      }, startDelay + interval)
    }

    const stop = () => {
      if (timer) clearInterval(timer)
      if (kickoff) clearTimeout(kickoff)
      timer = null
      kickoff = null
    }

    const io = new IntersectionObserver(
      ([entry]) => (entry?.isIntersecting ? start() : stop()),
      { threshold: 0.2 },
    )
    io.observe(host)

    return () => {
      io.disconnect()
      stop()
    }
  }, [images.length, interval, startDelay])

  return (
    <div ref={hostRef} className={`relative overflow-hidden ${className}`}>
      {images.map((image, i) => (
        <img
          key={image.src}
          src={image.src}
          alt={i === 0 ? image.alt : ''}
          width={width}
          height={height}
          loading={i === 0 ? 'eager' : 'lazy'}
          decoding="async"
          aria-hidden={i === 0 ? undefined : true}
          className={`crossfade ${i === index ? 'active' : ''} ${imageClassName}`}
        />
      ))}
    </div>
  )
}
