'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { z } from 'zod'
import { KeyRound, MessageSquareLock } from 'lucide-react'
import { authApi, type AuthMethods } from '@/lib/api/endpoints'
import { MOCKING_ENABLED } from '@/lib/api/config'
import { useSession } from '@/store/session'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import { useForm } from '@/lib/use-form'
import { emailSchema, phoneSchema, requiredText } from '@/lib/validation'
import { usePageTitle } from '@/lib/use-page-title'
import { toFaDigits } from '@/lib/format'
import { cn } from '@/lib/utils'

const phoneForm = z.object({ phone: phoneSchema })
const codeForm = z.object({ code: requiredText('کد تأیید', 5) })
const passwordForm = z.object({
  identifier: requiredText('شماره موبایل یا ایمیل', 5),
  /*
   * در ورود فقط خالی نبودن مهم است. قاعده‌ی «دست‌کم ۸ نویسه» مال ثبت‌نام است و
   * اینجا رمزِ درستِ حساب‌های قدیمی‌تر را هم پیش از رسیدن به سرور رد می‌کرد.
   */
  password: z.string().min(1, 'رمز عبور الزامی است'),
})
const registerForm = z.object({
  fullName: requiredText('نام و نام خانوادگی'),
  phone: phoneSchema,
  email: emailSchema,
  password: requiredText('رمز عبور', 8),
})

type Mode = 'otp' | 'password' | 'register'

export default function LoginPage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto my-20 h-96 max-w-md rounded-card" />}>
      <LoginView />
    </Suspense>
  )
}

function LoginView() {
  usePageTitle('ورود به حساب')
  const router = useRouter()
  const params = useSearchParams()
  const signIn = useSession((s) => s.signIn)

  /**
   * کدام روش‌ها روشن‌اند از سرور خوانده می‌شود، نه از روی حدس: مدیر می‌تواند
   * هرکدام را از پنل خاموش کند و رابط نباید دکمه‌ی روشِ خاموش را نشان بدهد.
   */
  const [methods, setMethods] = useState<AuthMethods>({ otp: true, password: true })
  const [mode, setMode] = useState<Mode>('otp')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (MOCKING_ENABLED) return
    authApi
      .methods()
      .then((next) => {
        setMethods(next)
        setMode(next.otp ? 'otp' : 'password')
      })
      .catch(() => undefined)
  }, [])

  const done = (token: string, user: Parameters<typeof signIn>[1]) => {
    signIn(token, user)
    toast.success(`خوش آمدید، ${user.fullName}`)
    const next = params.get('next') ?? ''
    // فقط مسیر داخلی؛ وگرنه ?next=//evil.com کاربر را بعد از ورود به سایت دیگری می‌برد
    router.push(next.startsWith('/') && !next.startsWith('//') ? next : '/profile')
  }

  if (MOCKING_ENABLED) {
    return (
      <div className="container-page py-20">
        <div className="mx-auto max-w-md space-y-3 rounded-card border border-border bg-surface p-8 text-center">
          <h1 className="text-lg font-bold">ورود در حالت آزمایشی فعال نیست</h1>
          <p className="text-[13px] leading-7 text-muted">
            سایت الان با داده‌ی ساختگی کار می‌کند و حسابی برای ورود وجود ندارد. برای فعال شدن ورود، آدرس بک‌اند را در
            فایل محیطی تنظیم کنید.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-md space-y-5 rounded-card border border-border bg-surface p-7">
        <div className="space-y-1.5">
          <h1 className="text-lg font-bold">ورود به حساب</h1>
          <p className="text-[13px] leading-7 text-muted">برای ثبت سفارش و پیگیری تعمیرات وارد شوید.</p>
        </div>

        {methods.otp && methods.password && (
          <div className="flex gap-1.5 rounded-2xl bg-surface-2 p-1.5">
            {(
              [
                ['otp', 'کد پیامکی', MessageSquareLock],
                ['password', 'رمز عبور', KeyRound],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-medium transition-colors',
                  mode === value ? 'bg-surface text-brand-600 shadow-sm dark:text-brand-300' : 'text-muted',
                )}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>
        )}

        {mode === 'otp' && methods.otp && <OtpForm busy={busy} setBusy={setBusy} onDone={done} />}
        {mode === 'password' && methods.password && <PasswordForm busy={busy} setBusy={setBusy} onDone={done} />}
        {mode === 'register' && methods.password && <RegisterForm busy={busy} setBusy={setBusy} onDone={done} />}

        {methods.password && (
          <p className="text-center text-[12.5px] text-muted">
            {mode === 'register' ? 'حساب دارید؟ ' : 'حساب ندارید؟ '}
            <button
              type="button"
              onClick={() => setMode(mode === 'register' ? 'password' : 'register')}
              className="font-medium text-brand-600 hover:underline dark:text-brand-300"
            >
              {mode === 'register' ? 'وارد شوید' : 'ثبت‌نام کنید'}
            </button>
          </p>
        )}
      </div>
    </div>
  )
}

type StepProps = {
  busy: boolean
  setBusy: (value: boolean) => void
  onDone: (token: string, user: Parameters<ReturnType<typeof useSession.getState>['signIn']>[1]) => void
}

function OtpForm({ busy, setBusy, onDone }: StepProps) {
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const phoneValidator = useForm(phoneForm)
  const codeValidator = useForm(codeForm)

  // شمارش معکوس تا اجازه‌ی درخواست دوباره؛ بدون این کاربر پشت‌سرهم می‌زند
  useEffect(() => {
    if (seconds <= 0) return
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [seconds])

  const request = async () => {
    const parsed = phoneValidator.validate({ phone })
    if (!parsed) return

    setBusy(true)
    try {
      const { expiresIn, devCode } = await authApi.requestOtp(parsed.phone)
      setSent(true)
      setSeconds(expiresIn)
      // تا وقتی سرویس پیامک وصل نشده، کد را همین‌جا نشان می‌دهیم
      if (devCode) toast.success(`کد تست: ${devCode}`)
      else toast.success('کد تأیید پیامک شد')
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const verify = async () => {
    const parsed = codeValidator.validate({ code })
    if (!parsed) return

    setBusy(true)
    try {
      const session = await authApi.verifyOtp({ phone, code: parsed.code })
      onDone(session.token, session.user)
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        void (sent ? verify() : request())
      }}
    >
      <Field label="شماره موبایل" required error={phoneValidator.errors.phone}>
        <Input
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value)
            phoneValidator.revalidate({ phone: e.target.value })
          }}
          invalid={Boolean(phoneValidator.errors.phone)}
          disabled={sent}
          inputMode="numeric"
          placeholder="۰۹۱۲۳۴۵۶۷۸۹"
          className="num"
          dir="ltr"
        />
      </Field>

      {sent && (
        <Field label="کد تأیید" required error={codeValidator.errors.code}>
          <Input
            value={code}
            onChange={(e) => {
              setCode(e.target.value)
              codeValidator.revalidate({ code: e.target.value })
            }}
            invalid={Boolean(codeValidator.errors.code)}
            inputMode="numeric"
            maxLength={5}
            autoFocus
            className="num text-center tracking-[0.5em]"
            dir="ltr"
          />
        </Field>
      )}

      <Button type="submit" block loading={busy}>
        {sent ? 'ورود' : 'دریافت کد'}
      </Button>

      {sent && (
        <button
          type="button"
          disabled={seconds > 0}
          onClick={() => void request()}
          className="w-full text-center text-[12.5px] text-muted disabled:opacity-60"
        >
          {seconds > 0 ? `ارسال دوباره تا ${toFaDigits(seconds)} ثانیه` : 'ارسال دوباره‌ی کد'}
        </button>
      )}
    </form>
  )
}

