<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Http\Resources\ReviewResource;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\Review;
use App\Models\Tag;
use App\Services\ProductQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CatalogController extends Controller
{
    public function index(Request $request, ProductQuery $query): JsonResponse
    {
        $filters = $query->filters();

        $paginator = $query
            ->apply(Product::query()->published()->with(['category', 'brand', 'variants', 'tags']), $filters)
            ->paginate($filters['perPage'], ['*'], 'page', $filters['page']);

        return response()->json([
            'items' => ProductResource::collection($paginator->items())->resolve(),
            'page' => $paginator->currentPage(),
            'perPage' => $paginator->perPage(),
            'total' => $paginator->total(),
            'totalPages' => max(1, $paginator->lastPage()),
            'facets' => $query->facets($filters),
        ]);
    }

    public function show(string $slug): JsonResponse
    {
        $product = Product::published()
            ->with(['category', 'brand', 'variants', 'tags'])
            ->where('slug', $slug)
            ->first();

        if (! $product) {
            return response()->json(['message' => 'محصول یافت نشد'], 404);
        }

        $related = Product::published()
            ->with(['category', 'brand', 'variants', 'tags'])
            ->where('category_id', $product->category_id)
            ->whereKeyNot($product->id)
            ->limit(8)
            ->get();

        return response()->json([
            'product' => (new ProductResource($product))->resolve(),
            'related' => ProductResource::collection($related)->resolve(),
        ]);
    }

    public function reviews(string $slug): JsonResponse
    {
        $product = Product::where('slug', $slug)->first();
        if (! $product) {
            return response()->json(['message' => 'یافت نشد'], 404);
        }

        $items = $product->reviews()->where('status', 'approved')->latest()->get();

        return response()->json([
            'items' => ReviewResource::collection($items)->resolve(),
            // همیشه هر پنج ستاره برمی‌گردد، حتی با شمارش صفر، تا نمودار نپرد
            'breakdown' => collect(range(5, 1))
                ->map(fn ($star) => ['star' => $star, 'count' => $items->where('rating', $star)->count()])
                ->values(),
            'average' => round((float) ($items->avg('rating') ?? 0), 1),
            'total' => $items->count(),
        ]);
    }

    /**
     * رأی پسند/ناپسند روی یک نظر.
     *
     * هر رأی‌دهنده روی هر نظر یک رأی دارد: زدن همان دکمه رأی را پس می‌گیرد و
     * زدن دکمه‌ی دیگر جهتش را برمی‌گرداند. رأی‌دهنده یا کاربر واردشده است یا
     * مهمانی که با درهم‌سازی آی‌پی شناخته می‌شود، پس شمارنده با کلیک پشت‌سرهم بالا نمی‌رود.
     */
    public function voteReview(Request $request, string $slug, Review $review): JsonResponse
    {
        $product = Product::where('slug', $slug)->first();
        if (! $product || $review->product_id !== $product->id || $review->status !== 'approved') {
            return response()->json(['message' => 'یافت نشد'], 404);
        }

        $data = $request->validate(['vote' => ['required', 'in:up,down']]);

        $voter = hash('sha256', $request->user() ? 'user:'.$request->user()->id : 'ip:'.$request->ip());
        $votes = DB::table('review_helpfuls')->where('review_id', $review->id)->where('voter_hash', $voter);
        $current = $votes->first();

        if ($current && $current->vote === $data['vote']) {
            $votes->delete();
            $mine = null;
        } elseif ($current) {
            $votes->update(['vote' => $data['vote'], 'updated_at' => now()]);
            $mine = $data['vote'];
        } else {
            DB::table('review_helpfuls')->insert([
                'review_id' => $review->id,
                'user_id' => $request->user()?->id,
                'vote' => $data['vote'],
                'voter_hash' => $voter,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $mine = $data['vote'];
        }

        // شمارنده‌ها از روی خودِ رأی‌ها ساخته می‌شوند تا با کلیک‌های همزمان از واقعیت جدا نیفتند
        $counts = DB::table('review_helpfuls')
            ->where('review_id', $review->id)
            ->selectRaw("count(*) filter (where vote = 'up') as up, count(*) filter (where vote = 'down') as down")
            ->first();

        $review->update([
            'helpful_count' => (int) $counts->up,
            'not_helpful_count' => (int) $counts->down,
        ]);

        return response()->json([
            'helpfulCount' => (int) $counts->up,
            'notHelpfulCount' => (int) $counts->down,
            'myVote' => $mine,
        ]);
    }

    public function storeReview(Request $request, string $slug): JsonResponse
    {
        $product = Product::where('slug', $slug)->first();
        if (! $product) {
            return response()->json(['message' => 'یافت نشد'], 404);
        }

        $data = $request->validate([
            'userName' => ['required', 'string', 'max:60'],
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'title' => ['required', 'string', 'max:120'],
            'body' => ['required', 'string', 'max:2000'],
            'pros' => ['array', 'max:5'],
            'pros.*' => ['string', 'max:60'],
            'cons' => ['array', 'max:5'],
            'cons.*' => ['string', 'max:60'],
        ]);

        $review = $product->reviews()->create([
            'user_id' => $request->user()?->id,
            'user_name' => $data['userName'],
            'rating' => $data['rating'],
            'title' => $data['title'],
            'body' => $data['body'],
            'pros' => $data['pros'] ?? [],
            'cons' => $data['cons'] ?? [],
            // نظر تازه تا تأیید ادمین منتشر نمی‌شود
            'status' => 'pending',
            'verified_purchase' => $request->user()
                ? $request->user()->orders()->whereHas('items', fn ($q) => $q->where('product_id', $product->id))->exists()
                : false,
        ]);

        return response()->json([
            'review' => (new ReviewResource($review))->resolve(),
            'message' => 'نظر شما ثبت شد و پس از بررسی منتشر می‌شود.',
        ], 201);
    }

    public function compare(Request $request): JsonResponse
    {
        $ids = array_filter(explode(',', (string) $request->query('ids')));

        $items = Product::published()
            ->with(['category', 'brand', 'variants', 'tags'])
            ->whereIn('id', $ids)
            ->get()
            // ترتیبی که کاربر انتخاب کرده حفظ می‌شود
            ->sortBy(fn ($p) => array_search((string) $p->id, $ids, true))
            ->values();

        // ستون‌های جدول مقایسه از کلیدهای مشخصاتِ دسته ساخته می‌شوند
        $specKeys = collect();
        foreach ($items as $product) {
            foreach (($product->specs ?? []) as $spec) {
                if (! $specKeys->contains('key', $spec['key'])) {
                    $specKeys->push(['key' => $spec['key'], 'label' => $spec['label'] ?? $spec['key']]);
                }
            }
        }

        return response()->json([
            'items' => ProductResource::collection($items)->resolve(),
            'specKeys' => $specKeys->values(),
        ]);
    }

    public function categories(): JsonResponse
    {
        $categories = Category::withCount(['products' => fn ($q) => $q->where('status', 'active')])->get();

        /*
         * شمار کالای دسته‌ی مادر، کالاهای زیردسته‌هایش را هم می‌شمارد. بدون این،
         * مادرِ بی‌کالای مستقیم در منوی سایت «خالی» دیده می‌شد و حذف می‌شد، در
         * حالی که زیرمجموعه‌هایش پر بودند.
         */
        $childCount = $categories
            ->filter(fn (Category $c) => $c->parent_id)
            ->groupBy('parent_id')
            ->map(fn ($group) => $group->sum('products_count'));

        return response()->json(
            $categories->map(fn (Category $c) => [
                'id' => (string) $c->id,
                'parentId' => $c->parent_id ? (string) $c->parent_id : null,
                'slug' => $c->slug,
                'title' => $c->title,
                'icon' => $c->icon,
                'description' => $c->description,
                'specKeys' => $c->spec_keys ?? [],
                'productCount' => $c->products_count + ($childCount[$c->id] ?? 0),
                /** فقط کالاهای خودِ دسته، بدون زیرمجموعه */
                'ownProductCount' => $c->products_count,
            ])
        );
    }

    public function brands(): JsonResponse
    {
        return response()->json(
            Brand::orderBy('title')->get()->map(fn (Brand $b) => [
                'id' => (string) $b->id,
                'slug' => $b->slug,
                'title' => $b->title,
                'logo' => $b->logo,
            ])
        );
    }

    /** اندپوینت عمومی فقط عنوان برچسب‌ها را می‌دهد؛ پنل شیء کامل می‌گیرد */
    public function tags(): JsonResponse
    {
        return response()->json(Tag::orderBy('title')->pluck('title'));
    }
}
