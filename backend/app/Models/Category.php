<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Category extends Model
{
    use SoftDeletes;

    protected $fillable = ['parent_id', 'slug', 'title', 'description', 'spec_keys'];

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
     * کلیدهای مشخصات دسته، به‌همراه آنچه از مادرهایش به ارث می‌برد.
     *
     * کلیدها معمولاً بالای شاخه تعریف می‌شوند؛ بدون ارث، زیرشاخه‌ی عمیق در
     * نوار فیلتر هیچ مشخصه‌ای نشان نمی‌داد.
     *
     * ترتیب: هرچه دسته نزدیک‌تر، بالاتر — اول مشخصه‌های خاصِ همین دسته و بعد
     * عمومی‌های مادر. کلید تکراری یک بار و در نزدیک‌ترین جایگاهش می‌آید. همین
     * ترتیب در فرم کالای پنل هم ساخته می‌شود تا دو جا یکی باشند.
     */
    public static function specKeyTrail(self $category): array
    {
        $keys = [];
        $seen = [];

        for ($node = $category; $node && ! in_array($node->id, $seen, true); $node = $node->parent) {
            $seen[] = $node->id;
            $keys[] = $node->spec_keys ?? [];
        }

        $flat = [];
        foreach (array_merge(...$keys ?: [[]]) as $key) {
            if ($key !== '' && ! in_array($key, $flat, true)) {
                $flat[] = $key;
            }
        }

        return $flat;
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
