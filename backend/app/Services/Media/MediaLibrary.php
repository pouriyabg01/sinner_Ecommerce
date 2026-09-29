<?php

namespace App\Services\Media;

use App\Models\Media;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * نگهداری کتابخانه‌ی تصویرها: ذخیره‌ی فایل تازه، و فهمیدن اینکه یک تصویر کجای
 * سایت استفاده شده.
 */
class MediaLibrary
{
    /**
     * جاهایی که ممکن است نشانی یک تصویر در آن‌ها نشسته باشد.
     * ستون => نوعِ ستون (متنی یا jsonb)، چون جست‌وجویشان فرق دارد.
     */
    private const USED_IN = [
        ['products', 'images', 'json'],
        ['brands', 'logo', 'text'],
        ['repair_issues', 'icon', 'text'],
        ['order_items', 'image', 'text'],
        ['site_documents', 'payload', 'json'],
    ];

    public function store(UploadedFile $file, ?User $user = null): Media
    {
        $path = $file->store('uploads', 'public');

        // ابعاد از خود فایلِ ذخیره‌شده خوانده می‌شود، نه از فایل موقت
        $size = @getimagesize(Storage::disk('public')->path($path));

        return Media::create([
            'path' => $path,
            'name' => $file->getClientOriginalName() ?: basename($path),
            'mime' => $size['mime'] ?? (string) $file->getMimeType(),
            'size' => (int) Storage::disk('public')->size($path),
            'width' => (int) ($size[0] ?? 0),
            'height' => (int) ($size[1] ?? 0),
            'user_id' => $user?->id,
        ]);
    }

    /**
     * جایگزینی محتوای یک تصویر با فایل تازه — بدون ساختن ردیف دوم.
     *
     * فایل تازه مسیر تازه می‌گیرد و نشانی قدیمی همه‌جای سایت به آن به‌روز می‌شود.
     * چرا مسیر تازه و نه بازنویسی روی همان فایل؟ دو دلیل:
     *
     * - nginx فایل‌های `/storage/` را یک هفته کش می‌کند؛ با بازنویسی، بازدیدکننده
     *   تا یک هفته همان تصویر قدیمی را می‌دید.
     * - قالب ممکن است عوض شده باشد (پی‌ان‌جی به وب‌پی)، و آن‌وقت پسوند فایل با
     *   محتوایش نمی‌خواند و مرورگر گیج می‌شود.
     *
     * @return int چند جای سایت به‌روز شد
     */
    public function replace(Media $media, UploadedFile $file, ?User $user = null): int
    {
        $oldPath = $media->path;
        $oldUrl = $media->url();

        $path = $file->store('uploads', 'public');
        $size = @getimagesize(Storage::disk('public')->path($path));

        $media->update([
            'path' => $path,
            'mime' => $size['mime'] ?? (string) $file->getMimeType(),
            'size' => (int) Storage::disk('public')->size($path),
            'width' => (int) ($size[0] ?? 0),
            'height' => (int) ($size[1] ?? 0),
            'user_id' => $user?->id ?? $media->user_id,
        ]);

        $updated = $this->rewriteUrl($oldUrl, $media->url());

        // فایل قدیمی بعد از به‌روز شدن همه‌ی نشانی‌ها می‌رود، نه پیش از آن
        Storage::disk('public')->delete($oldPath);

        return $updated;
    }

    /** نشانی قدیمی را هر جای سایت که نشسته باشد با نشانی تازه عوض می‌کند */
    private function rewriteUrl(string $old, string $new): int
    {
        $needle = '%'.$old.'%';
        $touched = 0;

        foreach (self::USED_IN as [$table, $column, $kind]) {
            $expression = $kind === 'json' ? "{$column}::text" : $column;
            $cast = $kind === 'json' ? '::jsonb' : '';

            $touched += DB::table($table)
                ->whereRaw("{$expression} like ?", [$needle])
                ->update([$column => DB::raw("replace({$expression}, ".DB::getPdo()->quote($old).', '.DB::getPdo()->quote($new)."){$cast}")]);
        }

        return $touched;
    }

    /** فایل را هم از دیسک پاک می‌کند، وگرنه ردیف می‌رفت و فایل یتیم می‌ماند */
    /**
     * حذف عادی: ردیف به سطل زباله می‌رود و فایل سر جایش می‌ماند، وگرنه
     * برگرداندنِ تصویر یک رکوردِ بی‌فایل می‌شد. فایل موقع حذف کامل می‌رود.
     */
    public function delete(Media $media): void
    {
        $media->delete();
    }

    /**
     * چند جای سایت از این تصویر استفاده می‌کنند.
     *
     * جست‌وجو روی خودِ نشانی است نه شناسه، چون تصویرها همه‌جا به‌صورت رشته‌ی
     * نشانی ذخیره شده‌اند و نه رابطه‌ی جدولی. کُند است ولی فقط موقع حذف صدا
     * زده می‌شود.
     */
    public function usageCount(Media $media): int
    {
        $needle = '%'.$media->url().'%';
        $total = 0;

        foreach (self::USED_IN as [$table, $column, $kind]) {
            $expression = $kind === 'json' ? "{$column}::text" : $column;
            $total += (int) DB::table($table)->whereRaw("{$expression} like ?", [$needle])->count();
        }

        return $total;
    }
}
