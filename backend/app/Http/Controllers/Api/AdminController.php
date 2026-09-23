<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Http\Resources\ProductResource;
use App\Http\Resources\RepairRequestResource;
use App\Http\Resources\ReviewResource;
use App\Http\Resources\UserResource;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Discount;
use App\Models\Order;
use App\Models\Product;
use App\Models\RepairIssue;
use App\Models\RepairRequest;
use App\Models\Review;
use App\Models\SiteDocument;
use App\Models\Tag;
use App\Models\User;
use App\Services\ProductQuery;
use App\Services\Sms\SmsSender;
use App\Services\StockAlerts;
use App\Support\Digits;
use App\Support\OrderStatusFlow;
use App\Support\RepairStatusFlow;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdminController extends Controller
{
    /* -------------------------------- محصولات -------------------------------- */

    /** پنل کالای غیرفعال را هم می‌بیند؛ فروشگاه نه */
    public function products(Request $request, ProductQuery $query): JsonResponse
    {
        $filters = $query->filters();

        $paginator = $query
            ->apply(Product::query()->with(['category', 'brand', 'variants', 'tags']), $filters)
            ->paginate($filters['perPage'], ['*'], 'page', $filters['page']);

        return response()->json([
            'items' => ProductResource::collection($paginator->items())->resolve(),
            'page' => $paginator->currentPage(),
            'perPage' => $paginator->perPage(),
            'total' => $paginator->total(),
            'totalPages' => max(1, $paginator->lastPage()),
            'facets' => ['brands' => [], 'tags' => [], 'specs' => [], 'priceRange' => ['min' => 0, 'max' => 0]],
        ]);
    }

    public function storeProduct(Request $request): JsonResponse
    {
        $data = $this->productPayload($request);

        $product = DB::transaction(function () use ($data) {
            $product = Product::create($data['attributes']);
            $this->syncProductRelations($product, $data);

            return $product;
        });

        return response()->json((new ProductResource($this->loadProduct($product)))->resolve(), 201);
    }

    public function updateProduct(Request $request, Product $product): JsonResponse
    {
        $data = $this->productPayload($request, $product);

        DB::transaction(function () use ($product, $data) {
            $product->update($data['attributes']);
            $this->syncProductRelations($product, $data);
        });

        // اگر مدلی که کسی منتظرش بود دوباره موجود شده، همین حالا خبرش می‌کنیم
        app(StockAlerts::class)->notifyAvailable($product->fresh());

        return response()->json((new ProductResource($this->loadProduct($product)))->resolve());
    }

    public function destroyProduct(Product $product): JsonResponse
    {
        $discountIds = DB::table('discount_product')->where('product_id', $product->id)->pluck('discount_id');
        $product->delete();
        Discount::deactivateUnscoped($discountIds);

        return response()->json(['ok' => true]);
    }

    private function loadProduct(Product $product): Product
    {
        return $product->fresh()->load(['category', 'brand', 'variants', 'tags']);
    }

    private function productPayload(Request $request, ?Product $existing = null): array
    {
        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:120'],
            'titleEn' => ['sometimes', 'nullable', 'string', 'max:120'],
            // خالی یعنی «خودت بساز»؛ پیش‌تر نامک خالی با خطای «نامک باید متن باشد» کل ثبت را رد می‌کرد
            'slug' => ['sometimes', 'nullable', 'string', 'max:120', 'regex:/^[a-z0-9]+(-[a-z0-9]+)*$/', Rule::unique('products', 'slug')->ignore($existing?->id)],
            'categorySlug' => ['sometimes', 'string', 'exists:categories,slug'],
            'brandSlug' => ['sometimes', 'string', 'exists:brands,slug'],
            'compareAtPrice' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'images' => ['sometimes', 'array'],
            'shortDescription' => ['sometimes', 'nullable', 'string', 'max:400'],
            'description' => ['sometimes', 'nullable', 'string'],
            'specs' => ['sometimes', 'array'],
            'variants' => ['sometimes', 'array', 'min:1'],
            'variants.*.title' => ['required', 'string', 'max:120'],
            'variants.*.price' => ['required', 'integer', 'min:1000'],
            'variants.*.stock' => ['required', 'integer', 'min:0'],
            'variants.*.option' => ['sometimes', 'nullable', 'string', 'max:40'],
            'variantLabel' => ['sometimes', 'nullable', 'string', 'max:30'],
            'tags' => ['sometimes', 'array'],
            'status' => ['sometimes', 'in:active,inactive'],
            'isNew' => ['sometimes', 'boolean'],
            'isFeatured' => ['sometimes', 'boolean'],
            'condition' => ['sometimes', 'in:new,stock,used'],
        ], [
            'slug.regex' => 'نامک فقط حروف کوچک انگلیسی، عدد و خط تیره می‌پذیرد — مانند iphone-16-pro',
            'slug.unique' => 'کالای دیگری همین نامک را دارد؛ نامک دیگری بنویسید یا خالی بگذارید تا خودکار ساخته شود',
        ]);

        $map = [
            'title' => 'title',
            'titleEn' => 'title_en',
            'slug' => 'slug',
            'compareAtPrice' => 'compare_at_price',
            'images' => 'images',
            'shortDescription' => 'short_description',
            'description' => 'description',
            'specs' => 'specs',
            'status' => 'status',
            'isNew' => 'is_new',
            'isFeatured' => 'is_featured',
            'condition' => 'condition',
            'variantLabel' => 'variant_label',
        ];

        $attributes = [];
        foreach ($map as $input => $column) {
            if (array_key_exists($input, $data)) {
                $attributes[$column] = $data[$input];
            }
        }

        // کالای بی‌نام انگلیسی یا بی‌توضیح کوتاه با خطای ۵۰۰ رد می‌شد
        $attributes = $this->blankNulls($attributes, ['title_en', 'short_description', 'description']);

        // در ویرایش، نامک خالی یعنی «دست نزن» — آدرس کالای موجود نباید عوض شود
        if (empty($attributes['slug'])) {
            unset($attributes['slug']);
            if (! $existing) {
                $attributes['slug'] = $this->uniqueProductSlug($data['titleEn'] ?? null);
            }
        }

        if (isset($data['categorySlug'])) {
            $attributes['category_id'] = Category::where('slug', $data['categorySlug'])->value('id');
        }

        if (isset($data['brandSlug'])) {
            $attributes['brand_id'] = Brand::where('slug', $data['brandSlug'])->value('id');
        }

        // کالای فعالِ بی‌دسته در فروشگاه دیده نمی‌شد ولی در پنل «فعال» می‌ماند؛ این دو نباید از هم جدا بیفتند
        $finalStatus = $attributes['status'] ?? $existing?->status ?? 'active';
        $finalCategory = array_key_exists('category_id', $attributes) ? $attributes['category_id'] : $existing?->category_id;
        if ($finalStatus === 'active' && ! $finalCategory) {
            throw ValidationException::withMessages([
                'categorySlug' => 'کالای بدون دسته‌بندی را نمی‌شود فعال کرد — اول یک دسته برایش انتخاب کنید',
            ]);
        }

        return [
            'attributes' => $attributes,
            'variants' => $data['variants'] ?? null,
            'tags' => $data['tags'] ?? null,
        ];
    }

    /**
     * لاراول رشته‌ی خالی را null می‌کند، ولی این ستون‌ها null نمی‌پذیرند.
     * کلیدِ نیامده دست نمی‌خورد تا «نفرستادن» همچنان یعنی «تغییر نده»، ولی
     * فیلدی که ادمین عمداً خالی کرده، خالی ذخیره می‌شود.
     */
    private function blankNulls(array $data, array $keys): array
    {
        foreach ($keys as $key) {
            if (array_key_exists($key, $data) && $data[$key] === null) {
                $data[$key] = '';
            }
        }

        return $data;
    }

    /** نامک از نام انگلیسی، و برای کالای بی‌نام انگلیسی «product»؛ با پسوند عددی تا تکراری نشود */
    private function uniqueProductSlug(?string $titleEn): string
    {
        $base = Str::slug((string) $titleEn) ?: 'product';
        $slug = $base;
        for ($i = 2; Product::query()->where('slug', $slug)->exists(); $i++) {
            $slug = "{$base}-{$i}";
        }

        return $slug;
    }

    private function syncProductRelations(Product $product, array $data): void
    {
        if ($data['variants'] !== null) {
            $product->variants()->delete();
            foreach ($data['variants'] as $index => $variant) {
                $product->variants()->create([
                    'title' => $variant['title'],
                    'color_name' => $variant['color']['name'] ?? null,
                    'color_hex' => $variant['color']['hex'] ?? null,
                    'option_value' => $variant['option'] ?? null,
                    'price' => $variant['price'],
                    'stock' => $variant['stock'],
                    'position' => $index,
                ]);
            }
        }

        if ($data['tags'] !== null) {
            $ids = collect($data['tags'])
                ->map(fn ($title) => Tag::firstOrCreate(['title' => $title])->id);
            $product->tags()->sync($ids);
        }

        // قیمت و موجودی هیچ‌وقت از ورودی خوانده نمی‌شوند
        $product->syncPricingFromVariants();
    }

    /* --------------------------------- سفارش --------------------------------- */

    public function orders(): JsonResponse
    {
        $items = Order::with(['items', 'user'])->latest()->get()
            ->map(fn ($order) => OrderResource::forAdmin($order)->resolve());

        return response()->json($items);
    }

    public function updateOrder(Request $request, Order $order): JsonResponse
    {
        $data = $request->validate([
            'status' => ['sometimes', 'in:pending_payment,processing,packing,shipped,delivered,cancelled,returned'],
            'paymentStatus' => ['sometimes', 'in:unpaid,paid,failed,cancelled'],
            'trackingCode' => ['sometimes', 'nullable', 'string', 'max:60'],
            'note' => ['sometimes', 'nullable', 'string', 'max:300'],
        ]);

        $statusChanged = isset($data['status']) && $data['status'] !== $order->status;

        // جهش از وضعیتی به وضعیت دور، مرحله‌های میانی را از تاریخچه و پیامک‌ها می‌انداخت
        if ($statusChanged && $rejection = OrderStatusFlow::rejectionFor($order->status, $data['status'])) {
            return response()->json([
                'message' => $rejection,
                'errors' => ['status' => [$rejection]],
            ], 422);
        }

        if ($statusChanged) {
            $order->pushTimeline($data['status'], $data['note'] ?? null);
        }

        if (isset($data['paymentStatus'])) {
            $order->payment_status = $data['paymentStatus'];
        }
        // کد رهگیری را باید بشود پاک هم کرد، پس null نادیده گرفته نمی‌شود
        if (array_key_exists('trackingCode', $data)) {
            $order->tracking_code = trim(Digits::english((string) $data['trackingCode'])) ?: null;
        }
        $order->save();

        if ($statusChanged && in_array($order->status, ['shipped', 'delivered', 'cancelled'], true)) {
            app(SmsSender::class)->order($order, 'order.'.$order->status);
        }

        return response()->json(OrderResource::forAdmin($order->fresh()->load(['items', 'user']))->resolve());
    }

    /* --------------------------------- تعمیر --------------------------------- */

    public function repairs(): JsonResponse
    {
        $items = RepairRequest::with(['issues', 'user'])->latest()->get()
            ->map(fn ($repair) => RepairRequestResource::forAdmin($repair)->resolve());

        return response()->json($items);
    }

    public function updateRepair(Request $request, RepairRequest $repair): JsonResponse
    {
        $data = $request->validate([
            'status' => ['sometimes', Rule::in(array_keys(RepairStatusFlow::LABELS))],
            'finalCost' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'technicianNote' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'warrantyDays' => ['sometimes', 'integer', 'min:0', 'max:3650'],
            'note' => ['sometimes', 'nullable', 'string', 'max:300'],
        ]);

        $statusChanged = isset($data['status']) && $data['status'] !== $repair->status;

        /*
         * هزینه‌ی همین درخواست، نه فقط آنچه ذخیره شده: ادمین معمولاً هزینه و وضعیت
         * را با هم می‌فرستد و اگر فقط مقدار ذخیره‌شده را می‌دیدیم، همان ارسال درست
         * هم رد می‌شد.
         */
        $finalCost = array_key_exists('finalCost', $data)
            ? (int) $data['finalCost']
            : (int) $repair->final_cost;

        if ($statusChanged && $rejection = RepairStatusFlow::rejectionForAdmin($repair->status, $data['status'], $finalCost)) {
            return response()->json([
                'message' => $rejection,
                'errors' => ['status' => [$rejection]],
            ], 422);
        }

        if ($statusChanged) {
            $repair->pushTimeline($data['status'], $data['note'] ?? null);
        }

        $repair->fill(array_filter([
            'final_cost' => $data['finalCost'] ?? null,
            'technician_note' => $data['technicianNote'] ?? null,
            'warranty_days' => $data['warrantyDays'] ?? null,
        ], fn ($v) => $v !== null))->save();

        $repairEvent = ['awaiting_approval' => 'repair.quoted', 'ready' => 'repair.ready', 'completed' => 'repair.completed'][$repair->status] ?? null;
        if ($statusChanged && $repairEvent) {
            app(SmsSender::class)->repair($repair->fresh(), $repairEvent);
        }

        return response()->json(RepairRequestResource::forAdmin($repair->fresh()->load(['issues', 'user']))->resolve());
    }

    public function repairIssues(): JsonResponse
    {
        return response()->json(RepairIssue::get()->map(fn (RepairIssue $issue) => [
            'id' => (string) $issue->id,
            'deviceKinds' => $issue->device_kinds ?? [],
            'title' => $issue->title,
            'hint' => $issue->hint,
            'icon' => $issue->icon,
            'estimatedMin' => (int) $issue->estimated_min,
            'estimatedMax' => (int) $issue->estimated_max,
            'estimatedDays' => (int) $issue->estimated_days,
        ]));
    }

    public function storeRepairIssue(Request $request): JsonResponse
    {
        $issue = RepairIssue::create($this->repairIssuePayload($request));

        return response()->json(['id' => (string) $issue->id] + $request->all(), 201);
    }

    public function updateRepairIssue(Request $request, RepairIssue $repairIssue): JsonResponse
    {
        $repairIssue->update($this->repairIssuePayload($request));

        return response()->json(['id' => (string) $repairIssue->id] + $request->all());
    }

    public function destroyRepairIssue(RepairIssue $repairIssue): JsonResponse
    {
        $repairIssue->delete();

        return response()->json(['ok' => true]);
    }

    private function repairIssuePayload(Request $request): array
    {
        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:120'],
            'hint' => ['sometimes', 'nullable', 'string', 'max:300'],
            'icon' => ['sometimes', 'nullable', 'string', 'max:60'],
            'deviceKinds' => ['sometimes', 'array'],
            'estimatedMin' => ['sometimes', 'integer', 'min:0'],
            'estimatedMax' => ['sometimes', 'integer', 'min:0'],
            'estimatedDays' => ['sometimes', 'integer', 'min:0'],
        ]);

        $data = $this->blankNulls($data, ['hint', 'icon']);

        return array_filter([
            'title' => $data['title'] ?? null,
            'hint' => $data['hint'] ?? null,
            'icon' => $data['icon'] ?? null,
            'device_kinds' => $data['deviceKinds'] ?? null,
            'estimated_min' => $data['estimatedMin'] ?? null,
            'estimated_max' => $data['estimatedMax'] ?? null,
            'estimated_days' => $data['estimatedDays'] ?? null,
        ], fn ($v) => $v !== null);
    }

    /* ---------------------------------- نظر ---------------------------------- */

    public function reviews(): JsonResponse
    {
        return response()->json(ReviewResource::collection(Review::latest()->get())->resolve());
    }

    public function updateReview(Request $request, Review $review): JsonResponse
    {
        $data = $request->validate(['status' => ['required', 'in:pending,approved,rejected']]);

        $review->update($data);
        // میانگین امتیاز کالا فقط از نظرهای تأییدشده ساخته می‌شود
        $review->product->syncReviewStats();

        return response()->json((new ReviewResource($review->fresh()))->resolve());
    }

    /* --------------------------------- تخفیف --------------------------------- */

    public function discounts(): JsonResponse
    {
        return response()->json(
            Discount::with(['products', 'categories', 'users'])->latest()->get()->map(fn (Discount $d) => $d->toApi())
        );
    }

    public function storeDiscount(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:20', 'unique:discounts,code'],
            'type' => ['required', 'in:percent,amount'],
            'value' => ['required', 'integer', 'min:1'],
            'productIds' => ['array'],
            'categoryIds' => ['array'],
            // bail: شناسه‌ی غیرعددی نباید به کوئری روی ستون bigint برسد
            'categoryIds.*' => ['bail', 'integer', 'exists:categories,id'],
            'userIds' => ['array'],
            'userIds.*' => ['bail', 'integer', 'exists:users,id'],
            'startsAt' => ['required', 'date'],
            // کدی که پایانش گذشته هیچ‌وقت فعال نمی‌شد
            'endsAt' => ['required', 'date', 'after:startsAt', 'after:now'],
            'usageLimit' => ['integer', 'min:0'],
        ], [
            // نام فیلدها در پیام پیش‌فرض انگلیسی می‌ماند («ends at باید بعد از now باشد»)
            'endsAt.after' => 'زمان پایان باید بعد از شروع و در آینده باشد',
        ]);

        $discount = Discount::create([
            'code' => $data['code'],
            'type' => $data['type'],
            'value' => $data['value'],
            'starts_at' => $data['startsAt'],
            'ends_at' => $data['endsAt'],
            'usage_limit' => $data['usageLimit'] ?? 0,
            'active' => true,
        ]);
        $discount->products()->sync($data['productIds'] ?? []);
        $discount->categories()->sync($data['categoryIds'] ?? []);
        $discount->users()->sync($data['userIds'] ?? []);

        return response()->json(['id' => (string) $discount->id] + $request->all(), 201);
    }

    public function updateDiscount(Request $request, Discount $discount): JsonResponse
    {
        $data = $request->validate([
            'active' => ['sometimes', 'boolean'],
            'productIds' => ['sometimes', 'array'],
            'categoryIds' => ['sometimes', 'array'],
            'categoryIds.*' => ['bail', 'integer', 'exists:categories,id'],
            'userIds' => ['sometimes', 'array'],
            'userIds.*' => ['bail', 'integer', 'exists:users,id'],
            'usageLimit' => ['sometimes', 'integer', 'min:0'],
        ]);

        $discount->update(array_filter([
            'active' => $data['active'] ?? null,
            'usage_limit' => $data['usageLimit'] ?? null,
        ], fn ($v) => $v !== null));

        if (isset($data['productIds'])) {
            $discount->products()->sync($data['productIds']);
        }

        if (isset($data['categoryIds'])) {
            $discount->categories()->sync($data['categoryIds']);
        }

        if (isset($data['userIds'])) {
            $discount->users()->sync($data['userIds']);
        }

        return response()->json(['id' => (string) $discount->id] + $request->all());
    }

    public function destroyDiscount(Discount $discount): JsonResponse
    {
        $discount->delete();

        return response()->json(['ok' => true]);
    }

    /**
     * فهرست سبک کاربران برای کد تخفیف شخصی. ادمینی که فقط کد تخفیف می‌سازد
     * (مثل ادمین کاتالوگ) به فهرست کامل کاربران دسترسی ندارد؛ اینجا فقط نام و
     * شماره را می‌بیند، نه آدرس و ایمیل. کاربر مسدود قابل انتخاب نیست.
     */
    public function discountCustomers(): JsonResponse
    {
        return response()->json(
            User::where('status', 'active')->orderBy('full_name')->get(['id', 'full_name', 'phone'])
                ->map(fn (User $u) => ['id' => (string) $u->id, 'fullName' => $u->full_name, 'phone' => $u->phone])
        );
    }

    /* --------------------------------- کاربر --------------------------------- */

    public function users(): JsonResponse
    {
        return response()->json(
            UserResource::collection(User::with('addresses')->latest()->get())->resolve()
        );
    }

    /**
     * پرونده‌ی کامل کاربر برای کشوی ویرایش: خود حساب، سفارش‌ها، تعمیرات و چند آمار.
     * پیش‌تر فقط خود کاربر برگردانده می‌شد و کشو تا ابد در حالت بارگذاری می‌ماند.
     */
    public function user(User $user): JsonResponse
    {
        $orders = $user->orders()->latest()->get();
        $repairs = $user->repairRequests()->latest()->get();

        return response()->json([
            'user' => (new UserResource($user->load('addresses')))->resolve(),
            'orders' => $orders->map(fn (Order $order) => [
                'id' => (string) $order->id,
                'code' => $order->code,
                'total' => (int) $order->total,
                'status' => $order->status,
                'paymentStatus' => $order->payment_status,
                'createdAt' => $order->created_at?->toIso8601String(),
            ])->values(),
            'repairs' => $repairs->map(fn (RepairRequest $repair) => [
                'id' => (string) $repair->id,
                'code' => $repair->code,
                'device' => trim($repair->device_brand.' '.$repair->device_model),
                'status' => $repair->status,
                'createdAt' => $repair->created_at?->toIso8601String(),
            ])->values(),
            'stats' => [
                'orderCount' => $orders->count(),
                // سفارش لغوشده خرید حساب نمی‌شود
                'spent' => (int) $orders->where('status', '!=', 'cancelled')->sum('total'),
                'openRepairs' => $repairs->whereNotIn('status', ['completed', 'rejected'])->count(),
            ],
        ]);
    }

    public function storeUser(Request $request): JsonResponse
    {
        $data = $request->validate([
            'fullName' => ['required', 'string', 'max:80'],
            'phone' => ['required', 'string', 'unique:users,phone'],
            'email' => ['nullable', 'email', 'unique:users,email'],
            'role' => ['required', 'in:customer,admin,admin_super'],
            'adminTitle' => ['nullable', 'string', 'max:60'],
            'permissions' => ['array'],
            'status' => ['nullable', 'in:active,inactive,blocked'],
            'password' => ['nullable', 'string', 'min:8'],
        ]);

        $user = User::create([
            'full_name' => $data['fullName'],
            'name' => $data['fullName'],
            'phone' => $data['phone'],
            'email' => $data['email'] ?? null,
            'password' => $data['password'] ?? null,
            'role' => $data['role'],
            'admin_title' => $data['adminTitle'] ?? null,
            'permissions' => $data['role'] === 'admin' ? ($data['permissions'] ?? []) : [],
            'status' => $data['status'] ?? 'active',
        ]);

        return response()->json((new UserResource($user->load('addresses')))->resolve(), 201);
    }

    public function updateUser(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'fullName' => ['sometimes', 'string', 'max:80'],
            'phone' => ['sometimes', 'string', Rule::unique('users', 'phone')->ignore($user->id)],
            'email' => ['sometimes', 'nullable', 'email', Rule::unique('users', 'email')->ignore($user->id)],
            'role' => ['sometimes', 'in:customer,admin,admin_super'],
            'adminTitle' => ['sometimes', 'nullable', 'string', 'max:60'],
            'permissions' => ['sometimes', 'array'],
            'status' => ['sometimes', 'in:active,inactive,blocked'],
        ]);

        $attributes = array_filter([
            'full_name' => $data['fullName'] ?? null,
            'name' => $data['fullName'] ?? null,
            'phone' => $data['phone'] ?? null,
            'role' => $data['role'] ?? null,
            'admin_title' => $data['adminTitle'] ?? null,
            'status' => $data['status'] ?? null,
        ], fn ($v) => $v !== null);

        if (array_key_exists('email', $data)) {
            $attributes['email'] = $data['email'];
        }

        if (array_key_exists('permissions', $data)) {
            // فهرست دسترسی فقط برای نقش admin معنا دارد
            $role = $data['role'] ?? $user->role;
            $attributes['permissions'] = $role === 'admin' ? $data['permissions'] : [];
        }

        $user->update($attributes);

        return response()->json((new UserResource($user->fresh()->load('addresses')))->resolve());
    }

    /**
     * حساب بی‌سابقه واقعاً پاک می‌شود؛ حسابی که سفارش یا تعمیر دارد فقط مسدود
     * می‌شود تا آن سوابق بی‌صاحب نمانند (پایگاه داده هم اجازه‌ی پاک شدنش را
     * نمی‌دهد). پاسخ می‌گوید کدام‌یک رخ داده تا پنل پیام درست بدهد.
     */
    public function destroyUser(Request $request, User $user): JsonResponse
    {
        if ($user->id === $request->user()->id) {
            throw ValidationException::withMessages(['user' => 'حساب خودتان را نمی‌شود حذف کرد']);
        }

        if ($user->role === 'admin_super') {
            throw ValidationException::withMessages(['user' => 'حساب مدیر کل حذف نمی‌شود']);
        }

        if ($user->orders()->exists() || $user->repairRequests()->exists()) {
            $user->update(['status' => 'blocked']);

            return response()->json(['ok' => true, 'deleted' => false]);
        }

        $user->delete();

        return response()->json(['ok' => true, 'deleted' => true]);
    }

    public function admins(): JsonResponse
    {
        $admins = User::with('addresses')->whereIn('role', ['admin', 'admin_super'])->get();

        return response()->json(UserResource::collection($admins)->resolve());
    }

    /* ------------------------------ دسته / برند / برچسب ------------------------ */

    public function categories(): JsonResponse
    {
        return response()->json(Category::withCount('products')->get()->map(fn (Category $c) => [
            'id' => (string) $c->id,
            'parentId' => $c->parent_id ? (string) $c->parent_id : null,
            'slug' => $c->slug,
            'title' => $c->title,
            'icon' => $c->icon,
            'description' => $c->description,
            'specKeys' => $c->spec_keys ?? [],
            'productCount' => $c->products_count,
        ]));
    }

    public function storeCategory(Request $request): JsonResponse
    {
        $data = $request->validate([
            'slug' => ['required', 'string', 'unique:categories,slug'],
            'title' => ['required', 'string', 'max:80'],
            'icon' => ['nullable', 'string', 'max:60'],
            'description' => ['nullable', 'string', 'max:400'],
            'specKeys' => ['array'],
            'parentId' => ['nullable', 'exists:categories,id'],
        ]);

        $this->assertCategoryParent($data['parentId'] ?? null);

        $category = Category::create([
            'parent_id' => $data['parentId'] ?? null,
            'slug' => $data['slug'],
            'title' => $data['title'],
            'icon' => $data['icon'] ?? '',
            'description' => $data['description'] ?? '',
            'spec_keys' => $data['specKeys'] ?? [],
        ]);

        return response()->json(['id' => (string) $category->id] + $request->all(), 201);
    }

    public function updateCategory(Request $request, Category $category): JsonResponse
    {
        $data = $request->validate([
            'slug' => ['sometimes', 'string', Rule::unique('categories', 'slug')->ignore($category->id)],
            'title' => ['sometimes', 'string', 'max:80'],
            'icon' => ['sometimes', 'nullable', 'string', 'max:60'],
            'description' => ['sometimes', 'nullable', 'string', 'max:400'],
            'specKeys' => ['sometimes', 'array'],
            'parentId' => ['sometimes', 'nullable', 'exists:categories,id'],
        ]);

        if (array_key_exists('parentId', $data)) {
            $this->assertCategoryParent($data['parentId'], $category);
        }

        $data = $this->blankNulls($data, ['icon', 'description']);

        // مادرِ null معنی‌دار است («دیگر زیرمجموعه نباشد») و نباید با array_filter بیفتد
        if (array_key_exists('parentId', $data)) {
            $category->parent_id = $data['parentId'];
        }

        $category->update(array_filter([
            'slug' => $data['slug'] ?? null,
            'title' => $data['title'] ?? null,
            'icon' => $data['icon'] ?? null,
            'description' => $data['description'] ?? null,
            'spec_keys' => $data['specKeys'] ?? null,
        ], fn ($v) => $v !== null));

        return response()->json(['id' => (string) $category->id] + $request->all());
    }

    /**
     * قاعده‌های مادر شدن.
     *
     * دو سطح بیشتر نداریم: منوی سایت یک کشوی بازشونده دارد، نه درخت تودرتو.
     * دسته‌ای هم که خودش زیرمجموعه دارد نمی‌تواند زیر دسته‌ی دیگری برود، وگرنه
     * سطح سوم از راه پشتی ساخته می‌شد.
     */
    private function assertCategoryParent(?string $parentId, ?Category $category = null): void
    {
        if (! $parentId) {
            return;
        }

        if ($category && (string) $category->id === (string) $parentId) {
            throw ValidationException::withMessages(['parentId' => 'یک دسته نمی‌تواند مادر خودش باشد']);
        }

        $parent = Category::find($parentId);
        if ($parent?->parent_id) {
            throw ValidationException::withMessages(['parentId' => 'این دسته خودش زیرمجموعه است؛ فقط دسته‌های اصلی می‌توانند مادر باشند']);
        }

        if ($category && Category::where('parent_id', $category->id)->exists()) {
            throw ValidationException::withMessages(['parentId' => 'این دسته خودش زیرمجموعه دارد و نمی‌تواند زیر دسته‌ی دیگری برود']);
        }
    }

    /**
     * دسته‌ی دارای کالا فقط با تصمیم صریح ادمین حذف می‌شود:
     * - delete_products: کالاها هم پاک می‌شوند. سفارش‌های قبلی عنوان و قیمت را جدا
     *   نگه داشته‌اند و دست نمی‌خورند.
     * - detach_products: کالاها بی‌دسته و غیرفعال می‌شوند؛ تا دسته‌ی تازه نگیرند و
     *   دوباره فعال نشوند در فروشگاه نمایش داده نمی‌شوند.
     */
    public function destroyCategory(Request $request, Category $category): JsonResponse
    {
        $data = $request->validate([
            'mode' => ['nullable', 'in:delete_products,detach_products'],
        ]);
        $count = $category->products()->count();

        if ($count > 0 && empty($data['mode'])) {
            return response()->json([
                'message' => 'این دسته کالا دارد؛ مشخص کنید کالاها حذف شوند یا بدون دسته بمانند',
            ], 422);
        }

        // کدهای محدود به این دسته، یا به کالاهایی که همراهش پاک می‌شوند
        $discountIds = DB::table('category_discount')->where('category_id', $category->id)->pluck('discount_id');
        if (($data['mode'] ?? null) === 'delete_products') {
            $discountIds = $discountIds->merge(
                DB::table('discount_product')->whereIn('product_id', $category->products()->select('id'))->pluck('discount_id')
            );
        }

        DB::transaction(function () use ($category, $data, $discountIds) {
            if (($data['mode'] ?? null) === 'delete_products') {
                $category->products()->delete();
            } else {
                // بی‌دسته یعنی غیرفعال: دلیل دیده نشدن در فروشگاه باید در پنل هم پیدا باشد
                $category->products()->update(['category_id' => null, 'status' => 'inactive']);
            }

            $this->forgetCategoryInHome($category->slug);
            $category->delete();
            Discount::deactivateUnscoped($discountIds);
        });

        return response()->json(['ok' => true, 'affected' => $count]);
    }

    /** بخش «دسته‌بندی‌ها»ی صفحه‌ی اصلی نباید به دسته‌ی حذف‌شده لینک بدهد */
    private function forgetCategoryInHome(string $slug): void
    {
        $home = SiteDocument::payloadFor('home');
        if (empty($home['sections'])) {
            return;
        }

        $changed = false;
        foreach ($home['sections'] as &$section) {
            if (($section['type'] ?? null) !== 'category_grid') {
                continue;
            }
            $slugs = $section['props']['categorySlugs'] ?? [];
            $kept = array_values(array_filter($slugs, fn ($s) => $s !== $slug));
            if (count($kept) !== count($slugs)) {
                $section['props']['categorySlugs'] = $kept;
                $changed = true;
            }
        }
        unset($section);

        if ($changed) {
            SiteDocument::store('home', $home);
        }
    }

    public function brands(): JsonResponse
    {
        return response()->json(Brand::withCount('products')->get()->map(fn (Brand $b) => [
            'id' => (string) $b->id,
            'slug' => $b->slug,
            'title' => $b->title,
            'logo' => $b->logo,
            'productCount' => $b->products_count,
        ]));
    }

    public function storeBrand(Request $request): JsonResponse
    {
        $data = $request->validate([
            'slug' => ['required', 'string', 'unique:brands,slug'],
            'title' => ['required', 'string', 'max:80'],
            'logo' => ['nullable', 'string'],
        ]);

        $brand = Brand::create($this->blankNulls($data, ['logo']));

        return response()->json(['id' => (string) $brand->id] + $request->all(), 201);
    }

    public function updateBrand(Request $request, Brand $brand): JsonResponse
    {
        $data = $request->validate([
            'slug' => ['sometimes', 'string', Rule::unique('brands', 'slug')->ignore($brand->id)],
            'title' => ['sometimes', 'string', 'max:80'],
            'logo' => ['sometimes', 'nullable', 'string'],
        ]);

        $brand->update(array_filter($this->blankNulls($data, ['logo']), fn ($v) => $v !== null));

        return response()->json(['id' => (string) $brand->id] + $request->all());
    }

    public function destroyBrand(Brand $brand): JsonResponse
    {
        if ($brand->products()->exists()) {
            return response()->json(['message' => 'این برند کالا دارد و حذف نمی‌شود'], 409);
        }

        $brand->delete();

        return response()->json(['ok' => true]);
    }

    public function tags(): JsonResponse
    {
        return response()->json(Tag::withCount('products')->get()->map(fn (Tag $t) => [
            'id' => (string) $t->id,
            'title' => $t->title,
            'productCount' => $t->products_count,
        ]));
    }

    public function storeTag(Request $request): JsonResponse
    {
        $data = $request->validate(['title' => ['required', 'string', 'max:40', 'unique:tags,title']]);
        $tag = Tag::create($data);

        return response()->json(['id' => (string) $tag->id, 'title' => $tag->title], 201);
    }

    public function updateTag(Request $request, Tag $tag): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:40', Rule::unique('tags', 'title')->ignore($tag->id)],
        ]);

        $tag->update($data);

        return response()->json(['id' => (string) $tag->id, 'title' => $tag->title]);
    }

    public function destroyTag(Tag $tag): JsonResponse
    {
        $tag->delete();

        return response()->json(['ok' => true]);
    }
}
