import { Hero } from '@/components/landing/Hero'
import { CategoryTiles } from '@/components/landing/CategoryTiles'
import { Experiences } from '@/components/landing/Experiences'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { CryptoRails } from '@/components/landing/CryptoRails'
import { ClosingCta } from '@/components/landing/ClosingCta'
import { MembershipInvite } from '@/components/site/MembershipInvite'

export default function LandingPage() {
  return (
    <>
      <Hero />
      <CategoryTiles />
      <Experiences />
      <HowItWorks />
      <CryptoRails />
      <ClosingCta />
      <MembershipInvite />
    </>
  )
}
