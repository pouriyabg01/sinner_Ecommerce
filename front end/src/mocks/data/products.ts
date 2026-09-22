import type { CategorySlug, Product, ProductSpec, ProductStatus, ProductVariant } from '@/types/catalog'

interface Seed {
  slug: string
  title: string
  titleEn: string
  categorySlug: CategorySlug
  brandSlug: string
  price: number
  compareAtPrice?: number
  rating: number
  reviewCount: number
  stock: number
  shortDescription: string
  description: string
  specs: [key: string, label: string, value: string, score?: number][]
  variants?: [title: string, price: number, stock: number, colorName?: string, hex?: string][]
  tags: string[]
  isNew?: boolean
  isFeatured?: boolean
  /** پیش‌فرض فعال؛ فقط کالایی که عمداً از فروشگاه برداشته شده اینجا مقدار می‌گیرد */
  status?: ProductStatus
  daysAgo: number
}

const seeds: Seed[] = [
  {
    slug: 'iphone-16-pro-max',
    title: 'آیفون ۱۶ پرو مکس',
    titleEn: 'Apple iPhone 16 Pro Max',
    categorySlug: 'mobile',
    brandSlug: 'apple',
    price: 92_500_000,
    compareAtPrice: 99_800_000,
    rating: 4.8,
    reviewCount: 212,
    stock: 7,
    shortDescription: 'بدنه تیتانیوم، تراشه A18 Pro و دوربین ۴۸ مگاپیکسلی با ضبط ProRes',
    description:
      'آیفون ۱۶ پرو مکس با بدنه تیتانیومی سبک‌تر، نمایشگر ۶.۹ اینچی ProMotion و تراشه A18 Pro عرضه شده است. سیستم سه‌دوربینه با سنسور اصلی ۴۸ مگاپیکسل، دکمه اختصاصی دوربین و پشتیبانی از ضبط ویدیو ۴K/۱۲۰fps، آن را به کامل‌ترین آیفون تاریخ تبدیل کرده. باتری بهبودیافته تا ۳۳ ساعت پخش ویدیو دوام می‌آورد.',
    specs: [
      ['display', 'نمایشگر', '۶.۹ اینچ Super Retina XDR — ۱۲۰ هرتز', 69],
      ['chipset', 'پردازنده', 'Apple A18 Pro', 98],
      ['ram', 'حافظه رم', '۸ گیگابایت', 8],
      ['storage', 'حافظه داخلی', '۲۵۶ گیگابایت', 256],
      ['battery', 'باتری', '۴۶۸۵ میلی‌آمپرساعت', 4685],
      ['camera', 'دوربین اصلی', '۴۸ + ۴۸ + ۱۲ مگاپیکسل', 48],
    ],
    variants: [
      ['۲۵۶ گیگابایت — تیتانیوم طبیعی', 92_500_000, 4, 'تیتانیوم طبیعی', '#b6ada4'],
      ['۵۱۲ گیگابایت — تیتانیوم مشکی', 108_900_000, 2, 'تیتانیوم مشکی', '#3b3b3d'],
      ['۱ ترابایت — تیتانیوم صحرایی', 126_000_000, 1, 'تیتانیوم صحرایی', '#bfa48f'],
    ],
    tags: ['پرچم‌دار', 'پرفروش', 'گارانتی طلایی'],
    isNew: true,
    isFeatured: true,
    daysAgo: 4,
  },
  {
    slug: 'galaxy-s25-ultra',
    title: 'گلکسی اس ۲۵ اولترا',
    titleEn: 'Samsung Galaxy S25 Ultra',
    categorySlug: 'mobile',
    brandSlug: 'samsung',
    price: 78_900_000,
    compareAtPrice: 86_400_000,
    rating: 4.7,
    reviewCount: 168,
    stock: 12,
    shortDescription: 'قلم S Pen، زوم اپتیکال ۵ برابر و نمایشگر ۶.۹ اینچی ضدانعکاس',
    description:
      'گلکسی اس ۲۵ اولترا با نمایشگر Dynamic AMOLED 2X و پوشش ضدانعکاس Gorilla Armor، حتی زیر نور مستقیم خورشید هم خوانا است. اسنپدراگون ۸ نسل ۴ به همراه ۱۲ گیگ رم، سنگین‌ترین بازی‌ها را بدون افت اجرا می‌کند و مجموعه دوربین ۲۰۰ مگاپیکسلی با زوم پریسکوپی، بهترین گزینه برای عکاسی از راه دور است.',
    specs: [
      ['display', 'نمایشگر', '۶.۹ اینچ Dynamic AMOLED 2X — ۱۲۰ هرتز', 69],
      ['chipset', 'پردازنده', 'Snapdragon 8 Elite', 96],
      ['ram', 'حافظه رم', '۱۲ گیگابایت', 12],
      ['storage', 'حافظه داخلی', '۲۵۶ گیگابایت', 256],
      ['battery', 'باتری', '۵۰۰۰ میلی‌آمپرساعت', 5000],
      ['camera', 'دوربین اصلی', '۲۰۰ + ۵۰ + ۱۰ + ۱۲ مگاپیکسل', 200],
    ],
    variants: [
      ['۲۵۶ گیگابایت — مشکی تیتانیوم', 78_900_000, 8, 'مشکی تیتانیوم', '#2f3134'],
      ['۵۱۲ گیگابایت — خاکستری', 89_500_000, 4, 'خاکستری تیتانیوم', '#8d8f93'],
    ],
    tags: ['پرچم‌دار', 'پرفروش'],
    isNew: true,
    isFeatured: true,
    daysAgo: 9,
  },
  {
    slug: 'xiaomi-14t-pro',
    title: 'شیائومی ۱۴T پرو',
    titleEn: 'Xiaomi 14T Pro',
    categorySlug: 'mobile',
    brandSlug: 'xiaomi',
    price: 31_400_000,
    compareAtPrice: 35_900_000,
    rating: 4.5,
    reviewCount: 94,
    stock: 23,
    shortDescription: 'شارژ ۱۲۰ واتی، لنز Leica و پردازنده Dimensity 9300+',
    description:
      'شیائومی ۱۴T پرو نسبت قیمت به کارایی فوق‌العاده‌ای دارد. شارژ سریع ۱۲۰ وات باتری را در حدود ۲۰ دقیقه پر می‌کند و کالیبراسیون رنگ لایکا، خروجی دوربین را از حالت اشباع‌شده‌ی معمول گوشی‌های چینی خارج کرده است.',
    specs: [
      ['display', 'نمایشگر', '۶.۶۷ اینچ AMOLED — ۱۴۴ هرتز', 66],
      ['chipset', 'پردازنده', 'Dimensity 9300+', 88],
      ['ram', 'حافظه رم', '۱۲ گیگابایت', 12],
      ['storage', 'حافظه داخلی', '۵۱۲ گیگابایت', 512],
      ['battery', 'باتری', '۵۰۰۰ میلی‌آمپرساعت', 5000],
      ['camera', 'دوربین اصلی', '۵۰ + ۵۰ + ۱۲ مگاپیکسل Leica', 50],
    ],
    tags: ['اقتصادی', 'ارسال فوری'],
    isFeatured: true,
    daysAgo: 21,
  },
  {
    slug: 'galaxy-a56',
    title: 'گلکسی A56',
    titleEn: 'Samsung Galaxy A56 5G',
    categorySlug: 'mobile',
    brandSlug: 'samsung',
    price: 18_700_000,
    rating: 4.2,
    reviewCount: 56,
    stock: 41,
    shortDescription: 'میان‌رده‌ی محبوب با نمایشگر ۱۲۰ هرتز و ۴ سال آپدیت',
    description:
      'A56 گزینه‌ی امن بازار میان‌رده است: بدنه فلزی، نمایشگر Super AMOLED یک‌دست و تعهد سامسونگ به چهار نسل آپدیت اندروید. برای کاربر روزمره‌ای که دنبال دردسر نیست، بهترین انتخاب زیر ۲۰ میلیون.',
    specs: [
      ['display', 'نمایشگر', '۶.۷ اینچ Super AMOLED — ۱۲۰ هرتز', 67],
      ['chipset', 'پردازنده', 'Exynos 1580', 62],
      ['ram', 'حافظه رم', '۸ گیگابایت', 8],
      ['storage', 'حافظه داخلی', '۱۲۸ گیگابایت', 128],
      ['battery', 'باتری', '۵۰۰۰ میلی‌آمپرساعت', 5000],
      ['camera', 'دوربین اصلی', '۵۰ + ۱۲ + ۵ مگاپیکسل', 50],
    ],
    tags: ['اقتصادی', 'پرفروش'],
    daysAgo: 47,
  },
  {
    slug: 'macbook-air-m4',
    title: 'مک‌بوک ایر M4',
    titleEn: 'Apple MacBook Air 13 M4',
    categorySlug: 'laptop',
    brandSlug: 'apple',
    price: 74_200_000,
    compareAtPrice: 79_900_000,
    rating: 4.9,
    reviewCount: 143,
    stock: 9,
    shortDescription: 'بدون فن، ۱۸ ساعت باتری و وزن ۱.۲۴ کیلوگرم',
    description:
      'مک‌بوک ایر M4 سبک‌ترین راه برای داشتن یک لپ‌تاپ حرفه‌ای است. طراحی بدون فن یعنی سکوت کامل، و تراشه M4 با ۱۰ هسته پردازشی، کارهای سنگین ادیت عکس و کدنویسی را بدون داغ شدن انجام می‌دهد.',
    specs: [
      ['display', 'نمایشگر', '۱۳.۶ اینچ Liquid Retina — ۲۵۶۰×۱۶۶۴', 136],
      ['cpu', 'پردازنده', 'Apple M4 — ۱۰ هسته', 92],
      ['gpu', 'گرافیک', 'Apple M4 GPU — ۸ هسته', 70],
      ['ram', 'حافظه رم', '۱۶ گیگابایت یکپارچه', 16],
      ['storage', 'حافظه', '۵۱۲ گیگابایت SSD', 512],
      ['weight', 'وزن', '۱.۲۴ کیلوگرم', 1.24],
    ],
    variants: [
      ['۱۶GB / 512GB — نقره‌ای', 74_200_000, 5, 'نقره‌ای', '#e3e4e6'],
      ['۲۴GB / 1TB — نیمه‌شب', 96_800_000, 2, 'نیمه‌شب', '#2e3641'],
    ],
    tags: ['پیشنهاد سردبیر', 'گارانتی طلایی'],
    isFeatured: true,
    daysAgo: 15,
  },
  {
    slug: 'asus-rog-strix-g16',
    title: 'ایسوس ROG Strix G16',
    titleEn: 'ASUS ROG Strix G16 RTX 4070',
    categorySlug: 'laptop',
    brandSlug: 'asus',
    price: 89_500_000,
    compareAtPrice: 97_000_000,
    rating: 4.6,
    reviewCount: 78,
    stock: 5,
    shortDescription: 'RTX 4070 و نمایشگر ۲۴۰ هرتز برای گیمینگ بی‌رقیب',
    description:
      'اگر دنبال لپ‌تاپی هستید که هر بازی امروزی را روی تنظیمات بالا و بالای ۱۰۰ فریم اجرا کند، Strix G16 انتخاب مستقیم است. سیستم خنک‌کننده سه‌فنه و کیبورد مکانیکی-حسی آن، تفاوت را در جلسات طولانی بازی نشان می‌دهد.',
    specs: [
      ['display', 'نمایشگر', '۱۶ اینچ QHD+ — ۲۴۰ هرتز', 160],
      ['cpu', 'پردازنده', 'Intel Core i9-14900HX', 94],
      ['gpu', 'گرافیک', 'NVIDIA RTX 4070 8GB', 85],
      ['ram', 'حافظه رم', '۳۲ گیگابایت DDR5', 32],
      ['storage', 'حافظه', '۱ ترابایت SSD', 1024],
      ['weight', 'وزن', '۲.۵ کیلوگرم', 2.5],
    ],
    tags: ['گیمینگ', 'پرفروش'],
    isFeatured: true,
    daysAgo: 30,
  },
  {
    slug: 'lenovo-ideapad-slim-5',
    title: 'لنوو آیدیاپد اسلیم ۵',
    titleEn: 'Lenovo IdeaPad Slim 5',
    categorySlug: 'laptop',
    brandSlug: 'lenovo',
    price: 34_800_000,
    rating: 4.1,
    reviewCount: 39,
    stock: 18,
    shortDescription: 'گزینه‌ی اقتصادی برای دانشجو و کار اداری با ۱۶ گیگ رم',
    description:
      'آیدیاپد اسلیم ۵ تعادل خوبی بین قیمت و کیفیت ساخت دارد. بدنه آلومینیومی، صفحه‌کلید راحت و ۱۶ گیگابایت رم آن را برای چندوظیفگی سنگین اداری و برنامه‌نویسی سبک مناسب می‌کند.',
    specs: [
      ['display', 'نمایشگر', '۱۴ اینچ WUXGA IPS — ۶۰ هرتز', 140],
      ['cpu', 'پردازنده', 'AMD Ryzen 7 8845HS', 76],
      ['gpu', 'گرافیک', 'Radeon 780M یکپارچه', 40],
      ['ram', 'حافظه رم', '۱۶ گیگابایت', 16],
      ['storage', 'حافظه', '۵۱۲ گیگابایت SSD', 512],
      ['weight', 'وزن', '۱.۴۶ کیلوگرم', 1.46],
    ],
    tags: ['اقتصادی', 'ارسال فوری'],
    daysAgo: 62,
  },
  {
    slug: 'playstation-5-slim',
    title: 'پلی‌استیشن ۵ اسلیم',
    titleEn: 'Sony PlayStation 5 Slim Disc',
    categorySlug: 'console',
    brandSlug: 'sony',
    price: 41_900_000,
    compareAtPrice: 45_500_000,
    rating: 4.9,
    reviewCount: 305,
    stock: 14,
    shortDescription: 'نسخه دیسک‌خور با ۱ ترابایت حافظه و دسته DualSense',
    description:
      'پلی‌استیشن ۵ اسلیم همان قدرت PS5 اصلی را در بدنه‌ای ۳۰٪ کوچک‌تر ارائه می‌دهد. درایو دیسک جداشدنی، ۱ ترابایت SSD داخلی و دسته DualSense با بازخورد لمسی، تجربه‌ای است که روی هیچ کنسول دیگری تکرار نشده.',
    specs: [
      ['storage', 'حافظه', '۱ ترابایت SSD', 1024],
      ['resolution', 'رزولوشن', 'تا 4K و پشتیبانی 8K', 4],
      ['fps', 'نرخ فریم', 'تا ۱۲۰ فریم بر ثانیه', 120],
      ['controllers', 'دسته همراه', '۱ عدد DualSense', 1],
    ],
    variants: [
      ['نسخه دیسک‌خور — ۱TB', 41_900_000, 9],
      ['نسخه دیجیتال — ۱TB', 36_400_000, 5],
    ],
    tags: ['پرفروش', 'گیمینگ', 'گارانتی طلایی'],
    isFeatured: true,
    daysAgo: 11,
  },
  {
    slug: 'xbox-series-x',
    title: 'ایکس‌باکس سری ایکس',
    titleEn: 'Microsoft Xbox Series X',
    categorySlug: 'console',
    brandSlug: 'microsoft',
    price: 38_600_000,
    rating: 4.7,
    reviewCount: 141,
    stock: 6,
    shortDescription: 'قدرتمندترین کنسول مایکروسافت با ۱۲ ترافلاپس گرافیک',
    description:
      'سری ایکس روی کاغذ قدرتمندترین کنسول نسل است و با Game Pass، دسترسی به صدها بازی را ارزان می‌کند. سازگاری کامل با نسل‌های قبلی ایکس‌باکس نیز یکی از نقاط قوت بی‌رقیب آن است.',
    specs: [
      ['storage', 'حافظه', '۱ ترابایت NVMe', 1024],
      ['resolution', 'رزولوشن', 'بومی 4K', 4],
      ['fps', 'نرخ فریم', 'تا ۱۲۰ فریم بر ثانیه', 120],
      ['controllers', 'دسته همراه', '۱ عدد Wireless', 1],
    ],
    tags: ['گیمینگ'],
    daysAgo: 26,
  },
  {
    slug: 'nintendo-switch-2',
    title: 'نینتندو سوییچ ۲',
    titleEn: 'Nintendo Switch 2',
    categorySlug: 'console',
    brandSlug: 'nintendo',
    price: 33_200_000,
    compareAtPrice: 36_000_000,
    rating: 4.8,
    reviewCount: 97,
    stock: 3,
    shortDescription: 'نمایشگر ۷.۹ اینچی و دسته‌های Joy-Con مغناطیسی',
    description:
      'سوییچ ۲ همان جادوی هیبریدی نسل قبل را با سخت‌افزاری بسیار قوی‌تر تکرار می‌کند. نمایشگر بزرگ‌تر، خروجی 4K در حالت داک و Joy-Con های جدید مغناطیسی از مهم‌ترین تغییرات هستند.',
    specs: [
      ['storage', 'حافظه', '۲۵۶ گیگابایت', 256],
      ['resolution', 'رزولوشن', '1080p دستی / 4K داک', 4],
      ['fps', 'نرخ فریم', 'تا ۱۲۰ فریم بر ثانیه', 120],
      ['controllers', 'دسته همراه', '۲ عدد Joy-Con 2', 2],
    ],
    tags: ['گیمینگ', 'پیشنهاد سردبیر'],
    isNew: true,
    daysAgo: 6,
  },
  {
    slug: 'game-god-of-war-ragnarok',
    title: 'بازی God of War Ragnarök',
    titleEn: 'God of War Ragnarök — PS5',
    categorySlug: 'game',
    brandSlug: 'sony',
    price: 3_200_000,
    compareAtPrice: 4_100_000,
    rating: 4.9,
    reviewCount: 264,
    stock: 30,
    shortDescription: 'حماسه‌ی کریتوس و آترئوس با زیرنویس فارسی',
    description:
      'ادامه‌ی مستقیم God of War 2018 که کوراتوس و پسرش را در آستانه‌ی راگناروک قرار می‌دهد. سیستم مبارزه عمیق‌تر، جهان بزرگ‌تر و روایتی که یکی از بهترین‌های تاریخ بازی‌های ویدیویی لقب گرفته است.',
    specs: [
      ['platform', 'پلتفرم', 'PlayStation 5'],
      ['genre', 'سبک', 'اکشن ماجراجویی'],
      ['players', 'تعداد بازیکن', 'تک‌نفره'],
      ['language', 'زبان', 'انگلیسی با زیرنویس فارسی'],
    ],
    tags: ['پرفروش', 'گیمینگ'],
    daysAgo: 90,
  },
  {
    slug: 'game-ea-fc-25',
    title: 'بازی EA Sports FC 25',
    titleEn: 'EA Sports FC 25 — PS5',
    categorySlug: 'game',
    brandSlug: 'sony',
    price: 4_450_000,
    rating: 4.0,
    reviewCount: 188,
    stock: 25,
    shortDescription: 'محبوب‌ترین بازی فوتبال با موتور HyperMotion V',
    description:
      'نسخه‌ی امسال با موتور HyperMotion V و بازطراحی حالت Ultimate Team عرضه شده است. برای بازی آنلاین با دوستان، همچنان انتخاب اول بازار ایران است.',
    specs: [
      ['platform', 'پلتفرم', 'PlayStation 5'],
      ['genre', 'سبک', 'ورزشی'],
      ['players', 'تعداد بازیکن', 'تا ۴ نفر آفلاین / آنلاین'],
      ['language', 'زبان', 'گزارش انگلیسی'],
    ],
    tags: ['پرفروش'],
    isNew: true,
    daysAgo: 3,
  },
  {
    slug: 'game-elden-ring-shadow',
    title: 'بازی Elden Ring — Shadow of the Erdtree',
    titleEn: 'Elden Ring: Shadow of the Erdtree — PS5',
    categorySlug: 'game',
    brandSlug: 'sony',
    price: 3_950_000,
    compareAtPrice: 4_600_000,
    rating: 4.8,
    reviewCount: 121,
    stock: 12,
    shortDescription: 'نسخه کامل به همراه بزرگ‌ترین بسته الحاقی فرام‌سافتور',
    description:
      'الدن رینگ به‌همراه الحاقی Shadow of the Erdtree، بیش از ۱۰۰ ساعت محتوای بی‌رحمانه و زیبا ارائه می‌دهد. اگر طرفدار بازی‌های سخت هستید، از این نسخه نگذرید.',
    specs: [
      ['platform', 'پلتفرم', 'PlayStation 5'],
      ['genre', 'سبک', 'نقش‌آفرینی اکشن'],
      ['players', 'تعداد بازیکن', 'تک‌نفره با کوآپ آنلاین'],
      ['language', 'زبان', 'انگلیسی'],
    ],
    tags: ['گیمینگ', 'پیشنهاد سردبیر'],
    daysAgo: 34,
  },
  {
    slug: 'airpods-pro-3',
    title: 'ایرپاد پرو ۳',
    titleEn: 'Apple AirPods Pro 3',
    categorySlug: 'accessory',
    brandSlug: 'apple',
    price: 14_900_000,
    compareAtPrice: 16_500_000,
    rating: 4.6,
    reviewCount: 87,
    stock: 22,
    shortDescription: 'حذف نویز فعال نسل جدید با تشخیص دمای بدن',
    description:
      'ایرپاد پرو ۳ با تراشه H3 حذف نویز را تا دو برابر نسل قبل بهبود داده و حالت Transparency آن طبیعی‌ترین خروجی بازار است. سنسور دمای بدن و شارژ USB-C از دیگر تغییرات این نسل هستند.',
    specs: [
      ['type', 'نوع', 'هندزفری داخل گوش (TWS)'],
      ['connection', 'اتصال', 'Bluetooth 5.4'],
      ['battery', 'باتری', 'تا ۳۰ ساعت با کیس', 30],
      ['weight', 'وزن', '۵.۳ گرم هر ایرباد', 5.3],
    ],
    tags: ['پرفروش', 'ارسال فوری'],
    isFeatured: true,
    daysAgo: 18,
  },
  {
    slug: 'logitech-g-pro-x-superlight-2',
    title: 'ماوس لاجیتک G Pro X Superlight 2',
    titleEn: 'Logitech G Pro X Superlight 2',
    categorySlug: 'accessory',
    brandSlug: 'logitech',
    price: 6_850_000,
    rating: 4.9,
    reviewCount: 64,
    stock: 16,
    shortDescription: 'وزن ۶۰ گرم، سنسور HERO 2 و ۹۵ ساعت باتری',
    description:
      'استاندارد طلایی ماوس‌های حرفه‌ای ای‌اسپورت. وزن زیر ۶۰ گرم، سوییچ‌های نوری هیبریدی و تأخیر بی‌سیم عملاً صفر — همان چیزی که اکثر بازیکنان حرفه‌ای CS و Valorant استفاده می‌کنند.',
    specs: [
      ['type', 'نوع', 'ماوس گیمینگ بی‌سیم'],
      ['connection', 'اتصال', 'LIGHTSPEED بی‌سیم + USB-C'],
      ['battery', 'باتری', 'تا ۹۵ ساعت', 95],
      ['weight', 'وزن', '۶۰ گرم', 60],
    ],
    tags: ['گیمینگ', 'پیشنهاد سردبیر'],
    daysAgo: 40,
  },
  {
    slug: 'dualsense-edge',
    title: 'دسته DualSense Edge',
    titleEn: 'Sony DualSense Edge Controller',
    categorySlug: 'accessory',
    brandSlug: 'sony',
    price: 12_300_000,
    compareAtPrice: 13_900_000,
    rating: 4.4,
    reviewCount: 52,
    stock: 8,
    shortDescription: 'دسته حرفه‌ای با آنالوگ‌های تعویض‌پذیر و پروفایل سفارشی',
    description:
      'نسخه‌ی حرفه‌ای دسته PS5 با ماژول‌های آنالوگ قابل تعویض (پایان درد سر drift)، دکمه‌های پشتی و امکان ذخیره‌ی پروفایل‌های مختلف برای هر بازی.',
    specs: [
      ['type', 'نوع', 'دسته بازی حرفه‌ای'],
      ['connection', 'اتصال', 'Bluetooth + USB-C'],
      ['battery', 'باتری', 'تا ۱۰ ساعت', 10],
      ['weight', 'وزن', '۳۲۵ گرم', 325],
    ],
    tags: ['گیمینگ', 'گارانتی طلایی'],
    daysAgo: 55,
  },
  {
    slug: 'iphone-13-used',
    title: 'آیفون ۱۳ — کارکرده تمیز',
    titleEn: 'Apple iPhone 13 (Used)',
    categorySlug: 'mobile',
    brandSlug: 'apple',
    price: 27_500_000,
    compareAtPrice: 31_000_000,
    rating: 4.3,
    reviewCount: 71,
    stock: 4,
    shortDescription: 'سلامت باتری بالای ۹۰٪ با ۶ ماه گارانتی فروشگاه',
    description:
      'دستگاه‌های کارکرده‌ی ما پیش از فروش توسط تکنسین‌های خودمان تست کامل سخت‌افزاری می‌شوند: سلامت باتری، دوربین، صفحه و پورت شارژ. همراه با ۶ ماه گارانتی تعویض قطعه.',
    specs: [
      ['display', 'نمایشگر', '۶.۱ اینچ Super Retina XDR', 61],
      ['chipset', 'پردازنده', 'Apple A15 Bionic', 74],
      ['ram', 'حافظه رم', '۴ گیگابایت', 4],
      ['storage', 'حافظه داخلی', '۱۲۸ گیگابایت', 128],
      ['battery', 'باتری', 'سلامت ۹۲٪', 3240],
      ['camera', 'دوربین اصلی', '۱۲ + ۱۲ مگاپیکسل', 12],
    ],
    tags: ['کارکرده تمیز', 'اقتصادی'],
    daysAgo: 8,
  },
  {
    slug: 'asus-tuf-a15',
    title: 'ایسوس TUF Gaming A15',
    titleEn: 'ASUS TUF Gaming A15 RTX 4060',
    categorySlug: 'laptop',
    brandSlug: 'asus',
    price: 56_700_000,
    compareAtPrice: 61_000_000,
    rating: 4.4,
    reviewCount: 58,
    stock: 11,
    shortDescription: 'گیمینگ مقرون‌به‌صرفه با RTX 4060 و صفحه ۱۴۴ هرتز',
    description:
      'TUF A15 نقطه‌ی شیرین بازار گیمینگ است: RTX 4060 برای بازی روان در رزولوشن 1080p، بدنه‌ی مقاوم با استاندارد نظامی MIL-STD و قیمتی که خیلی زیر رقبای هم‌رده است.',
    specs: [
      ['display', 'نمایشگر', '۱۵.۶ اینچ FHD — ۱۴۴ هرتز', 156],
      ['cpu', 'پردازنده', 'AMD Ryzen 7 7735HS', 78],
      ['gpu', 'گرافیک', 'NVIDIA RTX 4060 8GB', 72],
      ['ram', 'حافظه رم', '۱۶ گیگابایت DDR5', 16],
      ['storage', 'حافظه', '۵۱۲ گیگابایت SSD', 512],
      ['weight', 'وزن', '۲.۲ کیلوگرم', 2.2],
    ],
    tags: ['گیمینگ', 'اقتصادی'],
    daysAgo: 44,
  },
]

