CREATE TABLE "UserExternalProject" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "language" TEXT,
    "stars" INTEGER,
    "topics" JSONB,
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "UserExternalProject_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserExternalProject_userId_provider_externalId_key" ON "UserExternalProject"("userId", "provider", "externalId");
CREATE INDEX "UserExternalProject_userId_selected_lastSyncedAt_idx" ON "UserExternalProject"("userId", "selected", "lastSyncedAt");

ALTER TABLE "UserExternalProject" ADD CONSTRAINT "UserExternalProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
