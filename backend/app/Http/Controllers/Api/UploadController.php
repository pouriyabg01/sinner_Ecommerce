<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * آپلود تصویر.
 *
 * بدون این، تصویرها به data URL تبدیل می‌شدند و چند صد کیلوبایت base64 داخل
 * همان JSON تنظیمات ذخیره می‌شد.
 */
class UploadController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'image', 'max:2048'],
        ]);

        $path = $request->file('file')->store('uploads', 'public');

        return response()->json([
            'url' => asset('storage/'.$path),
            'path' => $path,
        ], 201);
    }
}
