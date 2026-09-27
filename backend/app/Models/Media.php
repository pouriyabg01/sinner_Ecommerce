<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Media extends Model
{
    // جمعِ media خودش media است و لاراول «medias» می‌سازد
    protected $table = 'media';

    protected $fillable = ['path', 'name', 'title', 'alt', 'caption', 'mime', 'size', 'width', 'height', 'user_id'];

    protected $casts = [
        'size' => 'integer',
        'width' => 'integer',
        'height' => 'integer',
    ];

    /**
     * نشانی نسبی و نه کامل — همان قاعده‌ی آپلود: نشانیِ امروز نباید داخل داده
     * پخته شود، وگرنه با عوض شدن دامنه همه‌ی تصویرها می‌شکنند.
     */
    public function url(): string
    {
        return '/storage/'.$this->path;
    }
}
