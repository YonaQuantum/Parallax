-- Clear legacy AURA avatar URLs on User.image that point to files never uploaded
UPDATE "User" SET "image" = NULL WHERE "image" LIKE '/aura/%';
