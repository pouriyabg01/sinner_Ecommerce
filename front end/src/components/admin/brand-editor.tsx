'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { RotateCcw, Save } from 'lucide-react'
import type { SiteSettings } from '@/types/cms'
import { useSaveSettings, useSiteSettings } from '@/lib/api/queries'
import { AdminCard } from '@/components/admin/data-table'
import { SingleImageField } from '@/components/admin/image-field'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadError } from '@/components/ui/load-error'
import { toast } from '@/components/ui/toast'
import { useForm } from '@/lib/use-form'
import { optionalText, requiredText } from '@/lib/validation'
import { BRAND_FALLBACK, DEFAULT_FAVICON, MARK_PATHS } from '@/lib/brand'

const brandSchema = z.object({
  siteName: requiredText('نام سایت'),
  wordmark: requiredText('واژه‌نشان'),
  caption: optionalText(40, 'زیرنویس نشان'),
})

/**
 * نشان، نام و آیکون تب مرورگر. این سه کنار هم‌اند چون کاربر آن‌ها را با هم
 * می‌بیند: نشانِ هدر، متن کنارش، و همان چیزی که در تب مرورگر باز است.
 */
export function BrandEditor() {
  const { data, isLoading, isError, refetch } = useSiteSettings()
  const saveSettings = useSaveSettings()
  const [draft, setDraft] = useState<SiteSettings | null>(null)
  const form = useForm(brandSchema)

  useEffect(() => {
    if (data && !draft) setDraft(structuredClone(data))
  }, [data, draft])

  if (isError) return <LoadError onRetry={() => refetch()} />
  if (isLoading || !draft) return <Skeleton className="h-96 rounded-card" />

  const values = {
    siteName: draft.siteName,
    wordmark: draft.brand.wordmark,
    caption: draft.brand.caption,
  }

  const update = (next: SiteSettings) => {
    setDraft(next)
    form.revalidate({
      siteName: next.siteName,
      wordmark: next.brand.wordmark,
      caption: next.brand.caption,
    })
  }

  const patchBrand = (patch: Partial<SiteSettings['brand']>) =>
    update({ ...draft, brand: { ...draft.brand, ...patch } })

  const dirty = JSON.stringify(draft) !== JSON.stringify(data)

  const save = () => {
    const parsed = form.validate(values)
    if (!parsed) return toast.error('چند فیلد ایراد دارد — پیام‌های قرمز را بررسی کنید')

    saveSettings.mutate(
      {
        ...draft,
        siteName: parsed.siteName,
        brand: { ...draft.brand, wordmark: parsed.wordmark, caption: parsed.caption },
      },
      {
        onSuccess: (saved) => {
          setDraft(structuredClone(saved))
          form.reset()
          toast.success('نشان و نام سایت ذخیره شد')
        },
        onError: (error) => toast.error(error.message),
      },
    )
  }

  return (
    <AdminCard
      title="نشان و نام سایت"
      action={
        <Button size="sm" loading={saveSettings.isPending} disabled={!dirty} onClick={save}>
          <Save className="size-4" />
          ذخیره نشان
        </Button>
      }
    >
      <div className="space-y-5 p-5">
        {/* پیش‌نمایش با همان ابعاد و فاصله‌هایی که در هدر سایت رندر می‌شود */}
        <div className="space-y-2">
          <span className="text-[11px] text-muted">پیش‌نمایش هدر</span>
          <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-surface-2/40 p-4">
            <MarkPreview src={draft.brand.mark} />
            <span className="flex flex-col leading-none">
              <span className="font-display text-lg font-bold tracking-[0.18em]">
                {draft.brand.wordmark || BRAND_FALLBACK.wordmark}
              </span>
              {draft.brand.caption && (
                <span className="pt-1 text-[10px] text-muted">{draft.brand.caption}</span>
              )}
            </span>

            {/* شبیه‌سازی تب مرورگر تا آیکون در اندازه‌ی واقعی‌اش دیده شود */}
            <span className="ms-auto flex items-center gap-2 rounded-t-lg border border-border border-b-0 bg-surface px-3 py-2">
              <Image
                src={draft.brand.favicon || DEFAULT_FAVICON}
                alt=""
                width={16}
                height={16}
                unoptimized
                className="size-4 rounded-[3px] object-contain"
              />
              <span className="max-w-32 truncate text-[11px] text-muted">
                {draft.siteName || BRAND_FALLBACK.siteName}
              </span>
            </span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="نام سایت" required hint="در تب مرورگر و فوتر دیده می‌شود" error={form.errors.siteName}>
            <Input
              value={draft.siteName}
              invalid={Boolean(form.errors.siteName)}
              onChange={(e) => update({ ...draft, siteName: e.target.value })}
            />
          </Field>

          <Field label="واژه‌نشان" required hint="متن بزرگ کنار نشان" error={form.errors.wordmark}>
            <Input
              value={draft.brand.wordmark}
              invalid={Boolean(form.errors.wordmark)}
              onChange={(e) => patchBrand({ wordmark: e.target.value })}
            />
          </Field>
        </div>

        <Field
          label="زیرنویس نشان"
          hint="خط کوچک زیر واژه‌نشان؛ خالی بگذارید تا نمایش داده نشود. حداکثر ۴۰ حرف."
          error={form.errors.caption}
        >
          <Input
            value={draft.brand.caption}
            invalid={Boolean(form.errors.caption)}
            onChange={(e) => patchBrand({ caption: e.target.value })}
          />
        </Field>

        <div className="grid gap-5 border-t border-border pt-5 sm:grid-cols-2">
          <div className="space-y-2">
            <SingleImageField
              label="تصویر نشان"
              hint="مربع و ترجیحاً PNG یا SVG با پس‌زمینه‌ی شفاف. خالی بگذارید تا نشان پیش‌فرض بماند."
              value={draft.brand.mark}
              onChange={(mark) => patchBrand({ mark })}
            />
            {draft.brand.mark && (
              <Button variant="ghost" size="sm" onClick={() => patchBrand({ mark: '' })}>
                <RotateCcw className="size-3.5" />
                بازگشت به نشان پیش‌فرض
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <SingleImageField
              label="آیکون تب مرورگر"
              hint="مرورگر آن را در ۱۶ تا ۳۲ پیکسل نشان می‌دهد، پس تصویر ساده انتخاب کنید. خالی یعنی همان نشان پیش‌فرض."
              value={draft.brand.favicon}
              onChange={(favicon) => patchBrand({ favicon })}
            />
            {draft.brand.favicon && (
              <Button variant="ghost" size="sm" onClick={() => patchBrand({ favicon: '' })}>
                <RotateCcw className="size-3.5" />
                بازگشت به آیکون پیش‌فرض
              </Button>
            )}
          </div>
        </div>
      </div>
    </AdminCard>
  )
}

/** همان مربع نشان در هدر؛ اینجا فقط برای پیش‌نمایش تکرار می‌شود */
function MarkPreview({ src }: { src: string }) {
  if (src) {
    return (
      <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-2xl bg-surface-2">
        <Image src={src} alt="" width={40} height={40} unoptimized className="size-full object-contain" />
      </span>
    )
  }

  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-glow">
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2">
        {MARK_PATHS.map((d) => (
          <path key={d} d={d} strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </svg>
    </span>
  )
}
