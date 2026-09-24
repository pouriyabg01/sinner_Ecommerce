'use client'

import { useState } from 'react'
import { z } from 'zod'
import { Mail, Send } from 'lucide-react'
import type { SectionProps } from '@/types/cms'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { useForm } from '@/lib/use-form'
import { useSubscribeToNewsletter } from '@/lib/api/queries'
import { emailSchema } from '@/lib/validation'

const newsletterSchema = z.object({ email: emailSchema })

export function Newsletter({ title, subtitle, placeholder, ctaLabel }: SectionProps['newsletter']) {
  const [email, setEmail] = useState('')
  const form = useForm(newsletterSchema)
  const subscribe = useSubscribeToNewsletter()

  return (
    <div className="container-page">
      <div className="relative overflow-hidden rounded-card border border-border bg-surface p-8 text-center sm:p-12">
        <span
          aria-hidden
          className="pointer-events-none absolute -end-16 -top-16 size-56 bg-[radial-gradient(circle,var(--color-brand-500),transparent_70%)] opacity-[0.16]"
        />
        <span className="absolute -bottom-20 -start-10 size-56 rounded-full bg-ember-500/6" />

        <div className="relative mx-auto max-w-lg space-y-4">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
            <Mail className="size-6" />
          </span>
          <h2 className="text-xl font-bold sm:text-2xl">{title}</h2>
          <p className="text-[13px] leading-7 text-muted">{subtitle}</p>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!form.validate({ email })) return
              subscribe.mutate(email.trim(), {
                onSuccess: () => {
                  setEmail('')
                  form.reset()
                  /*
                   * عضویت دومرحله‌ای است: اینجا فقط نامه‌ی تأیید رفته. پیام هم همین
                   * را می‌گوید، وگرنه کاربر منتظر خبرنامه‌ای می‌ماند که هیچ‌وقت
                   * نمی‌آید چون روی لینک تأیید نزده است.
                   */
                  toast.success('نامه‌ی تأیید برایتان فرستاده شد؛ صندوق ورودی ایمیلتان را ببینید.')
                },
                onError: (error) => toast.error(error.message),
              })
            }}
            noValidate
            className="space-y-2 pt-2"
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  form.revalidate({ email: e.target.value })
                }}
                aria-invalid={Boolean(form.errors.email) || undefined}
                aria-label={placeholder}
                placeholder={placeholder}
                /*
                 * تا وقتی خالی است راست‌چین می‌ماند تا راهنمای فارسی مثل بقیه‌ی
                 * صفحه از راست شروع شود؛ با اولین حرف، چپ‌چین می‌شود چون ایمیل
                 * لاتین است. (dir="auto" اینجا کار نمی‌کند: مرورگر جهت را از
                 * مقدار می‌گیرد نه از راهنما، و مقدار خالی یعنی چپ‌چین.)
                 */
                dir={email ? 'ltr' : 'rtl'}
                className={cn(
                  /*
                   * روی گوشی چیدمان ستونی است و flex-1 آنجا روی ارتفاع اثر
                   * می‌گذارد، نه عرض — کادر را به ۲۴ پیکسل له می‌کرد. پس فقط از
                   * عرض تبلت به بالا flex می‌شود.
                   *
                   * قلم ۱۶ پیکسلی روی گوشی عمدی است: سافاری با قلم کوچک‌تر،
                   * موقع لمس کادر کل صفحه را زوم می‌کند.
                   */
                  'h-12 w-full shrink-0 rounded-2xl border bg-background px-4 text-base outline-none transition-all placeholder:text-muted/70 sm:flex-1 sm:text-sm',
                  form.errors.email
                    ? 'border-red-500 focus:shadow-[0_0_0_4px_rgba(239,68,68,0.16)]'
                    : 'border-border focus:border-brand-400 focus:shadow-[0_0_0_4px_rgba(0,179,146,0.12)]',
                )}
              />
              <Button type="submit" size="lg" loading={subscribe.isPending}>
                <Send className="size-4" />
                {ctaLabel}
              </Button>
            </div>
            {form.errors.email && (
              <p role="alert" className="text-xs text-red-500">
                {form.errors.email}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
