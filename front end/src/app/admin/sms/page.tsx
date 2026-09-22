'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Save, Send } from 'lucide-react'
import {
  SMS_PLACEHOLDER_LABEL,
  SMS_PROVIDER_LABEL,
  type SmsLogEntry,
  type SmsProvider,
  type SmsSettings,
} from '@/types/sms'
import { useSaveSmsSettings, useSendTestSms, useSmsMessages, useSmsSettings } from '@/lib/api/queries'
import { PermissionGate } from '@/components/admin/admin-shell'
import { AdminCard, Table } from '@/components/admin/data-table'
import { BlockToggle } from '@/components/admin/editor-bits'
import { Badge, type BadgeTone } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadError } from '@/components/ui/load-error'
import { toast } from '@/components/ui/toast'
import { formatDateTime, toEnDigits, toFaDigits } from '@/lib/format'
import { cn } from '@/lib/utils'

type Draft = Pick<SmsSettings, 'enabled' | 'provider' | 'sender' | 'username' | 'events'> & {
  apiKey: string
  password: string
}

const toDraft = (settings: SmsSettings): Draft => ({
  enabled: settings.enabled,
  provider: settings.provider,
  sender: settings.sender,
  username: settings.username,
  events: structuredClone(settings.events),
  apiKey: '',
  password: '',
})

/** پیامک فارسی: تا ۷۰ حرف یک پیامک؛ بیشتر از آن هر ۶۷ حرف یک پیامک حساب می‌شود */
const ON_OFF = { on: 'روشن', off: 'خاموش' }

const smsParts = (text: string) => (text.length <= 70 ? 1 : Math.ceil(text.length / 67))

const STATUS: Record<SmsLogEntry['status'], { label: string; tone: BadgeTone }> = {
  sent: { label: 'ارسال شد', tone: 'success' },
  logged: { label: 'آزمایشی', tone: 'neutral' },
  failed: { label: 'ناموفق', tone: 'danger' },
}

/**
 * پیامک‌های خودکار سایت. تا وقتی سرویس پیامک خریده نشده، «حالت آزمایشی» پیامک‌ها را فقط
 * در گزارش پایین ثبت می‌کند تا متن و زمان هرکدام دیده شود؛ بعد از خرید، فقط سرویس و
 * کلیدش را وارد می‌کنید و با پیامک آزمایشی اتصال را امتحان می‌کنید.
 */
