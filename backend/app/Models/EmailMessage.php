<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmailMessage extends Model
{
    protected $fillable = ['to_address', 'event', 'subject', 'body', 'status', 'mailer', 'error'];
}