function PasswordForm({ busy, setBusy, onDone }: StepProps) {
  const [values, setValues] = useState({ identifier: '', password: '' })
  const form = useForm(passwordForm)

  const submit = async () => {
    const parsed = form.validate(values)
    if (!parsed) return

    setBusy(true)
    try {
      const session = await authApi.login(parsed)
      onDone(session.token, session.user)
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const update = (patch: Partial<typeof values>) => {
    const next = { ...values, ...patch }
    setValues(next)
    form.revalidate(next)
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <Field label="شماره موبایل یا ایمیل" required error={form.errors.identifier}>
        <Input
          value={values.identifier}
          onChange={(e) => update({ identifier: e.target.value })}
          invalid={Boolean(form.errors.identifier)}
          dir="ltr"
        />
      </Field>
      <Field label="رمز عبور" required error={form.errors.password}>
        <Input
          type="password"
          value={values.password}
          onChange={(e) => update({ password: e.target.value })}
          invalid={Boolean(form.errors.password)}
          dir="ltr"
        />
      </Field>
      <Button type="submit" block loading={busy}>
        ورود
      </Button>
    </form>
  )
}

function RegisterForm({ busy, setBusy, onDone }: StepProps) {
  const [values, setValues] = useState({ fullName: '', phone: '', email: '', password: '' })
  const form = useForm(registerForm)

  const update = (patch: Partial<typeof values>) => {
    const next = { ...values, ...patch }
    setValues(next)
    form.revalidate(next)
  }

  const submit = async () => {
    const parsed = form.validate(values)
    if (!parsed) return

    setBusy(true)
    try {
      const session = await authApi.register({
        fullName: parsed.fullName,
        phone: parsed.phone,
        email: parsed.email,
        password: parsed.password,
      })
      onDone(session.token, session.user)
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <Field label="نام و نام خانوادگی" required error={form.errors.fullName}>
        <Input
          value={values.fullName}
          onChange={(e) => update({ fullName: e.target.value })}
          invalid={Boolean(form.errors.fullName)}
        />
      </Field>
      <Field label="شماره موبایل" required error={form.errors.phone}>
        <Input
          value={values.phone}
          onChange={(e) => update({ phone: e.target.value })}
          invalid={Boolean(form.errors.phone)}
          inputMode="numeric"
          className="num"
          dir="ltr"
        />
      </Field>
      <Field label="ایمیل" required error={form.errors.email}>
        <Input
          value={values.email}
          onChange={(e) => update({ email: e.target.value })}
          invalid={Boolean(form.errors.email)}
          dir="ltr"
        />
      </Field>
      <Field label="رمز عبور" required hint="دست‌کم ۸ نویسه" error={form.errors.password}>
        <Input
          type="password"
          value={values.password}
          onChange={(e) => update({ password: e.target.value })}
          invalid={Boolean(form.errors.password)}
          dir="ltr"
        />
      </Field>
      <Button type="submit" block loading={busy}>
        ساخت حساب
      </Button>
    </form>
  )
}
