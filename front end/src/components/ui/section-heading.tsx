import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export function SectionHeading({
  title,
  href,
  linkLabel = 'مشاهده همه',
  className,
}: {
  title: string
  href?: string
  linkLabel?: string
  className?: string
}) {
  return (
    <div className={cn('mb-7 flex items-end justify-between gap-4', className)}>
      <h2 className="text-xl font-bold sm:text-2xl">
        {/*
          خط زیر عنوان تمام عرض خودِ متن را می‌گیرد، نه یک تکه‌ی ۴۰ پیکسلی.
          span بیرونی inline مانده (نه inline-block) تا عنوان بلند در موبایل
          بشکند و از کادر بیرون نزند؛ inset-x-0 عرض را از همان متن می‌گیرد.
        */}
        <span className="relative">
          {title}
          <span className="absolute inset-x-0 -bottom-1 h-[3px] rounded-full bg-brand-500" />
        </span>
      </h2>
      {href && (
        <Link
          href={href}
          className="group inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand-600 transition-colors hover:text-brand-500 dark:text-brand-400"
        >
          {linkLabel}
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
        </Link>
      )}
    </div>
  )
}
