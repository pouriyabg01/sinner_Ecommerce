<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CampaignSend extends Model
{
    protected $fillable = ['campaign_id', 'subscriber_id', 'status', 'error'];
}
