'use client'

import { useCallback, useEffect, useState } from 'react'
import { getImageProps } from 'next/image'
import Link from 'next/link'
import useEmblaCarousel from 'embla-carousel-react'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import type { SectionProps, SlideItem } from '@/types/cms'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'

export function HeroSlider({ slides, autoplayMs, showThumbnails }: SectionProps['hero_slider']) {
  const [emblaRef, embla] = useEmblaCarousel({ loop: true, direction: 'rtl', duration: 30 })
  const [selected, setSelected] = useState(0)
  const [hovered, setHovered] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [tabHidden, setTabHidden] = useState(false)

  const onSelect = useCallback(() => {
    if (embla) setSelected(embla.selectedScrollSnap())
  }, [embla])

  useEffect(() => {
    if (!embla) return
    const onDown = () => setDragging(true)
    const onUp = () => setDragging(false)
    embla.on('select', onSelect).on('reInit', onSelect).on('pointerDown', onDown).on('pointerUp', onUp)
    onSelect()
    return () => {
      embla.off('select', onSelect).off('reInit', onSelect).off('pointerDown', onDown).off('pointerUp', onUp)
    }
  }, [embla, onSelect])

  useEffect(() => {
    const onVisibility = () => setTabHidden(document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const paused = hovered || dragging || tabHidden

  /**
   * setTimeout به‌جای setInterval و وابسته به `selected`:
   * با هر جابه‌جایی — چه خودکار چه دستی — شمارش از نو شروع می‌شود، وگرنه
   * ممکن بود بلافاصله بعد از کلیک کاربر، تایمر قدیمی اسلاید را عوض کند.
   */
  useEffect(() => {
    if (!embla || !autoplayMs || paused) return
    const id = setTimeout(() => embla.scrollNext(), autoplayMs)
    return () => clearTimeout(id)
  }, [embla, autoplayMs, paused, selected])

  if (!slides.length) return null

  const active = slides[selected] ?? slides[0]

  return (
    <div className="container-page">
      <div
        className="relative overflow-hidden rounded-3xl"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex">
            {slides.map((slide, i) => (
              <div key={slide.id} className="relative min-w-0 flex-[0_0_100%]">
                {/*
                  در موبایل نسبت ۱۶:۱۰ حدود ۲۲۰ پیکسل ارتفاع می‌داد و کپشن (تیتر
                  دو خطی + توضیح + دکمه) از قاب بیرون می‌زد و روی نقطه‌ها می‌افتاد.
                  min-height کف ارتفاع را تضمین می‌کند و تصویر با object-cover پر می‌شود.
                */}
                <div className="relative min-h-96 aspect-[16/10] sm:min-h-0 sm:aspect-[21/9]">
                  <SlideImage slide={slide} first={i === 0} />
                  <div className="absolute inset-0 bg-gradient-to-l from-ink-950/10 via-ink-950/55 to-ink-950/90" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/*
          متن بیرون از ریل کروسل است تا با ترنسفورم embla درگیر نشود؛
          تصویر اسلاید می‌خورد و متن سر جای خودش کراس‌فید می‌شود.
        */}
        <div className="pointer-events-none absolute inset-0 flex items-center">
          {/*
            از sm به بالا فلش‌ها ظاهر می‌شوند؛ ps بیشتر می‌دهیم تا روی متن نیفتند.
            pb در موبایل جای نقطه‌های پایین را خالی نگه می‌دارد تا دکمه رویشان ننشیند.
          */}
          <div className="w-full max-w-2xl px-6 pb-12 sm:ps-24 sm:pe-12 sm:pb-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={active.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                className="pointer-events-auto space-y-4"
              >
                <span className="block h-1 w-14 rounded-full" style={{ backgroundColor: active.accent }} />
                <h2 className="text-balance text-2xl font-bold leading-[1.7] text-white sm:text-4xl">
                  {active.title}
                </h2>
                <p className="max-w-lg text-[13px] leading-8 text-white/75 sm:text-[15px]">{active.subtitle}</p>
                <Link
                  href={active.ctaHref}
                  className={cn(buttonVariants({ size: 'lg' }), 'group mt-2 shadow-none hover:brightness-110')}
                  // سایه از رنگ همان اسلاید ساخته می‌شود، نه رنگ ثابت برند
                  style={{
                    backgroundColor: active.accent,
                    boxShadow: `0 12px 34px -14px ${active.accent}`,
                  }}
                >
                  {active.ctaLabel}
                  <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
                </Link>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/*
          سایت RTL است، پس start سمت راست و end سمت چپ می‌نشیند.
          «قبلی» سمت راست با فلش راست و «بعدی» سمت چپ با فلش چپ — هم‌جهت با
          حرکت خودِ اسلایدر و مثل فلش‌های کروسل محصولات.
        */}
        <button
          onClick={() => embla?.scrollPrev()}
          aria-label="اسلاید قبلی"
          className="absolute start-4 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/12 text-white backdrop-blur transition-colors hover:bg-white/25 sm:grid"
        >
          <ChevronRight className="size-5" />
        </button>
        <button
          onClick={() => embla?.scrollNext()}
          aria-label="اسلاید بعدی"
          className="absolute end-4 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/12 text-white backdrop-blur transition-colors hover:bg-white/25 sm:grid"
        >
          <ChevronLeft className="size-5" />
        </button>

        {showThumbnails && (
          <div className="absolute inset-x-0 bottom-5 flex justify-center gap-2">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                onClick={() => embla?.scrollTo(i)}
                aria-label={`اسلاید ${i + 1}`}
                aria-current={selected === i}
                className={cn(
                  'h-1.5 overflow-hidden rounded-full transition-all duration-400',
                  selected === i ? 'w-10 bg-white/35' : 'w-4 bg-white/40 hover:bg-white/70',
                )}
              >
                {/*
                  نوار پیشرفت فقط روی نقطه‌ی فعال و فقط وقتی پخش خودکار در جریان است.
                  هنگام توقف حذف می‌شود چون با ادامه، شمارش از صفر شروع می‌شود.
                */}
                {selected === i && autoplayMs > 0 && !paused && (
                  <motion.span
                    key={slide.id}
                    className="block h-full rounded-full bg-white"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: autoplayMs / 1000, ease: 'linear' }}
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * قاب اسلایدر در گوشی تقریباً مربع است و در لپ‌تاپ ۲۱ به ۹؛ تصویر عریض در گوشی
 * از دو طرف بریده می‌شد. اگر ادمین تصویر گوشی داده باشد، زیر ۶۴۰ پیکسل همان
 * نمایش داده می‌شود. با <picture> مرورگر فقط یکی از دو تصویر را دانلود می‌کند؛
 * دو <Image> که با CSS پنهان شوند، هر دو را می‌گرفتند.
 */
function SlideImage({ slide, first }: { slide: SlideItem; first: boolean }) {
  const imageProps = (src: string) =>
    getImageProps({
      src,
      alt: '',
      fill: true,
      sizes: '100vw',
      className: 'object-cover',
      // اسلاید اول بالای صفحه است و نباید منتظر بارگذاری تنبل بماند
      loading: first ? 'eager' : 'lazy',
      fetchPriority: first ? 'high' : 'auto',
    }).props
  const desktop = imageProps(slide.image)
  const mobile = slide.mobileImage ? imageProps(slide.mobileImage) : null

  return (
    <picture>
      {/* تصویرهای svg بهینه‌سازی نمی‌شوند و srcSet ندارند؛ آن‌وقت خودِ src کافی است */}
      {mobile && <source media="(max-width: 639px)" srcSet={mobile.srcSet ?? mobile.src} sizes={mobile.sizes} />}
      {/* eslint-disable-next-line @next/next/no-img-element -- خروجی getImageProps همان تگ next/image است */}
      <img {...desktop} />
    </picture>
  )
}
