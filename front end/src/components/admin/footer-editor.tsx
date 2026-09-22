'use client'

import { useEffect, useState } from 'react'
import { z } from 'zod'
import { Plus, Save, Sparkles, Trash2 } from 'lucide-react'
import { FOOTER_SOURCE_LABEL, type FooterColumnSource, type FooterConfig, type SiteSettings } from '@/types/cms'
import { useFooterLinks } from '@/components/layout/footer'
import { useSaveSettings, useSiteSettings } from '@/lib/api/queries'
import { AdminCard } from '@/components/admin/data-table'
import { BlockToggle, EditorRow, IconPicker } from '@/components/admin/editor-bits'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { LinkField, LINK_HINT } from '@/components/admin/link-field'
import { LoadError } from '@/components/ui/load-error'
import { toast } from '@/components/ui/toast'
import { useForm } from '@/lib/use-form'
import { linkSchema, optionalText, requiredText } from '@/lib/validation'
import { getIcon } from '@/lib/icons'
import { uid } from '@/lib/utils'

const footerSchema = z.object({
  description: optionalText(300, 'متن معرفی فوتر'),
  badges: z.object({
    items: z.array(
      z.object({
        title: requiredText('عنوان نشان', 2),
        text: optionalText(80, 'توضیح نشان'),
      }),
    ),
  }),
  columns: z.array(
    z.object({
      title: requiredText('عنوان ستون', 2),
      links: z.array(z.object({ label: requiredText('عنوان لینک', 2), href: linkSchema })),
    }),
  ),
})

/**
 * محتوای فوتر — نشان‌های اعتماد، متن معرفی و ستون‌های لینک.
 * آدرس، تلفن، ایمیل و شبکه‌های اجتماعیِ فوتر از «تنظیمات سایت» می‌آید.
 */
