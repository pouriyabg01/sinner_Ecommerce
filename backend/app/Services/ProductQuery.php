<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

/**
 * فیلتر، مرتب‌سازی و گروه‌های فیلترِ فهرست کالا.
 *
 * قواعد عیناً همان چیزی است که فرانت انتظار دارد
 * (`front end/src/mocks/query-products.ts`): درون یک کلید مشخصات «یا» و بین
 * کلیدها «و»؛ و هر گروه فیلتر روی دامنه‌ای شمرده می‌شود که خودش از آن حذف شده،
 * وگرنه با انتخاب یک مقدار بقیه‌ی مقدارهای همان گروه صفر می‌شوند.
 */
class ProductQuery
{
    public const SPEC_PREFIX = 'spec_';

    public function __construct(private Request $request) {}

    public function filters(): array
    {
        $r = $this->request;
        $list = function (string $key) use ($r): array {
            $value = $r->query($key);
            $value = is_array($value) ? $value : (is_string($value) ? explode(',', $value) : []);

            return array_values(array_filter(array_map('trim', $value), fn ($v) => $v !== ''));
        };

        $specs = [];
        foreach ($r->query() as $key => $value) {
            if (! str_starts_with($key, self::SPEC_PREFIX)) {
                continue;
            }
            $values = array_values(array_filter(explode(',', (string) $value)));
            if ($values) {
                $specs[substr($key, strlen(self::SPEC_PREFIX))] = $values;
            }
        }

        return [
            'q' => $r->query('q'),
            'ids' => $list('ids'),
            'category' => $r->query('category'),
            'brands' => $list('brands'),
            'minPrice' => $r->query('minPrice') !== null ? (int) $r->query('minPrice') : null,
            'maxPrice' => $r->query('maxPrice') !== null ? (int) $r->query('maxPrice') : null,
            'inStockOnly' => $r->query('inStockOnly') === 'true',
            'hasDiscount' => $r->query('hasDiscount') === 'true',
            'minRating' => $r->query('minRating') !== null ? (float) $r->query('minRating') : null,
            'tags' => $list('tags'),
            'specs' => $specs,
            'sort' => $r->query('sort', 'newest'),
            'page' => max(1, (int) $r->query('page', 1)),
            'perPage' => min(100, max(1, (int) $r->query('perPage', 12))),
        ];
    }

    public function apply(Builder $query, array $f): Builder
    {
        if (! empty($f['q'])) {
            // trigram: هم زیررشته را پیدا می‌کند هم غلط املایی را تحمل می‌کند
            $needle = '%'.$f['q'].'%';
            $query->where(function (Builder $q) use ($needle) {
                $q->where('title', 'ilike', $needle)
                    ->orWhere('title_en', 'ilike', $needle)
                    ->orWhere('short_description', 'ilike', $needle);
            });
        }

        if ($f['ids']) {
            $query->whereIn('id', $f['ids']);
        }

        if ($f['category']) {
            // دسته‌ی مادر، کالای زیردسته‌هایش را هم نشان می‌دهد
            $category = Category::where('slug', $f['category'])->first();
            $query->whereIn('category_id', $category ? Category::branchIds($category) : [-1]);
        }

        if ($f['brands']) {
            $query->whereHas('brand', fn (Builder $q) => $q->whereIn('slug', $f['brands']));
        }

        if ($f['minPrice'] !== null) {
            $query->where('price', '>=', $f['minPrice']);
        }

        if ($f['maxPrice'] !== null) {
            $query->where('price', '<=', $f['maxPrice']);
        }

        if ($f['inStockOnly']) {
            $query->where('stock', '>', 0);
        }

        if ($f['hasDiscount']) {
            $query->whereNotNull('compare_at_price')->whereColumn('compare_at_price', '>', 'price');
        }

        if ($f['minRating'] !== null) {
            $query->where('rating', '>=', $f['minRating']);
        }

        if ($f['tags']) {
            $query->whereHas('tags', fn (Builder $q) => $q->whereIn('title', $f['tags']));
        }

        foreach ($f['specs'] as $key => $values) {
            $query->where(function (Builder $q) use ($key, $values) {
                foreach ($values as $value) {
                    $q->orWhereRaw('specs @> ?', [json_encode([['key' => $key, 'value' => $value]])]);
                }
            });
        }

        return match ($f['sort']) {
            'cheapest' => $query->orderBy('price'),
            'expensive' => $query->orderByDesc('price'),
            'popular' => $query->orderByRaw('review_count * rating desc'),
            'discount' => $query->orderByRaw(
                'case when compare_at_price is null or compare_at_price <= price then 0
                      else round(((compare_at_price - price)::numeric / compare_at_price) * 100) end desc'
            ),
            default => $query->orderByDesc('created_at'),
        };
    }

    /** گروه‌های فیلتر با شمارش، برای ستون کناری فهرست کالا */
    public function facets(array $f): array
    {
        $base = fn (array $without = []) => $this->apply(
            Product::query()->published(),
            [...$f, ...$without, 'page' => 1]
        );

        $brands = (clone $base(['brands' => []]))->with('brand')->get()
            ->groupBy(fn ($p) => $p->brand?->slug)
            ->map(fn ($group, $slug) => [
                'value' => (string) $slug,
                'label' => $group->first()->brand?->title ?? '',
                'count' => $group->count(),
            ])->values();

        $tags = (clone $base(['tags' => []]))->with('tags')->get()
            ->flatMap(fn ($p) => $p->tags->pluck('title'))
            ->countBy()
            ->map(fn ($count, $title) => ['value' => $title, 'label' => $title, 'count' => $count])
            ->values();

        $priceScope = (clone $base(['minPrice' => null, 'maxPrice' => null]))->get();

        // زیردسته اگر کلید مشخصات خودش را نداشته باشد، از مادرش می‌گیرد
        $filterCategory = $f['category'] ? Category::with('parent')->where('slug', $f['category'])->first() : null;
        $specKeys = $filterCategory
            ? (($filterCategory->spec_keys ?: null) ?? $filterCategory->parent?->spec_keys ?? [])
            : [];

        $specFacets = [];
        foreach ($specKeys as $key) {
            $others = $f['specs'];
            unset($others[$key]);
            $scope = $this->apply(Product::query()->published(), [...$f, 'specs' => $others])->get();

            $counts = [];
            $label = $key;
            foreach ($scope as $product) {
                foreach (($product->specs ?? []) as $spec) {
                    if (($spec['key'] ?? null) !== $key) {
                        continue;
                    }
                    $label = $spec['label'] ?? $label;
                    $counts[$spec['value']] = ($counts[$spec['value']] ?? 0) + 1;
                }
            }

            $picked = $f['specs'][$key] ?? [];
            // گروهی که فقط یک مقدار دارد فیلتر بی‌فایده‌ای است
            if (count($counts) < 2 && ! $picked) {
                continue;
            }

            $specFacets[] = [
                'key' => $key,
                'label' => $label,
                'options' => collect($counts)
                    ->map(fn ($count, $value) => ['value' => (string) $value, 'label' => (string) $value, 'count' => $count])
                    ->values(),
            ];
        }

        return [
            'brands' => $brands,
            'tags' => $tags,
            'priceRange' => [
                'min' => (int) ($priceScope->min('price') ?? 0),
                'max' => (int) ($priceScope->max('price') ?? 0),
            ],
            'specs' => $specFacets,
        ];
    }
}
