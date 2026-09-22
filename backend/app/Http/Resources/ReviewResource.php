<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReviewResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'productId' => (string) $this->product_id,
            'userName' => $this->user_name,
            'rating' => (int) $this->rating,
            'title' => $this->title,
            'body' => $this->body,
            'pros' => $this->pros ?? [],
            'cons' => $this->cons ?? [],
            'createdAt' => $this->created_at?->toIso8601String(),
            'helpfulCount' => (int) $this->helpful_count,
            'notHelpfulCount' => (int) $this->not_helpful_count,
            'status' => $this->status,
            'verifiedPurchase' => (bool) $this->verified_purchase,
        ];
    }
}
