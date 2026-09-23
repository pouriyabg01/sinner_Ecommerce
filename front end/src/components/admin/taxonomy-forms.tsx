'use client'

import { useEffect, useState } from 'react'
import { z } from 'zod'
import type { Brand, Category, Tag } from '@/types/catalog'
import { ApiError } from '@/lib/api/client'
import { Drawer } from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import { IconPicker } from '@/components/admin/editor-bits'
import { SingleImageField } from '@/components/admin/image-field'
import { useForm } from '@/lib/use-form'
import { imageSourceSchema, optionalText, requiredText, slugSchema } from '@/lib/validation'
import { latinSlug } from '@/lib/utils'

/** اسلاگ هم الزامی است هم باید فرم درست داشته باشد؛ slugSchema خودش خالی را رد نمی‌کند */
const requiredSlug = slugSchema.refine((v) => v.length > 0, { message: 'اسلاگ الزامی است' })

const categorySchema = z.object({
  title: requiredText('عنوان دسته', 2),
  slug: requiredSlug,
  description: optionalText(200, 'توضیح'),
})

const brandSchema = z.object({
  title: requiredText('نام برند', 2),
  slug: requiredSlug,
  logo: imageSourceSchema,
})

type CategoryDraft = { title: string; slug: string; description: string; icon: string; specKeys: string; parentId: string }

const EMPTY_CATEGORY: CategoryDraft = { title: '', slug: '', description: '', icon: 'package', specKeys: '', parentId: '' }

