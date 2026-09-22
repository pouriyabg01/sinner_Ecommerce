import type { AboutPageConfig, HomePageConfig, SiteSettings } from '@/types/cms'
import { DEFAULT_PAYMENT_SETTINGS } from '@/lib/payment'
import { DEFAULT_REPAIR_SETTINGS } from '@/lib/repair-pickup'

export const siteSettings: SiteSettings = {
  siteName: 'سینر',
  tagline: 'فروشگاه و تعمیرگاه تخصصی دیجیتال',
  brand: { mark: '', favicon: '', wordmark: 'SINNER', caption: 'فروشگاه و تعمیرگاه' },
  phone: '021-91008080',
  email: 'hello@sinner.shop',
  address: 'تهران، خیابان ولیعصر، بالاتر از میدان ونک، برج آوا، طبقه ۶',
  socials: [
    { id: 'ig', label: 'اینستاگرام', href: 'https://instagram.com' },
    { id: 'tg', label: 'تلگرام', href: 'https://telegram.org' },
    { id: 'wa', label: 'واتساپ', href: 'https://wa.me/' },
  ],
  announcement: {
    enabled: true,
    text: 'ارسال رایگان برای سفارش‌های بالای ۵ میلیون تومان — به‌همراه پیک رایگان تحویل دستگاه تعمیری',
    href: '/repair',
  },
  auth: { otp: true, password: true },
  shipping: {
    freeThreshold: 5_000_000,
    cost: 350_000,
  },
  payment: structuredClone(DEFAULT_PAYMENT_SETTINGS),
  repair: structuredClone(DEFAULT_REPAIR_SETTINGS),
  footer: {
    description:
      'سینر فقط یک فروشگاه نیست؛ از لحظه‌ی خرید تا زمانی که دستگاه شما به تعمیر نیاز پیدا کند، کنار شما هستیم.',
    badges: {
      enabled: true,
      items: [
        { id: 'tb_authentic', icon: 'shield-check', title: 'ضمانت اصالت', text: 'کالای اورجینال یا بازگشت وجه' },
        { id: 'tb_shipping', icon: 'truck', title: 'ارسال سریع', text: 'تهران زیر ۴ ساعت' },
        { id: 'tb_return', icon: 'undo-2', title: '۷ روز مهلت تعویض', text: 'بدون قید و شرط' },
        { id: 'tb_service', icon: 'wrench', title: 'خدمات پس از فروش', text: 'تعمیرگاه تخصصی خودمان' },
      ],
    },
    columns: [
      {
        id: 'fc_categories',
        title: 'دسته‌بندی‌ها',
        source: 'categories',
        links: [],
      },
      {
        id: 'fc_services',
        title: 'خدمات',
        source: 'services',
        links: [],
      },
      {
        id: 'fc_company',
        title: 'سینر',
        source: 'manual',
        links: [
          { id: 'fl_about', label: 'درباره ما', href: '/about' },
          { id: 'fl_contact', label: 'تماس با ما', href: '/about#contact' },
          { id: 'fl_terms', label: 'قوانین و مقررات', href: '/about#terms' },
          { id: 'fl_compare', label: 'مقایسه محصولات', href: '/compare' },
          { id: 'fl_orders', label: 'سفارش‌های من', href: '/profile/orders' },
        ],
      },
    ],
  },
  theme: {
    brandHue: '#00b392',
    emberHue: '#ff5c3e',
    radius: 'soft',
    darkMode: 'system',
  },
}

