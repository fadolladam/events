<?php

namespace App\Modules\Media;

use App\Http\Controllers\Controller;
use App\Modules\Audit\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MediaController extends Controller
{
    /**
     * Accept an image file from the browser, store it on the public disk,
     * and return a root-relative URL the frontend can use directly
     * (nginx proxies /storage/ to the backend).
     */
    public function uploadImage(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp,gif', 'max:5120'],
            'folder' => ['nullable', 'string', 'in:event-covers,event-banners'],
        ]);

        $folder = $request->input('folder', 'event-covers');
        $file = $request->file('file');
        $name = Str::uuid()->toString() . '.' . strtolower($file->getClientOriginalExtension() ?: $file->extension());

        $path = $file->storeAs($folder, $name, 'public');

        AuditService::log(
            action: 'media_uploaded',
            entityType: 'Media',
            entityId: $path,
            newValue: ['size' => $file->getSize(), 'mime' => $file->getMimeType()]
        );

        return response()->json([
            'path' => $path,
            'url' => '/storage/' . $path,
        ], 201);
    }
}
