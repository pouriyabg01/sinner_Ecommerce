'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { z } from 'zod'
import { ExternalLink, Plus, RotateCcw, Save } from 'lucide-react'
import type { AboutPageConfig } from '@/types/cms'
import { useAboutConfig, useSaveAboutConfig } from '@/lib/api/queries'
import { AdminCard } from '@/components/admin/data-table'
import { BlockToggle, EditorRow, IconPicker } from '@/components/admin/editor-bits'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadError } from '@/components/ui/load-error'
import { toast } from '@/components/ui/toast'
import { useForm } from '@/lib/use-form'
import { optionalText, requiredText } from '@/lib/validation'
import { uid } from '@/lib/utils'

const aboutSchema = z.object({
  hero: z.object({
    title: requiredText('عنوان سربرگ'),
    body: optionalText(700, 'متن سربرگ'),
  }),
  stats: z.object({
    items: z.array(
      z.object({
        value: requiredText('مقدار آمار', 1),
        label: requiredText('برچسب آمار', 2),
      }),
    ),
  }),
  values: z.object({
    items: z.array(
      z.object({
        title: requiredText('عنوان ارزش'),
        text: optionalText(500, 'توضیح ارزش'),
      }),
    ),
  }),
  contact: z.object({
    title: requiredText('عنوان بلوک تماس'),
    description: optionalText(500, 'توضیح بلوک تماس'),
  }),
  terms: z.object({
    title: requiredText('عنوان قوانین'),
    items: z.array(z.object({ text: requiredText('متن بند', 5) })),
  }),
})

