'use client'

import { useEffect, useRef, useState } from 'react'
import { useMotionAllowed } from '@/hooks/useMotionAllowed'

/**
 * The hero's moving backplate.
 *
 * A 20s loop of four crossfaded clips, cut and encoded offline rather than sequenced in
 * the browser. Baking the transitions into one file means one request, no JS timing, and
 * transitions that cannot judder no matter what the main thread is doing.
 *
 * The poster is not a placeholder, it is the mobile and reduced-motion answer:
 *
 *   - Reduced motion gets the still, always. An autoplaying background is exactly the
 *     kind of ambient movement that setting exists to stop.
 *   - Coarse pointers get the still too. 1.9MB of video on a phone connection buys a
 *     texture nobody asked for, and it is the first thing to cut for speed.
 *   - Everyone else gets the video, but only after it can actually play. It mounts at
 *     opacity 0 over the poster and fades up on `canplay`, so a slow connection shows a
 *     handsome still rather than a black rectangle.
 *
 * The video is decorative, so it carries no accessible name and is hidden from the
 * tree entirely. Nothing in it conveys information that is not in the copy.
 *
 * Neither the video nor the poster carries the .photo class the site's photographs use:
 * the grade is baked into the file by scripts/build-hero-video.sh, because four clips
 * shot on different days need individual correction that one uniform CSS filter cannot
 * provide. Adding .photo here would grade it twice.
 */
export function HeroVideo({ className = '' }: { className?: string }) {
  const { reduced, precise, ready } = useMotionAllowed()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [playing, setPlaying] = useState(false)

  // Video only on a precise pointer (a proxy for "not a phone") with motion allowed.
  const wantsVideo = ready && precise && !reduced

  useEffect(() => {
    const video = videoRef.current
    if (!video || !wantsVideo) return

    const onReady = () => setPlaying(true)
    video.addEventListener('canplay', onReady)

    // Some browsers refuse autoplay even muted; the poster stays up in that case.
    const attempt = video.play()
    if (attempt) attempt.catch(() => setPlaying(false))

    return () => video.removeEventListener('canplay', onReady)
  }, [wantsVideo])

  // Stop decoding while the tab is in the background. No visual cost, real battery cost.
  useEffect(() => {
    if (!wantsVideo) return
    const onVisibility = () => {
      const video = videoRef.current
      if (!video) return
      if (document.hidden) video.pause()
      else void video.play().catch(() => {})
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [wantsVideo])

  return (
    <div className={`absolute inset-0 ${className}`} aria-hidden="true">
      <img
        src="/media/hero-poster.jpg"
        alt=""
        width={1600}
        height={900}
        fetchPriority="high"
        className="absolute inset-0 h-full w-full object-cover"
      />

      {wantsVideo ? (
        <video
          ref={videoRef}
          muted
          loop
          playsInline
          preload="auto"
          poster="/media/hero-poster.jpg"
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ease-[var(--ease-soft)]"
          style={{ opacity: playing ? 1 : 0 }}
        >
          <source src="/media/hero.mp4" type="video/mp4" />
        </video>
      ) : null}
    </div>
  )
}
