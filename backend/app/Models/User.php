<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /** دسترسی‌های ریز — دقیقاً همان فهرست `Permission` در فرانت */
    public const PERMISSIONS = [
        'dashboard.view',
        'product.manage',
        'category.manage',
        'discount.manage',
        'tag.manage',
        'newsletter.manage',
        'order.manage',
        'repair.manage',
        'review.moderate',
        'user.manage',
        'appearance.manage',
        'settings.manage',
    ];

    protected $fillable = [
        'full_name', 'name', 'email', 'phone', 'password',
        'role', 'admin_title', 'permissions', 'status',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'permissions' => 'array',
        ];
    }

    public function addresses(): HasMany
    {
        return $this->hasMany(Address::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function repairRequests(): HasMany
    {
        return $this->hasMany(RepairRequest::class);
    }

    public function wishlist(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'wishlist_items')->withTimestamps();
    }

    public function isAdmin(): bool
    {
        return in_array($this->role, ['admin', 'admin_super'], true);
    }

    /**
     * مدیر کل همیشه همه‌چیز را دارد و فهرست دسترسی برایش معنا ندارد؛
     * ادمین معمولی فقط همان‌هایی که موقع ساختش انتخاب شده.
     */
    public function can($abilities, $arguments = []): bool
    {
        if (is_string($abilities) && in_array($abilities, self::PERMISSIONS, true)) {
            if ($this->role === 'admin_super') {
                return true;
            }

            return $this->role === 'admin' && in_array($abilities, $this->permissions ?? [], true);
        }

        return parent::can($abilities, $arguments);
    }

    public function stockAlerts(): HasMany
    {
        return $this->hasMany(StockAlert::class);
    }
}