export function FooterEditor() {
  const { data, isLoading, isError, refetch } = useSiteSettings()
  const saveSettings = useSaveSettings()
  const [draft, setDraft] = useState<SiteSettings | null>(null)
  const form = useForm(footerSchema)
  const linksOf = useFooterLinks()

  useEffect(() => {
    if (data && !draft) setDraft(structuredClone(data))
  }, [data, draft])

  if (isError) return <LoadError onRetry={() => refetch()} />

  if (isLoading || !draft) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-56 rounded-card" />
        <Skeleton className="h-72 rounded-card" />
      </div>
    )
  }

  const footer = draft.footer

  /** هر تغییری بعد از اولین تلاش برای ذخیره، خطاها را زنده به‌روز می‌کند */
  const update = (next: FooterConfig) => {
    const settings = { ...draft, footer: next }
    setDraft(settings)
    form.revalidate(next)
  }

  const dirty = JSON.stringify(draft.footer) !== JSON.stringify(data?.footer)

  const save = () => {
    if (!form.validate(footer)) {
      toast.error('چند فیلد ایراد دارد — لطفاً پیام‌های قرمز را بررسی کنید')
      return
    }
    saveSettings.mutate(draft, {
      onSuccess: (saved) => {
        setDraft(structuredClone(saved))
        form.reset()
        toast.success('فوتر سایت ذخیره شد')
      },
      onError: (error) => toast.error(error.message),
    })
  }

  const patchBadge = (id: string, patch: Partial<FooterConfig['badges']['items'][number]>) =>
    update({
      ...footer,
      badges: {
        ...footer.badges,
        items: footer.badges.items.map((b) => (b.id === id ? { ...b, ...patch } : b)),
      },
    })

  const patchColumn = (id: string, patch: Partial<FooterConfig['columns'][number]>) =>
    update({ ...footer, columns: footer.columns.map((c) => (c.id === id ? { ...c, ...patch } : c)) })

  // هر ستون خودکار یک بار کافی است؛ اگر حذف شده باشد، دکمه‌ی برگرداندنش پیدا می‌شود
  const missingAuto = (Object.keys(FOOTER_SOURCE_LABEL) as Exclude<FooterColumnSource, 'manual'>[]).filter(
    (source) => !footer.columns.some((c) => c.source === source),
  )

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button loading={saveSettings.isPending} disabled={!dirty} onClick={save}>
          <Save className="size-4" />
          ذخیره فوتر
        </Button>
      </div>

      <AdminCard
        title="نشان‌های اعتماد"
        action={
          <BlockToggle
            checked={footer.badges.enabled}
            onChange={(enabled) => update({ ...footer, badges: { ...footer.badges, enabled } })}
          />
        }
      >
        <div className="space-y-4 p-5">
          {/* پیش‌نمایش با همان ظاهری که بالای فوتر دیده می‌شود */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-muted">پیش‌نمایش</span>
            {footer.badges.enabled && footer.badges.items.length > 0 ? (
              <div className="grid gap-4 rounded-2xl border border-border p-4 sm:grid-cols-2 lg:grid-cols-4">
                {footer.badges.items.map((badge) => {
                  const Icon = getIcon(badge.icon)
                  return (
                    <div key={badge.id} className="flex items-center gap-3">
                      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                        <Icon className="size-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-bold">{badge.title || 'عنوان…'}</span>
                        <span className="block truncate text-xs text-muted">{badge.text}</span>
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border py-2.5 text-center text-[12px] text-muted">
                نوار نشان‌ها در فوتر نمایش داده نمی‌شود.
              </p>
            )}
          </div>

          {footer.badges.items.map((badge, i) => (
            <EditorRow
              key={badge.id}
              title={`نشان ${i + 1}`}
              onDelete={() =>
                update({
                  ...footer,
                  badges: { ...footer.badges, items: footer.badges.items.filter((b) => b.id !== badge.id) },
                })
              }
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <IconPicker value={badge.icon} onChange={(icon) => patchBadge(badge.id, { icon })} />
                <Field label="عنوان" required error={form.errors[`badges.items.${i}.title`]}>
                  <Input
                    value={badge.title}
                    onChange={(e) => patchBadge(badge.id, { title: e.target.value })}
                    invalid={Boolean(form.errors[`badges.items.${i}.title`])}
                  />
                </Field>
                <Field label="توضیح" error={form.errors[`badges.items.${i}.text`]}>
                  <Input
                    value={badge.text}
                    onChange={(e) => patchBadge(badge.id, { text: e.target.value })}
                    invalid={Boolean(form.errors[`badges.items.${i}.text`])}
                  />
                </Field>
              </div>
            </EditorRow>
          ))}

          <Button
            variant="outline"
            block
            onClick={() =>
              update({
                ...footer,
                badges: {
                  ...footer.badges,
                  items: [
                    ...footer.badges.items,
                    { id: uid('tb'), icon: 'shield-check', title: 'عنوان نشان', text: 'توضیح کوتاه' },
                  ],
                },
              })
            }
          >
            <Plus className="size-4" />
            افزودن نشان
          </Button>
        </div>
      </AdminCard>

      <AdminCard title="متن معرفی">
        <div className="p-5">
          <Field
            label="متن زیر لوگو"
            hint="حداکثر ۳۰۰ حرف — آدرس، تلفن و ایمیل زیر همین متن از تنظیمات سایت می‌آید"
            error={form.errors.description}
          >
            <Textarea
              value={footer.description}
              onChange={(e) => update({ ...footer, description: e.target.value })}
              invalid={Boolean(form.errors.description)}
              className="min-h-24"
            />
          </Field>
        </div>
      </AdminCard>

      <AdminCard title="ستون‌های لینک">
        <div className="space-y-4 p-5">
          {footer.columns.map((column, ci) => (
            <EditorRow
              key={column.id}
              title={
                column.source && column.source !== 'manual'
                  ? `ستون ${ci + 1} — خودکار از ${FOOTER_SOURCE_LABEL[column.source]}`
                  : `ستون ${ci + 1}`
              }
              onDelete={() => update({ ...footer, columns: footer.columns.filter((c) => c.id !== column.id) })}
            >
              <Field label="عنوان ستون" required error={form.errors[`columns.${ci}.title`]}>
                <Input
                  value={column.title}
                  onChange={(e) => patchColumn(column.id, { title: e.target.value })}
                  invalid={Boolean(form.errors[`columns.${ci}.title`])}
                />
              </Field>

              {column.source && column.source !== 'manual' ? (
                <div className="space-y-2.5 rounded-2xl bg-surface-2 p-4">
                  <p className="flex items-start gap-2 text-[12px] leading-6 text-muted">
                    <Sparkles className="mt-1 size-3.5 shrink-0 text-brand-500" />
                    {column.source === 'categories'
                      ? 'لینک‌ها خودکار از دسته‌بندی‌ها ساخته می‌شوند — هر دسته‌ای که کالای قابل نمایش دارد. با افزودن، حذف یا تغییر نام دسته، فوتر خودش به‌روز می‌شود.'
                      : 'لینک‌ها خودکار از بخش تعمیرات ساخته می‌شوند — هر نوع دستگاهی که مشکلی برایش تعریف شده، به‌علاوه‌ی «پیگیری تعمیر».'}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {linksOf(column).map((link) => (
                      <span key={link.id} className="rounded-lg border border-border bg-surface px-2.5 py-1 text-[12px]">
                        {link.label}
                      </span>
                    ))}
                    {!linksOf(column).length && <span className="text-[12px] text-muted">فعلاً چیزی برای نمایش نیست.</span>}
                  </div>
                </div>
              ) : (
              <div className="space-y-2.5">
                {column.links.map((link, li) => (
                  <div key={link.id} className="flex items-end gap-2">
                    <Field
                      label={`عنوان لینک ${li + 1}`}
                      className="flex-1"
                      error={form.errors[`columns.${ci}.links.${li}.label`]}
                    >
                      <Input
                        value={link.label}
                        onChange={(e) =>
                          patchColumn(column.id, {
                            links: column.links.map((l) => (l.id === link.id ? { ...l, label: e.target.value } : l)),
                          })
                        }
                        invalid={Boolean(form.errors[`columns.${ci}.links.${li}.label`])}
                      />
                    </Field>
                    <Field
                      label="آدرس"
                      className="flex-1"
                      error={form.errors[`columns.${ci}.links.${li}.href`]}
                    >
                      <LinkField
                        value={link.href}
                        onChange={(href) =>
                          patchColumn(column.id, {
                            links: column.links.map((l) => (l.id === link.id ? { ...l, href } : l)),
                          })
                        }
                        invalid={Boolean(form.errors[`columns.${ci}.links.${li}.href`])}
                      />
                    </Field>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="حذف لینک"
                      className="mb-2 text-muted hover:text-red-500"
                      onClick={() =>
                        patchColumn(column.id, { links: column.links.filter((l) => l.id !== link.id) })
                      }
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  block
                  onClick={() =>
                    patchColumn(column.id, {
                      links: [...column.links, { id: uid('fl'), label: 'عنوان لینک', href: '/products' }],
                    })
                  }
                >
                  <Plus className="size-3.5" />
                  افزودن لینک
                </Button>
              </div>
              )}
            </EditorRow>
          ))}

          <Button
            variant="outline"
            block
            onClick={() =>
              update({
                ...footer,
                columns: [
                  ...footer.columns,
                  {
                    id: uid('fc'),
                    title: 'ستون جدید',
                    source: 'manual',
                    links: [{ id: uid('fl'), label: 'عنوان لینک', href: '/' }],
                  },
                ],
              })
            }
          >
            <Plus className="size-4" />
            افزودن ستون
          </Button>

          {missingAuto.map((source) => (
            <Button
              key={source}
              variant="soft"
              block
              onClick={() =>
                update({
                  ...footer,
                  columns: [
                    ...footer.columns,
                    { id: uid('fc'), title: source === 'categories' ? 'دسته‌بندی‌ها' : 'خدمات', source, links: [] },
                  ],
                })
              }
            >
              <Sparkles className="size-4" />
              افزودن ستون خودکار {FOOTER_SOURCE_LABEL[source]}
            </Button>
          ))}
        </div>
      </AdminCard>
    </div>
  )
}