export function CategoryDrawer({
  open,
  editing,
  categories,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean
  /** null یعنی ساخت دسته‌ی جدید */
  editing: Category | null
  /** همه‌ی دسته‌ها، برای انتخاب مادر */
  categories: Category[]
  saving: boolean
  onClose: () => void
  onSubmit: (body: Omit<Category, 'id'>, onError: (error: unknown) => void) => void
}) {
  const [draft, setDraft] = useState<CategoryDraft>(EMPTY_CATEGORY)
  const form = useForm(categorySchema)

  useEffect(() => {
    if (!open) return
    form.reset()
    setDraft(
      editing
        ? {
            title: editing.title,
            slug: editing.slug,
            description: editing.description,
            icon: editing.icon,
            specKeys: editing.specKeys.join('، '),
            parentId: editing.parentId ?? '',
          }
        : EMPTY_CATEGORY,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id])

  const update = (patch: Partial<CategoryDraft>) => {
    const next = { ...draft, ...patch }
    setDraft(next)
    form.revalidate(next)
  }

  /*
   * بیشتر از دو سطح نداریم: مادر فقط می‌تواند دسته‌ی اصلی باشد. دسته‌ای هم که
   * خودش زیرمجموعه دارد، در فهرست مادرهای ممکنِ خودش نمی‌آید.
   */
  const hasChildren = categories.some((category) => category.parentId === editing?.id)
  const parentOptions = hasChildren
    ? []
    : categories.filter((category) => !category.parentId && category.id !== editing?.id)

  const submit = () => {
    const clean = form.validate(draft)
    if (!clean) return toast.error('چند فیلد ایراد دارد — پیام‌های قرمز را بررسی کنید')

    onSubmit(
      {
        ...clean,
        icon: draft.icon,
        // رشته‌ی خالی یعنی «دسته‌ی اصلی»؛ سرور null می‌خواهد نه ''
        parentId: draft.parentId || null,
        // «رم، حافظه» → ['رم','حافظه'] — کلیدهایی که در فیلتر و مقایسه ستون می‌شوند
        specKeys: draft.specKeys
          .split(/[،,\n]/)
          .map((k) => k.trim())
          .filter(Boolean),
      },
      (error) => {
        const field = error instanceof ApiError ? (error.payload as { field?: string })?.field : undefined
        if (field) form.setError(field, error instanceof Error ? error.message : '')
      },
    )
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={editing ? `ویرایش «${editing.title}»` : 'دسته‌بندی جدید'}
      footer={
        <Button block loading={saving} onClick={submit}>
          {editing ? 'ذخیره تغییرات' : 'افزودن دسته‌بندی'}
        </Button>
      }
    >
      <div className="space-y-5">
        <Field label="عنوان" required error={form.errors.title}>
          <Input
            value={draft.title}
            invalid={Boolean(form.errors.title)}
            placeholder="مثلاً هدفون و هندزفری"
            onChange={(e) => {
              // اسلاگ تا وقتی دستی عوض نشده، از عنوان ساخته می‌شود
              const autoSlug = !editing && (draft.slug === '' || draft.slug === latinSlug(draft.title))
              update({ title: e.target.value, ...(autoSlug ? { slug: latinSlug(e.target.value) } : {}) })
            }}
          />
        </Field>

        <Field
          label="اسلاگ"
          required
          error={form.errors.slug}
          hint={editing ? 'با تغییر اسلاگ، کالاها و سکشن‌های صفحه‌ی اصلی خودکار به‌روز می‌شوند.' : 'در آدرس صفحه استفاده می‌شود — فقط حروف کوچک انگلیسی'}
        >
          <Input
            value={draft.slug}
            invalid={Boolean(form.errors.slug)}
            dir="ltr"
            className="text-start"
            placeholder="headphones"
            onChange={(e) => update({ slug: e.target.value })}
          />
        </Field>

        <Field
          label="دسته‌ی مادر"
          error={form.errors.parentId}
          hint="خالی یعنی خودش یک دسته‌ی اصلی است و در منوی سایت جای خودش را دارد"
        >
          <Select value={draft.parentId} onChange={(e) => update({ parentId: e.target.value })}>
            <option value="">— دسته‌ی اصلی —</option>
            {parentOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {category.title}
              </option>
            ))}
          </Select>
        </Field>

        <IconPicker value={draft.icon} onChange={(icon) => update({ icon })} />

        <Field label="توضیح کوتاه" error={form.errors.description} hint="زیر عنوان دسته در صفحه‌ی اصلی نمایش داده می‌شود">
          <Textarea
            rows={3}
            value={draft.description}
            invalid={Boolean(form.errors.description)}
            placeholder="پرچم‌داران و میان‌رده‌های روز بازار"
            onChange={(e) => update({ description: e.target.value })}
          />
        </Field>

        <Field
          label="کلیدهای مشخصات"
          hint="با ویرگول جدا کنید. همین کلیدها ستون‌های صفحه‌ی مقایسه و فیلترهای این دسته را می‌سازند — مانند display، ram، battery"
        >
          <Textarea
            rows={2}
            dir="ltr"
            className="text-start"
            value={draft.specKeys}
            placeholder="display, chipset, ram, storage"
            onChange={(e) => update({ specKeys: e.target.value })}
          />
        </Field>
      </div>
    </Drawer>
  )
}

type BrandDraft = { title: string; slug: string; logo: string }
const EMPTY_BRAND: BrandDraft = { title: '', slug: '', logo: '' }

