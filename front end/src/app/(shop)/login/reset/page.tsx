'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { z } from 'zod'
import { Link2Off } from 'lucide-react'
import { authApi } from '@/lib/api/endpoints'
import { useSession } from '@/store/session'
import { Button, buttonVariants } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Field, Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import { useForm } from '@/lib/use-form'
import { requiredText } from '@/lib/validation'
import { usePageTitle } from '@/lib/use-page-title'

const resetForm = z.object({ password: requiredText('رمز عبور', 8) })

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto my-20 h-80 max-w-md rounded-card" />}>
      <ResetView />
    </Suspense>
  )
}

function ResetView() {
  usePageTitle('انتخاب رمز تازه')
  const router = useRouter()
  const params = useSearchParams()
  const signIn = useSession((s) => s.signIn)
  const token = params.get('token') ?? ''
  const email = params.get('email') ?? ''

  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const form = useForm(resetForm)

  if (!token || !email) {
    return (
      <div className="container-page py-20">
        <EmptyState
          as="h1"
          icon={Link2Off}
          title="این لینک کامل نیست"
          description="لینک را مستقیم از نامه‌ای که برایتان آمده باز کنید، یا دوباره درخواست بازیابی بدهید."
          action={
            <Link href="/login/forgot" className={buttonVariants({ variant: 'soft' })}>
              درخواست دوباره
            </Link>
          }
        />
      </div>
    )
  }

  const submit = async () => {
    const parsed = form.validate({ password })
    if (!parsed) return

    setBusy(true)
    try {
      // سرور بعد از تغییر رمز خودش نشست تازه می‌دهد، پس کاربر دوباره وارد نمی‌شود
      const session = await authApi.resetPassword({ email, token, password: parsed.password })
      signIn(session.token, session.user)
      toast.success('رمز تازه ثبت شد')
      router.replace('/profile')
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-md rounded-card border border-border bg-surface p-6 sm:p-8">
        <h1 className="text-lg font-bold">انتخاب رمز تازه</h1>
        <p className="mt-2 text-[13px] leading-7 text-muted">
          برای <span className="en-code">{email}</span> رمز تازه بگذارید. با ثبت رمز، هر جایی که با رمز قبلی وارد مانده بودید بیرون می‌رود.
        </p>

        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <Field label="رمز تازه" required error={form.errors.password} hint="دست‌کم ۸ نویسه">
            <Input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                form.revalidate({ password: e.target.value })
              }}
              invalid={Boolean(form.errors.password)}
              autoComplete="new-password"
              dir="ltr"
            />
          </Field>
          <Button type="submit" block loading={busy}>
            ثبت رمز تازه
          </Button>
        </form>
      </div>
    </div>
  )
}
