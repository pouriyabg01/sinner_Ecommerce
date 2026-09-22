<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Http\Resources\ProductResource;
use App\Http\Resources\RepairRequestResource;
use App\Http\Resources\UserResource;
use App\Models\Address;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class MeController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return response()->json((new UserResource($request->user()->load('addresses')))->resolve());
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'fullName' => ['sometimes', 'string', 'max:80'],
            // یکتایی را سرور چک می‌کند تا فرم بتواند خطا را روی همان فیلد نشان دهد
            'phone' => ['sometimes', 'string', Rule::unique('users', 'phone')->ignore($user->id)],
            'email' => ['sometimes', 'nullable', 'email', Rule::unique('users', 'email')->ignore($user->id)],
        ]);

        $user->update(array_filter([
            'full_name' => $data['fullName'] ?? null,
            'name' => $data['fullName'] ?? null,
            'phone' => $data['phone'] ?? null,
            'email' => $data['email'] ?? null,
        ], fn ($value) => $value !== null));

        return response()->json((new UserResource($user->fresh()->load('addresses')))->resolve());
    }

    public function orders(Request $request): JsonResponse
    {
        $orders = $request->user()->orders()->with('items')->latest()->get();

        return response()->json(OrderResource::collection($orders)->resolve());
    }

    public function repairs(Request $request): JsonResponse
    {
        $repairs = $request->user()->repairRequests()->with('issues')->latest()->get();

        return response()->json(RepairRequestResource::collection($repairs)->resolve());
    }

    /**
     * تغییر رمز.
     *
     * حسابی که فقط با کد پیامکی ساخته شده رمزی ندارد و بدون «رمز فعلی» رمز
     * می‌گذارد. بعد از تغییر، بقیه‌ی نشست‌ها بسته می‌شوند: اگر کسی رمز را داشته
     * و وارد شده باشد، باید بیرون بیفتد.
     */
    public function changePassword(Request $request): JsonResponse
    {
        $user = $request->user();
        $hasPassword = (bool) $user->password;

        $data = $request->validate([
            'currentPassword' => [$hasPassword ? 'required' : 'nullable', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed:passwordConfirmation'],
        ]);

        if ($hasPassword && ! Hash::check($data['currentPassword'], $user->password)) {
            throw ValidationException::withMessages(['currentPassword' => 'رمز فعلی درست نیست.']);
        }

        if ($hasPassword && Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages(['password' => 'رمز جدید باید با رمز فعلی فرق داشته باشد.']);
        }

        $user->update(['password' => $data['password']]);

        $current = $user->currentAccessToken();
        $user->tokens()->where('id', '!=', $current?->id ?? 0)->delete();

        return response()->json(['message' => 'رمز عبور تغییر کرد و بقیه‌ی دستگاه‌ها از حساب خارج شدند.']);
    }

    /** فقط کالاهای منتشرشده؛ کالای غیرفعال در لیست می‌ماند و با فعال شدن دوباره برمی‌گردد */
    public function wishlist(Request $request): JsonResponse
    {
        $products = $request->user()->wishlist()
            ->where('products.status', 'active')
            ->whereNotNull('products.category_id')
            ->with(['category', 'brand', 'variants', 'tags'])
            ->orderByPivot('created_at', 'desc')
            ->get();

        return response()->json(ProductResource::collection($products)->resolve());
    }

    public function addToWishlist(Request $request): JsonResponse
    {
        // bail: شناسه‌ی غیرعددی نباید به کوئری exists برسد، پستگرس رویش خطا می‌دهد
        $data = $request->validate(['productId' => ['bail', 'required', 'integer', 'exists:products,id']]);

        $request->user()->wishlist()->syncWithoutDetaching([$data['productId']]);

        return $this->wishlistIds($request);
    }

    public function removeFromWishlist(Request $request, Product $product): JsonResponse
    {
        $request->user()->wishlist()->detach($product->id);

        return $this->wishlistIds($request);
    }

    private function wishlistIds(Request $request): JsonResponse
    {
        return response()->json([
            'productIds' => $request->user()->wishlist()
                ->orderByPivot('created_at', 'desc')
                ->pluck('products.id')
                ->map(fn ($id) => (string) $id)
                ->values(),
        ]);
    }

    /* --------------------------------- آدرس‌ها --------------------------------- */

    /**
     * قواعد دفترچه‌ی آدرس: اولین آدرس خودکار پیش‌فرض می‌شود، در هر لحظه فقط
     * یک پیش‌فرض وجود دارد، و با حذفِ پیش‌فرض جدیدترینِ بعدی جایش را می‌گیرد.
     * هر سه مسیر کل حساب را برمی‌گردانند تا پروفایل و تکمیل سفارش یکجا به‌روز شوند.
     */
    public function storeAddress(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $this->validateAddress($request, partial: false);

        DB::transaction(function () use ($user, $data) {
            $makeDefault = ($data['isDefault'] ?? false) || ! $user->addresses()->exists();
            if ($makeDefault) {
                $user->addresses()->update(['is_default' => false]);
            }
            $user->addresses()->create($this->addressAttributes($data) + ['is_default' => $makeDefault]);
        });

        return $this->account($user);
    }

    public function updateAddress(Request $request, Address $address): JsonResponse
    {
        $user = $request->user();
        // آدرس دیگران برای این کاربر اصلاً وجود ندارد
        if ($address->user_id !== $user->id) {
            return response()->json(['message' => 'آدرس پیدا نشد'], 404);
        }

        $data = $this->validateAddress($request, partial: true);

        DB::transaction(function () use ($user, $address, $data) {
            // فقط «پیش‌فرض کن» پذیرفته می‌شود؛ برداشتنش یعنی حسابِ بی‌پیش‌فرض
            if (($data['isDefault'] ?? false) === true) {
                $user->addresses()->whereKeyNot($address->id)->update(['is_default' => false]);
                $address->is_default = true;
            }
            $address->fill($this->addressAttributes($data))->save();
        });

        return $this->account($user);
    }

    public function destroyAddress(Request $request, Address $address): JsonResponse
    {
        $user = $request->user();
        if ($address->user_id !== $user->id) {
            return response()->json(['message' => 'آدرس پیدا نشد'], 404);
        }

        DB::transaction(function () use ($user, $address) {
            $wasDefault = $address->is_default;
            $address->delete();

            if ($wasDefault) {
                $user->addresses()->latest('id')->first()?->update(['is_default' => true]);
            }
        });

        return $this->account($user);
    }

    private function validateAddress(Request $request, bool $partial): array
    {
        // رقم فارسی و عربی به لاتین، تا «۰۹۱۲…» و «09 12…» هر دو پذیرفته شوند
        foreach (['phone', 'postalCode'] as $field) {
            if (is_string($request->input($field))) {
                $request->merge([$field => preg_replace('/[\s\-]/u', '', $this->latinDigits($request->input($field)))]);
            }
        }

        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'title' => [$required, 'string', 'max:40'],
            'receiver' => [$required, 'string', 'max:80'],
            'phone' => [$required, 'string', 'regex:/^09\d{9}$/'],
            'province' => [$required, 'string', 'max:40'],
            'city' => [$required, 'string', 'max:60'],
            'postalCode' => [$required, 'string', 'regex:/^\d{10}$/'],
            'line' => [$required, 'string', 'min:10', 'max:300'],
            'isDefault' => ['sometimes', 'boolean'],
        ]);
    }

    private function latinDigits(string $value): string
    {
        return strtr($value, [
            '۰' => '0', '۱' => '1', '۲' => '2', '۳' => '3', '۴' => '4', '۵' => '5', '۶' => '6', '۷' => '7', '۸' => '8', '۹' => '9',
            '٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4', '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9',
        ]);
    }

    private function addressAttributes(array $data): array
    {
        $map = [
            'title' => 'title', 'receiver' => 'receiver', 'phone' => 'phone', 'province' => 'province',
            'city' => 'city', 'postalCode' => 'postal_code', 'line' => 'line',
        ];

        $attributes = [];
        foreach ($map as $input => $column) {
            if (array_key_exists($input, $data)) {
                $attributes[$column] = $data[$input];
            }
        }

        return $attributes;
    }

    private function account(User $user): JsonResponse
    {
        return response()->json((new UserResource($user->fresh()->load('addresses')))->resolve());
    }
}
