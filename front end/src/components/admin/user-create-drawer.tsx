'use client'

import { useEffect, useState } from 'react'
import { z } from 'zod'
import { USER_STATUS_HINT, USER_STATUS_OPTIONS, type UserStatus } from '@/types/user'
import { ApiError } from '@/lib/api/client'
import { useCreateUser } from '@/lib/api/queries'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { ChipPicker } from '@/components/ui/chip-picker'
import { Field, Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import { useForm } from '@/lib/use-form'
import { emailSchema, mobileSchema, requiredText } from '@/lib/validation'

const newUserSchema = z.object({
  fullName: requiredText('نام و نام خانوادگی'),
  phone: mobileSchema,
  email: emailSchema,
})

/** وضعیت جدا از اسکیما نگه داشته می‌شود چون اعتبارسنجی ندارد؛ مقدارهایش از قبل محدودند */
type Draft = z.input<typeof newUserSchema> & { status: UserStatus }

const EMPTY: Draft = { fullName: '', phone: '', email: '', status: 'active' }

export function UserCreateDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createUser = useCreateUser()
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const form = useForm(newUserSchema)

  // هر بار که کشو باز می‌شود فرم تمیز شروع شود، نه با باقی‌مانده‌ی دفعه‌ی قبل
  useEffect(() => {
    if (!open) return
    setDraft(EMPTY)
    form.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const update = (patch: Partial<Draft>) => {
    const next = { ...draft, ...patch }
    setDraft(next)
    form.revalidate(next)
  }

  const save = () => {
    const clean = form.validate(draft)
    if (!clean) return toast.error('چند فیلد ایراد دارد — پیام‌های قرمز را بررسی کنید')

    createUser.mutate(
      { ...clean, status: draft.status },
      {
        onSuccess: (user) => {
          toast.success(`«${user.fullName}» اضافه شد`)
          onClose()
        },
        onError: (error: Error) => {
          // سرور می‌گوید کدام فیلد تکراری است؛ خطا باید زیر همان کادر بنشیند
          const field = error instanceof ApiError ? (error.payload as { field?: string })?.field : undefined
          if (field) form.setError(field, error.message)
          toast.error(error.message)
        },
      },
    )
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="کاربر جدید"
      footer={
        <div className="flex gap-2">
          <Button block loading={createUser.isPending} onClick={save}>
            ساخت کاربر
          </Button>
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="rounded-2xl border border-border bg-surface-2/50 p-3.5 text-[11.5px] leading-6 text-muted">
          این حساب به‌عنوان «مشتری» ساخته می‌شود. برای حسابی که به پنل دسترسی داشته باشد از صفحه‌ی
          ادمین‌ها استفاده کنید.
        </p>

        <Field label="نام و نام خانوادگی" required error={form.errors.fullName}>
          <Input
            value={draft.fullName}
            invalid={Boolean(form.errors.fullName)}
            onChange={(e) => update({ fullName: e.target.value })}
          />
        </Field>

        <Field label="موبایل" required hint="مثل ۰۹۱۲۱۲۳۴۵۶۷" error={form.errors.phone}>
          <Input
            value={draft.phone}
            invalid={Boolean(form.errors.phone)}
            dir="ltr"
            inputMode="numeric"
            className="num text-start"
            onChange={(e) => update({ phone: e.target.value })}
          />
        </Field>

        <Field label="ایمیل" required error={form.errors.email}>
          <Input
            value={draft.email}
            invalid={Boolean(form.errors.email)}
            dir="ltr"
            className="text-start"
            onChange={(e) => update({ email: e.target.value })}
          />
        </Field>

        {/* اینجا Field به کار نمی‌آید: fieldset داخل label قرار نمی‌گیرد */}
        <div className="space-y-2">
          <p className="text-[13px] font-medium">وضعیت حساب</p>
          <ChipPicker
            label="وضعیت حساب کاربر تازه"
            value={draft.status}
            options={USER_STATUS_OPTIONS}
            onChange={(status: UserStatus) => update({ status })}
          />
          <p className="text-xs leading-6 text-muted">{USER_STATUS_HINT[draft.status]}</p>
        </div>
      </div>
    </Drawer>
  )
}
