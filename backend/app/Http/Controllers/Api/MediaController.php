<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Media;
use App\Services\Media\MediaLibrary;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * کتابخانه‌ی تصویرها.
 *
 * دسترسی‌اش «هر ادمینی» است نه یک دسترسیِ ریز: کسی که کالا، برند یا صفحه‌ی اصلی
 * را ویرایش می‌کند ناچار باید تصویر هم بگذارد، و دادن دسترسی جدا به همه‌شان فقط
 * یک تیکِ اضافه بود که همیشه باید زده می‌شد.
 */
class MediaController extends Controller
{
    private const PER_PAGE = 60;

    public const SORTS = ['newest', 'oldest', 'name', 'largest'];

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'sort' => ['nullable', Rule::in(self::SORTS)],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $query = Media::query();

        if ($term = trim((string) ($data['search'] ?? ''))) {
            $query->where(fn ($q) => $q->where('name', 'ilike', "%{$term}%")->orWhere('title', 'ilike', "%{$term}%"));
        }

        match ($data['sort'] ?? 'newest') {
            'oldest' => $query->oldest('id'),
            'name' => $query->orderBy('name'),
            'largest' => $query->orderByDesc('size'),
            default => $query->latest('id'),
        };

        $page = $query->paginate(self::PER_PAGE, ['*'], 'page', $data['page'] ?? 1);

        return response()->json([
            'items' => collect($page->items())->map($this->row(...)),
            'total' => $page->total(),
            'page' => $page->currentPage(),
            'lastPage' => $page->lastPage(),
        ]);
    }

    public function store(Request $request, MediaLibrary $library): JsonResponse
    {
        $request->validate(['file' => ['required', 'file', 'image', 'max:2048']]);

        $media = $library->store($request->file('file'), $request->user());

        return response()->json($this->row($media), 201);
    }

    /**
     * جایگزینی خودِ فایل، بدون ساختن ردیف تازه. همه‌ی جاهایی که این تصویر را
     * نشان می‌دهند، نسخه‌ی تازه را می‌بینند — که هدف همین است.
     */
    public function replace(Request $request, Media $medium, MediaLibrary $library): JsonResponse
    {
        $request->validate(['file' => ['required', 'file', 'image', 'max:2048']]);

        $updated = $library->replace($medium, $request->file('file'), $request->user());

        return response()->json(['item' => $this->row($medium->fresh()), 'updated' => $updated]);
    }

    public function update(Request $request, Media $medium): JsonResponse
    {
        $data = $request->validate([
            'title' => ['nullable', 'string', 'max:160'],
            'alt' => ['nullable', 'string', 'max:200'],
            'caption' => ['nullable', 'string', 'max:300'],
        ]);

        $medium->update([
            'title' => trim((string) ($data['title'] ?? '')),
            'alt' => trim((string) ($data['alt'] ?? '')),
            'caption' => trim((string) ($data['caption'] ?? '')),
        ]);

        return response()->json($this->row($medium));
    }

    public function destroy(Request $request, Media $medium, MediaLibrary $library): JsonResponse
    {
        $force = $request->boolean('force');
        $usage = $library->usageCount($medium);

        /*
         * تصویری که جایی از سایت استفاده می‌شود، با حذف شدن آنجا را می‌شکند و
         * برگشتی هم ندارد. پس اول هشدار، و فقط با تأیید صریح حذف.
         */
        if ($usage > 0 && ! $force) {
            return response()->json([
                'message' => 'این تصویر در '.$usage.' جای سایت استفاده شده است',
                'usage' => $usage,
            ], 409);
        }

        $library->delete($medium);

        return response()->json(['ok' => true]);
    }

    private function row(Media $media): array
    {
        return [
            'id' => (string) $media->id,
            'url' => $media->url(),
            'name' => $media->name,
            'title' => $media->title,
            'alt' => $media->alt,
            'caption' => $media->caption,
            'mime' => $media->mime,
            'size' => $media->size,
            'width' => $media->width,
            'height' => $media->height,
            'createdAt' => $media->created_at?->toIso8601String(),
        ];
    }
}
