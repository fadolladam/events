<?php

namespace App\Modules\Media;

use App\Http\Controllers\Controller;
use App\Modules\Audit\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class MediaController extends Controller
{
    /** Detected MIME → the only extension we will ever write. */
    private const ALLOWED = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
    ];

    private const MAX_DIMENSION = 6000;

    /**
     * Accept an image from the browser, store it on the public disk under a
     * random server-generated name, and return a root-relative URL.
     *
     * Hardening: the stored extension comes from the *detected* MIME (never the
     * client filename), the bytes must actually decode as an image of an allowed
     * type via getimagesize(), dimensions are sanity-capped, and the filename is
     * a fresh UUID so nothing can be traversed or overwritten.
     */
    public function uploadImage(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'image', 'mimetypes:'.implode(',', array_keys(self::ALLOWED)), 'max:5120'],
            'folder' => ['nullable', 'string', 'in:event-covers,event-banners'],
        ]);

        $file = $request->file('file');

        // getimagesize() reads the real image header — authoritative over both
        // the client filename and the request Content-Type. A renamed script or
        // a spoofed type fails here.
        $info = @getimagesize($file->getRealPath());
        if ($info === false || ($info[0] ?? 0) < 1 || ($info[1] ?? 0) < 1) {
            throw ValidationException::withMessages(['file' => ['That file is not a readable image.']]);
        }

        $mime = (string) ($info['mime'] ?? '');
        if (! isset(self::ALLOWED[$mime])) {
            throw ValidationException::withMessages(['file' => ['Unsupported image type.']]);
        }
        if ($info[0] > self::MAX_DIMENSION || $info[1] > self::MAX_DIMENSION) {
            throw ValidationException::withMessages(['file' => ['Image is too large; max '.self::MAX_DIMENSION.'px per side.']]);
        }

        $folder = $request->input('folder', 'event-covers');
        $name = Str::uuid()->toString().'.'.self::ALLOWED[$mime];

        $path = $file->storeAs($folder, $name, 'public');

        AuditService::log(
            action: 'media_uploaded',
            entityType: 'Media',
            entityId: $path,
            newValue: ['size' => $file->getSize(), 'mime' => $mime, 'width' => $info[0], 'height' => $info[1]]
        );

        return response()->json([
            'path' => $path,
            'url' => '/storage/'.$path,
        ], 201);
    }
}
