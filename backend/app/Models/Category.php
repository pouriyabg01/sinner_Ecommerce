<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    protected $fillable = ['parent_id', 'slug', 'title', 'icon', 'description', 'spec_keys'];

    protected $casts = ['spec_keys' => 'array'];

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    /**
     * شناسه‌ی خودِ دسته به‌همراه زیردسته‌هایش.
     *
     * فیلتر فروشگاه روی دسته‌ی مادر باید کالای زیردسته‌ها را هم بیاورد، وگرنه
     * «لپ‌تاپ» خالی دیده می‌شود در حالی که همه‌ی کالاها زیر «لپ‌تاپ گیمینگ»اند.
     */
    public static function branchIds(self $category): array
    {
        return [$category->id, ...self::where('parent_id', $category->id)->pluck('id')->all()];
    }
}
