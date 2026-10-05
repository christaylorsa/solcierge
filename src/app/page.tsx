import { Hero } from '@/components/landing/Hero'
import { CategoryTiles } from '@/components/landing/CategoryTiles'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { CryptoRails } from '@/components/landing/CryptoRails'
import { Commissions } from '@/components/landing/Commissions'
import { ClosingCta } from '@/components/landing/ClosingCta'
import { MembershipInvite } from '@/components/site/MembershipInvite'

export default function LandingPage() {
  return (
    <>
      <Hero />
      <CategoryTiles />
      <HowItWorks />
      <CryptoRails />
      <Commissions />
      <ClosingCta />
      <MembershipInvite />
    </>
  )
}
