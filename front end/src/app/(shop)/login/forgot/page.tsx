'use client'

import { useState } from 'react'
import Link from 'next/link'
import { z } from 'zod'
import { MailCheck } from 'lucide-react'
import { authApi } from '@/lib/api/endpoints'
import { Button, buttonVariants } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Field, Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import { useForm } from '@/lib/use-form'
import { emailSchema } from '@/lib/validation'
import { usePageTitle } from '@/lib/use-page-title'

const forgotForm = z.object({ email: emailSchema })

export default function ForgotPasswordPage() {
  usePageTitle('بازیابی رمز عبور')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const form = useForm(forgotForm)

  if (sent) {
    return (
      <div className="container-page py-20">
        <EmptyState
          as="h1"
          icon={MailCheck}
          title="اگر این ایمیل حساب داشته باشد، لینک بازیابی برایش رفت"
          description="صندوق ورودی و پوشه‌ی هرزنامه را ببینید. لینک تا یک ساعت معتبر است."
          action={
            <Link href="/login" className={buttonVariants({ variant: 'soft' })}>
              برگشت به ورود
            </Link>
          }
        />
      </div>
    )
  }

  const submit = async () => {
    const parsed = form.validate({ email })
    if (!parsed) return

    setBusy(true)
    try {
      await authApi.forgotPassword(parsed.email)
      /*
       * چه حساب باشد چه نباشد همین صفحه را می‌بینیم — سرور هم همین را برمی‌گرداند.
       * وگرنه با همین فرم می‌شد فهمید کدام ایمیل در سایت حساب دارد.
       */
      setSent(true)
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-md rounded-card border border-border bg-surface p-6 sm:p-8">
        <h1 className="text-lg font-bold">رمزم را فراموش کرده‌ام</h1>
        <p className="mt-2 text-[13px] leading-7 text-muted">
          ایمیل حسابتان را بنویسید تا لینک انتخاب رمز تازه برایتان بفرستیم.
        </p>

        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <Field label="ایمیل" required error={form.errors.email}>
            <Input
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                form.revalidate({ email: e.target.value })
              }}
              invalid={Boolean(form.errors.email)}
              inputMode="email"
              dir="ltr"
            />
          </Field>
          <Button type="submit" block loading={busy}>
            فرستادن لینک
          </Button>
        </form>

        <p className="mt-4 text-center text-[13px] text-muted">
          رمزتان یادتان آمد؟{' '}
          <Link href="/login" className="font-medium text-brand-600 underline-offset-4 hover:underline dark:text-brand-400">
            برگشت به ورود
          </Link>
        </p>
      </div>
    </div>
  )
}
