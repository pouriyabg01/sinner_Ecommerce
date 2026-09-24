<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\CmsController;
use App\Http\Controllers\Api\MailController;
use App\Http\Controllers\Api\MeController;
use App\Http\Controllers\Api\NewsletterController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\PaymentGatewayController;
use App\Http\Controllers\Api\RepairController;
use App\Http\Controllers\Api\SmsController;
use App\Http\Controllers\Api\StatsController;
use App\Http\Controllers\Api\StockAlertController;
use App\Http\Controllers\Api\UploadController;
use Illuminate\Support\Facades\Route;

/**
 * قرارداد این مسیرها از لایه‌ی mock فرانت گرفته شده
 * (`front end/src/mocks/handlers.ts`)، تا سوییچ‌کردن فرانت فقط تغییر
 * دو خط در `.env.local` باشد و هیچ صفحه‌ای دست نخورد.
 */
Route::prefix('v1')->group(function () {
    /* ---------------------------------- ورود ---------------------------------- */
    Route::prefix('auth')->group(function () {
        Route::get('methods', [AuthController::class, 'methods']);
        // سقف تلاش‌ها در AppServiceProvider تعریف شده است
        Route::post('otp/request', [AuthController::class, 'requestOtp'])->middleware('throttle:otp');
        Route::post('otp/verify', [AuthController::class, 'verifyOtp'])->middleware('throttle:login');
        Route::post('login', [AuthController::class, 'login'])->middleware('throttle:login');
        Route::post('register', [AuthController::class, 'register'])->middleware('throttle:login');
        Route::post('password/forgot', [AuthController::class, 'forgotPassword'])->middleware('throttle:login');
        Route::post('password/reset', [AuthController::class, 'resetPassword'])->middleware('throttle:login');
        Route::post('logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
    });

    /* -------------------------------- فروشگاه -------------------------------- */
    Route::get('products', [CatalogController::class, 'index']);
    Route::get('products/{slug}', [CatalogController::class, 'show']);
    Route::get('products/{slug}/reviews', [CatalogController::class, 'reviews']);
    Route::post('products/{slug}/reviews', [CatalogController::class, 'storeReview']);
    Route::post('products/{slug}/reviews/{review}/vote', [CatalogController::class, 'voteReview'])
        ->middleware('throttle:lookup');
    Route::get('compare', [CatalogController::class, 'compare']);
    Route::get('categories', [CatalogController::class, 'categories']);
    Route::get('brands', [CatalogController::class, 'brands']);
    Route::get('tags', [CatalogController::class, 'tags']);

    /* -------------------------------- خبرنامه -------------------------------- */
    Route::prefix('newsletter')->group(function () {
        Route::post('subscribe', [NewsletterController::class, 'subscribe'])->middleware('throttle:lookup');
        // خودِ توکن راز است، پس تأیید و لغو عضویت ورود نمی‌خواهند
        Route::post('confirm/{token}', [NewsletterController::class, 'confirm'])->middleware('throttle:lookup');
        Route::post('unsubscribe/{token}', [NewsletterController::class, 'unsubscribe'])->middleware('throttle:lookup');
    });

    Route::post('discounts/validate', [OrderController::class, 'validateDiscount'])->middleware('throttle:lookup');

    /*
     * بازگشت از بانک. بانک این را بدون کوکی و توکن صدا می‌زند، پس عمومی است؛
     * نتیجه از verify سمت سرور درمی‌آید نه از پارامترهای این درخواست.
     * بعضی درگاه‌ها GET برمی‌گردند و بعضی POST.
     */
    Route::match(['get', 'post'], 'payment/callback/{type}/{code}', [PaymentController::class, 'callback'])
        ->whereIn('type', ['order', 'repair'])
        ->name('payment.callback');

    /* --------------------------------- محتوا --------------------------------- */
    Route::get('cms/home', [CmsController::class, 'home']);
    Route::get('cms/about', [CmsController::class, 'about']);
    Route::get('cms/settings', [CmsController::class, 'settings']);

    /* --------------------------------- تعمیر --------------------------------- */
    Route::get('repair/issues', [RepairController::class, 'issues']);
    Route::post('repair/estimate', [RepairController::class, 'estimate']);
    // پیگیری با کد رهگیری بدون ورود کار می‌کند؛ خود کد راز است
    Route::get('repair/requests/{code}', [RepairController::class, 'track'])->middleware('throttle:lookup');

    /* ------------------------------ نیازمند ورود ------------------------------ */
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('me', [MeController::class, 'show']);
        Route::patch('me', [MeController::class, 'update']);
        Route::get('me/orders', [MeController::class, 'orders']);
        Route::get('me/stock-alerts', [StockAlertController::class, 'index']);
        Route::post('me/stock-alerts', [StockAlertController::class, 'store']);
        Route::delete('me/stock-alerts/{stockAlert}', [StockAlertController::class, 'destroy'])->whereNumber('stockAlert');
        Route::get('me/repairs', [MeController::class, 'repairs']);
        Route::patch('me/password', [MeController::class, 'changePassword']);
        Route::post('me/addresses', [MeController::class, 'storeAddress']);
        Route::patch('me/addresses/{address}', [MeController::class, 'updateAddress'])->whereNumber('address');
        Route::delete('me/addresses/{address}', [MeController::class, 'destroyAddress'])->whereNumber('address');
        Route::get('me/wishlist', [MeController::class, 'wishlist']);
        Route::post('me/wishlist', [MeController::class, 'addToWishlist']);
        Route::delete('me/wishlist/{product}', [MeController::class, 'removeFromWishlist'])->whereNumber('product');

        Route::post('orders', [OrderController::class, 'store']);
        Route::get('orders/{code}', [OrderController::class, 'show']);
        /*
         * پرداخت هم برای سفارش فروشگاه است و هم برای هزینه‌ی تعمیر، پس نوع در
         * خود مسیر می‌آید و هر دو از یک درگاه و یک منطق تأیید رد می‌شوند.
         */
        Route::post('pay/{type}/{code}', [PaymentController::class, 'start'])
            ->whereIn('type', ['order', 'repair']);
        Route::post('pay/{type}/{code}/demo', [PaymentController::class, 'demo'])
            ->whereIn('type', ['order', 'repair']);

        // تأیید یا ردِ برآورد هزینه‌ی تعمیر — تنها راهِ رسیدن به مرحله‌ی پرداخت
        Route::post('repair/requests/{code}/decide', [RepairController::class, 'decide']);

        Route::post('repair/requests', [RepairController::class, 'store']);

        Route::post('uploads', [UploadController::class, 'store']);
    });

    /* ---------------------------------- پنل ---------------------------------- */
    Route::prefix('admin')->middleware('auth:sanctum')->group(function () {
        Route::get('stats', StatsController::class)->middleware('permission:dashboard.view');

        Route::middleware('permission:product.manage')->group(function () {
            Route::get('products', [AdminController::class, 'products']);
            Route::post('products', [AdminController::class, 'storeProduct']);
            Route::patch('products/{product}', [AdminController::class, 'updateProduct']);
            Route::delete('products/{product}', [AdminController::class, 'destroyProduct']);
        });

        Route::middleware('permission:order.manage')->group(function () {
            Route::get('orders', [AdminController::class, 'orders']);
            Route::patch('orders/{order}', [AdminController::class, 'updateOrder']);
        });

        Route::middleware('permission:repair.manage')->group(function () {
            Route::get('repairs', [AdminController::class, 'repairs']);
            // نام پارامتر باید با امضای متد (RepairRequest $repair) یکی باشد، وگرنه binding مدل خالی می‌سازد
            Route::patch('repairs/{repair}', [AdminController::class, 'updateRepair']);
            Route::get('repair-issues', [AdminController::class, 'repairIssues']);
            Route::post('repair-issues', [AdminController::class, 'storeRepairIssue']);
            Route::patch('repair-issues/{repairIssue}', [AdminController::class, 'updateRepairIssue']);
            Route::delete('repair-issues/{repairIssue}', [AdminController::class, 'destroyRepairIssue']);
        });

        Route::middleware('permission:review.moderate')->group(function () {
            Route::get('reviews', [AdminController::class, 'reviews']);
            Route::patch('reviews/{review}', [AdminController::class, 'updateReview']);
        });

        Route::middleware('permission:discount.manage')->group(function () {
            Route::get('discounts', [AdminController::class, 'discounts']);
            Route::get('discounts/customers', [AdminController::class, 'discountCustomers']);
            Route::post('discounts', [AdminController::class, 'storeDiscount']);
            Route::patch('discounts/{discount}', [AdminController::class, 'updateDiscount']);
            Route::delete('discounts/{discount}', [AdminController::class, 'destroyDiscount']);
        });

        Route::middleware('permission:user.manage')->group(function () {
            Route::get('users', [AdminController::class, 'users']);
            Route::get('users/{user}', [AdminController::class, 'user']);
            Route::post('users', [AdminController::class, 'storeUser']);
            Route::patch('users/{user}', [AdminController::class, 'updateUser']);
            Route::delete('users/{user}', [AdminController::class, 'destroyUser']);
            Route::get('admins', [AdminController::class, 'admins']);
            Route::post('admins', [AdminController::class, 'storeUser']);
            Route::delete('admins/{user}', [AdminController::class, 'destroyUser']);
        });

        Route::middleware('permission:category.manage')->group(function () {
            Route::get('categories', [AdminController::class, 'categories']);
            Route::post('categories', [AdminController::class, 'storeCategory']);
            Route::patch('categories/{category}', [AdminController::class, 'updateCategory']);
            Route::delete('categories/{category}', [AdminController::class, 'destroyCategory']);
            Route::get('brands', [AdminController::class, 'brands']);
            Route::post('brands', [AdminController::class, 'storeBrand']);
            Route::patch('brands/{brand}', [AdminController::class, 'updateBrand']);
            Route::delete('brands/{brand}', [AdminController::class, 'destroyBrand']);
        });

        Route::middleware('permission:settings.manage')->group(function () {
            Route::get('payment-gateway', [PaymentGatewayController::class, 'show']);
            Route::put('payment-gateway', [PaymentGatewayController::class, 'update']);
            Route::delete('payment-gateway/field', [PaymentGatewayController::class, 'forget']);

            Route::get('sms', [SmsController::class, 'show']);
            Route::put('sms', [SmsController::class, 'update']);
            Route::post('sms/test', [SmsController::class, 'test'])->middleware('throttle:lookup');
            Route::get('sms/messages', [SmsController::class, 'messages']);

            Route::get('mail', [MailController::class, 'show']);
            Route::put('mail', [MailController::class, 'update']);
            Route::post('mail/test', [MailController::class, 'test'])->middleware('throttle:lookup');
            Route::get('mail/messages', [MailController::class, 'messages']);
        });

        Route::middleware('permission:newsletter.manage')->prefix('newsletter')->group(function () {
            Route::get('subscribers', [NewsletterController::class, 'subscribers']);
            Route::delete('subscribers/{subscriber}', [NewsletterController::class, 'destroySubscriber'])->whereNumber('subscriber');
            Route::get('campaigns', [NewsletterController::class, 'campaigns']);
            Route::post('campaigns', [NewsletterController::class, 'storeCampaign']);
            Route::patch('campaigns/{campaign}', [NewsletterController::class, 'updateCampaign'])->whereNumber('campaign');
            Route::delete('campaigns/{campaign}', [NewsletterController::class, 'destroyCampaign'])->whereNumber('campaign');
            Route::post('campaigns/{campaign}/test', [NewsletterController::class, 'testCampaign'])->whereNumber('campaign');
            Route::post('campaigns/{campaign}/send', [NewsletterController::class, 'sendCampaign'])->whereNumber('campaign');
        });

        Route::middleware('permission:tag.manage')->group(function () {
            Route::get('tags', [AdminController::class, 'tags']);
            Route::post('tags', [AdminController::class, 'storeTag']);
            Route::patch('tags/{tag}', [AdminController::class, 'updateTag']);
            Route::delete('tags/{tag}', [AdminController::class, 'destroyTag']);
        });
    });

    /* ذخیره‌ی محتوای سایت — مسیرش عمومی است ولی نوشتنش دسترسی می‌خواهد */
    Route::middleware(['auth:sanctum', 'permission:appearance.manage'])->group(function () {
        Route::put('cms/home', [CmsController::class, 'saveHome']);
        Route::put('cms/about', [CmsController::class, 'saveAbout']);
        Route::put('cms/settings', [CmsController::class, 'saveSettings']);
    });
});
