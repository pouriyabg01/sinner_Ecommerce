<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\OtpCode;
use App\Models\SiteDocument;
use App\Models\User;
use App\Services\Mail\MailSender;
use App\Services\Sms\SmsSender;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * ورود با دو روش: کد یک‌بارمصرف پیامکی و رمز عبور.
 *
 * هرکدام از پنل مدیریت جداگانه خاموش/روشن می‌شود، پس هر اندپوینت اول بررسی
 * می‌کند روشش فعال است یا نه — وگرنه خاموش‌کردن در پنل فقط دکمه را از رابط
 * برمی‌داشت و مسیرش همچنان باز می‌ماند.
 */
class AuthController extends Controller
{
    private const OTP_TTL_SECONDS = 120;

    private const OTP_MAX_ATTEMPTS = 5;

    private const RESET_TTL_MINUTES = 60;

    public function methods(): JsonResponse
    {
        return response()->json($this->enabledMethods());
    }

    private function enabledMethods(): array
    {
        $auth = SiteDocument::payloadFor('settings')['auth'] ?? [];

        return [
            'otp' => (bool) ($auth['otp'] ?? true),
            'password' => (bool) ($auth['password'] ?? true),
        ];
    }

    private function ensureEnabled(string $method): void
    {
        if (! $this->enabledMethods()[$method]) {
            abort(403, 'این روش ورود در حال حاضر غیرفعال است');
        }
    }

    public function requestOtp(Request $request): JsonResponse
    {
        $this->ensureEnabled('otp');

        $data = $request->validate(['phone' => ['required', 'string', 'regex:/^09\d{9}$/']]);

        $code = (string) random_int(10000, 99999);

        OtpCode::where('phone', $data['phone'])->whereNull('used_at')->delete();
        OtpCode::create([
            'phone' => $data['phone'],
            // خودِ کد ذخیره نمی‌شود؛ لو رفتن دیتابیس نباید یعنی ورود به حساب‌ها
            'code_hash' => Hash::make($code),
            'expires_at' => now()->addSeconds(self::OTP_TTL_SECONDS),
        ]);

        app(SmsSender::class)->otp($data['phone'], $code);

        return response()->json([
            'expiresIn' => self::OTP_TTL_SECONDS,
            // تا وقتی سرویس پیامک وصل نشده، کد برای تست برمی‌گردد
            'devCode' => app()->environment('production') ? null : $code,
        ]);
    }

    public function verifyOtp(Request $request): JsonResponse
    {
        $this->ensureEnabled('otp');

        $data = $request->validate([
            'phone' => ['required', 'string'],
            'code' => ['required', 'string'],
            'fullName' => ['nullable', 'string', 'max:80'],
        ]);

        $otp = OtpCode::where('phone', $data['phone'])
            ->whereNull('used_at')
            ->latest('id')
            ->first();

        if (! $otp || $otp->expires_at->isPast()) {
            throw ValidationException::withMessages(['code' => 'کد منقضی شده است؛ دوباره درخواست بدهید']);
        }

        if ($otp->attempts >= self::OTP_MAX_ATTEMPTS) {
            throw ValidationException::withMessages(['code' => 'تعداد تلاش‌ها بیش از حد شد؛ کد تازه بگیرید']);
        }

        if (! Hash::check($data['code'], $otp->code_hash)) {
            $otp->increment('attempts');
            throw ValidationException::withMessages(['code' => 'کد واردشده درست نیست']);
        }

        $otp->update(['used_at' => now()]);

        // ورود و ثبت‌نام یک مسیرند: شماره‌ی تازه یعنی حساب تازه
        $user = User::firstOrNew(['phone' => $data['phone']]);
        if (! $user->exists) {
            $user->fill([
                'full_name' => $data['fullName'] ?: 'کاربر جدید',
                'name' => $data['fullName'] ?: 'کاربر جدید',
                'role' => 'customer',
                'status' => 'active',
            ])->save();
        }

        return $this->issueToken($user);
    }

    public function login(Request $request): JsonResponse
    {
        $this->ensureEnabled('password');

        $data = $request->validate([
            'identifier' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('phone', $data['identifier'])
            ->orWhere('email', $data['identifier'])
            ->first();

        if (! $user || ! $user->password || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages(['identifier' => 'شماره/ایمیل یا رمز عبور درست نیست']);
        }

        return $this->issueToken($user);
    }

    public function register(Request $request): JsonResponse
    {
        $this->ensureEnabled('password');

        $data = $request->validate([
            'fullName' => ['required', 'string', 'max:80'],
            'phone' => ['required', 'string', 'regex:/^09\d{9}$/', 'unique:users,phone'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        $user = User::create([
            'full_name' => $data['fullName'],
            'name' => $data['fullName'],
            'phone' => $data['phone'],
            'email' => $data['email'],
            'password' => $data['password'],
            'role' => 'customer',
            'status' => 'active',
        ]);

        return $this->issueToken($user);
    }

    /**
     * «رمزم را فراموش کرده‌ام». لینک بازیابی به ایمیل می‌رود، پس این تنها جایی است
     * که ورود با رمز به ایمیل وابسته می‌شود؛ ورود با کد پیامکی مسیر جداگانه‌ی خودش
     * را دارد و از این دست نمی‌خورد.
     */
    public function forgotPassword(Request $request, MailSender $mail): JsonResponse
    {
        $this->ensureEnabled('password');

        $data = $request->validate(['email' => ['required', 'email']]);

        $user = User::where('email', mb_strtolower(trim($data['email'])))->first();

        if ($user && $user->status !== 'blocked') {
            $token = Str::random(64);

            // خودِ توکن ذخیره نمی‌شود؛ لو رفتن این جدول نباید یعنی گرفتن حساب‌ها
            DB::table('password_reset_tokens')->updateOrInsert(
                ['email' => $user->email],
                ['token' => Hash::make($token), 'created_at' => now()],
            );

            $mail->passwordReset($user, $token, self::RESET_TTL_MINUTES);
        }

        /*
         * پاسخ چه حساب باشد چه نباشد یکی است: وگرنه با همین فرم می‌شد فهمید کدام
         * ایمیل در سایت حساب دارد.
         */
        return response()->json(['ok' => true]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $this->ensureEnabled('password');

        $data = $request->validate([
            'email' => ['required', 'email'],
            'token' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        $email = mb_strtolower(trim($data['email']));
        $row = DB::table('password_reset_tokens')->where('email', $email)->first();
        $expired = $row && Carbon::parse($row->created_at)->addMinutes(self::RESET_TTL_MINUTES)->isPast();

        if (! $row || $expired || ! Hash::check($data['token'], $row->token)) {
            throw ValidationException::withMessages(['token' => 'این لینک معتبر نیست یا منقضی شده است']);
        }

        $user = User::where('email', $email)->firstOrFail();
        $user->update(['password' => $data['password']]);

        DB::table('password_reset_tokens')->where('email', $email)->delete();

        // هرکس با رمز قبلی جایی وارد مانده بیرون می‌رود — نکته‌ی اصلیِ عوض‌کردن رمز همین است
        $user->tokens()->delete();

        return $this->issueToken($user);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->json(['ok' => true]);
    }

    private function issueToken(User $user): JsonResponse
    {
        if ($user->status === 'blocked') {
            throw ValidationException::withMessages(['identifier' => 'این حساب مسدود شده است']);
        }

        return response()->json([
            'token' => $user->createToken('app')->plainTextToken,
            'user' => (new UserResource($user->load('addresses')))->resolve(),
        ]);
    }
}
