import { dehydrate } from '@tanstack/react-query'
import { cmsApi } from '@/lib/api/endpoints'
import { qk } from '@/lib/api/queries'
import { makeServerQueryClient, prefetch } from '@/lib/api/prefetch'
import type { Metadata, Viewport } from 'next'
import { vazirmatn, yekan } from '@/lib/fonts'
import { DEFAULT_FAVICON } from '@/lib/brand'
import { SITE_URL, absoluteUrl } from '@/lib/api/server'
import { siteIdentity, titleName } from '@/lib/site-meta'
import { Providers } from './providers'
import './globals.css'

/**
 * عنوان و توضیح از تنظیمات پنل ساخته می‌شوند، نه از متنِ ثابتِ کد.
 *
 * تا پیش از این نام «سینر» در کد نوشته شده بود و در HTML می‌نشست، در حالی که
 * فروشگاه نام دیگری داشت — یعنی جست‌وجوی نام واقعی به هیچ‌جای سایت نمی‌رسید.
 * `metadataBase` هم به دامنه‌ی دیگری اشاره می‌کرد و آدرس‌های مطلقِ متادیتا
 * (کاننیکال و تصویر اشتراک‌گذاری) روی همان دامنه ساخته می‌شدند.
 */
export async function generateMetadata(): Promise<Metadata> {
  const site = await siteIdentity()
  const name = titleName(site)

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: `${name} | ${site.tagline}`,
      template: `%s | ${site.name}`,
    },
    description:
      `${name}، ${site.tagline}. خرید گوشی، لپ‌تاپ، کنسول و بازی با ضمانت اصالت کالا، ` +
      'به‌همراه تعمیرگاه تخصصی با پیک رایگان درب منزل.',
    keywords: [
      site.name,
      site.wordmark,
      new URL(SITE_URL).hostname,
      'فروشگاه موبایل',
      'خرید لپ تاپ',
      'کنسول بازی',
      'تعمیر موبایل',
      'تعمیر لپ تاپ',
    ],
    // فقط صفحه‌ی اصلی این را می‌گیرد؛ بقیه‌ی بخش‌ها کاننیکال خودشان را دارند
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      locale: 'fa_IR',
      siteName: site.name,
      url: '/',
      images: site.logo ? [{ url: absoluteUrl(site.logo), alt: site.name }] : undefined,
    },
  }
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f8fa' },
    { media: '(prefers-color-scheme: dark)', color: '#0b111a' },
  ],
}

/** جلوگیری از پرش تم هنگام لود اولیه */
const themeScript = `
(function(){
  try {
    var stored = JSON.parse(localStorage.getItem('sinner-ui') || '{}');
    var theme = (stored.state && stored.state.theme) || 'system';
    var dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // تنظیمات سایت را هدر، فوتر و آیکون تب می‌خوانند؛ از پیش گرفته می‌شود تا در HTML سرور باشد
  const client = makeServerQueryClient()
  await prefetch(client, qk.settings, () => cmsApi.settings())

  const site = await siteIdentity()

  /*
   * داده‌ی ساختاریافته‌ی خودِ سایت: به گوگل می‌گوید این دامنه رسماً مالِ کدام
   * کسب‌وکار است. همین چیزی است که کارت نام و جست‌وجوی داخلی سایت در نتیجه‌ها
   * از رویش ساخته می‌شود.
   */
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: site.name,
      ...(site.wordmark && { alternateName: site.wordmark }),
      url: SITE_URL,
      ...(site.logo && { logo: absoluteUrl(site.logo) }),
      description: site.tagline,
      ...(site.socials.length && { sameAs: site.socials }),
      ...(site.address && {
        address: { '@type': 'PostalAddress', streetAddress: site.address, addressCountry: 'IR' },
      }),
      ...((site.phone || site.email) && {
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          ...(site.phone && { telephone: site.phone }),
          ...(site.email && { email: site.email }),
          areaServed: 'IR',
          availableLanguage: 'Persian',
        },
      }),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: site.name,
      ...(site.wordmark && { alternateName: site.wordmark }),
      url: SITE_URL,
      inLanguage: 'fa-IR',
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/products?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
  ]

  return (
    // data-scroll-behavior: چون در globals.css روی html اسکرول نرم گذاشته‌ایم،
    // نکست ۱۶ فقط با این نشانه، هنگام جابه‌جایی بین صفحه‌ها موقتاً خاموشش می‌کند
    // تا رفتن به صفحه‌ی بعد به‌جای اسکرول انیمیشنی، آنی باشد.
    <html
      lang="fa"
      dir="rtl"
      data-scroll-behavior="smooth"
      className={`${vazirmatn.variable} ${yekan.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/*
         * آیکون تب به‌جای metadata.icons دستی گذاشته می‌شود: نکست لینکِ متادیتا را
         * در هر ناوبری از نو می‌سازد و آیکونی که ادمین انتخاب کرده پاک می‌شد.
         * این لینک مال ماست و FaviconSync همین را به‌روز می‌کند.
         */}
        <link rel="icon" type="image/svg+xml" href={DEFAULT_FAVICON} />
        <script
          type="application/ld+json"
          // < در JSON می‌تواند تگ script را زودتر ببندد
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers state={dehydrate(client)}>{children}</Providers>
      </body>
    </html>
  )
}
