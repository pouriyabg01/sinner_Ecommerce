<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    protected $fillable = ['slug', 'title', 'icon', 'description', 'spec_keys'];

    protected $casts = ['spec_keys' => 'array'];

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }
}
