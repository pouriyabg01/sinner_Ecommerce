<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * سند محتوای سایت: `home`، `about` و `settings`.
 * همیشه یکجا خوانده و یکجا نوشته می‌شود، پس کل سند در یک ستون jsonb می‌نشیند.
 */
class SiteDocument extends Model
{
    protected $primaryKey = 'key';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['key', 'payload'];

    protected $casts = ['payload' => 'array'];

    public static function payloadFor(string $key, array $fallback = []): array
    {
        return static::find($key)?->payload ?? $fallback;
    }

    public static function store(string $key, array $payload): array
    {
        $payload['updatedAt'] = now()->toIso8601String();
        static::updateOrCreate(['key' => $key], ['payload' => $payload]);

        return $payload;
    }
}
