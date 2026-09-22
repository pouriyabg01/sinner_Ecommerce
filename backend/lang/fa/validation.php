<?php

/**
 * پیام‌های اعتبارسنجی فارسی.
 *
 * فرانت بیشتر خطاها را پیش از ارسال می‌گیرد، ولی بعضی فقط از سرور می‌آیند
 * (مثل «این ایمیل قبلاً ثبت شده») و مستقیم جلوی کاربر نمایش داده می‌شوند.
 */
return [
    'required' => ':attribute الزامی است.',
    'confirmed' => ':attribute با تکرارش یکی نیست.',
    'string' => ':attribute باید متن باشد.',
    'email' => ':attribute معتبر نیست — مانند name@example.com',
    'unique' => 'این :attribute قبلاً روی حساب دیگری ثبت شده است.',
    'exists' => ':attribute انتخاب‌شده وجود ندارد.',
    'regex' => 'قالب :attribute درست نیست.',
    'integer' => ':attribute باید عدد صحیح باشد.',
    'boolean' => ':attribute باید درست یا نادرست باشد.',
    'array' => ':attribute باید فهرست باشد.',
    'date' => ':attribute تاریخ معتبری نیست.',
    'after' => ':attribute باید بعد از :date باشد.',
    'in' => ':attribute انتخاب‌شده معتبر نیست.',
    'image' => ':attribute باید تصویر باشد.',
    'file' => ':attribute باید فایل باشد.',
    'min' => [
        'string' => ':attribute دست‌کم :min نویسه باشد.',
        'numeric' => ':attribute نباید کمتر از :min باشد.',
        'array' => ':attribute دست‌کم :min مورد لازم دارد.',
    ],
    'max' => [
        'string' => ':attribute حداکثر :max نویسه باشد.',
        'numeric' => ':attribute نباید بیشتر از :max باشد.',
        'file' => 'حجم :attribute نباید بیشتر از :max کیلوبایت باشد.',
    ],

    'attributes' => [
        'email' => 'ایمیل',
        'phone' => 'شماره موبایل',
        'fullName' => 'نام و نام خانوادگی',
        'password' => 'رمز عبور',
        'currentPassword' => 'رمز فعلی',
        'passwordConfirmation' => 'تکرار رمز',
        'productId' => 'کالا',
        'receiver' => 'نام گیرنده',
        'province' => 'استان',
        'city' => 'شهر',
        'postalCode' => 'کد پستی',
        'line' => 'نشانی',
        'identifier' => 'شماره موبایل یا ایمیل',
        'code' => 'کد',
        'slug' => 'نامک',
        'title' => 'عنوان',
        'file' => 'فایل',
        'variants' => 'مدل‌های کالا',
        'addressSummary' => 'آدرس',
        'preferredDeliveryDate' => 'تاریخ تحویل',
        'mode' => 'نحوه‌ی حذف',
        'paymentMethod' => 'روش پرداخت',
        'lines' => 'سبد خرید',
    ],
];
