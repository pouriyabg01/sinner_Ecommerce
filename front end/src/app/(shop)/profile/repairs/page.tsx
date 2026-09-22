'use client'

import Link from 'next/link'
import { CreditCard, Wrench } from 'lucide-react'
import {
  useDecideRepair,
  useMyRepairs,
  usePayRepairDemo,
  useSiteSettings,
  useStartRepairPayment,
} from '@/lib/api/queries'
import { useSession } from '@/store/session'
import { DEVICE_KIND_LABEL, PICKUP_METHOD_LABEL, type RepairRequest } from '@/types/repair'
import { RepairStatusChip } from '@/components/ui/status-chip'
import { RepairTimeline } from '@/components/repair/status-timeline'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Button, buttonVariants } from '@/components/ui/button'
import { formatDate, formatPrice, toFaDigits } from '@/lib/format'
import { redirectToGateway } from '@/lib/gateway-redirect'
import { toast } from '@/components/ui/toast'

export default function MyRepairsPage() {
  const userId = useSession((s) => s.userId)
  const { data, isLoading } = useMyRepairs(userId)

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-card" />
        ))}
      </div>
    )
  }

  if (!data?.length) {
    return (
      <div className="rounded-card border border-border bg-surface">
        <EmptyState
          as="h1"
          icon={Wrench}
          title="درخواست تعمیری ثبت نشده است"
          description="اگر دستگاه شما مشکلی دارد، در کمتر از دو دقیقه درخواست خود را ثبت کنید؛ پیک سینر درِ منزل مراجعه می‌کند."
          action={
            <Link href="/repair" className={buttonVariants({ variant: 'soft' })}>
              ثبت درخواست تعمیر
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">تعمیرات من</h1>
        <Link href="/repair" className={buttonVariants({ size: 'sm', variant: 'soft' })}>
          درخواست جدید
        </Link>
      </div>

      {data.map((repair) => (
        <article key={repair.id} className="rounded-card border border-border bg-surface p-5">
          <header className="mb-4 flex flex-wrap items-center gap-3 border-b border-border pb-4">
            <span className="en-code text-sm font-bold">{repair.code}</span>
            <RepairStatusChip status={repair.status} />
            <span className="text-[11px] text-muted">{formatDate(repair.createdAt)}</span>
          </header>

          <div className="grid gap-6 lg:grid-cols-2">
            <dl className="space-y-3 text-[12.5px]">
              {[
                { label: 'دستگاه', value: `${DEVICE_KIND_LABEL[repair.deviceKind]} — ${repair.deviceBrand} ${repair.deviceModel}` },
                { label: 'روش تحویل', value: PICKUP_METHOD_LABEL[repair.pickupMethod] },
                // در تحویل حضوری آدرسی گرفته نمی‌شود و ردیفش فقط روش تحویل را تکرار می‌کرد
                ...(repair.pickupMethod === 'in_person'
                  ? []
                  : [{ label: 'آدرس', value: repair.addressSummary || '—' }]),
                ...(repair.pickupMethod === 'courier'
                  ? [
                      {
                        label: 'زمان پیک',
                        value: repair.preferredDate ? formatDate(repair.preferredDate) : 'بدون ترجیح — تماس می‌گیریم',
                      },
                    ]
                  : []),
                {
                  label: 'هزینه',
                  value: repair.finalCost
                    ? formatPrice(repair.finalCost)
                    : `برآورد ${formatPrice(repair.estimatedCost.min, false)} تا ${formatPrice(repair.estimatedCost.max)}`,
                },
                { label: 'گارانتی', value: `${toFaDigits(repair.warrantyDays)} روز` },
              ].map((row) => (
                <div key={row.label} className="flex gap-3">
                  <dt className="w-20 shrink-0 text-muted">{row.label}</dt>
                  <dd className="num flex-1 leading-7">{row.value}</dd>
                </div>
              ))}

              {repair.technicianNote && (
                <div className="rounded-2xl bg-surface-2 p-3.5 leading-7">
                  <span className="font-bold">یادداشت تکنسین: </span>
                  {repair.technicianNote}
                </div>
              )}

              <RepairDecision repair={repair} />
            </dl>

            <div className="rounded-2xl border border-border p-4">
              <p className="mb-4 text-[12.5px] font-bold">مراحل انجام</p>
              <RepairTimeline timeline={repair.timeline} />
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}

/**
 * تصمیم مشتری و پرداخت هزینه‌ی تعمیر.
 *
 * تا پیش از این دکمه‌های «تأیید» و «انصراف» وجود داشتند ولی به هیچ‌جا وصل نبودند
 * و هزینه‌ی تعمیر هیچ راهی برای پرداخت نداشت — مشتری پیامکِ «برای تأیید به پنل
 * سر بزنید» می‌گرفت و در پنل کاری از دستش برنمی‌آمد.
 */
function RepairDecision({ repair }: { repair: RepairRequest }) {
  const decide = useDecideRepair()
  const startPayment = useStartRepairPayment()
  const payDemo = usePayRepairDemo()
  const { data: settings } = useSiteSettings()

  if (repair.status === 'awaiting_approval') {
    return (
      <div className="space-y-2 pt-1">
        <p className="rounded-2xl bg-surface-2 p-3.5 text-[12px] leading-6">
          هزینه‌ی تعمیر <b className="num">{formatPrice(repair.finalCost ?? 0)}</b> برآورد شده است. با تأیید،
          به مرحله‌ی پرداخت می‌روید و پس از آن تعمیر شروع می‌شود.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={decide.isPending}
            onClick={() =>
              decide.mutate(
                { code: repair.code, decision: 'approve' },
                { onSuccess: () => toast.success('هزینه تأیید شد — حالا می‌توانید پرداخت کنید') },
              )
            }
          >
            تأیید هزینه
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={decide.isPending}
            onClick={() =>
              decide.mutate(
                { code: repair.code, decision: 'reject' },
                { onSuccess: () => toast.success('درخواست شما بسته شد') },
              )
            }
          >
            انصراف
          </Button>
        </div>
      </div>
    )
  }

  if (repair.status !== 'awaiting_payment') return null

  /** دمو یا بانک واقعی را سرور تصمیم می‌گیرد، نه مرورگر */
  const pay = () =>
    startPayment.mutate(repair.code, {
      onSuccess: (result) => {
        if (result.mode === 'gateway') {
          redirectToGateway(result)
          return
        }
        // در حالت دمو تراکنش واقعی‌ای نیست؛ نتیجه همان چیزی است که در پنل تنظیم شده
        payDemo.mutate(
          { code: repair.code, outcome: 'success' },
          {
            onSuccess: () => toast.success('پرداخت آزمایشی انجام شد — تعمیر شروع می‌شود'),
            onError: (error: Error) => toast.error(error.message),
          },
        )
      },
      onError: (error: Error) => toast.error(error.message),
    })

  const pending = startPayment.isPending || payDemo.isPending

  return (
    <div className="space-y-2 pt-1">
      <p className="rounded-2xl bg-ember-500/8 p-3.5 text-[12px] leading-6 text-ember-700 dark:text-ember-300">
        هزینه را تأیید کرده‌اید. پس از پرداخت <b className="num">{formatPrice(repair.finalCost ?? 0)}</b> تعمیر
        دستگاه شروع می‌شود.
        {settings?.payment.demo.enabled && ' (درگاه آزمایشی روشن است و مبلغی کم نمی‌شود.)'}
      </p>
      <Button size="sm" disabled={pending} onClick={pay}>
        <CreditCard className="size-4" />
        {pending ? 'در حال اتصال…' : 'پرداخت هزینه تعمیر'}
      </Button>
    </div>
  )
}
