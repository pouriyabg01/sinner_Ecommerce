<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class RepairIssue extends Model
{
    protected $fillable = [
        'title', 'hint', 'icon', 'device_kinds', 'estimated_min', 'estimated_max', 'estimated_days',
    ];

    protected $casts = [
        'device_kinds' => 'array',
        'estimated_min' => 'integer',
        'estimated_max' => 'integer',
        'estimated_days' => 'integer',
    ];

    public function requests(): BelongsToMany
    {
        return $this->belongsToMany(RepairRequest::class, 'repair_request_issue');
    }
}
