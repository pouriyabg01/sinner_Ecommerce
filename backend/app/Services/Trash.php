<?php

namespace App\Services;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Discount;
use App\Models\Media;
use App\Models\Product;
use App\Models\RepairIssue;
use App\Models\Tag;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

/**
 * سطل زباله‌ی پنل.
 *
 * حذف در پنل دیگر ردیف را نمی‌برد؛ فقط از فروشگاه و فهرست‌های پنل پنهانش
 * می‌کند. برگرداندن همان ردیف است، با همان شناسه و همان پیوندها — نه یک کپی.
 * حذف کامل هم هست، برای وقتی که ادمین مطمئن است.
 *
 * کارهایی که ادمین موقع حذف صریحاً خواسته (مثل پاک شدن کالاهای یک دسته)
 * برنمی‌گردند؛ سطل فقط خودِ چیزِ حذف‌شده را نگه می‌دارد.
 */
class Trash
{
    /** نوع‌های سطل: کلید ← [مدل، نام فارسی، ستونی که عنوان را نشان می‌دهد] */
    public const TYPES = [
        'product' => [Product::class, 'کالا', 'title'],
        'category' => [Category::class, 'دسته‌بندی', 'title'],
        'brand' => [Brand::class, 'برند', 'title'],
        'tag' => [Tag::class, 'برچسب', 'title'],
        'discount' => [Discount::class, 'کد تخفیف', 'code'],
        'repair_issue' => [RepairIssue::class, 'مشکل تعمیر', 'title'],
        'media' => [Media::class, 'تصویر', 'name'],
    ];

    /** همه‌ی چیزهای داخل سطل، تازه‌ترین حذف اول */
    public function items(): array
    {
        $rows = [];

        foreach (self::TYPES as $type => [$model, $label, $titleColumn]) {
            foreach ($model::onlyTrashed()->orderByDesc('deleted_at')->get() as $row) {
                $rows[] = [
                    'type' => $type,
                    'typeLabel' => $label,
                    'id' => (string) $row->getKey(),
                    'title' => (string) ($row->{$titleColumn} ?: '—'),
                    'deletedAt' => $row->deleted_at?->toIso8601String(),
                    'thumbnail' => $this->thumbnail($row),
                ];
            }
        }

        usort($rows, fn ($a, $b) => strcmp((string) $b['deletedAt'], (string) $a['deletedAt']));

        return $rows;
    }

    public function restore(string $type, string $id): void
    {
        $this->trashed($type)->findOrFail($id)->restore();
    }

    public function purge(string $type, string $id): void
    {
        $this->forget($this->trashed($type)->findOrFail($id));
    }

    /** خالی کردن کل سطل؛ شمار چیزهایی که برای همیشه رفتند را برمی‌گرداند */
    public function empty(): int
    {
        $count = 0;

        foreach (array_keys(self::TYPES) as $type) {
            foreach ($this->trashed($type)->get() as $row) {
                $this->forget($row);
                $count++;
            }
        }

        return $count;
    }

    private function trashed(string $type)
    {
        $model = self::TYPES[$type][0] ?? abort(404, 'چنین نوعی در سطل زباله نیست');

        return $model::onlyTrashed();
    }

    /** حذف کامل؛ تصویر فایلش را هم می‌برد وگرنه فایلِ بی‌صاحب روی دیسک می‌ماند */
    public function forget(Model $row): void
    {
        if ($row instanceof Media) {
            Storage::disk('public')->delete($row->path);
        }

        $row->forceDelete();
    }

    private function thumbnail(Model $row): ?string
    {
        if ($row instanceof Media) {
            return $row->url();
        }

        if ($row instanceof Product) {
            return $row->images[0] ?? null;
        }

        return null;
    }
}