export function BrandDrawer({
  open,
  editing,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean
  editing: Brand | null
  saving: boolean
  onClose: () => void
  onSubmit: (body: Omit<Brand, 'id'>, onError: (error: unknown) => void) => void
}) {
  const [draft, setDraft] = useState<BrandDraft>(EMPTY_BRAND)
  const form = useForm(brandSchema)

  useEffect(() => {
    if (!open) return
    form.reset()
    setDraft(editing ? { title: editing.title, slug: editing.slug, logo: editing.logo } : EMPTY_BRAND)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id])

  const update = (patch: Partial<BrandDraft>) => {
    const next = { ...draft, ...patch }
    setDraft(next)
    form.revalidate(next)
  }

  const submit = () => {
    const clean = form.validate(draft)
    if (!clean) return toast.error('چند فیلد ایراد دارد — پیام‌های قرمز را بررسی کنید')

    onSubmit(clean, (error) => {
      const field = error instanceof ApiError ? (error.payload as { field?: string })?.field : undefined
      if (field) form.setError(field, error instanceof Error ? error.message : '')
    })
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={editing ? `ویرایش «${editing.title}»` : 'برند جدید'}
      footer={
        <Button block loading={saving} onClick={submit}>
          {editing ? 'ذخیره تغییرات' : 'افزودن برند'}
        </Button>
      }
    >
      <div className="space-y-5">
        <Field label="نام برند" required error={form.errors.title}>
          <Input
            value={draft.title}
            invalid={Boolean(form.errors.title)}
            placeholder="مثلاً ایسر"
            onChange={(e) => {
              const autoSlug = !editing && (draft.slug === '' || draft.slug === latinSlug(draft.title))
              update({ title: e.target.value, ...(autoSlug ? { slug: latinSlug(e.target.value) } : {}) })
            }}
          />
        </Field>

        <Field
          label="اسلاگ"
          required
          error={form.errors.slug}
          hint={editing ? 'با تغییر اسلاگ، برند کالاها و نوار برندهای صفحه‌ی اصلی خودکار به‌روز می‌شود.' : 'در فیلتر برند استفاده می‌شود'}
        >
          <Input
            value={draft.slug}
            invalid={Boolean(form.errors.slug)}
            dir="ltr"
            className="text-start"
            placeholder="acer"
            onChange={(e) => update({ slug: e.target.value })}
          />
        </Field>

        <SingleImageField
          label="لوگو"
          value={draft.logo}
          error={form.errors.logo}
          onChange={(logo) => update({ logo })}
          placeholder="/img/brands/acer.svg"
          hint="فایل را بکشید و رها کنید، آپلود کنید یا لینک بدهید. لوگوی SVG تک‌رنگ در نوار برندهای صفحه‌ی اصلی با رنگ تم کشیده می‌شود؛ بقیه‌ی فرمت‌ها همان‌طور که هستند نمایش داده می‌شوند."
        />
      </div>
    </Drawer>
  )
}


const tagSchema = z.object({ title: requiredText('نام برچسب', 2) })

export function TagDrawer({
  open,
  editing,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean
  editing: Tag | null
  saving: boolean
  onClose: () => void
  onSubmit: (body: Omit<Tag, 'id'>, onError: (error: unknown) => void) => void
}) {
  const [title, setTitle] = useState('')
  const form = useForm(tagSchema)

  useEffect(() => {
    if (!open) return
    form.reset()
    setTitle(editing ? editing.title : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id])

  const submit = () => {
    const clean = form.validate({ title })
    if (!clean) return toast.error('نام برچسب را درست وارد کنید')

    onSubmit(clean, (error) => {
      const field = error instanceof ApiError ? (error.payload as { field?: string })?.field : undefined
      if (field) form.setError(field, error instanceof Error ? error.message : '')
    })
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={editing ? `ویرایش «${editing.title}»` : 'برچسب جدید'}
      footer={
        <Button block loading={saving} onClick={submit}>
          {editing ? 'ذخیره تغییرات' : 'افزودن برچسب'}
        </Button>
      }
    >
      <Field
        label="نام برچسب"
        required
        error={form.errors.title}
        hint={
          editing
            ? 'با تغییر نام، برچسب روی همه‌ی کالاهایی که آن را دارند به‌روز می‌شود.'
            : 'همین متن روی کارت کالا و در فیلتر فروشگاه نمایش داده می‌شود.'
        }
      >
        <Input
          value={title}
          invalid={Boolean(form.errors.title)}
          placeholder="مثلاً پرفروش"
          onChange={(e) => {
            setTitle(e.target.value)
            form.revalidate({ title: e.target.value })
          }}
        />
      </Field>
    </Drawer>
  )
}
