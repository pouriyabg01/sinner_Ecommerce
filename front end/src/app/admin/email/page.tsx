'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Save, Send } from 'lucide-react'
import {
  MAILER_LABEL,
  MAIL_ENCRYPTION_LABEL,
  MAIL_PLACEHOLDER_LABEL,
  type MailEncryption,
  type MailLogEntry,
  type MailSettings,
  type Mailer,
} from '@/types/mail'
import { useMailMessages, useMailSettings, useSaveMailSettings, useSendTestMail } from '@/lib/api/queries'
import { PermissionGate } from '@/components/admin/admin-shell'
import { AdminCard, Table } from '@/components/admin/data-table'
import { BlockToggle } from '@/components/admin/editor-bits'
import { Badge, type BadgeTone } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadError } from '@/components/ui/load-error'
import { toast } from '@/components/ui/toast'
import { formatDateTime, toEnDigits } from '@/lib/format'
import { cn } from '@/lib/utils'

type Draft = Pick<
  MailSettings,
  'enabled' | 'mailer' | 'host' | 'port' | 'encryption' | 'username' | 'fromAddress' | 'fromName' | 'events'
> & { password: string }

const toDraft = (settings: MailSettings): Draft => ({
  enabled: settings.enabled,
  mailer: settings.mailer,
  host: settings.host,
  port: settings.port,
  encryption: settings.encryption,
  username: settings.username,
  fromAddress: settings.fromAddress,
  fromName: settings.fromName,
  events: structuredClone(settings.events),
  password: '',
})

const ON_OFF = { on: 'روشن', off: 'خاموش' }

const STATUS: Record<MailLogEntry['status'], { label: string; tone: BadgeTone }> = {
  sent: { label: 'ارسال شد', tone: 'success' },
  logged: { label: 'آزمایشی', tone: 'neutral' },
  failed: { label: 'ناموفق', tone: 'danger' },
}

/**
 * ایمیل‌های خودکار سایت. تا وقتی سرویس ایمیل خریده نشده، «حالت آزمایشی» نامه‌ها را فقط
 * در گزارش پایین ثبت می‌کند تا متن و زمان هرکدام دیده شود؛ بعد از خرید، اطلاعات اتصال را
 * وارد می‌کنید و با ایمیل آزمایشی اتصال را امتحان می‌کنید.
 */
