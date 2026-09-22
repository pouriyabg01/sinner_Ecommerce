<?php

namespace App\Services\Payment;

use RuntimeException;

/** خطای قابل نمایش به مشتری؛ پیامش مستقیم در صفحه‌ی تسویه دیده می‌شود */
class GatewayException extends RuntimeException {}
