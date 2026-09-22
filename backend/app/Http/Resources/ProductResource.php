<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * خروجی دقیقاً شکل `Product` در `front end/src/types/catalog.ts` است.
 *
 * کلیدها camelCase‌اند و شناسه رشته: فرانت `id` را همه‌جا رشته می‌گیرد
 * (کلید React، مقایسه با `includes`)، و عدد شدنش خطای بی‌سروصدا می‌دهد.
 */
class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'slug' => $this->slug,
            'title' => $this->title,
            'titleEn' => $this->title_en,
            'categorySlug' => $this->category?->slug ?? '',
            'brandSlug' => $this->brand?->slug ?? '',
            'price' => (int) $this->price,
            'compareAtPrice' => $this->compare_at_price !== null ? (int) $this->compare_at_price : null,
            'rating' => (float) $this->rating,
            'reviewCount' => (int) $this->review_count,
            'stock' => (int) $this->stock,
            'images' => $this->images ?? [],
            'shortDescription' => $this->short_description,
            'description' => $this->description,
            'specs' => $this->specs ?? [],
            'variants' => $this->variants->map(fn ($variant) => array_filter([
                'id' => (string) $variant->id,
                'title' => $variant->title,
                'color' => $variant->color_name ? ['name' => $variant->color_name, 'hex' => $variant->color_hex] : null,
                'storage' => $variant->storage,
                'price' => (int) $variant->price,
                'stock' => (int) $variant->stock,
            ], fn ($value) => $value !== null))->values(),
            'tags' => $this->tags->pluck('title')->values(),
            'isNew' => (bool) $this->is_new,
            'isFeatured' => (bool) $this->is_featured,
            'status' => $this->status,
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}
