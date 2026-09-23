<?php

namespace Database\Seeders;

use App\Models\Address;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Discount;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\RepairIssue;
use App\Models\RepairRequest;
use App\Models\Review;
use App\Models\SiteDocument;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * داده‌ی نمونه از همان لایه‌ی mock فرانت بیرون کشیده شده
 * (`database/seeders/data/*.json`)، تا سایت با بک‌اند واقعی دقیقاً همان چیزی را
 * نشان بدهد که تا امروز نشان می‌داد و تفاوت‌ها قابل مقایسه بماند.
 *
 * شناسه‌های قدیمی (`prd_001`, `usr_100`, …) به شناسه‌ی عددی نگاشت می‌شوند و
 * همان نگاشت برای ارجاع‌های بین جدول‌ها استفاده می‌شود.
 */
class DatabaseSeeder extends Seeder
{
    /** نگاشت شناسه‌ی متنیِ داده‌ی نمونه به شناسه‌ی عددی دیتابیس */
    private array $map = [];

    private function data(string $file): array
    {
        return json_decode(file_get_contents(database_path("seeders/data/{$file}.json")), true);
    }

    public function run(): void
    {
        DB::transaction(function () {
            $this->seedTaxonomy();
            $this->seedProducts();
            $this->seedUsers();
            $this->seedReviews();
            $this->seedDiscounts();
            $this->seedOrders();
            $this->seedRepairs();
            $this->seedDocuments();
        });
    }

    private function seedTaxonomy(): void
    {
        foreach ($this->data('categories') as $row) {
            $category = Category::create([
                'slug' => $row['slug'],
                'title' => $row['title'],
                'icon' => $row['icon'] ?? '',
                'description' => $row['description'] ?? '',
                'spec_keys' => $row['specKeys'] ?? [],
            ]);
            $this->map["cat:{$row['slug']}"] = $category->id;
            $this->map["catid:{$row['id']}"] = $category->id;
        }

        foreach ($this->data('brands') as $row) {
            $brand = Brand::create([
                'slug' => $row['slug'],
                'title' => $row['title'],
                'logo' => $row['logo'] ?? '',
            ]);
            $this->map["brand:{$row['slug']}"] = $brand->id;
        }

        // اندپوینت عمومی برچسب‌ها فقط عنوان برمی‌گرداند، نه شیء کامل
        foreach ($this->data('tags') as $row) {
            Tag::create(['title' => is_array($row) ? $row['title'] : $row]);
        }
    }

    private function seedProducts(): void
    {
        foreach ($this->data('products') as $row) {
            $product = Product::create([
                'slug' => $row['slug'],
                'title' => $row['title'],
                'title_en' => $row['titleEn'] ?? '',
                'category_id' => $this->map["cat:{$row['categorySlug']}"],
                'brand_id' => $this->map["brand:{$row['brandSlug']}"],
                'compare_at_price' => $row['compareAtPrice'] ?? null,
                'images' => $row['images'] ?? [],
                'short_description' => $row['shortDescription'] ?? '',
                'description' => $row['description'] ?? '',
                'specs' => $row['specs'] ?? [],
                'is_new' => $row['isNew'] ?? false,
                'is_featured' => $row['isFeatured'] ?? false,
                'status' => $row['status'] ?? 'active',
            ]);
            $product->forceFill(['created_at' => $row['createdAt']])->save();
            $this->map["prd:{$row['id']}"] = $product->id;

            foreach (($row['variants'] ?? []) as $index => $variant) {
                ProductVariant::create([
                    'product_id' => $product->id,
                    'title' => $variant['title'],
                    'color_name' => $variant['color']['name'] ?? null,
                    'color_hex' => $variant['color']['hex'] ?? null,
                    'option_value' => $variant['storage'] ?? $variant['option'] ?? null,
                    'price' => $variant['price'],
                    'stock' => $variant['stock'],
                    'position' => $index,
                ]);
            }

            $tagIds = Tag::whereIn('title', $row['tags'] ?? [])->pluck('id');
            $product->tags()->sync($tagIds);

            $product->syncPricingFromVariants();
        }
    }

    private function seedUsers(): void
    {
        foreach ($this->data('users') as $row) {
            $user = User::create([
                'full_name' => $row['fullName'],
                'name' => $row['fullName'],
                'phone' => $row['phone'] ?: null,
                'email' => $row['email'] ?: null,
                // رمز نمونه برای همه‌ی حساب‌های دمو
                'password' => Hash::make('password'),
                'role' => $row['role'],
                'admin_title' => $row['adminTitle'] ?? null,
                'permissions' => $row['permissions'] ?? [],
                'status' => $row['status'] ?? 'active',
            ]);
            $user->forceFill(['created_at' => $row['createdAt']])->save();
            $this->map["usr:{$row['id']}"] = $user->id;

            foreach (($row['addresses'] ?? []) as $address) {
                Address::create([
                    'user_id' => $user->id,
                    'title' => $address['title'],
                    'receiver' => $address['receiver'],
                    'phone' => $address['phone'],
                    'province' => $address['province'],
                    'city' => $address['city'],
                    'postal_code' => $address['postalCode'],
                    'line' => $address['line'],
                    'is_default' => $address['isDefault'] ?? false,
                ]);
            }
        }
    }

