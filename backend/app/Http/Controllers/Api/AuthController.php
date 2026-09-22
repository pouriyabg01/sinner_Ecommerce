<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\OtpCode;
use App\Models\SiteDocument;
use App\Models\User;
use App\Services\Sms\SmsSender;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
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