export default function AdminEmailPage() {
  const { data, isLoading, isError, refetch } = useMailSettings()
  const save = useSaveMailSettings()
  const [draft, setDraft] = useState<Draft | null>(null)

  useEffect(() => {
    if (data && !draft) setDraft(toDraft(data))
  }, [data, draft])

  if (isError) return <LoadError onRetry={() => refetch()} />
  if (isLoading || !data || !draft) return <Skeleton className="h-96 rounded-card" />

  const update = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch })
  const setEvent = (key: string, patch: Partial<Draft['events'][string]>) =>
    update({ events: { ...draft.events, [key]: { ...draft.events[key], ...patch } } })

  const usesServer = draft.mailer !== 'log'
  const missingCredentials = usesServer && (!draft.host.trim() || !draft.username.trim() || (!data.passwordSet && !draft.password))
  const missingSender = !draft.fromAddress.trim()
  const dirty = JSON.stringify(toDraft(data)) !== JSON.stringify(draft)

  const submit = () =>
    save.mutate(
      {
        enabled: draft.enabled,
        mailer: draft.mailer,
        host: draft.host.trim(),
        port: draft.port,
        encryption: draft.encryption,
        username: draft.username.trim(),
        fromAddress: draft.fromAddress.trim(),
        fromName: draft.fromName.trim(),
        events: draft.events,
        password: draft.password || undefined,
      },
      {
        onSuccess: (saved) => {
          setDraft(toDraft(saved))
          toast.success('تنظیمات ایمیل ذخیره شد')
        },
        onError: (error) => toast.error(error.message),
      },
    )

  return (
    <PermissionGate permission="settings.manage">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">ایمیل</h1>
            <p className="mt-1.5 text-[13px] text-muted">اتصال سرویس ایمیل و متن نامه‌هایی که خودکار برای مشتری فرستاده می‌شود</p>
          </div>
          <Button loading={save.isPending} disabled={!dirty} onClick={submit}>
            <Save className="size-4" />
            ذخیره
          </Button>
        </div>

        <AdminCard
          title="ارسال ایمیل"
          action={<BlockToggle checked={draft.enabled} onChange={(enabled) => update({ enabled })} labels={ON_OFF} />}
        >
          <div className="space-y-4 p-5">
            <p
              className={cn(
                'rounded-xl px-3.5 py-2.5 text-[12.5px] leading-6',
                draft.enabled ? 'bg-brand-500/8 text-brand-700 dark:text-brand-300' : 'bg-surface-2 text-muted',
              )}
            >
              {!draft.enabled
                ? 'خاموش — هیچ ایمیلی ارسال یا ثبت نمی‌شود.'
                : draft.mailer === 'log'
                  ? 'روشن، در حالت آزمایشی — نامه‌ای واقعاً ارسال نمی‌شود؛ هر نامه فقط در گزارش پایین ثبت می‌شود.'
                  : 'روشن — نامه‌ها از طریق سرویس ایمیلی که پایین تنظیم کرده‌اید ارسال می‌شوند.'}
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="روش ارسال" hint="تا وقتی سرویس ایمیل نگرفته‌اید، حالت آزمایشی را نگه دارید">
                <Select value={draft.mailer} onChange={(e) => update({ mailer: e.target.value as Mailer })}>
                  {(Object.keys(MAILER_LABEL) as Mailer[]).map((mailer) => (
                    <option key={mailer} value={mailer}>
                      {MAILER_LABEL[mailer]}
                    </option>
                  ))}
                </Select>
              </Field>

              {usesServer && (
                <>
                  <Field label="نشانی سرور" hint="سرویس ایمیل این را به شما می‌دهد">
                    <Input
                      value={draft.host}
                      onChange={(e) => update({ host: e.target.value })}
                      placeholder="smtp.example.com"
                      dir="ltr"
                      className="en-code text-start"
                    />
                  </Field>
                  <Field label="رمزگذاری" hint="اگر سرویس چیز دیگری نگفته، گزینه‌ی درگاه ۵۸۷ درست است">
                    <Select
                      value={draft.encryption}
                      onChange={(e) => {
                        const encryption = e.target.value as MailEncryption
                        // درگاه با نوع رمزگذاری جفت است؛ با هم عوض می‌شوند تا دستی اصلاحش نکنند
                        update({ encryption, port: encryption === 'ssl' ? 465 : encryption === 'none' ? 25 : 587 })
                      }}
                    >
                      {(Object.keys(MAIL_ENCRYPTION_LABEL) as MailEncryption[]).map((value) => (
                        <option key={value} value={value}>
                          {MAIL_ENCRYPTION_LABEL[value]}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="درگاه">
                    <Input
                      value={String(draft.port)}
                      onChange={(e) => update({ port: Number(toEnDigits(e.target.value).replace(/\D/g, '')) || 0 })}
                      inputMode="numeric"
                      dir="ltr"
                      className="en-code text-start"
                    />
                  </Field>
                  <Field label="نام کاربری">
                    <Input
                      value={draft.username}
                      onChange={(e) => update({ username: e.target.value })}
                      autoComplete="off"
                      dir="ltr"
                      className="text-start"
                    />
                  </Field>
                  <Field label="رمز" hint={data.passwordSet ? 'رمز ذخیره شده است؛ فقط برای تغییرش وارد کنید' : undefined}>
                    <Input
                      type="password"
                      value={draft.password}
                      onChange={(e) => update({ password: e.target.value })}
                      placeholder={data.passwordSet ? '••••••••' : ''}
                      autoComplete="new-password"
                      dir="ltr"
                      className="text-start"
                    />
                  </Field>
                </>
              )}

              <Field label="نشانی فرستنده" hint="نامه‌ها از این نشانی می‌آیند و پاسخ مشتری هم به همین‌جا می‌رسد">
                <Input
                  value={draft.fromAddress}
                  onChange={(e) => update({ fromAddress: e.target.value })}
                  placeholder="info@example.com"
                  dir="ltr"
                  className="text-start"
                />
              </Field>
              <Field label="نام فرستنده" hint="چیزی که مشتری در صندوق ورودی‌اش به‌جای نشانی می‌بیند">
                <Input value={draft.fromName} onChange={(e) => update({ fromName: e.target.value })} placeholder="فروشگاه" />
              </Field>
            </div>

            {draft.enabled && (missingCredentials || missingSender) && (
              <p className="flex items-start gap-2 rounded-xl bg-amber-500/10 px-3.5 py-2.5 text-[12.5px] leading-6 text-amber-700 dark:text-amber-300">
                <AlertTriangle className="mt-1 size-4 shrink-0" />
                {missingSender
                  ? 'نشانی فرستنده خالی است؛ بدون آن هیچ نامه‌ای فرستاده نمی‌شود.'
                  : 'اطلاعات اتصال کامل نیست؛ تا کاملش نکنید، ارسال نامه‌ها ناموفق ثبت می‌شود.'}
              </p>
            )}
          </div>
        </AdminCard>

        <TestMailCard dirty={dirty} />

        <AdminCard title="ایمیل‌های خودکار">
          <div className="divide-y divide-border">
            {data.catalog.map((event) => {
              const value = draft.events[event.key]
              if (!value) return null
              return (
                <div key={event.key} className="space-y-3 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[13px] font-bold">{event.label}</p>
                      <p className="mt-1 text-xs text-muted">{event.hint}</p>
                    </div>
                    <BlockToggle checked={value.enabled} onChange={(enabled) => setEvent(event.key, { enabled })} labels={ON_OFF} />
                  </div>
                  <Field label="موضوع نامه">
                    <Input
                      value={value.subject}
                      onChange={(e) => setEvent(event.key, { subject: e.target.value })}
                      disabled={!value.enabled}
                    />
                  </Field>
                  <Textarea
                    value={value.body}
                    onChange={(e) => setEvent(event.key, { body: e.target.value })}
                    disabled={!value.enabled}
                    aria-label={`متن ایمیل ${event.label}`}
                    className="min-h-28 text-[13px] leading-7"
                  />
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="text-muted">افزودن:</span>
                    {event.placeholders.map((key) => (
                      <button
                        key={key}
                        type="button"
                        disabled={!value.enabled}
                        onClick={() => setEvent(event.key, { body: `${value.body}{${key}}` })}
                        className="rounded-lg border border-border px-2 py-0.5 transition-colors hover:border-brand-400 disabled:opacity-50"
                      >
                        {MAIL_PLACEHOLDER_LABEL[key] ?? key}
                      </button>
                    ))}
                    {/* لینک هیچ‌وقت داخل متن نمی‌نشیند؛ خودش دکمه‌ی ته نامه می‌شود */}
                    <span className="ms-auto text-muted">خط خالی یعنی پاراگراف تازه</span>
                  </div>
                </div>
              )
            })}
          </div>
        </AdminCard>

        <MailLogCard />
      </div>
    </PermissionGate>
  )
}

/**
 * این دکمه با تنظیماتِ ذخیره‌شده کار می‌کند، نه با چیزی که همین حالا تایپ شده.
 * پس تا وقتی تغییرِ ذخیره‌نشده هست، به‌جای خطای گیج‌کننده‌ی سمت سرور، همین‌جا
 * گفته می‌شود که اول باید ذخیره کرد.
 */
function TestMailCard({ dirty }: { dirty: boolean }) {
  const test = useSendTestMail()
  const [email, setEmail] = useState('')

  return (
    <AdminCard title="ایمیل آزمایشی">
      <div className="space-y-3 p-5">
        {dirty && (
          <p className="flex items-start gap-2 rounded-xl bg-amber-500/10 px-3.5 py-2.5 text-[12.5px] leading-6 text-amber-700 dark:text-amber-300">
            <AlertTriangle className="mt-1 size-4 shrink-0" />
            تغییرهای بالا هنوز ذخیره نشده‌اند. ایمیل آزمایشی با تنظیماتِ ذخیره‌شده می‌رود، پس اول «ذخیره» را بزنید.
          </p>
        )}
        <div className="flex flex-wrap items-start gap-3">
          <Field
            label="نشانی ایمیل"
            hint="با تنظیماتِ ذخیره‌شده ارسال می‌شود، حتی اگر ارسال ایمیل خاموش باشد"
            className="min-w-60 flex-1"
          >
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              inputMode="email"
              placeholder="me@example.com"
              dir="ltr"
              className="text-start"
            />
          </Field>
          <Button
            variant="outline"
            className="mt-7"
            loading={test.isPending}
            disabled={dirty}
            onClick={() =>
              test.mutate(email.trim(), {
                onSuccess: (result) => toast.success(result.message),
                onError: (error) => toast.error(error.message),
              })
            }
          >
            <Send className="size-4" />
            ارسال
          </Button>
        </div>
      </div>
    </AdminCard>
  )
}

function MailLogCard() {
  const { data, isLoading } = useMailMessages()

  return (
    <AdminCard title="گزارش ایمیل‌ها">
      {isLoading ? (
        <div className="space-y-2 p-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      ) : !data?.length ? (
        <p className="p-6 text-center text-[13px] text-muted">هنوز ایمیلی ثبت نشده است.</p>
      ) : (
        <Table head={['زمان', 'گیرنده', 'رویداد', 'وضعیت', 'موضوع']}>
          {data.map((message) => (
            <tr key={message.id} className="align-top">
              <td className="whitespace-nowrap p-3.5 text-muted">{formatDateTime(message.createdAt)}</td>
              <td className="en-code p-3.5">{message.email}</td>
              <td className="whitespace-nowrap p-3.5">{message.eventLabel}</td>
              <td className="p-3.5">
                <Badge tone={STATUS[message.status].tone}>{STATUS[message.status].label}</Badge>
                {message.error && <p className="mt-1 max-w-52 text-[11px] leading-5 text-red-500">{message.error}</p>}
              </td>
              <td className="p-3.5">
                <p className="max-w-md text-[12px] leading-6">{message.subject}</p>
                <p className="mt-1 max-w-md whitespace-pre-line text-[11px] leading-5 text-muted">{message.body}</p>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </AdminCard>
  )
}