    private function seedReviews(): void
    {
        foreach ($this->data('reviews') as $row) {
            $productId = $this->map["prd:{$row['productId']}"] ?? null;
            if (! $productId) {
                continue;
            }

            $review = Review::create([
                'product_id' => $productId,
                'user_name' => $row['userName'],
                'rating' => $row['rating'],
                'title' => $row['title'],
                'body' => $row['body'],
                'pros' => $row['pros'] ?? [],
                'cons' => $row['cons'] ?? [],
                'helpful_count' => $row['helpfulCount'] ?? 0,
                'status' => $row['status'],
                'verified_purchase' => $row['verifiedPurchase'] ?? false,
            ]);
            $review->forceFill(['created_at' => $row['createdAt']])->save();
        }

        Product::each(fn (Product $product) => $product->syncReviewStats());
    }

    private function seedDiscounts(): void
    {
        foreach ($this->data('discounts') as $row) {
            $discount = Discount::create([
                'code' => $row['code'],
                'type' => $row['type'],
                'value' => $row['value'],
                'starts_at' => $row['startsAt'],
                'ends_at' => $row['endsAt'],
                'usage_limit' => $row['usageLimit'] ?? 0,
                'used_count' => $row['usedCount'] ?? 0,
                'active' => $row['active'] ?? true,
            ]);

            $productIds = collect($row['productIds'] ?? [])
                ->map(fn ($id) => $this->map["prd:{$id}"] ?? null)
                ->filter();
            $discount->products()->sync($productIds);

            $categoryIds = collect($row['categoryIds'] ?? [])
                ->map(fn ($id) => $this->map["catid:{$id}"] ?? null)
                ->filter();
            $discount->categories()->sync($categoryIds);

            $userIds = collect($row['userIds'] ?? [])
                ->map(fn ($id) => $this->map["usr:{$id}"] ?? null)
                ->filter();
            $discount->users()->sync($userIds);
        }
    }

    private function seedOrders(): void
    {
        foreach ($this->data('orders') as $row) {
            $order = Order::create([
                'code' => $row['code'],
                'user_id' => $this->map["usr:{$row['userId']}"],
                'subtotal' => $row['subtotal'],
                'discount' => $row['discount'] ?? 0,
                'shipping_cost' => $row['shippingCost'] ?? 0,
                'total' => $row['total'],
                'status' => $row['status'],
                'payment_method' => $row['paymentMethod'],
                'payment_status' => $row['paymentStatus'],
                'payment_ref' => $row['paymentRef'] ?? null,
                'address_summary' => $row['addressSummary'] ?? '',
                'preferred_delivery_date' => $row['preferredDeliveryDate'] ?? null,
                'tracking_code' => $row['trackingCode'] ?? null,
                'timeline' => $row['timeline'] ?? [],
            ]);
            $order->forceFill(['created_at' => $row['createdAt']])->save();

            foreach (($row['items'] ?? []) as $item) {
                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $this->map["prd:{$item['productId']}"] ?? null,
                    'title' => $item['title'],
                    'variant_title' => $item['variantTitle'] ?? null,
                    'image' => $item['image'] ?? '',
                    'unit_price' => $item['unitPrice'],
                    'quantity' => $item['quantity'],
                ]);
            }
        }
    }

    private function seedRepairs(): void
    {
        foreach ($this->data('repair_issues') as $row) {
            $issue = RepairIssue::create([
                'title' => $row['title'],
                'hint' => $row['hint'] ?? '',
                'icon' => $row['icon'] ?? '',
                'device_kinds' => $row['deviceKinds'] ?? [],
                'estimated_min' => $row['estimatedMin'] ?? 0,
                'estimated_max' => $row['estimatedMax'] ?? 0,
                'estimated_days' => $row['estimatedDays'] ?? 0,
            ]);
            $this->map["iss:{$row['id']}"] = $issue->id;
        }

        foreach ($this->data('repairs') as $row) {
            $repair = RepairRequest::create([
                'code' => $row['code'],
                'user_id' => $this->map["usr:{$row['userId']}"],
                'device_kind' => $row['deviceKind'],
                'device_brand' => $row['deviceBrand'] ?? '',
                'device_model' => $row['deviceModel'] ?? '',
                'issue_description' => $row['issueDescription'] ?? '',
                'photos' => $row['photos'] ?? [],
                'pickup_method' => $row['pickupMethod'],
                'address_summary' => $row['addressSummary'] ?? '',
                'preferred_date' => $row['preferredDate'] ?? null,
                'status' => $row['status'],
                'estimated_min' => $row['estimatedCost']['min'] ?? 0,
                'estimated_max' => $row['estimatedCost']['max'] ?? 0,
                'final_cost' => $row['finalCost'] ?? null,
                'technician_note' => $row['technicianNote'] ?? null,
                'warranty_days' => $row['warrantyDays'] ?? 0,
                'timeline' => $row['timeline'] ?? [],
            ]);
            $repair->forceFill(['created_at' => $row['createdAt']])->save();

            $issueIds = collect($row['issueIds'] ?? [])
                ->map(fn ($id) => $this->map["iss:{$id}"] ?? null)
                ->filter();
            $repair->issues()->sync($issueIds);
        }
    }

    private function seedDocuments(): void
    {
        SiteDocument::updateOrCreate(['key' => 'home'], ['payload' => $this->data('cms_home')]);
        SiteDocument::updateOrCreate(['key' => 'about'], ['payload' => $this->data('cms_about')]);
        SiteDocument::updateOrCreate(['key' => 'settings'], ['payload' => $this->data('cms_settings')]);
    }
}
