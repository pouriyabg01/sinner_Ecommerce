'use client'

import { useEffect, useState } from 'react'
import { z } from 'zod'
import { Save, RotateCcw } from 'lucide-react'
import type { User } from '@/types/user'
import { ApiError } from '@/lib/api/client'
import { useMe, useUpdateProfile } from '@/lib/api/queries'
import { useSession } from '@/store/session'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadError } from '@/components/ui/load-error'
import { PasswordForm } from '@/components/profile/password-form'
import { toast } from '@/components/ui/toast'
import { useForm } from '@/lib/use-form'
import { emailSchema, mobileSchema, requiredText } from '@/lib/validation'

const accountSchema = z.object({
  fullName: requiredText('نام و نام خانوادگی'),
  phone: mobileSchema,
  email: emailSchema,
})

type Draft = { fullName: string; phone: string; email: string }

const toDraft = (user: User): Draft => ({
  fullName: user.fullName,
  phone: user.phone,
  email: user.email,
})

export default function AccountPage() {
  const userId = useSession((s) => s.userId)
  const { data: user, isLoading, isError, refetch } = useMe(userId)
  const updateProfile = useUpdateProfile()
  const form = useForm(accountSchema)

  const [draft, setDraft] = useState<Draft | null>(null)

  // با سوییچ حساب (حالت دمو) پیش‌نویس باید از نو ساخته شود، وگرنه فرمِ
  // کاربر قبلی روی حساب جدید می‌ماند.
  useEffect(() => {
    if (user) {
      setDraft(toDraft(user))
      form.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  if (isError) return <LoadError onRetry={() => refetch()} />
  if (isLoading || !draft || !user) return <Skeleton className="h-96 rounded-card" />

  const update = (patch: Partial<Draft>) => {
    const next = { ...draft, ...patch }
    setDraft(next)
    form.revalidate(next)
  }

  const dirty =
    draft.fullName !== user.fullName ||
    draft.phone !== user.phone ||
    draft.email !== user.email

  const save = () => {
    const clean = form.validate(draft)
    if (!clean) {
      toast.error('چند فیلد ایراد دارد — پیام‌های قرمز را بررسی کنید')
      return
    }

    updateProfile.mutate(
      { body: clean, userId },
      {
        onSuccess: () => toast.success('اطلاعات حساب ذخیره شد'),
        onError: (error) => {
          // ۴۰۹ یعنی موبایل یا ایمیل روی حساب دیگری ثبت شده — خطا باید
          // زیر همان فیلد بنشیند، نه فقط داخل توست.
          const field = error instanceof ApiError ? (error.payload as { field?: string })?.field : undefined
          if (field) form.setError(field, error.message)
          toast.error(error instanceof Error ? error.message : 'ذخیره‌سازی ناموفق بود')
        },
      },
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">اطلاعات حساب</h1>
          <p className="mt-1.5 text-[13px] text-muted">نام، شماره تماس و ایمیلی که برای سفارش‌ها استفاده می‌شود</p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <Button variant="ghost" size="sm" onClick={() => { setDraft(toDraft(user)); form.reset() }}>
              <RotateCcw className="size-4" />
              انصراف
            </Button>
          )}
          <Button size="sm" onClick={save} disabled={!dirty || updateProfile.isPending}>
            <Save className="size-4" />
            {updateProfile.isPending ? 'در حال ذخیره…' : 'ذخیره تغییرات'}
          </Button>
        </div>
      </div>

      <section className="rounded-card border border-border bg-surface p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="نام و نام خانوادگی" required error={form.errors.fullName} className="sm:col-span-2">
            <Input
              value={draft.fullName}
              onChange={(e) => update({ fullName: e.target.value })}
              invalid={Boolean(form.errors.fullName)}
              placeholder="مثلاً سارا محمدی"
              autoComplete="name"
            />
          </Field>

          <Field
            label="شماره موبایل"
            required
            error={form.errors.phone}
            hint="برای اطلاع‌رسانی وضعیت سفارش و تعمیر استفاده می‌شود"
          >
            <Input
              value={draft.phone}
              onChange={(e) => update({ phone: e.target.value })}
              invalid={Boolean(form.errors.phone)}
              placeholder="۰۹۱۲۱۲۳۴۵۶۷"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              className="num text-start"
            />
          </Field>

          <Field label="ایمیل" required error={form.errors.email}>
            <Input
              value={draft.email}
              onChange={(e) => update({ email: e.target.value })}
              invalid={Boolean(form.errors.email)}
              placeholder="name@example.com"
              inputMode="email"
              autoComplete="email"
              dir="ltr"
              className="text-start"
            />
          </Field>
        </div>
      </section>

      {/* فرم و دکمه‌ی جدای خودش را دارد؛ «ذخیره تغییرات» بالا فقط اطلاعات بالا را ذخیره می‌کند */}
      <section className="rounded-card border border-border bg-surface p-5 sm:p-6">
        <div className="mb-5 space-y-1.5">
          <h2 className="text-[15px] font-bold">رمز عبور</h2>
          <p className="text-[13px] text-muted">
            {user.hasPassword === false
              ? 'برای ورود با شماره و رمز، یک رمز بگذارید.'
              : 'رمز فعلی را وارد کنید و رمز تازه را انتخاب کنید.'}
          </p>
        </div>
        <PasswordForm key={user.id} needsCurrent={user.hasPassword !== false} />
      </section>
    </div>
  )
}
