import type { Metadata } from 'next'
import { NewsletterTokenAction } from '@/components/newsletter/token-action'

export const metadata: Metadata = { title: 'تأیید عضویت در خبرنامه', robots: { index: false } }

export default function NewsletterConfirmPage() {
  return <NewsletterTokenAction action="confirm" />
}
