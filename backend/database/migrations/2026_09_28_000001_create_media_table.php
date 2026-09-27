<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

/**
 * کتابخانه‌ی تصویرهای سایت.
 *
 * تا امروز هر آپلود فقط یک فایل روی دیسک بود و هیچ‌جا ثبت نمی‌شد؛ نه می‌شد دوباره
 * پیدایش کرد، نه فهمید کجا استفاده شده، نه متن جایگزین برایش نوشت. این جدول همان
 * فایل‌ها را صاحب‌دار می‌کند.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('media', function (Blueprint $table) {
            $table->id();
            // مسیر نسبی روی دیسک عمومی؛ یکتا، تا یک فایل دو ردیف نگیرد
            $table->string('path')->unique();
            $table->string('name');
            $table->string('title')->default('');
            $table->string('alt')->default('');
            $table->string('caption')->default('');
            $table->string('mime', 60)->default('');
            $table->unsignedBigInteger('size')->default(0);
            $table->unsignedInteger('width')->default(0);
            $table->unsignedInteger('height')->default(0);
            // آپلودکننده فقط برای گزارش؛ حذف حسابش نباید تصویر را ببرد
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();

            $table->index('created_at');
        });

        $this->importExistingFiles();
    }

    /**
     * فایل‌هایی که پیش از ساخت این جدول آپلود شده‌اند هم باید در گالری دیده شوند،
     * وگرنه مدیر با کتابخانه‌ای خالی روبه‌رو می‌شود در حالی که تصویرها روی سایت‌اند.
     */
    private function importExistingFiles(): void
    {
        $disk = Storage::disk('public');

        if (! $disk->exists('uploads')) {
            return;
        }

        foreach ($disk->files('uploads') as $path) {
            $full = $disk->path($path);
            $size = @getimagesize($full);

            DB::table('media')->insert([
                'path' => $path,
                'name' => basename($path),
                'mime' => $size['mime'] ?? (string) $disk->mimeType($path),
                'size' => (int) $disk->size($path),
                'width' => (int) ($size[0] ?? 0),
                'height' => (int) ($size[1] ?? 0),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('media');
    }
};
