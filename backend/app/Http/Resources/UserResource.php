<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return array_filter([
            'id' => (string) $this->id,
            'fullName' => $this->full_name,
            'phone' => $this->phone ?? '',
            'email' => $this->email ?? '',
            // حساب ساخته‌شده با کد پیامکی رمز ندارد؛ فرم تغییر رمز «رمز فعلی» نمی‌خواهد
            'hasPassword' => (bool) $this->password,
            'role' => $this->role,
            'adminTitle' => $this->admin_title,
            'permissions' => $this->role === 'admin' ? ($this->permissions ?? []) : null,
            'status' => $this->status,
            'createdAt' => $this->created_at?->toIso8601String(),
            'addresses' => $this->addresses->sortBy([['is_default', 'desc'], ['id', 'desc']])->map(fn ($address) => [
                'id' => (string) $address->id,
                'title' => $address->title,
                'receiver' => $address->receiver,
                'phone' => $address->phone,
                'province' => $address->province,
                'city' => $address->city,
                'postalCode' => $address->postal_code,
                'line' => $address->line,
                'isDefault' => (bool) $address->is_default,
            ])->values()->all(),
        ], fn ($value) => $value !== null);
    }
}
