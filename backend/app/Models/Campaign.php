<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Campaign extends Model
{
    protected $fillable = [
        'subject', 'body', 'cta_label', 'cta_url',
        'status', 'recipients', 'sent_count', 'failed_count', 'sent_at',
    ];

    protected $casts = ['sent_at' => 'datetime'];

    public function sends(): HasMany
    {
        return $this->hasMany(CampaignSend::class);
    }
}
