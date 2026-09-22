<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OtpCode extends Model
{
    protected $fillable = ['phone', 'code_hash', 'attempts', 'expires_at', 'used_at'];

    protected $casts = ['expires_at' => 'datetime', 'used_at' => 'datetime', 'attempts' => 'integer'];
}
