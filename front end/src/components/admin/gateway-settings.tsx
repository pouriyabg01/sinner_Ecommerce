'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, ExternalLink, Eraser, Landmark, Loader2, ShieldCheck } from 'lucide-react'
import { toast } from '@/components/ui/toast'
import { paymentGatewayApi } from '@/lib/api/endpoints'
import type { GatewayCredentials, GatewayDescriptor } from '@/types/payment-gateway'
import { AdminCard } from '@/components/admin/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/input'

const QUERY_KEY = ['admin', 'payment-gateway']

/**
 * فرم درگاه پرداخت.
 *
 * هیچ درگاهی اینجا hard-code نشده: فهرست و فیلدهای هرکدام از سرور می‌آید، پس
 * اضافه شدن درگاه تازه در بک‌اند بدون هیچ تغییری اینجا دیده می‌شود.
 *
 * مقدار محرمانه هیچ‌وقت از سرور برنمی‌گردد؛ ورودی خالی یعنی «همان قبلی بماند».
 */
export function GatewaySettingsCard() {
  const queryClient = useQueryClient()
  const { data, isPending } = useQuery({ queryKey: QUERY_KEY, queryFn: paymentGatewayApi.settings })

  const [driver, setDriver] = useState<string>('')
  const [draft, setDraft] = useState<GatewayCredentials>({})

  // تا وقتی پاسخ سرور نرسیده درگاهی برای انتخاب نیست
  useEffect(() => {
    if (data && !driver) setDriver(data.driver)
  }, [data, driver])

  // عوض کردن درگاه یعنی شروع از مقدارهای ذخیره‌شده‌ی همان درگاه
  useEffect(() => {
    if (data && driver) setDraft({ ...data.credentials[driver] })
  }, [data, driver])

  const gateway: GatewayDescriptor | undefined = useMemo(
    () => data?.catalog.find((g) => g.id === driver),
    [data, driver],
  )

  const save = useMutation({
    mutationFn: () => paymentGatewayApi.save({ driver, credentials: draft }),
    onSuccess: (next) => {
      queryClient.setQueryData(QUERY_KEY, next)
      setDraft({ ...next.credentials[driver] })
      toast.success('تنظیمات درگاه ذخیره شد')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const forget = useMutation({
    mutationFn: (field: string) => paymentGatewayApi.forget(driver, field),
    onSuccess: (next) => {
      queryClient.setQueryData(QUERY_KEY, next)
      setDraft({ ...next.credentials[driver] })
      toast.success('مقدار پاک شد')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  if (isPending || !data || !gateway) {
    return (
      <AdminCard title="درگاه بانکی">
        <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted">
          <Loader2 className="size-4 animate-spin" />
          در حال بارگذاری درگاه‌ها…
        </div>
      </AdminCard>
    )
  }

  const patch = (key: string, value: string | boolean) => setDraft((d) => ({ ...d, [key]: value }))
  const ready = data.configured[driver]
  const missing = gateway.fields.filter((f) => !draft[`${f.key}Set`] && !String(draft[f.key] ?? '').trim())

  return (
    <AdminCard
      title="درگاه بانکی"
      action={
        <span className="flex items-center gap-2 text-[11px] text-muted">
          <Landmark className="size-3.5" />
          {data.catalog.length} درگاه پشتیبانی می‌شود
        </span>
      }
    >
      <div className="space-y-5 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="ارائه‌دهنده" hint="درگاهی که سفارش‌های اینترنتی به آن می‌روند">
            <Select value={driver} onChange={(e) => setDriver(e.target.value)}>
              {data.catalog.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                  {data.configured[g.id] ? ' ✓' : ''}
                </option>
              ))}
            </Select>
          </Field>

          <div className="flex items-end">
            {ready ? (
              <Badge tone="success" className="gap-1.5">
                <CheckCircle2 className="size-3.5" />
                تنظیم شده و آماده
              </Badge>
            ) : (
              <Badge tone="warning">
                {missing.length} فیلد باقی مانده
              </Badge>
            )}
          </div>
        </div>

        {(gateway.note || gateway.site) && (
          <p className="flex flex-wrap items-center gap-2 rounded-2xl bg-surface-2/60 px-3.5 py-3 text-[12px] leading-6 text-muted">
            {gateway.note}
            {gateway.site && (
              <a
                href={gateway.site}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 font-medium text-brand-600 hover:underline dark:text-brand-400"
              >
                پنل {gateway.label}
                <ExternalLink className="size-3" />
              </a>
            )}
          </p>
        )}

        {gateway.fields.length === 0 && gateway.choices.length === 0 && gateway.toggles.length === 0 ? (
          <p className="rounded-2xl bg-surface-2/60 px-3.5 py-3 text-[12px] text-muted">
            این درگاه تنظیماتی لازم ندارد.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {gateway.choices.map((choice) => (
              <Field key={choice.key} label={choice.label}>
                <Select
                  value={String(draft[choice.key] ?? choice.default)}
                  onChange={(e) => patch(choice.key, e.target.value)}
                >
                  {choice.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </Field>
            ))}

            {gateway.fields.map((field) => {
              const isSet = Boolean(draft[`${field.key}Set`])
              const hint = field.secret
                ? isSet
                  ? 'ذخیره شده است — برای تغییر، مقدار تازه را وارد کنید'
                  : (field.hint ?? 'این مقدار رمزنگاری‌شده ذخیره می‌شود')
                : (field.hint ?? undefined)

              return (
                <Field
                  key={field.key}
                  label={field.label}
                  hint={hint}
                  required
                  className={field.multiline ? 'sm:col-span-2' : undefined}
                >
                  <div className="flex items-start gap-2">
                    {field.multiline ? (
                      <Textarea
                        value={String(draft[field.key] ?? '')}
                        dir="ltr"
                        className="text-start"
                        placeholder={isSet ? '••••••••  (ذخیره شده)' : ''}
                        onChange={(e) => patch(field.key, e.target.value)}
                      />
                    ) : (
                      <Input
                        value={String(draft[field.key] ?? '')}
                        dir="ltr"
                        type={field.secret ? 'password' : 'text'}
                        autoComplete="off"
                        className="text-start"
                        placeholder={isSet ? '••••••••  (ذخیره شده)' : ''}
                        onChange={(e) => patch(field.key, e.target.value)}
                      />
                    )}

                    {field.secret && isSet && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="پاک کردن مقدار ذخیره‌شده"
                        disabled={forget.isPending}
                        onClick={() => forget.mutate(field.key)}
                      >
                        <Eraser className="size-4" />
                      </Button>
                    )}
                  </div>
                </Field>
              )
            })}

            {gateway.toggles.map((toggle) => (
              <label
                key={toggle.key}
                className="flex cursor-pointer items-center gap-2.5 self-end rounded-2xl border border-border px-4 py-3 text-[13px]"
              >
                <input
                  type="checkbox"
                  checked={Boolean(draft[toggle.key])}
                  onChange={(e) => patch(toggle.key, e.target.checked)}
                  className="size-4 accent-[var(--color-brand-500)]"
                />
                <span>
                  {toggle.label}
                  {toggle.hint && <span className="block text-[11px] text-muted">{toggle.hint}</span>}
                </span>
              </label>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <span className="flex items-center gap-1.5 text-[11px] text-muted">
            <ShieldCheck className="size-3.5" />
            مقدارهای محرمانه رمزنگاری‌شده ذخیره می‌شوند و هرگز در صفحات عمومی سایت نمی‌آیند
          </span>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? 'در حال ذخیره…' : 'ذخیره‌ی درگاه'}
          </Button>
        </div>
      </div>
    </AdminCard>
  )
}
