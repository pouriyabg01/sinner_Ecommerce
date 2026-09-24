'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Megaphone, Plus, Send, Trash2 } from 'lucide-react'
import {
  CAMPAIGN_STATUS,
  SUBSCRIBER_STATUS,
  type Campaign,
  type CampaignInput,
  type SubscriberStatus,
} from '@/types/newsletter'
import {
  useCampaigns,
  useCreateCampaign,
  useDeleteCampaign,
  useDeleteSubscriber,
  useSendCampaign,
  useSubscribers,
  useTestCampaign,
  useUpdateCampaign,
} from '@/lib/api/queries'
import { PermissionGate } from '@/components/admin/admin-shell'
import { AdminCard, Table } from '@/components/admin/data-table'
import { BulkBar, SelectCell, runBulk, useSelection } from '@/components/admin/selection'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { EmptyState } from '@/components/ui/empty-state'
import { Field, Input, Textarea } from '@/components/ui/input'
import { LoadError } from '@/components/ui/load-error'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import { formatDateTime, toFaDigits } from '@/lib/format'

/**
 * خبرنامه: مشترکان و اطلاع‌رسانی‌های ایمیلی.
 *
 * متن نامه‌ها و اتصال سرویس ایمیل جای دیگری است (صفحه‌ی «ایمیل»)؛ اینجا فقط
 * «به چه کسی» و «چه چیزی» است.
 */
export default function AdminNewsletterPage() {
  return (
    <PermissionGate permission="newsletter.manage">
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold">خبرنامه</h1>
          <p className="mt-1.5 text-[13px] text-muted">مشترکان خبرنامه و اطلاع‌رسانی‌هایی که برایشان فرستاده می‌شود</p>
        </div>

        <MailOffWarning />
        <CampaignsCard />
        <SubscribersCard />
      </div>
    </PermissionGate>
  )
}

/**
 * تا وقتی ارسال ایمیل خاموش است هیچ نامه‌ای — نه تأیید عضویت و نه اطلاع‌رسانی — از
 * سایت بیرون نمی‌رود. بدون این هشدار، مدیر فقط می‌دید که همه‌ی اعضا «در انتظار
 * تأیید» مانده‌اند و دلیلش را جای دیگری باید می‌گشت.
 */
function MailOffWarning() {
  const { data } = useSubscribers()

  if (!data || data.mailEnabled) return null

  return (
    <p className="flex items-start gap-2 rounded-card bg-amber-500/10 px-4 py-3 text-[12.5px] leading-6 text-amber-700 dark:text-amber-300">
      <AlertTriangle className="mt-1 size-4 shrink-0" />
      <span>
        ارسال ایمیل خاموش است؛ نه نامه‌ی تأیید عضویت می‌رود و نه اطلاع‌رسانی‌ها.{' '}
        <Link href="/admin/email" className="font-medium underline underline-offset-4">
          روشنش کنید
        </Link>
      </span>
    </p>
  )
}

/* ------------------------------ اطلاع‌رسانی‌ها ------------------------------ */

