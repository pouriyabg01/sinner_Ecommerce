{{--
  قالب همه‌ی ایمیل‌های سایت.

  چرا جدول و استایل درخطی و نه کلاس؟ چون نرم‌افزارهای ایمیل (به‌ویژه اوت‌لوک) بخش
  بزرگی از سی‌اس‌اس امروزی را حذف می‌کنند؛ چیدمان با جدول و رنگِ نوشته‌شده روی خودِ
  تگ تنها چیزی است که همه‌جا یکسان دیده می‌شود.

  رنگ اصلی از تنظیمات ظاهر سایت می‌آید تا نامه‌ها با خود سایت یکی باشند.
--}}
<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $title }}</title>
</head>
<body style="margin:0; padding:0; background:#f4f5f7; font-family:Tahoma,'Segoe UI',sans-serif;">
    {{-- خلاصه‌ی بالای صندوق ورودی: چند کلمه‌ی اول متن، بدون اینکه در خود نامه دیده شود --}}
    <div style="display:none; max-height:0; overflow:hidden; opacity:0;">{{ $preview }}</div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7; padding:24px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #e6e8ec;">
                    <tr>
                        <td style="background:{{ $accent }}; padding:20px 28px;">
                            <a href="{{ $siteUrl }}" style="color:#ffffff; font-size:17px; font-weight:bold; text-decoration:none;">{{ $siteName }}</a>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:28px 28px 8px 28px;">
                            <h1 style="margin:0 0 16px 0; font-size:18px; line-height:1.7; color:#16181d;">{{ $title }}</h1>
                            <div style="font-size:14px; line-height:2; color:#3d4149;">{!! $bodyHtml !!}</div>
                        </td>
                    </tr>

                    @if ($ctaLabel && $ctaUrl)
                        <tr>
                            <td style="padding:12px 28px 28px 28px;">
                                <a href="{{ $ctaUrl }}" style="display:inline-block; background:{{ $accent }}; color:#ffffff; font-size:14px; font-weight:bold; text-decoration:none; padding:12px 28px; border-radius:12px;">{{ $ctaLabel }}</a>
                            </td>
                        </tr>
                    @else
                        <tr><td style="padding:0 28px 28px 28px;"></td></tr>
                    @endif

                    <tr>
                        <td style="background:#fafbfc; border-top:1px solid #eceef1; padding:18px 28px; font-size:12px; line-height:1.9; color:#8a9099;">
                            {{-- نشانی لاتین داخل خط فارسی باید جهت خودش را داشته باشد، وگرنه اسلش آخرش می‌پرد اول --}}
                            <div>{{ $siteName }} — <a href="{{ $siteUrl }}" dir="ltr" style="color:#8a9099; display:inline-block;">{{ $siteUrl }}</a></div>
                            @if ($unsubscribeUrl)
                                {{-- لغو عضویت باید یک کلیک باشد؛ اگر سخت باشد مردم به‌جایش دکمه‌ی «هرزنامه» را می‌زنند و آن به اعتبار فرستنده آسیب می‌زند --}}
                                <div style="margin-top:6px;">این نامه را چون عضو خبرنامه شده‌اید دریافت کرده‌اید. <a href="{{ $unsubscribeUrl }}" style="color:#8a9099; text-decoration:underline;">لغو عضویت</a></div>
                            @endif
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
