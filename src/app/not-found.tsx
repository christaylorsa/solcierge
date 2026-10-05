import Link from 'next/link'
import { Section } from '@/components/site/Section'

export default function NotFound() {
  return (
    <Section>
      <div className="max-w-prose">
        <p className="eyebrow">404</p>
        <h1 className="display mt-5 text-[clamp(2.25rem,6vw,3.5rem)] text-ink">
          Nothing at this address
        </h1>
        <p className="lede mt-6">
          The page has moved or never existed. If you followed a link from a quote or a
          confirmation, the booking itself is still in your account.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/request" className="btn btn-primary">
            Make a request
          </Link>
          <Link href="/account" className="btn btn-ghost">
            My bookings
          </Link>
        </div>
      </div>
    </Section>
  )
}