function CampaignsCard() {
  const { data, isLoading, isError, refetch } = useCampaigns()
  const create = useCreateCampaign()
  const update = useUpdateCampaign()
  const remove = useDeleteCampaign()
  const [editing, setEditing] = useState<Campaign | null | undefined>(undefined)
  const [sending, setSending] = useState<Campaign | null>(null)

  if (isError) return <LoadError onRetry={() => refetch()} />

  return (
    <>
      <AdminCard
        title="اطلاع‌رسانی‌ها"
        action={
          <Button size="sm" onClick={() => setEditing(null)}>
            <Plus className="size-4" />
            اطلاع‌رسانی تازه
          </Button>
        }
      >
        {isLoading ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-xl" />
            ))}
          </div>
        ) : !data?.length ? (
          <EmptyState
            icon={Megaphone}
            title="هنوز اطلاع‌رسانی‌ای نساخته‌اید"
            description="یک متن بنویسید، اول برای خودتان آزمایشی بفرستید و بعد برای همه‌ی مشترکان."
          />
        ) : (
          <Table head={['موضوع', 'وضعیت', 'پیشرفت', 'ساخته شده', '']}>
            {data.map((campaign) => (
              <tr key={campaign.id} className="border-b border-border last:border-0">
                <td className="p-3.5">
                  <button
                    type="button"
                    onClick={() => setEditing(campaign)}
                    className="text-start font-medium underline-offset-4 hover:underline"
                  >
                    {campaign.subject}
                  </button>
                </td>
                <td className="p-3.5">
                  <Badge tone={CAMPAIGN_STATUS[campaign.status].tone}>{CAMPAIGN_STATUS[campaign.status].label}</Badge>
                </td>
                <td className="num whitespace-nowrap p-3.5 text-muted">
                  {campaign.status === 'draft'
                    ? '—'
                    : `${toFaDigits(campaign.sentCount + campaign.failedCount)} از ${toFaDigits(campaign.recipients)}`}
                  {campaign.failedCount > 0 && (
                    <span className="ms-2 text-red-500">{toFaDigits(campaign.failedCount)} ناموفق</span>
                  )}
                </td>
                <td className="whitespace-nowrap p-3.5 text-muted">{formatDateTime(campaign.createdAt)}</td>
                <td className="p-3.5">
                  <div className="flex items-center justify-end gap-1">
                    {campaign.status === 'draft' && (
                      <Button size="sm" variant="soft" onClick={() => setSending(campaign)}>
                        <Send className="size-3.5" />
                        ارسال
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`حذف ${campaign.subject}`}
                      onClick={() =>
                        remove.mutate(campaign.id, {
                          onSuccess: () => toast.success('اطلاع‌رسانی حذف شد'),
                          onError: (error) => toast.error(error.message),
                        })
                      }
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </AdminCard>

      <CampaignDrawer
        key={editing === undefined ? 'closed' : (editing?.id ?? 'new')}
        open={editing !== undefined}
        editing={editing ?? null}
        saving={create.isPending || update.isPending}
        onClose={() => setEditing(undefined)}
        onSubmit={(body) => {
          const done = {
            onSuccess: () => {
              toast.success(editing ? 'اطلاع‌رسانی به‌روز شد' : 'اطلاع‌رسانی ذخیره شد')
              setEditing(undefined)
            },
            onError: (error: Error) => toast.error(error.message),
          }
          if (editing) update.mutate({ id: editing.id, ...body }, done)
          else create.mutate(body, done)
        }}
      />

      <SendDrawer campaign={sending} onClose={() => setSending(null)} />
    </>
  )
}

function CampaignDrawer({
  open,
  editing,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean
  editing: Campaign | null
  saving: boolean
  onClose: () => void
  onSubmit: (body: CampaignInput) => void
}) {
  const test = useTestCampaign()

  /*
   * `key` روی خود کشو، آن را با هر بار باز شدن از نو می‌سازد؛ پس مقدار اولیه یک بار
   * و از روی همین اطلاع‌رسانی خوانده می‌شود و نیازی به همگام‌سازی با افکت نیست.
   */
  const [draft, setDraft] = useState<CampaignInput>({
    subject: editing?.subject ?? '',
    body: editing?.body ?? '',
    ctaLabel: editing?.ctaLabel ?? '',
    ctaUrl: editing?.ctaUrl ?? '',
  })
  const [testEmail, setTestEmail] = useState('')

  const update = (patch: Partial<CampaignInput>) => setDraft({ ...draft, ...patch })
  const locked = Boolean(editing && editing.status !== 'draft')

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={editing ? 'ویرایش اطلاع‌رسانی' : 'اطلاع‌رسانی تازه'}
      widthClass="w-full max-w-xl"
      footer={
        !locked && (
          <Button
            block
            loading={saving}
            onClick={() => {
              if (!draft.subject.trim() || !draft.body.trim()) {
                toast.error('موضوع و متن نامه لازم است')
                return
              }
              onSubmit(draft)
            }}
          >
            ذخیره
          </Button>
        )
      }
    >
      <div className="space-y-4 p-5">
        {locked && (
          <p className="rounded-xl bg-surface-2 px-3.5 py-2.5 text-[12.5px] leading-6 text-muted">
            این اطلاع‌رسانی فرستاده شده و دیگر تغییر نمی‌کند. نامه‌ی رفته برنمی‌گردد.
          </p>
        )}

        <Field label="موضوع نامه" hint="همان چیزی که در صندوق ورودی دیده می‌شود؛ کوتاه و روشن">
          <Input value={draft.subject} onChange={(e) => update({ subject: e.target.value })} disabled={locked} />
        </Field>

        <Field label="متن نامه" hint="خط خالی یعنی پاراگراف تازه">
          <Textarea
            value={draft.body}
            onChange={(e) => update({ body: e.target.value })}
            disabled={locked}
            className="min-h-48 text-[13px] leading-7"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="نوشته‌ی دکمه" hint="خالی بگذارید تا نامه دکمه نداشته باشد">
            <Input
              value={draft.ctaLabel}
              onChange={(e) => update({ ctaLabel: e.target.value })}
              disabled={locked}
              placeholder="دیدن تخفیف‌ها"
            />
          </Field>
          <Field label="لینک دکمه">
            <Input
              value={draft.ctaUrl}
              onChange={(e) => update({ ctaUrl: e.target.value })}
              disabled={locked}
              placeholder="https://"
              dir="ltr"
              className="text-start"
            />
          </Field>
        </div>

        {editing && (
          <div className="space-y-3 rounded-xl border border-border p-4">
            <p className="text-[12.5px] font-bold">ارسال آزمایشی</p>
            <p className="text-xs leading-6 text-muted">
              قبل از ارسال به همه، نامه را برای خودتان بفرستید و ببینید در گوشی و رایانه چطور دیده می‌شود. متنِ
              ذخیره‌شده فرستاده می‌شود، نه چیزی که همین حالا تایپ کرده‌اید.
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <Field label="نشانی ایمیل" className="min-w-52 flex-1">
                <Input
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  inputMode="email"
                  placeholder="me@example.com"
                  dir="ltr"
                  className="text-start"
                />
              </Field>
              <Button
                variant="outline"
                loading={test.isPending}
                onClick={() =>
                  test.mutate(
                    { id: editing.id, email: testEmail.trim() },
                    {
                      onSuccess: (result) =>
                        toast.success(
                          result.status === 'logged'
                            ? 'حالت آزمایشی است؛ نامه فقط در گزارش ثبت شد'
                            : 'نامه‌ی آزمایشی فرستاده شد',
                        ),
                      onError: (error) => toast.error(error.message),
                    },
                  )
                }
              >
                <Send className="size-4" />
                ارسال
              </Button>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  )
}

/** تأیید ارسال انبوه — یک مرحله‌ی اضافه چون نامه‌ی رفته برنمی‌گردد */
function SendDrawer({ campaign, onClose }: { campaign: Campaign | null; onClose: () => void }) {
  const send = useSendCampaign()
  const { data } = useSubscribers()
  const active = data?.counts.active ?? 0

  return (
    <Drawer open={Boolean(campaign)} onClose={onClose} title="ارسال به همه‌ی مشترکان">
      <div className="space-y-4 p-5">
        <p className="text-[13px] leading-7">
          نامه‌ی «{campaign?.subject}» برای <span className="num font-bold">{toFaDigits(active)}</span> مشترک تأییدشده فرستاده می‌شود.
        </p>
        <p className="rounded-xl bg-amber-500/10 px-3.5 py-2.5 text-[12.5px] leading-6 text-amber-700 dark:text-amber-300">
          بعد از شروع ارسال، این نامه دیگر ویرایش نمی‌شود و جلویش را هم نمی‌شود گرفت.
        </p>
        <div className="flex gap-2">
          <Button
            block
            loading={send.isPending}
            disabled={active === 0}
            onClick={() =>
              campaign &&
              send.mutate(campaign.id, {
                onSuccess: () => {
                  toast.success('ارسال شروع شد')
                  onClose()
                },
                onError: (error) => toast.error(error.message),
              })
            }
          >
            <Send className="size-4" />
            ارسال کن
          </Button>
          <Button block variant="ghost" onClick={onClose}>
            انصراف
          </Button>
        </div>
      </div>
    </Drawer>
  )
}

/* -------------------------------- مشترکان -------------------------------- */

function SubscribersCard() {
  const { data, isLoading, isError, refetch } = useSubscribers()
  const remove = useDeleteSubscriber()
  const [busy, setBusy] = useState(false)

  const rows = useMemo(() => data?.items ?? [], [data])
  const ids = useMemo(() => rows.map((row) => row.id), [rows])
  const selection = useSelection(ids, ids)

  if (isError) return <LoadError onRetry={() => refetch()} />

  const counts = data?.counts
  const summary: { status: SubscriberStatus; count: number }[] = counts
    ? (Object.keys(SUBSCRIBER_STATUS) as SubscriberStatus[]).map((status) => ({ status, count: counts[status] }))
    : []

  const removeSelected = async () => {
    setBusy(true)
    const result = await runBulk(selection.selected, (id) => remove.mutateAsync(id))
    setBusy(false)
    selection.clear()

    if (result.failed) toast.error(`${toFaDigits(result.failed)} مورد حذف نشد${result.firstError ? ` — ${result.firstError}` : ''}`)
    if (result.done) toast.success(`${toFaDigits(result.done)} مشترک حذف شد`)
  }

  return (
    <AdminCard
      title="مشترکان"
      action={
        <div className="flex flex-wrap items-center gap-2">
          {summary.map(({ status, count }) => (
            <Badge key={status} tone={SUBSCRIBER_STATUS[status].tone}>
              <span className="num">{toFaDigits(count)}</span> {SUBSCRIBER_STATUS[status].label}
            </Badge>
          ))}
        </div>
      }
    >
      <BulkBar selection={selection} unit="مشترک">
        <Button size="sm" variant="danger" loading={busy} onClick={removeSelected}>
          <Trash2 className="size-3.5" />
          حذف
        </Button>
      </BulkBar>

      {isLoading ? (
        <div className="space-y-2 p-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      ) : !rows.length ? (
        <EmptyState
          icon={Megaphone}
          title="هنوز کسی عضو نشده است"
          description="فرم عضویت پایین صفحه‌ی اصلی است. هر ایمیلی که ثبت شود، تا وقتی روی لینک تأیید نزند اینجا «در انتظار تأیید» می‌ماند."
        />
      ) : (
        <Table head={['ایمیل', 'وضعیت', 'تأیید', 'عضویت']} selection={selection}>
          {rows.map((subscriber) => (
            <tr key={subscriber.id} className="border-b border-border last:border-0">
              <SelectCell selection={selection} id={subscriber.id} label={subscriber.email} />
              <td className="en-code p-3.5">{subscriber.email}</td>
              <td className="p-3.5">
                <Badge tone={SUBSCRIBER_STATUS[subscriber.status].tone}>{SUBSCRIBER_STATUS[subscriber.status].label}</Badge>
              </td>
              <td className="whitespace-nowrap p-3.5 text-muted">
                {subscriber.confirmedAt ? formatDateTime(subscriber.confirmedAt) : '—'}
              </td>
              <td className="whitespace-nowrap p-3.5 text-muted">{formatDateTime(subscriber.createdAt)}</td>
            </tr>
          ))}
        </Table>
      )}
    </AdminCard>
  )
}
