<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    protected $fillable = ['parent_id', 'slug', 'title', 'icon', 'description', 'spec_keys'];

    protected $casts = ['spec_keys' => 'array'];

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    /**
     * شناسه‌ی خودِ دسته به‌همراه همه‌ی زیرشاخه‌هایش، در هر عمقی.
     *
     * فیلتر فروشگاه روی دسته‌ی مادر باید کالای زیردسته‌ها را هم بیاورد، وگرنه
     * «لپ‌تاپ» خالی دیده می‌شود در حالی که همه‌ی کالاها زیر «لپ‌تاپ گیمینگ»اند.
     * درخت سقف سطح ندارد، پس یک پله پایین رفتن کافی نیست و کل شاخه پیموده می‌شود.
     *
     * دسته‌ها چندتا بیشتر نیستند و یکجا خوانده می‌شوند؛ پیمایش بازگشتی با پرس‌وجو
     * به ازای هر سطح، برای درختِ عمیق ده‌ها کوئری می‌شد.
     */
    public static function branchIds(self $category): array
    {
        $byParent = self::query()->get(['id', 'parent_id'])->groupBy('parent_id');

        $ids = [];
        $queue = [$category->id];

        while ($queue) {
            $id = array_shift($queue);
            // دیده‌شده را رد می‌کنیم تا ردیفِ حلقه‌دار (اگر از راهی جز API ساخته شود) اینجا گیر نکند
            if (in_array($id, $ids, true)) {
                continue;
            }
            $ids[] = $id;
            foreach ($byParent->get($id, collect()) as $child) {
                $queue[] = $child->id;
            }
        }

        return $ids;
    }
}
