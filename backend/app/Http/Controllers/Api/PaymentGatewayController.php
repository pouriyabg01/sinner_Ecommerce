<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Payment\PaymentGateways;
use App\Services\Payment\PaymentGatewaySettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * پنل درگاه پرداخت. فرم از روی {@see PaymentGateways::catalog()} ساخته می‌شود،
 * پس درگاه تازه در پنل ظاهر می‌شود بدون اینکه اینجا یا در فرانت چیزی عوض شود.
 */
class PaymentGatewayController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json(PaymentGatewaySettings::forAdmin());
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'driver' => ['required', Rule::in(array_keys(PaymentGateways::usable()))],
            'credentials' => ['array'],
        ]);

        $driver = $data['driver'];
        $input = $data['credentials'] ?? [];

        // فقط کلیدهای همین درگاه پذیرفته می‌شوند؛ بقیه‌ی ورودی دور ریخته می‌شود
        $rules = [];
        foreach (PaymentGateways::fields($driver) as $field) {
            $rules['credentials.'.$field['key']] = ['nullable', 'string', 'max:4000'];
        }
        foreach (PaymentGateways::toggles($driver) as $toggle) {
            $rules['credentials.'.$toggle['key']] = ['nullable', 'boolean'];
        }
        foreach (PaymentGateways::choices($driver) as $choice) {
            $rules['credentials.'.$choice['key']] = ['nullable', Rule::in(PaymentGateways::choiceValues($driver, $choice['key']))];
        }
        $request->validate($rules);

        PaymentGatewaySettings::save($driver, $input);

        return response()->json(PaymentGatewaySettings::forAdmin());
    }

    /** پاک کردن یک مقدار محرمانه — چون فرستادن خالی یعنی «همان قبلی بماند» */
    public function forget(Request $request): JsonResponse
    {
        $data = $request->validate([
            'driver' => ['required', Rule::in(array_keys(PaymentGateways::usable()))],
            'field' => ['required', 'string'],
        ]);

        if (! in_array($data['field'], PaymentGateways::secretKeys($data['driver']), true)) {
            return response()->json(['message' => 'این فیلد قابل پاک کردن نیست'], 422);
        }

        PaymentGatewaySettings::forget($data['driver'], $data['field']);

        return response()->json(PaymentGatewaySettings::forAdmin());
    }
}
