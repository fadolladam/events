# Seed assets

Static files `DatabaseSeeder` copies into `storage/app/public/` on every seed
run, so a fresh install (Docker, XAMPP, or local) gets the real demo cover
images instead of generic stock photos — no manual upload step needed.

- `event-covers/` — cover images for the seeded Blood Donation Drive and
  Angkor Wat Half Marathon events. Copied to `storage/app/public/event-covers/`
  (not overwritten if a file with the same name already exists there — an
  admin's real upload always wins).

Unlike `storage/app/public/`, this folder **is** tracked in git — it's
source material the seeder reads from, not user-uploaded runtime state.
