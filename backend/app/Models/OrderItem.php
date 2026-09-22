<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItem extends Model
{
    protected $fillable = [
        'order_id', 'product_id', 'product_variant_id', 'title', 'variant_title',
        'image', 'unit_price', 'quantity',
    ];

    protected $casts = ['unit_price' => 'integer', 'quantity' => 'integer'];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