/** پیکربندی صفحه‌ی اصلی — ادمین همین آرایه را در پنل ویرایش می‌کند */
export const homeConfig: HomePageConfig = {
  updatedAt: new Date().toISOString(),
  sections: [
    {
      id: 'sec_hero',
      type: 'hero_slider',
      enabled: true,
      spacing: 'sm',
      background: 'default',
      props: {
        autoplayMs: 6000,
        showThumbnails: true,
        slides: [
          {
            id: 'sl_1',
            title: 'آیفون ۱۶ پرو مکس رسید',
            subtitle: 'بدنه تیتانیومی، تراشه A18 Pro و دوربین حرفه‌ای در نور کم — همراه با گارانتی طلایی سینر',
            image: '/img/banners/hero-1.svg',
            ctaLabel: 'مشاهده و خرید',
            ctaHref: '/product/iphone-16-pro-max',
            accent: '#00b392',
          },
          {
            id: 'sl_2',
            title: 'دنیای گیمینگ، بدون سقف',
            subtitle: 'کنسول‌ها و لپ‌تاپ‌های گیمینگ با ضمانت اصالت و امکان تعویض تا ۷ روز',
            image: '/img/banners/hero-2.svg',
            ctaLabel: 'ورود به دنیای بازی',
            ctaHref: '/products?category=console',
            accent: '#5b6cff',
          },
          {
            id: 'sl_3',
            title: 'دستگاه شما خراب است؟ پیک ما درِ منزل می‌آید',
            subtitle: 'پیک رایگان، عیب‌یابی رایگان و ۶ ماه گارانتی روی تمام تعمیرات',
            image: '/img/banners/hero-3.svg',
            ctaLabel: 'ثبت سفارش تعمیر',
            ctaHref: '/repair',
            accent: '#ff5c3e',
          },
        ],
      },
    },
    {
      id: 'sec_features',
      type: 'features_bar',
      enabled: true,
      spacing: 'sm',
      background: 'default',
      props: {
        items: [
          { id: 'f1', icon: 'shield-check', title: 'ضمانت اصالت کالا', subtitle: 'بازگشت وجه در صورت مغایرت' },
          { id: 'f2', icon: 'truck', title: 'ارسال سریع', subtitle: 'تهران زیر ۴ ساعت، شهرستان ۲۴ ساعت' },
          { id: 'f3', icon: 'wrench', title: 'تعمیرگاه تخصصی', subtitle: 'پیک رایگان درب منزل' },
          { id: 'f4', icon: 'headset', title: 'پشتیبانی ۷ روز هفته', subtitle: 'مشاوره خرید رایگان' },
        ],
      },
    },
    {
      id: 'sec_categories',
      type: 'category_grid',
      enabled: true,
      spacing: 'lg',
      background: 'default',
      props: {
        title: 'دنبال چه چیزی می‌گردید؟',
        categorySlugs: ['mobile', 'laptop', 'console', 'game', 'accessory'],
      },
    },
    {
      id: 'sec_deal',
      type: 'countdown_deal',
      enabled: true,
      spacing: 'md',
      background: 'ink',
      props: {
        title: 'پیشنهاد شگفت‌انگیز امروز',
        productId: 'prd_008',
        endsAt: new Date(Date.now() + 9 * 3600_000).toISOString(),
        note: 'تعداد محدود — با پایان شمارش، قیمت به حالت عادی برمی‌گردد',
      },
    },
    {
      id: 'sec_featured',
      type: 'product_carousel',
      enabled: true,
      spacing: 'lg',
      background: 'default',
      props: {
        title: 'پیشنهاد سردبیر',
        source: 'featured',
        limit: 8,
        href: '/products',
      },
    },
    {
      id: 'sec_repair',
      type: 'repair_cta',
      enabled: true,
      spacing: 'lg',
      background: 'brand',
      props: {
        title: 'تعمیر تخصصی، بدون خروج از منزل',
        subtitle: 'مشکل دستگاه خود را انتخاب کنید؛ پیک سینر آن را درِ منزل تحویل می‌گیرد و پس از تعمیر به شما بازمی‌گرداند.',
        bullets: [
          'عیب‌یابی و مشاوره کاملاً رایگان',
          'قطعات اورجینال با ۶ ماه گارانتی',
          'پیگیری لحظه‌ای مراحل تعمیر از پنل کاربری',
          'پرداخت پس از تأیید هزینه توسط شما',
        ],
        ctaLabel: 'ثبت درخواست تعمیر',
        ctaHref: '/repair',
        image: '/img/banners/repair.svg',
      },
    },
    {
      id: 'sec_banners',
      type: 'banner_duo',
      enabled: true,
      spacing: 'md',
      background: 'default',
      props: {
        banners: [
          {
            id: 'bn_1',
            title: 'میان‌رده‌های زیر ۳۰ میلیون',
            subtitle: 'گزینه‌های مقرون‌به‌صرفه با بهترین کیفیت',
            image: '/img/banners/banner-1.svg',
            href: '/products?category=mobile&maxPrice=30000000',
            accent: '#c85cff',
          },
          {
            id: 'bn_2',
            title: 'لوازم جانبی گیمینگ',
            subtitle: 'هدست، ماوس و دسته حرفه‌ای',
            image: '/img/banners/banner-2.svg',
            href: '/products?category=accessory',
            accent: '#26c6da',
          },
        ],
      },
    },
    {
      id: 'sec_new',
      type: 'product_carousel',
      enabled: true,
      spacing: 'lg',
      background: 'surface',
      props: {
        title: 'جدیدترین‌ها',
        source: 'newest',
        limit: 8,
        href: '/products?sort=newest',
      },
    },
    {
      id: 'sec_brands',
      type: 'brand_strip',
      enabled: true,
      spacing: 'md',
      background: 'default',
      props: {
        title: 'برندهایی که نمایندگی می‌کنیم',
        brandSlugs: ['apple', 'samsung', 'sony', 'asus', 'microsoft', 'xiaomi', 'nintendo', 'lenovo', 'logitech'],
      },
    },
    {
      id: 'sec_testimonials',
      type: 'testimonials',
      enabled: true,
      spacing: 'lg',
      background: 'default',
      props: {
        title: 'مشتری‌ها چه می‌گویند',
        items: [
          {
            id: 't1',
            name: 'نگار کاظمی',
            role: 'طراح گرافیک',
            avatar: null,
            body: 'مک‌بوک را از سینر خریدم؛ یک روزه رسید و کاملاً پلمب بود. شش ماه بعد هم برای سرویس بردم و رایگان بررسی کردند.',
            rating: 5,
          },
          {
            id: 't2',
            name: 'امیر رضایی',
            role: 'گیمر',
            avatar: null,
            body: 'پلی‌استیشن ۵ من خراب شده بود؛ پیک درِ منزل آن را تحویل گرفت و سه روزه سالم بازگرداند. هزینه هم دقیقاً همان مبلغی بود که ابتدا اعلام کرده بودند.',
            rating: 5,
          },
          {
            id: 't3',
            name: 'مهسا طاهری',
            role: 'دانشجو',
            avatar: null,
            body: 'مشاوره خرید کاملاً بی‌طرفانه بود؛ حتی گوشی ارزان‌تری از آنچه در نظر داشتم به من پیشنهاد دادند.',
            rating: 4,
          },
        ],
      },
    },
    {
      id: 'sec_newsletter',
      type: 'newsletter',
      enabled: true,
      spacing: 'md',
      background: 'surface',
      props: {
        title: 'از تخفیف‌ها زودتر از دیگران باخبر شوید',
        subtitle: 'هفته‌ای یک ایمیل، بدون تبلیغات مزاحم. هر زمان بخواهید می‌توانید لغو عضویت کنید.',
        placeholder: 'ایمیل خود را وارد کنید',
        ctaLabel: 'عضویت',
      },
    },
  ],
}

