<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductVariant extends Model
{
    protected $fillable = [
        'product_id', 'title', 'color_name', 'color_hex', 'storage', 'price', 'stock', 'position',
    ];

    protected $casts = ['price' => 'integer', 'stock' => 'integer', 'position' => 'integer'];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
