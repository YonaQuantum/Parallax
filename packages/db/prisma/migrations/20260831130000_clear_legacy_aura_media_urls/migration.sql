-- Clear legacy AURA media URLs that point to files never uploaded under data/uploads
UPDATE "IdentityCard" SET "avatarUrl" = NULL WHERE "avatarUrl" LIKE '/aura/%';
UPDATE "IdentityCard" SET "cardBackgroundUrl" = NULL WHERE "cardBackgroundUrl" LIKE '/aura/%';
