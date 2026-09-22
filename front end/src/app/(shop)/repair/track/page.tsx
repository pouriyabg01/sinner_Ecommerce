'use client'

import { useState } from 'react'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { PackageSearch, Search } from 'lucide-react'
import { repairApi } from '@/lib/api/endpoints'
import type { RepairTracking } from '@/types/repair'
import { DEVICE_KIND_LABEL, PICKUP_METHOD_LABEL, REPAIR_STATUS_LABEL } from '@/types/repair'
import { RepairTimeline } from '@/components/repair/status-timeline'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { useForm } from '@/lib/use-form'
import { requiredText } from '@/lib/validation'
import { formatDate, formatPrice, toEnDigits } from '@/lib/format'

const trackSchema = z.object({
  code: requiredText('کد پیگیری', 6).transform((v) => toEnDigits(v).toUpperCase()),
})

export default function TrackRepairPage() {
  const [code, setCode] = useState('')
  const [result, setResult] = useState<RepairTracking | null>(null)
  const [notFound, setNotFound] = useState(false)
  const form = useForm(trackSchema)

  const search = useMutation({
    mutationFn: (value: string) => repairApi.detail(value),
    onSuccess: (data) => {
      setResult(data)
      setNotFound(false)
    },
    onError: () => {
      setResult(null)
      setNotFound(true)
    },
  })

  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">پیگیری سفارش تعمیر</h1>
          <p className="text-sm text-muted">کد پیگیری‌ای که هنگام ثبت درخواست دریافت کرده‌اید را وارد کنید.</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            const values = form.validate({ code })
            if (!values) return
            search.mutate(values.code)
          }}
          noValidate
          className="space-y-2"
        >
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={code}
              onChange={(e) => {
                setCode(e.target.value)
                form.revalidate({ code: e.target.value })
              }}
              invalid={Boolean(form.errors.code)}
              aria-label="کد پیگیری"
              placeholder="مثلاً RP-48213"
              className="en-code h-12 flex-1 text-center"
              dir="ltr"
            />
            <Button type="submit" size="lg" loading={search.isPending}>
              <Search className="size-4" />
              پیگیری
            </Button>
          </div>
          {form.errors.code ? (
            <p role="alert" className="text-center text-xs text-red-500">
              {form.errors.code}
            </p>
          ) : (
            <p className="text-center text-xs text-muted">
              کد را با حروف و اعداد انگلیسی وارد کنید؛ مثل <span className="en-code">RP-48213</span>
            </p>
          )}
        </form>

        {notFound && (
          <div className="rounded-card border border-border bg-surface">
            <EmptyState
              icon={PackageSearch}
              title="درخواستی با این کد پیدا نشد"
              description="کد را دوباره بررسی کن. کدها با RP شروع می‌شوند و ارقامشان انگلیسی است."
            />
          </div>
        )}

        {result && (
          <div className="space-y-5 rounded-card border border-border bg-surface p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <div>
                <p className="en-code text-sm font-bold">{result.code}</p>
                <p className="mt-1 text-[11px] text-muted">ثبت شده در {formatDate(result.createdAt)}</p>
              </div>
              <Badge tone="brand">{REPAIR_STATUS_LABEL[result.status]}</Badge>
            </div>

            <dl className="grid gap-4 text-[13px] sm:grid-cols-2">
              {[
                { label: 'دستگاه', value: `${DEVICE_KIND_LABEL[result.deviceKind]} — ${result.deviceBrand} ${result.deviceModel}` },
                { label: 'روش تحویل', value: PICKUP_METHOD_LABEL[result.pickupMethod] },
                {
                  label: 'برآورد اولیه',
                  value: `${formatPrice(result.estimatedCost.min, false)} تا ${formatPrice(result.estimatedCost.max)}`,
                },
                {
                  label: 'هزینه نهایی',
                  value: result.finalCost ? formatPrice(result.finalCost) : 'هنوز اعلام نشده',
                },
              ].map((row) => (
                <div key={row.label}>
                  <dt className="mb-1 text-[11px] text-muted">{row.label}</dt>
                  <dd className="num leading-7">{row.value}</dd>
                </div>
              ))}
            </dl>

            {result.technicianNote && (
              <div className="rounded-2xl bg-surface-2 p-4 text-[12.5px] leading-7">
                <span className="font-bold">یادداشت تکنسین: </span>
                {result.technicianNote}
              </div>
            )}

            <div className="border-t border-border pt-5">
              <p className="mb-4 text-[13px] font-bold">مراحل انجام</p>
              <RepairTimeline timeline={result.timeline} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
