import type { Metadata } from 'next'
import { NewsletterTokenAction } from '@/components/newsletter/token-action'

export const metadata: Metadata = { title: 'لغو عضویت در خبرنامه', robots: { index: false } }

export default function NewsletterUnsubscribePage() {
  return <NewsletterTokenAction action="unsubscribe" />
}
