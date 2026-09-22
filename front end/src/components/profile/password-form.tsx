'use client'

import { useState } from 'react'
import { z } from 'zod'
import { KeyRound, ShieldCheck } from 'lucide-react'
import { useChangePassword } from '@/lib/api/queries'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import { useForm } from '@/lib/use-form'
import { requiredText } from '@/lib/validation'

const newPassword = {
  password: requiredText('رمز عبور جدید', 8),
  passwordConfirmation: z.string(),
}

const matches = (v: { password: string; passwordConfirmation: string }) => v.password === v.passwordConfirmation
const mismatch = { message: 'تکرار رمز با رمز جدید یکی نیست', path: ['passwordConfirmation'] }

const withCurrentSchema = z
  .object({ currentPassword: requiredText('رمز فعلی', 1), ...newPassword })
  .refine(matches, mismatch)

const withoutCurrentSchema = z.object({ currentPassword: z.string(), ...newPassword }).refine(matches, mismatch)

const empty = { currentPassword: '', password: '', passwordConfirmation: '' }

/**
 * تغییر رمز. حساب ساخته‌شده با کد پیامکی رمزی ندارد و «رمز فعلی» برایش معنا
 * ندارد؛ آن‌وقت همین فرم رمز تازه می‌گذارد. بعد از تغییر، سرور بقیه‌ی نشست‌ها
 * را می‌بندد.
 */
export function PasswordForm({ needsCurrent }: { needsCurrent: boolean }) {
  const [values, setValues] = useState(empty)
  const form = useForm(needsCurrent ? withCurrentSchema : withoutCurrentSchema)
  const change = useChangePassword()

  const update = (patch: Partial<typeof values>) => {
    const next = { ...values, ...patch }
    setValues(next)
    form.revalidate(next)
  }

  const submit = () => {
    const parsed = form.validate(values)
    if (!parsed) return

    change.mutate(
      {
        currentPassword: needsCurrent ? parsed.currentPassword : undefined,
        password: parsed.password,
        passwordConfirmation: parsed.passwordConfirmation,
      },
      {
        onSuccess: ({ message }) => {
          toast.success(message)
          setValues(empty)
          form.reset()
        },
        onError: (error) => toast.error(error.message),
      },
    )
  }

  return (
    <form
      className="max-w-md space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      {!needsCurrent && (
        <p className="flex items-start gap-2 rounded-2xl bg-brand-500/8 p-3 text-[12.5px] leading-6 text-brand-700 dark:text-brand-300">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          حساب شما با کد پیامکی ساخته شده و هنوز رمزی ندارد. با گذاشتن رمز، با شماره و رمز هم می‌توانید وارد شوید.
        </p>
      )}

      {needsCurrent && (
        <Field label="رمز فعلی" required error={form.errors.currentPassword}>
          <Input
            type="password"
            autoComplete="current-password"
            value={values.currentPassword}
            onChange={(e) => update({ currentPassword: e.target.value })}
            invalid={Boolean(form.errors.currentPassword)}
            dir="ltr"
          />
        </Field>
      )}

      <Field label="رمز عبور جدید" required hint="دست‌کم ۸ نویسه" error={form.errors.password}>
        <Input
          type="password"
          autoComplete="new-password"
          value={values.password}
          onChange={(e) => update({ password: e.target.value })}
          invalid={Boolean(form.errors.password)}
          dir="ltr"
        />
      </Field>

      <Field label="تکرار رمز عبور جدید" required error={form.errors.passwordConfirmation}>
        <Input
          type="password"
          autoComplete="new-password"
          value={values.passwordConfirmation}
          onChange={(e) => update({ passwordConfirmation: e.target.value })}
          invalid={Boolean(form.errors.passwordConfirmation)}
          dir="ltr"
        />
      </Field>

      <p className="text-xs leading-6 text-muted">بعد از تغییر رمز، از همه‌ی دستگاه‌های دیگر خارج می‌شوید.</p>

      <Button type="submit" loading={change.isPending}>
        <KeyRound className="size-4" />
        {needsCurrent ? 'تغییر رمز' : 'ثبت رمز'}
      </Button>
    </form>
  )
}