/** محتوای صفحه‌ی «درباره ما» — داخل تب طراحی سایت رندر می‌شود */
export function AboutEditor() {
  const { data, isLoading, isError, refetch } = useAboutConfig()
  const saveAbout = useSaveAboutConfig()
  const [draft, setDraft] = useState<AboutPageConfig | null>(null)
  const form = useForm(aboutSchema)

  useEffect(() => {
    if (data && !draft) setDraft(structuredClone(data))
  }, [data, draft])

  if (isError) return <LoadError onRetry={() => refetch()} />

  if (isLoading || !draft) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-card" />
        <Skeleton className="h-64 rounded-card" />
        <Skeleton className="h-64 rounded-card" />
      </div>
    )
  }

  /** هر تغییری بعد از اولین تلاش برای ذخیره، خطاها را زنده به‌روز می‌کند */
  const update = (next: AboutPageConfig) => {
    setDraft(next)
    form.revalidate(next)
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(data)

  const save = () => {
    if (!form.validate(draft)) {
      toast.error('چند فیلد ایراد دارد — لطفاً پیام‌های قرمز را بررسی کنید')
      return
    }
    saveAbout.mutate(draft, {
      onSuccess: (saved) => {
        setDraft(structuredClone(saved))
        form.reset()
        toast.success('صفحه‌ی درباره ما ذخیره شد')
      },
      onError: (error) => toast.error(error.message),
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap justify-end gap-2">
        <Link href="/about" target="_blank" className="contents">
          <Button variant="outline">
            <ExternalLink className="size-4" />
            پیش‌نمایش
          </Button>
        </Link>
        <Button variant="ghost" disabled={!dirty} onClick={() => update(structuredClone(data!))}>
          <RotateCcw className="size-4" />
          بازگردانی
        </Button>
        <Button loading={saveAbout.isPending} disabled={!dirty} onClick={save}>
          <Save className="size-4" />
          ذخیره
        </Button>
      </div>

      <AdminCard title="سربرگ صفحه">
        <div className="space-y-4 p-5">
          <Field label="عنوان اصلی" required error={form.errors['hero.title']}>
            <Input
              value={draft.hero.title}
              onChange={(e) => update({ ...draft, hero: { ...draft.hero, title: e.target.value } })}
              invalid={Boolean(form.errors['hero.title'])}
            />
          </Field>
          <Field label="متن معرفی" hint="حداکثر ۷۰۰ حرف" error={form.errors['hero.body']}>
            <Textarea
              value={draft.hero.body}
              onChange={(e) => update({ ...draft, hero: { ...draft.hero, body: e.target.value } })}
              invalid={Boolean(form.errors['hero.body'])}
              className="min-h-28"
            />
          </Field>
        </div>
      </AdminCard>

      <AdminCard
        title="آمارها"
        action={
          <BlockToggle
            checked={draft.stats.enabled}
            onChange={(enabled) => update({ ...draft, stats: { ...draft.stats, enabled } })}
          />
        }
      >
        <div className="space-y-3 p-5">
          {draft.stats.items.map((stat, i) => (
            <EditorRow
              key={stat.id}
              title={`آمار ${i + 1}`}
              onDelete={() =>
                update({
                  ...draft,
                  stats: { ...draft.stats, items: draft.stats.items.filter((s) => s.id !== stat.id) },
                })
              }
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <IconPicker
                  value={stat.icon}
                  onChange={(icon) =>
                    update({
                      ...draft,
                      stats: {
                        ...draft.stats,
                        items: draft.stats.items.map((s) => (s.id === stat.id ? { ...s, icon } : s)),
                      },
                    })
                  }
                />
                <Field
                  label="مقدار"
                  hint="مثل ۲۴,۰۰۰+ یا ۹۸٪"
                  required
                  error={form.errors[`stats.items.${i}.value`]}
                >
                  <Input
                    value={stat.value}
                    onChange={(e) =>
                      update({
                        ...draft,
                        stats: {
                          ...draft.stats,
                          items: draft.stats.items.map((s) =>
                            s.id === stat.id ? { ...s, value: e.target.value } : s,
                          ),
                        },
                      })
                    }
                    invalid={Boolean(form.errors[`stats.items.${i}.value`])}
                  />
                </Field>
                <Field label="برچسب" required error={form.errors[`stats.items.${i}.label`]}>
                  <Input
                    value={stat.label}
                    onChange={(e) =>
                      update({
                        ...draft,
                        stats: {
                          ...draft.stats,
                          items: draft.stats.items.map((s) =>
                            s.id === stat.id ? { ...s, label: e.target.value } : s,
                          ),
                        },
                      })
                    }
                    invalid={Boolean(form.errors[`stats.items.${i}.label`])}
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
                ...draft,
                stats: {
                  ...draft.stats,
                  items: [
                    ...draft.stats.items,
                    { id: uid('st'), icon: 'shield-check', value: '۱۰۰+', label: 'عنوان آمار' },
                  ],
                },
              })
            }
          >
            <Plus className="size-4" />
            افزودن آمار
          </Button>
        </div>
      </AdminCard>

      <AdminCard
        title="ارزش‌های ما"
        action={
          <BlockToggle
            checked={draft.values.enabled}
            onChange={(enabled) => update({ ...draft, values: { ...draft.values, enabled } })}
          />
        }
      >
        <div className="space-y-3 p-5">
          {draft.values.items.map((value, i) => (
            <EditorRow
              key={value.id}
              title={`ارزش ${i + 1}`}
              onDelete={() =>
                update({
                  ...draft,
                  values: { ...draft.values, items: draft.values.items.filter((v) => v.id !== value.id) },
                })
              }
            >
              <Field label="عنوان" required error={form.errors[`values.items.${i}.title`]}>
                <Input
                  value={value.title}
                  onChange={(e) =>
                    update({
                      ...draft,
                      values: {
                        ...draft.values,
                        items: draft.values.items.map((v) =>
                          v.id === value.id ? { ...v, title: e.target.value } : v,
                        ),
                      },
                    })
                  }
                  invalid={Boolean(form.errors[`values.items.${i}.title`])}
                />
              </Field>
              <Field label="توضیح" error={form.errors[`values.items.${i}.text`]}>
                <Textarea
                  value={value.text}
                  onChange={(e) =>
                    update({
                      ...draft,
                      values: {
                        ...draft.values,
                        items: draft.values.items.map((v) =>
                          v.id === value.id ? { ...v, text: e.target.value } : v,
                        ),
                      },
                    })
                  }
                  invalid={Boolean(form.errors[`values.items.${i}.text`])}
                  className="min-h-20"
                />
              </Field>
            </EditorRow>
          ))}

          <Button
            variant="outline"
            block
            onClick={() =>
              update({
                ...draft,
                values: {
                  ...draft.values,
                  items: [...draft.values.items, { id: uid('vl'), title: 'عنوان ارزش', text: 'توضیح کوتاه' }],
                },
              })
            }
          >
            <Plus className="size-4" />
            افزودن ارزش
          </Button>
        </div>
      </AdminCard>

      <AdminCard
        title="بلوک تماس"
        action={
          <BlockToggle
            checked={draft.contact.enabled}
            onChange={(enabled) => update({ ...draft, contact: { ...draft.contact, enabled } })}
          />
        }
      >
        <div className="space-y-4 p-5">
          <p className="text-[11px] leading-6 text-muted">
            آدرس، تلفن و ایمیلِ کنار فرم از{' '}
            <Link href="/admin/settings" className="font-bold text-brand-600 dark:text-brand-400">
              تنظیمات سایت
            </Link>{' '}
            خوانده می‌شود تا در دو جا تکرار نشود.
          </p>
          <Field label="عنوان" required error={form.errors['contact.title']}>
            <Input
              value={draft.contact.title}
              onChange={(e) => update({ ...draft, contact: { ...draft.contact, title: e.target.value } })}
              invalid={Boolean(form.errors['contact.title'])}
            />
          </Field>
          <Field label="توضیح" hint="مثلاً ساعات پاسخ‌گویی" error={form.errors['contact.description']}>
            <Textarea
              value={draft.contact.description}
              onChange={(e) => update({ ...draft, contact: { ...draft.contact, description: e.target.value } })}
              invalid={Boolean(form.errors['contact.description'])}
              className="min-h-20"
            />
          </Field>
        </div>
      </AdminCard>

      <AdminCard
        title="قوانین و مقررات"
        action={
          <BlockToggle
            checked={draft.terms.enabled}
            onChange={(enabled) => update({ ...draft, terms: { ...draft.terms, enabled } })}
          />
        }
      >
        <div className="space-y-3 p-5">
          <Field label="عنوان بخش" required error={form.errors['terms.title']}>
            <Input
              value={draft.terms.title}
              onChange={(e) => update({ ...draft, terms: { ...draft.terms, title: e.target.value } })}
              invalid={Boolean(form.errors['terms.title'])}
            />
          </Field>

          {/* شماره‌ی بندها در خود سایت از روی ترتیب ساخته می‌شود، پس متن بدون شماره ذخیره می‌شود */}
          {draft.terms.items.map((term, i) => (
            <EditorRow
              key={term.id}
              title={`بند ${i + 1}`}
              onDelete={() =>
                update({
                  ...draft,
                  terms: { ...draft.terms, items: draft.terms.items.filter((t) => t.id !== term.id) },
                })
              }
            >
              <Field label="متن بند" required error={form.errors[`terms.items.${i}.text`]}>
                <Textarea
                  value={term.text}
                  onChange={(e) =>
                    update({
                      ...draft,
                      terms: {
                        ...draft.terms,
                        items: draft.terms.items.map((t) => (t.id === term.id ? { ...t, text: e.target.value } : t)),
                      },
                    })
                  }
                  invalid={Boolean(form.errors[`terms.items.${i}.text`])}
                  className="min-h-16"
                />
              </Field>
            </EditorRow>
          ))}

          <Button
            variant="outline"
            block
            onClick={() =>
              update({
                ...draft,
                terms: { ...draft.terms, items: [...draft.terms.items, { id: uid('tr'), text: 'متن بند جدید' }] },
              })
            }
          >
            <Plus className="size-4" />
            افزودن بند
          </Button>
        </div>
      </AdminCard>
    </div>
  )
}