/** محتوای صفحه‌ی «درباره ما» — ادمین همین را در پنل ویرایش می‌کند */
export const aboutConfig: AboutPageConfig = {
  updatedAt: new Date().toISOString(),
  hero: {
    title: 'ما فقط فروشنده نیستیم؛ تا پایان کنار شما هستیم.',
    body: 'سینر در سال ۱۳۹۶ با یک میز تعمیر کوچک آغاز به کار کرد. امروز هم همان نگاه را حفظ کرده‌ایم: کالای درست عرضه کنیم و هنگام بروز مشکل، خودمان پاسخگو باشیم. به همین دلیل فروشگاه و تعمیرگاه ما زیر یک سقف قرار دارد.',
  },
  stats: {
    enabled: true,
    items: [
      { id: 'st_customers', icon: 'users', value: '۲۴,۰۰۰+', label: 'مشتری راضی' },
      { id: 'st_repairs', icon: 'wrench', value: '۹,۵۰۰+', label: 'دستگاه تعمیرشده' },
      { id: 'st_delivery', icon: 'package-check', value: '۹۸٪', label: 'تحویل به‌موقع' },
      { id: 'st_years', icon: 'award', value: '۸ سال', label: 'سابقه فعالیت' },
    ],
  },
  values: {
    enabled: true,
    items: [
      {
        id: 'vl_price',
        title: 'قیمت را قبل از کار می‌گوییم',
        text: 'هیچ هزینه‌ای بدون تأیید شما به فاکتور اضافه نمی‌شود. اگر برآورد اولیه با هزینه‌ی نهایی فرق کند، دوباره تماس می‌گیریم.',
      },
      {
        id: 'vl_parts',
        title: 'قطعه‌ی اورجینال، نه کپی',
        text: 'روی هر قطعه‌ای که تعویض می‌کنیم، شش ماه گارانتی کتبی می‌دهیم. اگر قطعه‌ی غیراصل پیدا کردید، هزینه را کامل برمی‌گردانیم.',
      },
      {
        id: 'vl_advice',
        title: 'مشاوره‌ی بی‌طرفانه',
        text: 'اگر گوشی ارزان‌تری مناسب نیاز شما باشد، همان را پیشنهاد می‌دهیم. فروش بیشتر ارزش از دست دادن اعتماد شما را ندارد.',
      },
    ],
  },
  contact: {
    enabled: true,
    title: 'تماس با ما',
    description:
      'شنبه تا پنج‌شنبه، ۹ صبح تا ۸ شب. اگر سؤال فنی دارید، همین‌جا مطرح کنید — کارشناسان فنی ما پاسخگو هستند.',
  },
  terms: {
    enabled: true,
    title: 'قوانین و مقررات',
    items: [
      { id: 'tr_1', text: 'تمام کالاهای نو دارای گارانتی شرکتی یا گارانتی فروشگاه سینر هستند.' },
      {
        id: 'tr_2',
        text: 'مهلت تعویض کالای سالم ۷ روز از زمان تحویل است، مشروط بر سالم بودن بسته‌بندی و لوازم همراه.',
      },
      {
        id: 'tr_3',
        text: 'عیب‌یابی دستگاه‌ها رایگان است و در صورت عدم تأیید هزینه، دستگاه بدون کسر وجه بازگردانده می‌شود.',
      },
      {
        id: 'tr_4',
        text: 'گارانتی تعمیر شامل قطعه‌ی تعویض‌شده و کیفیت کار است و آسیب فیزیکی یا آب‌خوردگی مجدد را پوشش نمی‌دهد.',
      },
      { id: 'tr_5', text: 'اطلاعات شخصی کاربران در اختیار هیچ شخص یا شرکت ثالثی قرار نمی‌گیرد.' },
    ],
  },
}
