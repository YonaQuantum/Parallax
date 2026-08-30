-- Rebuild KnowledgeDomain around PARALLAX's six primary content axes.
-- Existing artifacts and sources are preserved and mapped into the new taxonomy.

CREATE TYPE "KnowledgeDomain_new" AS ENUM (
  'CODE',
  'AI_MODELS',
  'GAME_INTERACTION',
  'HARDWARE_EMBEDDED',
  'CREATIVE_MEDIA',
  'SCIENCE_COSMOS',
  'GENERAL'
);

DELETE FROM "DomainClock";

ALTER TABLE "KnowledgeSource" ALTER COLUMN "domain" DROP DEFAULT;
ALTER TABLE "IngestedArtifact" ALTER COLUMN "domain" DROP DEFAULT;

ALTER TABLE "DomainClock"
  ALTER COLUMN "domain" TYPE "KnowledgeDomain_new"
  USING (
    CASE "domain"::text
      WHEN 'CODE' THEN 'CODE'
      WHEN 'GAME' THEN 'GAME_INTERACTION'
      WHEN 'RENDERING' THEN 'CREATIVE_MEDIA'
      WHEN 'MUSIC' THEN 'CREATIVE_MEDIA'
      WHEN 'SPACE' THEN 'SCIENCE_COSMOS'
      WHEN 'SPECTRUM_SCIENCE' THEN 'SCIENCE_COSMOS'
      WHEN 'THOUGHT' THEN 'SCIENCE_COSMOS'
      ELSE 'GENERAL'
    END
  )::"KnowledgeDomain_new";

ALTER TABLE "KnowledgeSource"
  ALTER COLUMN "domain" TYPE "KnowledgeDomain_new"
  USING (
    CASE "domain"::text
      WHEN 'CODE' THEN 'CODE'
      WHEN 'GAME' THEN 'GAME_INTERACTION'
      WHEN 'RENDERING' THEN 'CREATIVE_MEDIA'
      WHEN 'MUSIC' THEN 'CREATIVE_MEDIA'
      WHEN 'SPACE' THEN 'SCIENCE_COSMOS'
      WHEN 'SPECTRUM_SCIENCE' THEN 'SCIENCE_COSMOS'
      WHEN 'THOUGHT' THEN 'SCIENCE_COSMOS'
      ELSE 'GENERAL'
    END
  )::"KnowledgeDomain_new";

ALTER TABLE "IngestedArtifact"
  ALTER COLUMN "domain" TYPE "KnowledgeDomain_new"
  USING (
    CASE "domain"::text
      WHEN 'CODE' THEN 'CODE'
      WHEN 'GAME' THEN 'GAME_INTERACTION'
      WHEN 'RENDERING' THEN 'CREATIVE_MEDIA'
      WHEN 'MUSIC' THEN 'CREATIVE_MEDIA'
      WHEN 'SPACE' THEN 'SCIENCE_COSMOS'
      WHEN 'SPECTRUM_SCIENCE' THEN 'SCIENCE_COSMOS'
      WHEN 'THOUGHT' THEN 'SCIENCE_COSMOS'
      ELSE 'GENERAL'
    END
  )::"KnowledgeDomain_new";

DROP TYPE "KnowledgeDomain";
ALTER TYPE "KnowledgeDomain_new" RENAME TO "KnowledgeDomain";

ALTER TABLE "KnowledgeSource" ALTER COLUMN "domain" SET DEFAULT 'GENERAL';
ALTER TABLE "IngestedArtifact" ALTER COLUMN "domain" SET DEFAULT 'GENERAL';

INSERT INTO "DomainClock" ("id", "domain", "heartbeatSeconds", "enabled", "createdAt", "updatedAt")
VALUES
  ('clock-code', 'CODE', 1800, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('clock-ai-models', 'AI_MODELS', 1800, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('clock-game-interaction', 'GAME_INTERACTION', 2400, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('clock-hardware-embedded', 'HARDWARE_EMBEDDED', 7200, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('clock-creative-media', 'CREATIVE_MEDIA', 3600, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('clock-science-cosmos', 'SCIENCE_COSMOS', 43200, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
