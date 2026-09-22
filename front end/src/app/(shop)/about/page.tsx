'use client'

import { useState } from 'react'
import { z } from 'zod'
import { motion } from 'motion/react'
import { Mail, MapPin, Phone } from 'lucide-react'
import { useAboutConfig, useSiteSettings } from '@/lib/api/queries'
import { Field, Input, Textarea } from '@/components/ui/input'
import { useForm } from '@/lib/use-form'
import { mobileSchema, requiredText } from '@/lib/validation'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadError } from '@/components/ui/load-error'
import { toast } from '@/components/ui/toast'
import { toFaDigits } from '@/lib/format'
import { getIcon } from '@/lib/icons'

const contactSchema = z.object({
  name: requiredText('نام و نام خانوادگی'),
  phone: mobileSchema,
  message: requiredText('پیام', 10),
})

export default function AboutPage() {
  const [contact, setContact] = useState({ name: '', phone: '', message: '' })
  const form = useForm(contactSchema)

  /** بعد از اولین تلاش برای ارسال، هر تغییری خطاها را زنده به‌روز می‌کند */
  const update = (patch: Partial<typeof contact>) => {
    const next = { ...contact, ...patch }
    setContact(next)
    form.revalidate(next)
  }

  const { data: settings } = useSiteSettings()
  const { data: about, isLoading, isError, refetch } = useAboutConfig()

  if (isError) {
    return (
      <div className="container-page py-16">
        <LoadError as="h1" onRetry={() => refetch()} />
      </div>
    )
  }

  if (isLoading || !about) {
    return (
      <div className="pb-16">
        <Skeleton className="h-64 rounded-none" />
        <div className="container-page space-y-4 py-12">
          <Skeleton className="h-32 rounded-card" />
          <Skeleton className="h-48 rounded-card" />
        </div>
      </div>
    )
  }

  return (
    <div className="pb-16">
      {/*
        نوار full-bleed اگر در هر دو تم تیره بماند، در حالت روشن مثل یک بلوک
        مشکی وسط صفحه‌ی روشن می‌نشیند. پس‌زمینه با تم عوض می‌شود و متن‌ها
        از توکن foreground/muted می‌آیند تا روی هر دو زمینه خوانا بمانند.
      */}
      <div className="relative overflow-hidden border-b border-border bg-gradient-to-bl from-brand-50 to-ink-50 dark:from-ink-900 dark:to-ink-950">
        <span
          aria-hidden
          className="pointer-events-none absolute -end-24 -top-24 size-96 bg-[radial-gradient(circle,var(--color-brand-500),transparent_70%)] opacity-[0.22]"
        />
        <div className="container-page relative py-16 sm:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl space-y-4"
          >
            <span className="inline-block h-1 w-14 rounded-full bg-brand-500" />
            <h1 className="text-balance text-2xl font-bold leading-[1.7] text-foreground sm:text-4xl">
              {about.hero.title}
            </h1>
            {/* روی زمینه‌ی نعنایی روشن، توکن muted کنتراست ۴.۱ می‌دهد که زیر آستانه‌ی AA است */}
            <p className="whitespace-pre-line text-sm leading-8 text-ink-600 dark:text-muted">
              {about.hero.body}
            </p>
          </motion.div>
        </div>
      </div>

      {about.stats.enabled && about.stats.items.length > 0 && (
        <div className="container-page py-12">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {about.stats.items.map((stat, i) => {
              const Icon = getIcon(stat.icon)
              return (
                <motion.div
                  key={stat.id}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="rounded-card border border-border bg-surface p-6 text-center"
                >
                  <span className="mx-auto mb-3 grid size-11 place-items-center rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                    <Icon className="size-5" />
                  </span>
                  <p className="num text-xl font-bold">{stat.value}</p>
                  <p className="mt-1 text-[11.5px] text-muted">{stat.label}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {about.values.enabled && about.values.items.length > 0 && (
        <div className="container-page">
          <div className="grid gap-4 md:grid-cols-3">
            {about.values.items.map((value, i) => (
              <motion.div
                key={value.id}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.1 }}
                className="rounded-card border border-border bg-surface p-6"
              >
                <span className="num mb-3 block text-2xl font-bold text-brand-500/25">{toFaDigits(i + 1)}</span>
                <h3 className="mb-2.5 text-[14px] font-bold leading-7">{value.title}</h3>
                <p className="text-[12.5px] leading-8 text-muted">{value.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {about.contact.enabled && (
        <div id="contact" className="container-page scroll-mt-32 pt-14">
          <div className="grid gap-6 rounded-card border border-border bg-surface p-6 lg:grid-cols-2 sm:p-8">
            <div className="space-y-5">
              <h2 className="text-lg font-bold">{about.contact.title}</h2>
              <p className="whitespace-pre-line text-[13px] leading-8 text-muted">{about.contact.description}</p>
              <ul className="space-y-3.5 text-[13px]">
                <li className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                    <MapPin className="size-4" />
                  </span>
                  <span className="leading-7">{settings?.address}</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                    <Phone className="size-4" />
                  </span>
                  <span className="num" dir="ltr">
                    {settings ? toFaDigits(settings.phone) : ''}
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                    <Mail className="size-4" />
                  </span>
                  <span dir="ltr">{settings?.email}</span>
                </li>
              </ul>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!form.validate(contact)) return
                toast.success('پیام شما ثبت شد. حداکثر تا یک روز کاری پاسخ می‌دهیم.')
                setContact({ name: '', phone: '', message: '' })
                form.reset()
              }}
              noValidate
              className="space-y-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="نام و نام خانوادگی" required error={form.errors.name}>
                  <Input
                    value={contact.name}
                    onChange={(e) => update({ name: e.target.value })}
                    invalid={Boolean(form.errors.name)}
                    placeholder="نام شما"
                  />
                </Field>
                <Field
                  label="شماره تماس"
                  required
                  hint="۱۱ رقم، با ۰۹ شروع شود"
                  error={form.errors.phone}
                >
                  <Input
                    value={contact.phone}
                    onChange={(e) => update({ phone: e.target.value })}
                    invalid={Boolean(form.errors.phone)}
                    inputMode="tel"
                    maxLength={13}
                    placeholder="09xxxxxxxxx"
                    dir="ltr"
                    className="text-start"
                  />
                </Field>
              </div>
              <Field label="پیام شما" required hint="حداقل ۱۰ حرف" error={form.errors.message}>
                <Textarea
                  value={contact.message}
                  onChange={(e) => update({ message: e.target.value })}
                  invalid={Boolean(form.errors.message)}
                  placeholder="سؤال یا نظر خود را بنویسید…"
                />
              </Field>
              <Button type="submit" block size="lg">
                ارسال پیام
              </Button>
            </form>
          </div>
        </div>
      )}

      {about.terms.enabled && about.terms.items.length > 0 && (
        <div id="terms" className="container-page scroll-mt-32 pt-14">
          <h2 className="mb-4 text-lg font-bold">{about.terms.title}</h2>
          <div className="space-y-3 rounded-card border border-border bg-surface p-6 text-[12.5px] leading-8 text-muted">
            {about.terms.items.map((term, i) => (
              <p key={term.id}>
                <span className="num">{toFaDigits(i + 1)}.</span> {term.text}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
