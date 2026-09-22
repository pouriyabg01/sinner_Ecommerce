<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Discount extends Model
{
    protected $fillable = ['code', 'type', 'value', 'starts_at', 'ends_at', 'usage_limit', 'used_count', 'active'];

    protected $casts = [
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'value' => 'integer',
        'usage_limit' => 'integer',
        'used_count' => 'integer',
        'active' => 'boolean',
    ];

    /**
     * محدودیت کد. کد روی کالایی اعمال می‌شود که یا خودش در این فهرست است یا
     * دسته‌اش در categories؛ هر دو خالی یعنی روی همه‌ی کالاها.
     */
    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class);
    }

    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(Category::class);
    }

    /** کد شخصی: فقط همین کاربران؛ خالی یعنی همه. جدا از محدودیت کالا/دسته سنجیده می‌شود */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class);
    }

    /** مهمان فقط از کدی استفاده می‌کند که مخصوص کسی نیست */
    public function availableTo(?User $user): bool
    {
        return $this->users->isEmpty() || ($user !== null && $this->users->contains($user));
    }

    /**
     * کدی که محدودیتش با حذف کالا یا دسته خالی شده خاموش می‌شود؛ وگرنه فهرست
     * خالی یعنی «همه‌ی کالاها» و کدِ مخصوص یک دسته بی‌صدا روی کل فروشگاه باز
     * می‌شد. شناسه‌ها باید پیش از حذف جمع شوند، چون ردیف‌های واسط همراه حذف پاک
     * می‌شوند.
     */
    public static function deactivateUnscoped(iterable $ids): void
    {
        $ids = collect($ids)->unique()->values();
        if ($ids->isEmpty()) {
            return;
        }

        static::whereIn('id', $ids)
            ->whereDoesntHave('products')
            ->whereDoesntHave('categories')
            ->update(['active' => false]);
    }

    /** شکل پاسخ API — همان `Discount` در `front end/src/types/catalog.ts` */
    public function toApi(): array
    {
        return [
            'id' => (string) $this->id,
            'code' => $this->code,
            'type' => $this->type,
            'value' => (int) $this->value,
            'productIds' => $this->products->map(fn ($p) => (string) $p->id)->values(),
            'categoryIds' => $this->categories->map(fn ($c) => (string) $c->id)->values(),
            'userIds' => $this->users->map(fn ($u) => (string) $u->id)->values(),
            'startsAt' => $this->starts_at->toIso8601String(),
            'endsAt' => $this->ends_at->toIso8601String(),
            'usageLimit' => (int) $this->usage_limit,
            'usedCount' => (int) $this->used_count,
            'active' => (bool) $this->active,
        ];
    }
}
