import type { BadgeTone } from '@/components/ui/badge'

/**
 * عضویت دومرحله‌ای است: ثبت ایمیل فقط `pending` می‌سازد و تا وقتی صاحب ایمیل روی
 * لینک تأیید نزده باشد هیچ اطلاع‌رسانی‌ای نمی‌گیرد.
 */
export type SubscriberStatus = 'pending' | 'active' | 'unsubscribed'

export const SUBSCRIBER_STATUS: Record<SubscriberStatus, { label: string; tone: BadgeTone }> = {
  active: { label: 'تأییدشده', tone: 'success' },
  pending: { label: 'در انتظار تأیید', tone: 'warning' },
  unsubscribed: { label: 'لغو شده', tone: 'neutral' },
}

export interface Subscriber {
  id: string
  email: string
  status: SubscriberStatus
  confirmedAt: string | null
  createdAt: string
}

export interface SubscriberList {
  items: Subscriber[]
  counts: Record<SubscriberStatus, number>
  /** با خاموش بودن ارسال ایمیل، نامه‌ی تأیید نمی‌رود و اعضای تازه راکد می‌مانند */
  mailEnabled: boolean
}

export type CampaignStatus = 'draft' | 'sending' | 'sent'

export const CAMPAIGN_STATUS: Record<CampaignStatus, { label: string; tone: BadgeTone }> = {
  draft: { label: 'پیش‌نویس', tone: 'neutral' },
  sending: { label: 'در حال ارسال', tone: 'warning' },
  sent: { label: 'فرستاده شد', tone: 'success' },
}

export interface Campaign {
  id: string
  subject: string
  body: string
  ctaLabel: string
  ctaUrl: string
  status: CampaignStatus
  recipients: number
  sentCount: number
  failedCount: number
  sentAt: string | null
  createdAt: string
}

export interface CampaignInput {
  subject: string
  body: string
  ctaLabel?: string
  ctaUrl?: string
}
