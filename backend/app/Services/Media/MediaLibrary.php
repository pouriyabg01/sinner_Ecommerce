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
        ['categories', 'icon', 'text'],
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

    /** فایل را هم از دیسک پاک می‌کند، وگرنه ردیف می‌رفت و فایل یتیم می‌ماند */
    public function delete(Media $media): void
    {
        Storage::disk('public')->delete($media->path);
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
