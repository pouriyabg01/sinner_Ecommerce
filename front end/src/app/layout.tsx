import { dehydrate } from '@tanstack/react-query'
import { cmsApi } from '@/lib/api/endpoints'
import { qk } from '@/lib/api/queries'
import { makeServerQueryClient, prefetch } from '@/lib/api/prefetch'
import type { Metadata, Viewport } from 'next'
import { vazirmatn, yekan } from '@/lib/fonts'
import { DEFAULT_FAVICON } from '@/lib/brand'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://sinner.shop'),
  title: {
    default: 'سینر | فروشگاه و تعمیرگاه تخصصی دیجیتال',
    template: '%s | سینر',
  },
  description:
    'خرید گوشی، لپ‌تاپ، کنسول و بازی با ضمانت اصالت کالا، به‌همراه تعمیرگاه تخصصی با پیک رایگان درب منزل.',
  keywords: ['فروشگاه موبایل', 'خرید لپ تاپ', 'کنسول بازی', 'تعمیر موبایل', 'تعمیر لپ تاپ'],
  openGraph: {
    type: 'website',
    locale: 'fa_IR',
    siteName: 'سینر',
  },
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
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers state={dehydrate(client)}>{children}</Providers>
      </body>
    </html>
  )
}
