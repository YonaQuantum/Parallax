-- Rename Aura* → IdentityCard* (preserve existing rows)
ALTER TABLE "AuraIdentity" RENAME TO "IdentityCard";

ALTER TYPE "AuraCardVariant" RENAME TO "IdentityCardVariant";
ALTER TYPE "AuraIdentityStatus" RENAME TO "IdentityCardStatus";

-- Migrate serial prefix AURA- → PX- and unify generationVersion
UPDATE "IdentityCard" SET "serial" = 'PX-' || substring("serial" from 6) WHERE "serial" LIKE 'AURA-%';
UPDATE "IdentityCard" SET "generationVersion" = 'identity-card-v1';
