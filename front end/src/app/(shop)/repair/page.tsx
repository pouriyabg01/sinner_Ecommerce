'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { CheckCircle2, ClipboardList, Copy, Search, Truck, Wrench } from 'lucide-react'
import type { RepairRequest } from '@/types/repair'
import { RepairWizard } from '@/components/repair/repair-wizard'
import { SignInRequired } from '@/components/auth/sign-in-required'
import { RepairTimeline } from '@/components/repair/status-timeline'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import { formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'

const howItWorks = [
  { icon: ClipboardList, title: 'ثبت درخواست', text: 'دستگاه و مشکل آن را انتخاب کنید — کمتر از دو دقیقه.' },
  { icon: Truck, title: 'پیک رایگان', text: 'پیک ما در بازه‌ی انتخابی‌ات درِ خانه دستگاه را تحویل می‌گیرد.' },
  { icon: Wrench, title: 'عیب‌یابی و تعمیر', text: 'هزینه‌ی قطعی اعلام می‌شود؛ بدون تأیید تو کاری انجام نمی‌شود.' },
  { icon: CheckCircle2, title: 'تحویل با گارانتی', text: 'دستگاه تعمیرشده با ۶ ماه گارانتی به دستت می‌رسد.' },
]

/** ثبت تعمیر فقط برای کاربر واردشده است؛ مهمان به‌جای کل صفحه دعوت به ورود می‌بیند */
export default function RepairPage() {
  return (
    <SignInRequired
      title="برای سفارش تعمیر وارد شوید"
      description="ثبت و پیگیری تعمیر به حساب کاربری نیاز دارد. بعد از ورود به همین صفحه برمی‌گردید."
    >
      <RepairContent />
    </SignInRequired>
  )
}

function RepairContent() {
  const [result, setResult] = useState<RepairRequest | null>(null)

  return (
    <div className="pb-16">
      {/* هدر */}
      <div className="relative overflow-hidden border-b border-border bg-gradient-to-bl from-brand-700 via-brand-600 to-brand-800">
        <span
          aria-hidden
          className="pointer-events-none absolute -end-20 -top-24 size-88 bg-[radial-gradient(circle,#fff,transparent_70%)] opacity-[0.14]"
        />
        <span className="absolute -bottom-28 start-10 size-64 rounded-full bg-white/5" />
        <div className="container-page relative py-14 sm:py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl space-y-4"
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-medium text-white">
              <Wrench className="size-3.5" />
              تعمیرگاه تخصصی سینر
            </span>
            <h1 className="text-balance text-2xl font-bold leading-[1.7] text-white sm:text-4xl">
              دستگاه شما خراب شده است؟ لازم نیست از منزل خارج شوید.
            </h1>
            <p className="max-w-xl text-sm leading-8 text-white/75">
              مشکل دستگاه را انتخاب کنید؛ پیک سینر درِ منزل مراجعه می‌کند و دستگاه را تحویل می‌گیرد. عیب‌یابی رایگان است و تا زمانی که هزینه را
              تأیید نکنید، هیچ اقدامی انجام نمی‌شود.
            </p>
            <div className="flex flex-wrap gap-2.5 pt-2">
              <Link
                href="#wizard"
                className={cn(buttonVariants({ size: 'lg' }), 'bg-white text-brand-700 shadow-none hover:bg-ink-50')}
              >
                شروع ثبت درخواست
              </Link>
              <Link
                href="/repair/track"
                className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'border-white/40 text-white hover:border-white hover:text-white')}
              >
                <Search className="size-4" />
                پیگیری تعمیر
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* مراحل */}
      <div className="container-page py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {howItWorks.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="relative rounded-card border border-border bg-surface p-5"
            >
              <span className="num absolute end-4 top-4 text-3xl font-bold text-brand-500/35 dark:text-brand-400/40">{i + 1}</span>
              <span className="mb-3.5 grid size-11 place-items-center rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                <step.icon className="size-5" />
              </span>
              <p className="mb-1.5 text-[13.5px] font-bold">{step.title}</p>
              <p className="text-[12px] leading-6 text-muted">{step.text}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ویزارد یا نتیجه */}
      <div id="wizard" className="container-page scroll-mt-32">
        {result ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mx-auto max-w-2xl space-y-6 rounded-card border border-brand-500/30 bg-surface p-7 text-center"
          >
            <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-brand-500/12 text-brand-600 dark:text-brand-400">
              <CheckCircle2 className="size-8" />
            </span>
            <div className="space-y-2">
              <h2 className="text-lg font-bold">درخواست تعمیر ثبت شد</h2>
              <p className="text-[13px] leading-7 text-muted">
                همکاران ما تا کمتر از دو ساعت کاری برای هماهنگی با شما تماس می‌گیرند.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 rounded-2xl bg-surface-2 px-4 py-3">
              <span className="text-xs text-muted">کد پیگیری:</span>
              <span className="en-code text-sm font-bold">{result.code}</span>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(result.code)
                  toast.success('کد پیگیری کپی شد')
                }}
                aria-label="کپی کد"
                className="text-muted transition-colors hover:text-brand-600"
              >
                <Copy className="size-4" />
              </button>
            </div>

            {result.estimatedCost.max > 0 && (
              <p className="num text-[13px]">
                برآورد هزینه: {formatPrice(result.estimatedCost.min, false)} تا {formatPrice(result.estimatedCost.max)}
              </p>
            )}

            <div className="rounded-2xl border border-border p-5 text-start">
              <p className="mb-4 text-[13px] font-bold">وضعیت</p>
              <RepairTimeline timeline={result.timeline} />
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/profile/repairs" className={buttonVariants({ variant: 'soft' })}>
                پیگیری در پنل کاربری
              </Link>
              <Button variant="ghost" onClick={() => setResult(null)}>
                ثبت درخواست جدید
              </Button>
            </div>
          </motion.div>
        ) : (
          <div id="repair-form" className="mx-auto max-w-3xl scroll-mt-32">
            <div className="mb-6 space-y-1.5 text-center">
              <h2 className="text-xl font-bold">ثبت سفارش تعمیر</h2>
              <p className="text-sm text-muted">در چهار قدم ساده — بدون نیاز به تماس تلفنی</p>
            </div>
            {/* useSearchParams داخل ویزارد Suspense می‌خواهد وگرنه build صفحه را رد می‌کند */}
            <Suspense fallback={<Skeleton className="h-96 rounded-card" />}>
              <RepairWizard onDone={setResult} />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  )
}
