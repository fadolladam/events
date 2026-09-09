-- Least-privilege database account for RHB Events.
-- The app never needs SUPER, GRANT, FILE, or CREATE USER — only the DML/DDL
-- it uses through migrations. Run this as an admin, then point the app's
-- DB_USERNAME / DB_PASSWORD at `rhb_events_app`.

CREATE DATABASE IF NOT EXISTS events
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Replace the password before running.
CREATE USER IF NOT EXISTS 'rhb_events_app'@'%' IDENTIFIED BY 'REPLACE_WITH_A_STRONG_PASSWORD';

GRANT SELECT, INSERT, UPDATE, DELETE,
      CREATE, ALTER, INDEX, DROP, REFERENCES,
      CREATE TEMPORARY TABLES, LOCK TABLES
  ON events.* TO 'rhb_events_app'@'%';

FLUSH PRIVILEGES;

-- Tighten the host: on a single-box deploy use 'localhost' instead of '%'.
-- Never expose MySQL's 3306 to the public internet — bind it to localhost or a
-- private network only (the bundled docker-compose already does).
