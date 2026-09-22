<?php

namespace App\Services;

use App\Models\Product;
use App\Models\StockAlert;
use App\Services\Sms\SmsSender;

/** «موجود شد خبرم کن»: بعد از هر ذخیره‌ی کالا، منتظرانِ مدلی که حالا موجود است خبر می‌گیرند */
class StockAlerts
{
    public function __construct(private SmsSender $sms) {}

    public function notifyAvailable(Product $product): void
    {
        // کالای غیرفعال یا بی‌دسته در فروشگاه دیده نمی‌شود؛ خبر دادن درباره‌اش بی‌معناست
        if ($product->status !== 'active' || $product->category_id === null) {
            return;
        }

        $product->loadMissing('variants');

        StockAlert::with('user')
            ->where('product_id', $product->id)
            ->whereNull('notified_at')
            ->get()
            ->each(function (StockAlert $alert) use ($product) {
                if (! self::isAvailable($product, $alert->variant_title)) {
                    return;
                }
                $alert->update(['notified_at' => now()]);
                $this->sms->backInStock($alert, $product);
            });
    }

    /** مدل با همان عنوان؛ اگر ادمین نامش را عوض کرده باشد، هر مدل موجودی کافی است */
    public static function isAvailable(Product $product, string $variantTitle): bool
    {
        $variants = $product->variants;
        $match = $variants->firstWhere('title', $variantTitle);

        return $match ? $match->stock > 0 : $variants->contains(fn ($variant) => $variant->stock > 0);
    }
}