export default function AdminSmsPage() {
  const { data, isLoading, isError, refetch } = useSmsSettings()
  const save = useSaveSmsSettings()
  const [draft, setDraft] = useState<Draft | null>(null)

  useEffect(() => {
    if (data && !draft) setDraft(toDraft(data))
  }, [data, draft])

  if (isError) return <LoadError onRetry={() => refetch()} />
  if (isLoading || !data || !draft) return <Skeleton className="h-96 rounded-card" />

  const update = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch })
  const setEvent = (key: string, patch: Partial<Draft['events'][string]>) =>
    update({ events: { ...draft.events, [key]: { ...draft.events[key], ...patch } } })

  const usesLogin = draft.provider === 'melipayamak'
  const usesKey = draft.provider !== 'log' && !usesLogin
  const missingCredentials =
    draft.provider !== 'log' &&
    (usesLogin
      ? !draft.username.trim() || (!data.passwordSet && !draft.password)
      : !data.apiKeySet && !draft.apiKey.trim())
  const dirty = JSON.stringify(toDraft(data)) !== JSON.stringify(draft)

  const submit = () =>
    save.mutate(
      {
        enabled: draft.enabled,
        provider: draft.provider,
        sender: draft.sender.trim(),
        username: draft.username.trim(),
        events: draft.events,
        apiKey: draft.apiKey.trim() || undefined,
        password: draft.password || undefined,
      },
      {
        onSuccess: (saved) => {
          setDraft(toDraft(saved))
          toast.success('تنظیمات پیامک ذخیره شد')
        },
        onError: (error) => toast.error(error.message),
      },
    )

  return (
    <PermissionGate permission="settings.manage">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">پیامک</h1>
            <p className="mt-1.5 text-[13px] text-muted">اتصال سرویس پیامک و متن پیامک‌هایی که خودکار برای مشتری فرستاده می‌شود</p>
          </div>
          <Button loading={save.isPending} disabled={!dirty} onClick={submit}>
            <Save className="size-4" />
            ذخیره
          </Button>
        </div>

        <AdminCard title="ارسال پیامک" action={<BlockToggle checked={draft.enabled} onChange={(enabled) => update({ enabled })} labels={ON_OFF} />}>
          <div className="space-y-4 p-5">
            <p
              className={cn(
                'rounded-xl px-3.5 py-2.5 text-[12.5px] leading-6',
                draft.enabled ? 'bg-brand-500/8 text-brand-700 dark:text-brand-300' : 'bg-surface-2 text-muted',
              )}
            >
              {!draft.enabled
                ? 'خاموش — هیچ پیامکی ارسال یا ثبت نمی‌شود.'
                : draft.provider === 'log'
                  ? 'روشن، در حالت آزمایشی — پیامکی واقعاً ارسال نمی‌شود؛ هر پیامک فقط در گزارش پایین ثبت می‌شود.'
                  : `روشن — پیامک‌ها از طریق ${SMS_PROVIDER_LABEL[draft.provider]} ارسال می‌شوند.`}
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="سرویس پیامک" hint="تا وقتی سرویس نخریده‌اید، حالت آزمایشی را نگه دارید">
                <Select value={draft.provider} onChange={(e) => update({ provider: e.target.value as SmsProvider })}>
                  {(Object.keys(SMS_PROVIDER_LABEL) as SmsProvider[]).map((provider) => (
                    <option key={provider} value={provider}>
                      {SMS_PROVIDER_LABEL[provider]}
                    </option>
                  ))}
                </Select>
              </Field>

              {draft.provider !== 'log' && (
                <Field label="شماره خط ارسال" hint="شماره‌ای که سرویس پیامک به شما داده است">
                  <Input
                    value={draft.sender}
                    onChange={(e) => update({ sender: toEnDigits(e.target.value) })}
                    dir="ltr"
                    className="en-code text-start"
                  />
                </Field>
              )}

              {usesKey && (
                <Field
                  label="کلید API"
                  hint={data.apiKeySet ? 'کلید ذخیره شده است؛ فقط برای تغییرش، کلید تازه را وارد کنید' : 'از پنل سرویس پیامک کپی کنید'}
                  className="sm:col-span-2"
                >
                  <Input
                    type="password"
                    value={draft.apiKey}
                    onChange={(e) => update({ apiKey: e.target.value })}
                    placeholder={data.apiKeySet ? '••••••••••••' : ''}
                    autoComplete="off"
                    dir="ltr"
                    className="text-start"
                  />
                </Field>
              )}

              {usesLogin && (
                <>
                  <Field label="نام کاربری پنل پیامک">
                    <Input
                      value={draft.username}
                      onChange={(e) => update({ username: e.target.value })}
                      autoComplete="off"
                      dir="ltr"
                      className="text-start"
                    />
                  </Field>
                  <Field label="رمز پنل پیامک" hint={data.passwordSet ? 'رمز ذخیره شده است؛ فقط برای تغییرش وارد کنید' : undefined}>
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
            </div>

            {draft.enabled && missingCredentials && (
              <p className="flex items-start gap-2 rounded-xl bg-amber-500/10 px-3.5 py-2.5 text-[12.5px] leading-6 text-amber-700 dark:text-amber-300">
                <AlertTriangle className="mt-1 size-4 shrink-0" />
                اطلاعات اتصال کامل نیست؛ تا کاملش نکنید، ارسال پیامک‌ها ناموفق ثبت می‌شود.
              </p>
            )}
          </div>
        </AdminCard>

        <TestSmsCard />

        <AdminCard title="پیامک‌های خودکار">
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
                  <Textarea
                    value={value.template}
                    onChange={(e) => setEvent(event.key, { template: e.target.value })}
                    disabled={!value.enabled}
                    aria-label={`متن پیامک ${event.label}`}
                    className="min-h-20 text-[13px] leading-7"
                  />
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="text-muted">افزودن:</span>
                    {event.placeholders.map((key) => (
                      <button
                        key={key}
                        type="button"
                        disabled={!value.enabled}
                        onClick={() => setEvent(event.key, { template: `${value.template}{${key}}` })}
                        className="rounded-lg border border-border px-2 py-0.5 transition-colors hover:border-brand-400 disabled:opacity-50"
                      >
                        {SMS_PLACEHOLDER_LABEL[key] ?? key}
                      </button>
                    ))}
                    <span className="num ms-auto text-muted">
                      {toFaDigits(value.template.length)} حرف — {toFaDigits(smsParts(value.template))} پیامک
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </AdminCard>

        <SmsLogCard />
      </div>
    </PermissionGate>
  )
}

function TestSmsCard() {
  const test = useSendTestSms()
  const [phone, setPhone] = useState('')

  return (
    <AdminCard title="پیامک آزمایشی">
      <div className="flex flex-wrap items-start gap-3 p-5">
        <Field
          label="شماره موبایل"
          hint="با تنظیماتِ ذخیره‌شده ارسال می‌شود، حتی اگر ارسال پیامک خاموش باشد"
          className="min-w-60 flex-1"
        >
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            placeholder="09121234567"
            dir="ltr"
            className="en-code text-start"
          />
        </Field>
        <Button
          variant="outline"
          className="mt-7"
          loading={test.isPending}
          onClick={() =>
            test.mutate(toEnDigits(phone).replace(/\s/g, ''), {
              onSuccess: (result) => toast.success(result.message),
              onError: (error) => toast.error(error.message),
            })
          }
        >
          <Send className="size-4" />
          ارسال
        </Button>
      </div>
    </AdminCard>
  )
}

function SmsLogCard() {
  const { data, isLoading } = useSmsMessages()

  return (
    <AdminCard title="گزارش پیامک‌ها">
      {isLoading ? (
        <div className="space-y-2 p-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      ) : !data?.length ? (
        <p className="p-6 text-center text-[13px] text-muted">هنوز پیامکی ثبت نشده است.</p>
      ) : (
        <Table head={['زمان', 'شماره', 'رویداد', 'وضعیت', 'متن']}>
          {data.map((message) => (
            <tr key={message.id} className="align-top">
              <td className="whitespace-nowrap p-3.5 text-muted">{formatDateTime(message.createdAt)}</td>
              <td className="en-code whitespace-nowrap p-3.5">{message.phone}</td>
              <td className="whitespace-nowrap p-3.5">{message.eventLabel}</td>
              <td className="p-3.5">
                <Badge tone={STATUS[message.status].tone}>{STATUS[message.status].label}</Badge>
                {message.error && <p className="mt-1 max-w-52 text-[11px] leading-5 text-red-500">{message.error}</p>}
              </td>
              <td className="p-3.5">
                <p className="max-w-md whitespace-pre-line text-[12px] leading-6">{message.message}</p>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </AdminCard>
  )
}
