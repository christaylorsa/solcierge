import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExperienceGrid } from '@/components/experiences/ExperienceGrid'
import { FilmGrain } from '@/components/motion/FilmGrain'
import { Eyebrow, MaskedHeading } from '@/components/motion/MaskedHeading'
import { ParallaxPhoto } from '@/components/motion/ParallaxPhoto'
import { Reveal, SectionDivider } from '@/components/motion/Reveal'
import { RequestForm } from '@/components/request/RequestForm'
import { Section } from '@/components/site/Section'
import { EXPERIENCES_CATEGORY } from '@/lib/categories'
import { EXPERIENCES, EXPERIENCE_BY_SLUG, isExperienceSlug, otherExperiences } from '@/lib/experiences'

export function generateStaticParams() {
  return EXPERIENCES.map((experience) => ({ slug: experience.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  if (!isExperienceSlug(slug)) return { title: 'Experiences' }
  const experience = EXPERIENCE_BY_SLUG[slug]
  return {
    title: experience.name,
    description: experience.intro,
    openGraph: { images: [{ url: experience.image, width: 1920, height: 1200, alt: experience.imageAlt }] },
  }
}

export default async function ExperiencePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!isExperienceSlug(slug)) notFound()
  const experience = EXPERIENCE_BY_SLUG[slug]

  return (
    <>
      {/*
        Banner. On wide screens the copy takes the left and the photograph a panel on the
        right, framed on its subject, so the two never fight. On phones the photograph
        sits behind the copy with a scrim rising from the bottom.
      */}
      <div className="relative isolate overflow-hidden border-b border-line bg-bg">
        <div className="absolute inset-0 lg:left-[36%] lg:[mask-image:linear-gradient(to_right,transparent,#000_45%)]">
          <img
            src={experience.image}
            alt={experience.imageAlt}
            width={1920}
            height={1200}
            fetchPriority="high"
            className="photo h-full w-full object-cover opacity-75 lg:opacity-95"
            style={{ objectPosition: experience.focus }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/60 to-bg/10 lg:via-transparent lg:to-transparent" aria-hidden="true" />
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-bg/80 to-transparent" aria-hidden="true" />
        </div>
        <FilmGrain />

        <div className="relative mx-auto flex min-h-[78svh] max-w-shell flex-col justify-end px-[var(--shell-x)] pb-16 pt-32 sm:pb-20">
          <Reveal>
            <nav className="flex items-center gap-2 text-xs text-faint" aria-label="Breadcrumb">
              <Link href="/experiences" className="transition-colors duration-300 ease hover:text-accent-soft">
                Experiences
              </Link>
              <span aria-hidden="true">/</span>
              <span className="text-muted">{experience.name}</span>
            </nav>

            <p className="eyebrow mt-8 flex flex-wrap items-center gap-3">
              {experience.place}
              {experience.homeGround ? (
                <span className="whitespace-nowrap border border-accent/40 px-2 py-0.5 text-[0.5625rem] text-accent-soft">
                  Home ground
                </span>
              ) : null}
            </p>
            <h1 className="display mt-4 max-w-xl text-[clamp(2.75rem,8vw,5.5rem)] leading-[0.95] text-ink">
              {experience.name}
            </h1>
            <p className="lede mt-6 max-w-xl">{experience.intro}</p>
          </Reveal>

          <Reveal delayIndex={2}>
            <dl className="mt-12 grid max-w-2xl gap-6 border-t border-line pt-7 sm:grid-cols-3">
              <Fact label="Length">{experience.duration}</Fact>
              <Fact label="When to go">{experience.season}</Fact>
              <Fact label="Price">On request, built around your dates and group</Fact>
            </dl>
            <a href="#request" className="btn btn-primary mt-10">
              Request this experience
            </a>
          </Reveal>
        </div>
      </div>

      {/* The shape of the trip. */}
      <Section>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.8fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Eyebrow>The shape of it</Eyebrow>
            <MaskedHeading
              lines={['A shape,', <span key="i" className="italic text-muted">not a script</span>]}
              className="display mt-5 text-[clamp(2.25rem,5vw,3.5rem)] text-ink"
            />
            <Reveal delayIndex={2}>
              <p className="lede mt-6 max-w-md">
                This is how it often runs. Every day of yours is rewritten around who is coming, what
                they love, and how much they want to do.
              </p>
            </Reveal>
          </div>

          <ol>
            {experience.shape.map((beat, index) => (
              <li key={beat.title}>
                <SectionDivider />
                <div className="grid gap-3 py-8 sm:grid-cols-[9rem_1fr] sm:gap-8">
                  <p className="text-[0.6875rem] tracking-label uppercase text-accent-soft">
                    <span className="sr-only">Part {index + 1}. </span>
                    {beat.when}
                  </p>
                  <div>
                    <h3 className="display text-2xl text-ink">{beat.title}</h3>
                    <p className="mt-2.5 max-w-prose text-sm leading-relaxed text-muted">{beat.body}</p>
                  </div>
                </div>
              </li>
            ))}
            <SectionDivider />
          </ol>
        </div>
      </Section>

      {/* What the desk arranges, over the second photograph. */}
      <section className="relative isolate overflow-hidden border-y border-line">
        <ParallaxPhoto src={experience.image2} className="opacity-80" travel={14} />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-bg via-bg/75 to-bg/10" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-bg via-transparent to-bg" />
        <FilmGrain />

        <div className="relative mx-auto grid max-w-shell gap-12 px-[var(--shell-x)] py-28 sm:py-36 lg:grid-cols-[1fr_1.3fr] lg:items-center lg:gap-16">
          <div>
            <Eyebrow>What we arrange</Eyebrow>
            <MaskedHeading
              lines={['Everything,', <span key="i" className="italic text-muted">door to door</span>]}
              className="display mt-5 text-[clamp(2.25rem,5vw,3.5rem)] text-ink"
            />
            <Reveal delayIndex={2}>
              <p className="lede mt-6 max-w-md">
                One desk, one quote, one payment. You get the plan and the paperwork; we deal with
                everyone else.
              </p>
            </Reveal>
          </div>

          <Reveal delayIndex={3}>
            <ul className="grid gap-px border border-line bg-line sm:grid-cols-2">
              {experience.included.map((item) => (
                <li key={item} className="flex gap-3 bg-bg/85 p-5 text-sm leading-relaxed text-ink backdrop-blur-sm">
                  <span className="mt-[0.5rem] block h-1 w-1 shrink-0 bg-accent" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* The brief. */}
      <div id="request" className="mx-auto max-w-shell scroll-mt-24 px-[var(--shell-x)] py-16 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
          <div>
            <h2 className="eyebrow mb-6">Request {experience.name}</h2>
            <RequestForm category={EXPERIENCES_CATEGORY} experience={experience} />
          </div>

          <aside className="space-y-10 lg:pt-11">
            <div className="border border-line bg-surface p-6">
              <p className="eyebrow">Price</p>
              <p className="display mt-4 text-3xl text-ink">On request</p>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Every experience is costed to your dates, your group and your taste. No fee to ask,
                and no commitment until you settle a quote.
              </p>
            </div>

            <div className="space-y-6 text-sm leading-relaxed">
              <div>
                <p className="eyebrow">Timing</p>
                <p className="mt-2.5 text-muted">{EXPERIENCES_CATEGORY.leadTime}</p>
              </div>
              <div>
                <p className="eyebrow">Settlement</p>
                <p className="mt-2.5 text-muted">
                  Quoted in USD. Pay in USDC one for one, or in SOL at a rate locked for ten
                  minutes with the countdown on screen.
                </p>
              </div>
              <div>
                <p className="eyebrow">Who supplies it</p>
                <p className="mt-2.5 text-muted">
                  Solcierge plans and arranges. Each part is booked with, and supplied by, the
                  operator named in your quote, on their terms.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <Section tone="surface" className="border-t border-line">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h2 className="display text-[clamp(2rem,4vw,2.75rem)] text-ink">Other experiences</h2>
          <Link href="/experiences" className="link-underline text-sm text-muted">
            All experiences
          </Link>
        </div>
        <ExperienceGrid experiences={otherExperiences(experience.slug)} className="mt-12" />
      </Section>
    </>
  )
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-2.5 text-sm leading-relaxed text-muted">{children}</dd>
    </div>
  )
}
