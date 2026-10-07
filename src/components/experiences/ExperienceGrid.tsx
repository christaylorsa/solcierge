import Link from 'next/link'
import { Stagger } from '@/components/motion/Reveal'
import { Tilt } from '@/components/motion/Magnetic'
import { trailingSpan, type Experience } from '@/lib/experiences'

/**
 * Experiences as tall photographic cards, the copy laid over the image rather than
 * under it, so they read as places to go rather than services to order. Same hover
 * gesture as the category tiles (the `.card-*` rules in globals.css).
 *
 * The bottom row is always full: when the count does not divide into the columns,
 * the last card widens to fill the gap (see trailingSpan), at two columns and three.
 */
export function ExperienceGrid({ experiences, className = '' }: { experiences: Experience[]; className?: string }) {
  const sm = trailingSpan(experiences.length, 2)
  const lg = trailingSpan(experiences.length, 3)

  return (
    <Stagger className={`grid gap-5 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {experiences.map((experience, index) => {
        const last = index === experiences.length - 1
        return (
          <Tilt key={experience.slug} className={last ? SPAN[`${sm}-${lg}`] : ''} max={last && lg > 1 ? 2 : 4}>
            <ExperienceCard experience={experience} shape={last ? SHAPE[`${sm}-${lg}`] : SHAPE['1-1']} />
          </Tilt>
        )
      })}
    </Stagger>
  )
}

/*
 * Written out in full so Tailwind sees every class. Keyed "<span at two columns>-<span
 * at three>". A wide card keeps the row height of its neighbours: one column is 3/4,
 * two columns 3/2, three columns 9/4.
 */
const SPAN: Record<string, string> = {
  '1-1': '',
  '1-2': 'lg:col-span-2',
  '1-3': 'lg:col-span-3',
  '2-1': 'sm:col-span-2 lg:col-span-1',
  '2-2': 'sm:col-span-2',
  '2-3': 'sm:col-span-2 lg:col-span-3',
}
const SHAPE: Record<string, string> = {
  '1-1': 'sm:aspect-[3/4]',
  '1-2': 'sm:aspect-[3/4] lg:aspect-[3/2]',
  '1-3': 'sm:aspect-[3/4] lg:aspect-[9/4]',
  '2-1': 'sm:aspect-[3/2] lg:aspect-[3/4]',
  '2-2': 'sm:aspect-[3/2]',
  '2-3': 'sm:aspect-[3/2] lg:aspect-[9/4]',
}

export function ExperienceCard({ experience, shape = SHAPE['1-1'] }: { experience: Experience; shape?: string }) {
  return (
    <Link
      href={`/experiences/${experience.slug}`}
      className={`card group relative isolate flex aspect-[4/5] flex-col justify-end overflow-hidden border border-line bg-bg ${shape}`}
    >
      <img
        src={experience.image}
        alt={experience.imageAlt}
        width={1920}
        height={1200}
        loading="lazy"
        decoding="async"
        className="photo card-media absolute inset-0 -z-10 h-full w-full object-cover"
        style={{ objectPosition: experience.focus }}
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-bg via-bg/65 to-bg/0" aria-hidden="true" />
      <div
        className="card-scrim absolute inset-0 -z-10 bg-gradient-to-t from-bg via-bg/60 to-transparent"
        aria-hidden="true"
      />

      <div className="p-6">
        <p className="eyebrow flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          {experience.place}
          {experience.homeGround ? (
            <span className="whitespace-nowrap border border-accent/40 px-1.5 py-0.5 text-[0.5625rem] text-accent-soft">Home ground</span>
          ) : null}
        </p>
        <h3 className="card-title display mt-3 text-[1.75rem] leading-tight text-ink">{experience.name}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{experience.tagline}</p>
        <p className="card-cta mt-5 text-[0.6875rem] tracking-label uppercase text-faint">
          See the experience
          <span className="card-arrow" aria-hidden="true">
            &rarr;
          </span>
        </p>
      </div>
    </Link>
  )
}
