-- Ensure all isPlatformAdmin=true users have role='admin'
UPDATE "User" SET "role" = 'admin' WHERE "isPlatformAdmin" = true AND ("role" IS NULL OR "role" != 'admin');

-- Ensure all users have a role value (fill nulls)
UPDATE "User" SET "role" = 'user' WHERE "role" IS NULL;
