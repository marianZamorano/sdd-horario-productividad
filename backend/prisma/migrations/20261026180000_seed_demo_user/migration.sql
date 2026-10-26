-- Usuario de prueba (spec 002 FR-022): demo@horario.app / Demo12345 (hash bcrypt, coste 10).
-- Idempotente: no toca un usuario que ya exista con ese email.
INSERT INTO "User" ("id", "email", "passwordHash", "timezone")
VALUES (
    gen_random_uuid(),
    'demo@horario.app',
    '$2b$10$gvMb6H1hnj3od8aQjqNrWuaC/Jh3K5yiAOCxsbbfVdRPNJVr6Qbwa',
    'UTC'
)
ON CONFLICT ("email") DO NOTHING;
