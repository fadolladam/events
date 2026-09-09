<?php

namespace App\Modules\Tickets;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class TicketController extends Controller
{
    public function __construct(
        protected TicketService $ticketService
    ) {}

    public function showPublicByToken(string $token): JsonResponse
    {
        $ticket = Ticket::where('secure_token', $token)
            ->with([
                'registration.participant',
                'event:id,title,short_title,event_code,start_at,end_at,timezone,venue_name,address,city,primary_color,secondary_color',
            ])
            ->first();

        if (! $ticket) {
            return response()->json([
                'message' => 'No digital ticket is available for this link yet. A QR ticket is issued once your registration is confirmed — if you are on the waiting list, you will receive it when a seat opens up.',
            ], 404);
        }

        $qrSvg = $this->ticketService->generateQrSvg($token);

        return response()->json([
            'ticket' => $ticket,
            'qr_svg' => $qrSvg,
        ]);
    }

    public function getQrImage(string $token): Response
    {
        $qrSvg = $this->ticketService->generateQrSvg($token);

        return response($qrSvg, 200, [
            'Content-Type' => 'image/svg+xml',
            'Cache-Control' => 'no-cache, private',
        ]);
    }
}
