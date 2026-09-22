<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Review extends Model
{
    protected $fillable = [
        'product_id', 'user_id', 'user_name', 'rating', 'title', 'body',
        'pros', 'cons', 'helpful_count', 'not_helpful_count', 'status', 'verified_purchase',
    ];

    protected $casts = [
        'pros' => 'array',
        'cons' => 'array',
        'rating' => 'integer',
        'helpful_count' => 'integer',
        'not_helpful_count' => 'integer',
        'verified_purchase' => 'boolean',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
