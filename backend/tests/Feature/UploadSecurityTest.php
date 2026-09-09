<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UploadSecurityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');

        $manager = User::create([
            'name' => 'Organizer',
            'email' => 'org@rhbgroup.com',
            'password' => Hash::make('x'),
            'role' => 'event_organizer',
            'status' => 'active',
        ]);
        Sanctum::actingAs($manager);
    }

    public function test_a_real_image_is_stored_under_a_random_name_with_a_safe_extension(): void
    {
        $res = $this->postJson('/api/media/upload', [
            'file' => UploadedFile::fake()->image('holiday snap.png', 400, 300),
            'folder' => 'event-covers',
        ]);

        $res->assertCreated();
        $url = $res->json('url');

        // Random UUID name + an extension derived from the real image header,
        // never from the (attacker-controlled) client filename.
        $this->assertMatchesRegularExpression('#^/storage/event-covers/[0-9a-f-]{36}\.(png|jpg|webp|gif)$#', $url);
        $this->assertStringNotContainsString('holiday snap', $url);
        Storage::disk('public')->assertExists(str_replace('/storage/', '', $url));
    }

    public function test_a_script_disguised_as_an_image_is_rejected(): void
    {
        $res = $this->postJson('/api/media/upload', [
            'file' => UploadedFile::fake()->createWithContent('avatar.php.png', "<?php echo 'pwned';"),
            'folder' => 'event-covers',
        ]);

        $res->assertStatus(422);
    }

    public function test_folder_is_constrained_to_the_allowed_list(): void
    {
        $res = $this->postJson('/api/media/upload', [
            'file' => UploadedFile::fake()->image('ok.png', 100, 100),
            'folder' => '../../etc',
        ]);

        $res->assertStatus(422);
    }
}
