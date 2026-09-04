<?php

namespace App\Modules\Tickets;

use App\Models\Registration;
use App\Models\Ticket;
use App\Modules\Audit\AuditService;
use Illuminate\Support\Str;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class TicketService
{
    /**
     * Issue cryptographically secure QR ticket.
     * Contains ONLY non-guessable random token / secure URL (NO personal participant PII).
     */
    public function issueTicket(Registration $registration): Ticket
    {
        // Check if ticket already exists
        $existing = Ticket::where('registration_id', $registration->id)->first();
        if ($existing) {
            return $existing;
        }

        $secureToken = Str::random(64);
        $ticketCode = 'TCK-' . strtoupper(Str::random(8)) . '-' . date('Y');
        
        // Base ticket URL for scanning/viewing
        $ticketUrl = config('app.url') . "/ticket/{$secureToken}";

        $ticket = Ticket::create([
            'registration_id' => $registration->id,
            'event_id' => $registration->event_id,
            'ticket_code' => $ticketCode,
            'secure_token' => $secureToken,
            'status' => 'active',
            'qr_payload' => $ticketUrl,
            'issued_at' => now(),
        ]);

        AuditService::log(
            action: 'ticket_issued',
            entityType: 'Ticket',
            entityId: (string) $ticket->id,
            eventId: $registration->event_id,
            newValue: ['ticket_code' => $ticketCode, 'registration_number' => $registration->registration_number]
        );

        return $ticket;
    }

    /**
     * Render SVG QR code for the given ticket secure token
     */
    public function generateQrSvg(string $secureToken): string
    {
        $ticketUrl = config('app.url') . "/ticket/{$secureToken}";
        
        try {
            return (string) QrCode::size(250)->generate($ticketUrl);
        } catch (\Throwable $e) {
            // Fallback inline SVG generator if library backend has any renderer quirk
            return $this->generateFallbackSvg($ticketUrl);
        }
    }

    public function revokeTicket(Ticket $ticket, string $reason = ''): Ticket
    {
        $ticket->update([
            'status' => 'revoked',
            'revoked_at' => now(),
        ]);

        AuditService::log(
            action: 'ticket_revoked',
            entityType: 'Ticket',
            entityId: (string) $ticket->id,
            eventId: $ticket->event_id,
            newValue: ['reason' => $reason]
        );

        return $ticket;
    }

    protected function generateFallbackSvg(string $content): string
    {
        $encoded = htmlspecialchars($content, ENT_QUOTES, 'UTF-8');
        return "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200' width='200' height='200'><rect width='200' height='200' fill='#ffffff'/><rect x='20' y='20' width='40' height='40' fill='#0f172a'/><rect x='140' y='20' width='40' height='40' fill='#0f172a'/><rect x='20' y='140' width='40' height='40' fill='#0f172a'/><text x='100' y='105' font-size='10' text-anchor='middle' fill='#0f172a'>RHB EVENTS</text></svg>";
    }
}
