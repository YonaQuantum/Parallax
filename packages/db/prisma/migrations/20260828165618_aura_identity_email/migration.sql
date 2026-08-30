-- CreateEnum
CREATE TYPE "AuraCardVariant" AS ENUM ('MOON', 'WHITE');

-- CreateEnum
CREATE TYPE "AuraIdentityStatus" AS ENUM ('RESERVED', 'CLAIMED', 'SUSPENDED');

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuraIdentity" (
    "id" TEXT NOT NULL,
    "serial" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "generationVersion" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "quote" TEXT,
    "skills" JSONB NOT NULL,
    "cardVariant" "AuraCardVariant" NOT NULL DEFAULT 'WHITE',
    "status" "AuraIdentityStatus" NOT NULL DEFAULT 'RESERVED',
    "isFounder" BOOLEAN NOT NULL DEFAULT false,
    "avatarUrl" TEXT,
    "cardBackgroundUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,

    CONSTRAINT "AuraIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_email_expiresAt_idx" ON "EmailVerificationToken"("email", "expiresAt");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_userId_usedAt_idx" ON "EmailVerificationToken"("userId", "usedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AuraIdentity_serial_key" ON "AuraIdentity"("serial");

-- CreateIndex
CREATE UNIQUE INDEX "AuraIdentity_code_key" ON "AuraIdentity"("code");

-- CreateIndex
CREATE UNIQUE INDEX "AuraIdentity_userId_key" ON "AuraIdentity"("userId");

-- CreateIndex
CREATE INDEX "AuraIdentity_status_isFounder_idx" ON "AuraIdentity"("status", "isFounder");

-- CreateIndex
CREATE INDEX "AuraIdentity_handle_idx" ON "AuraIdentity"("handle");

-- AddForeignKey
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuraIdentity" ADD CONSTRAINT "AuraIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
