<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\RepairRequest;
use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;

/**
 * آمار داشبورد پنل.
 *
 * مرزهای ماه شمسی حساب می‌شوند، نه میلادی — وگرنه «این ماه» وسط شهریور می‌پرد.
 */
class StatsController extends Controller
{
    private const OPEN_ORDER_STATUS = ['pending_payment', 'processing', 'packing'];

    private const CLOSED_REPAIR_STATUS = ['completed', 'rejected'];

    public function __invoke(): JsonResponse
    {
        $months = $this->recentPersianMonths(12);

        return response()->json([
            'revenue' => (int) Order::where('payment_status', 'paid')->sum('total'),
            'orderCount' => Order::count(),
            'productCount' => Product::count(),
            'repairCount' => RepairRequest::count(),
            'reviewCount' => Review::count(),
            'openOrders' => Order::whereIn('status', self::OPEN_ORDER_STATUS)->count(),
            'pendingReviews' => Review::where('status', 'pending')->count(),
            'openRepairs' => RepairRequest::whereNotIn('status', self::CLOSED_REPAIR_STATUS)->count(),
            'months' => $this->monthlySales($months),
            'lowStock' => Product::where('stock', '<=', 5)
                ->orderBy('stock')
                ->limit(10)
                ->get()
                ->map(fn (Product $p) => [
                    'id' => (string) $p->id,
                    'slug' => $p->slug,
                    'title' => $p->title,
                    'stock' => (int) $p->stock,
                ]),
            'daily' => $this->dailySales(),
            'topProducts' => Product::orderByDesc('review_count')
                ->limit(5)
                ->get()
                ->map(fn (Product $p) => [
                    'id' => (string) $p->id,
                    'slug' => $p->slug,
                    'title' => $p->title,
                    'image' => $p->images[0] ?? '',
                    'reviewCount' => (int) $p->review_count,
                    'price' => (int) $p->price,
                ]),
        ]);
    }

    /** ابتدای چند ماه شمسی اخیر، از قدیمی به جدید */
    private function recentPersianMonths(int $count): array
    {
        $starts = [];
        $cursor = $this->persianMonthStart(Carbon::now());

        for ($i = 0; $i < $count; $i++) {
            array_unshift($starts, $cursor->copy());
            $cursor = $this->persianMonthStart($cursor->copy()->subDay());
        }

        return $starts;
    }

    private function persianMonthStart(Carbon $from): Carbon
    {
        $date = $from->copy()->startOfDay();

        // حداکثر ۳۱ قدم عقب تا رسیدن به روز اولِ ماه شمسی
        while ($this->persianDay($date) !== 1) {
            $date->subDay();
        }

        return $date;
    }

    private function persianDay(Carbon $date): int
    {
        $formatter = new \IntlDateFormatter(
            'en_US@calendar=persian', \IntlDateFormatter::NONE, \IntlDateFormatter::NONE,
            date_default_timezone_get(), \IntlDateFormatter::TRADITIONAL, 'd'
        );

        return (int) $formatter->format($date);
    }

    private function persianLabel(Carbon $date): string
    {
        $formatter = new \IntlDateFormatter(
            'fa_IR@calendar=persian', \IntlDateFormatter::NONE, \IntlDateFormatter::NONE,
            date_default_timezone_get(), \IntlDateFormatter::TRADITIONAL, 'LLLL yyyy'
        );

        return $formatter->format($date);
    }

    private function monthlySales(array $starts): array
    {
        $rows = [];

        foreach ($starts as $index => $start) {
            $end = $starts[$index + 1] ?? Carbon::now()->addDay()->startOfDay();

            $orders = Order::where('payment_status', 'paid')
                ->whereBetween('created_at', [$start, $end]);

            // درآمد تعمیر به ماهی تعلق دارد که واقعاً تمام شده، نه ماه ثبت درخواست
            $repairs = RepairRequest::where('status', 'completed')
                ->whereBetween('updated_at', [$start, $end]);

            $rows[] = [
                'key' => $start->toDateString(),
                'label' => $this->persianLabel($start),
                'productRevenue' => (int) $orders->clone()->sum('total'),
                'repairRevenue' => (int) $repairs->clone()->sum('final_cost'),
                'orderCount' => $orders->clone()->count(),
                'repairCount' => $repairs->clone()->count(),
            ];
        }

        return $rows;
    }

    private function dailySales(): array
    {
        $rows = [];

        for ($i = 29; $i >= 0; $i--) {
            $day = Carbon::now()->subDays($i)->startOfDay();
            $orders = Order::where('payment_status', 'paid')
                ->whereBetween('created_at', [$day, $day->copy()->endOfDay()]);

            $rows[] = [
                'date' => $day->toDateString(),
                'revenue' => (int) $orders->clone()->sum('total'),
                'orders' => $orders->clone()->count(),
            ];
        }

        return $rows;
    }
}
