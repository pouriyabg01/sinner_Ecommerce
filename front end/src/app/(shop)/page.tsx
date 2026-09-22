'use client'

import { useHomeConfig } from '@/lib/api/queries'
import { SectionRenderer } from '@/components/home/section-renderer'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadError } from '@/components/ui/load-error'

export default function HomePage() {
  const { data, isLoading, isError, refetch } = useHomeConfig()

  if (isError) {
    return (
      <div className="container-page py-10">
        <LoadError as="h1" onRetry={() => refetch()} />
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="container-page space-y-10 py-6">
        <Skeleton className="aspect-[21/9] rounded-3xl" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-card" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="pt-4">
      {/*
        تیتر اصلی صفحه. تیتر دیده‌شدنیِ لندینگ، کپشن اسلایدر است که با هر اسلاید
        عوض می‌شود و نمی‌تواند h1 باشد؛ پس h1 ثابت و مخفی می‌گذاریم تا ساختار
        سند و صفحه‌خوان‌ها بدانند این صفحه چیست.
      */}
      <h1 className="sr-only">سینر — فروشگاه و تعمیرگاه تخصصی موبایل، لپ‌تاپ، کنسول و بازی</h1>

      {data.sections.map((section) => (
        <SectionRenderer key={section.id} section={section} />
      ))}
    </div>
  )
}