function buildSpecs(rows: Seed['specs']): ProductSpec[] {
  return rows.map(([key, label, value, score]) => ({ key, label, value, score }))
}

function buildVariants(slug: string, rows: Seed['variants'], fallbackPrice: number, fallbackStock: number): ProductVariant[] {
  if (!rows?.length) {
    return [{ id: `${slug}_v1`, title: 'استاندارد', price: fallbackPrice, stock: fallbackStock }]
  }
  return rows.map(([title, price, stock, colorName, hex], i) => ({
    id: `${slug}_v${i + 1}`,
    title,
    price,
    stock,
    color: colorName && hex ? { name: colorName, hex } : undefined,
  }))
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString()
}

export const products: Product[] = seeds.map((seed, index) => ({
  id: `prd_${String(index + 1).padStart(3, '0')}`,
  slug: seed.slug,
  title: seed.title,
  titleEn: seed.titleEn,
  categorySlug: seed.categorySlug,
  brandSlug: seed.brandSlug,
  price: seed.price,
  compareAtPrice: seed.compareAtPrice ?? null,
  rating: seed.rating,
  reviewCount: seed.reviewCount,
  stock: seed.stock,
  images: [1, 2, 3].map((n) => `/img/products/${seed.slug}-${n}.svg`),
  shortDescription: seed.shortDescription,
  description: seed.description,
  specs: buildSpecs(seed.specs),
  variants: buildVariants(seed.slug, seed.variants, seed.price, seed.stock),
  tags: seed.tags,
  isNew: seed.isNew ?? false,
  isFeatured: seed.isFeatured ?? false,
  status: seed.status ?? 'active',
  createdAt: daysAgoIso(seed.daysAgo),
}))

export function getProductBySlug(slug: string) {
  return products.find((p) => p.slug === slug)
}

export function getProductById(id: string) {
  return products.find((p) => p.id === id)
}
