<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class NewsletterSubscriber extends Model
{
    protected $fillable = ['email', 'token', 'status', 'confirmed_at', 'unsubscribed_at'];

    protected $casts = [
        'confirmed_at' => 'datetime',
        'unsubscribed_at' => 'datetime',
    ];

    public static function newToken(): string
    {
        return Str::random(48);
    }

    /** تنها کسانی که تأیید کرده‌اند و لغو نکرده‌اند اطلاع‌رسانی می‌گیرند */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }
}
