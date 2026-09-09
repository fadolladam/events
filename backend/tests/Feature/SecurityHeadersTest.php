<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SecurityHeadersTest extends TestCase
{
    use RefreshDatabase;

    public function test_api_responses_carry_the_hardening_headers(): void
    {
        $res = $this->getJson('/api/public/events');

        $res->assertHeader('X-Content-Type-Options', 'nosniff');
        $res->assertHeader('X-Frame-Options', 'DENY');
        $res->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        $this->assertStringContainsString("frame-ancestors 'none'", $res->headers->get('Content-Security-Policy'));
        $this->assertStringContainsString('camera=(self)', $res->headers->get('Permissions-Policy'));
    }

    public function test_hsts_is_only_sent_over_https(): void
    {
        $this->getJson('/api/public/events')->assertHeaderMissing('Strict-Transport-Security');

        config(['app.url' => 'https://events.test']);
        $res = $this->get('https://events.test/api/public/events');
        $res->assertHeader('Strict-Transport-Security');
    }

    public function test_layer_can_be_disabled_by_config(): void
    {
        config(['security.headers_enabled' => false]);

        $this->getJson('/api/public/events')->assertHeaderMissing('Content-Security-Policy');
    }
}
