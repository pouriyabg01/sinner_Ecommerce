<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StockAlert;
use App\Services\StockAlerts;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** «موجود شد خبرم کن» از دید مشتری */
class StockAlertController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $alerts = $request->user()->stockAlerts()->with('product.variants')->latest()->get()
            ->filter(fn (StockAlert $alert) => $alert->product !== null)
            ->map(fn (StockAlert $alert) => $this->present($alert))
            ->values();

        return response()->json($alerts);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'productId' => ['bail', 'required', 'integer', 'exists:products,id'],
            'variantTitle' => ['nullable', 'string', 'max:120'],
        ]);
        $user = $request->user();

        // زدن دوباره بعد از یک بار خبر گرفتن، اطلاع‌رسانی را از نو فعال می‌کند
        $alert = StockAlert::updateOrCreate(
            ['user_id' => $user->id, 'product_id' => $data['productId'], 'variant_title' => $data['variantTitle'] ?? ''],
            ['phone' => $user->phone ?? '', 'notified_at' => null],
        );

        return response()->json($this->present($alert->load('product.variants')), 201);
    }

    public function destroy(Request $request, StockAlert $stockAlert): JsonResponse
    {
        abort_unless($stockAlert->user_id === $request->user()->id, 404);
        $stockAlert->delete();

        return response()->json(['ok' => true]);
    }

    private function present(StockAlert $alert): array
    {
        $product = $alert->product;
        $visible = $product->status === 'active' && $product->category_id !== null;

        return [
            'id' => (string) $alert->id,
            'productId' => (string) $product->id,
            'slug' => $product->slug,
            'title' => $product->title,
            'image' => $product->images[0] ?? '',
            'variantTitle' => $alert->variant_title,
            'available' => $visible && StockAlerts::isAvailable($product, $alert->variant_title),
            'notifiedAt' => $alert->notified_at?->toIso8601String(),
            'createdAt' => $alert->created_at?->toIso8601String(),
        ];
    }
}
