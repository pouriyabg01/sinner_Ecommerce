<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    protected $fillable = [
        'slug', 'title', 'title_en', 'category_id', 'brand_id', 'compare_at_price',
        'images', 'short_description', 'description', 'specs', 'is_new', 'is_featured', 'status',
    ];

    protected $casts = [
        'images' => 'array',
        'specs' => 'array',
        'is_new' => 'boolean',
        'is_featured' => 'boolean',
        'price' => 'integer',
        'compare_at_price' => 'integer',
        'stock' => 'integer',
        'rating' => 'float',
        'review_count' => 'integer',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class)->orderBy('position');
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    /** کالای غیرفعال برای مشتری اصلاً وجود ندارد — حتی با لینک مستقیم */
    public function scopePublished(Builder $query): Builder
    {
        // کالای بی‌دسته (دسته‌اش حذف شده) تا دسته‌ی تازه نگیرد در فروشگاه نیست
        return $query->where('status', 'active')->whereNotNull('category_id');
    }

    /**
     * قیمت و موجودی از مدل‌ها ساخته می‌شوند، نه از ورودی کاربر: ارزان‌ترین مدل
     * قیمتِ «از» است و جمع موجودی‌ها موجودی کل. هرجا مدل‌ها عوض شدند باید صدا
     * زده شود، وگرنه کارت کالا قیمتی نشان می‌دهد که در صفحه‌ی محصول نیست.
     */
    public function syncPricingFromVariants(): void
    {
        $variants = $this->variants()->get();
        if ($variants->isEmpty()) {
            return;
        }

        $this->forceFill([
            'price' => (int) $variants->min('price'),
            'stock' => (int) $variants->sum('stock'),
        ])->save();
    }

    /** میانگین امتیاز و تعداد نظر، فقط از نظرهای تأییدشده */
    public function syncReviewStats(): void
    {
        $approved = $this->reviews()->where('status', 'approved');

        $this->forceFill([
            'rating' => round((float) ($approved->clone()->avg('rating') ?? 0), 1),
            'review_count' => (int) $approved->clone()->count(),
        ])->save();
    }
}
