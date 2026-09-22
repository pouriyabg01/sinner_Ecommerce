'use client'

import { useEffect, useState } from 'react'
import { z } from 'zod'
import { Save, Sparkles } from 'lucide-react'
import type { SiteSettings } from '@/types/cms'
import { useSaveSettings, useSiteSettings } from '@/lib/api/queries'
import { AdminCard } from '@/components/admin/data-table'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { LinkField, LINK_HINT } from '@/components/admin/link-field'
import { LoadError } from '@/components/ui/load-error'
import { toast } from '@/components/ui/toast'
import { useForm } from '@/lib/use-form'
import { linkSchema, optionalText } from '@/lib/validation'

const announcementSchema = z.object({
  text: optionalText(120, 'متن اعلان'),
  href: linkSchema,
})

/**
 * نوار اعلان بالای سایت.
 * قواعد ارسال پیش‌تر همین‌جا ویرایش می‌شد؛ حالا فقط در «تنظیمات ← هزینه ارسال»
 * است تا یک مقدار دو جای ویرایش نداشته باشد.
 */
export function AnnouncementEditor() {
  const { data, isLoading, isError, refetch } = useSiteSettings()
  const saveSettings = useSaveSettings()
  const [draft, setDraft] = useState<SiteSettings | null>(null)
  const form = useForm(announcementSchema)

  useEffect(() => {
    if (data && !draft) setDraft(structuredClone(data))
  }, [data, draft])

  if (isError) return <LoadError onRetry={() => refetch()} />
  if (isLoading || !draft) return <Skeleton className="h-72 rounded-card" />

  const values = {
    text: draft.announcement.text,
    href: draft.announcement.href,
  }

  const update = (next: SiteSettings) => {
    setDraft(next)
    form.revalidate({ text: next.announcement.text, href: next.announcement.href })
  }

  const patchAnnouncement = (patch: Partial<SiteSettings['announcement']>) =>
    update({ ...draft, announcement: { ...draft.announcement, ...patch } })

  const dirty = JSON.stringify(draft) !== JSON.stringify(data)

  const save = () => {
    const parsed = form.validate(values)
    if (!parsed) return

    const next: SiteSettings = {
      ...draft,
      announcement: { ...draft.announcement, text: parsed.text, href: parsed.href },
    }

    saveSettings.mutate(next, {
      onSuccess: (saved) => {
        setDraft(structuredClone(saved))
        form.reset()
        toast.success('نوار اعلان ذخیره شد')
      },
      onError: (error) => toast.error(error.message),
    })
  }

  return (
    <AdminCard
      title="نوار اعلان بالای سایت"
      action={
        <Button size="sm" loading={saveSettings.isPending} disabled={!dirty} onClick={save}>
          <Save className="size-4" />
          ذخیره اعلان
        </Button>
      }
    >
      <div className="space-y-4 p-5">
        {/* پیش‌نمایش دقیقاً با همان ظاهری که در هدر سایت دیده می‌شود */}
        <div className="space-y-1.5">
          <span className="text-[11px] text-muted">پیش‌نمایش</span>
          {draft.announcement.enabled ? (
            <div className="rounded-xl bg-gradient-to-l from-brand-600 via-brand-500 to-brand-600 py-2.5 text-center text-[12.5px] font-medium text-white">
              <span className="inline-flex items-center gap-2">
                <Sparkles className="size-3.5" />
                {draft.announcement.text || 'متن اعلان…'}
              </span>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border py-2.5 text-center text-[12px] text-muted">
              نوار اعلان خاموش است — در سایت نمایش داده نمی‌شود.
            </p>
          )}
        </div>

        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={draft.announcement.enabled}
            onChange={(e) => patchAnnouncement({ enabled: e.target.checked })}
            className="size-4 accent-[var(--color-brand-500)]"
          />
          <span className="text-[13px]">نوار اعلان نمایش داده شود</span>
        </label>

        <Field label="متن اعلان" hint="حداکثر ۱۲۰ حرف" error={form.errors.text}>
          <Input
            value={draft.announcement.text}
            onChange={(e) => patchAnnouncement({ text: e.target.value })}
            invalid={Boolean(form.errors.text)}
          />
        </Field>

        <Field label="لینک اعلان" hint={LINK_HINT} error={form.errors.href}>
          <LinkField
            value={draft.announcement.href}
            onChange={(href) => patchAnnouncement({ href })}
            invalid={Boolean(form.errors.href)}
            placeholder="/repair"
          />
        </Field>
      </div>
    </AdminCard>
  )
}
