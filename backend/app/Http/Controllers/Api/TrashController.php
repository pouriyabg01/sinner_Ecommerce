<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Trash;
use Illuminate\Http\JsonResponse;

class TrashController extends Controller
{
    public function __construct(private readonly Trash $trash) {}

    public function index(): JsonResponse
    {
        return response()->json($this->trash->items());
    }

    public function restore(string $type, string $id): JsonResponse
    {
        $this->trash->restore($type, $id);

        return response()->json(['ok' => true]);
    }

    public function destroy(string $type, string $id): JsonResponse
    {
        $this->trash->purge($type, $id);

        return response()->json(['ok' => true]);
    }

    public function clear(): JsonResponse
    {
        return response()->json(['ok' => true, 'removed' => $this->trash->empty()]);
    }
}
