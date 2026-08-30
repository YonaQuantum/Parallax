-- CreateEnum
CREATE TYPE "AgentResidentStatus" AS ENUM ('ACTIVE', 'STANDBY', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "AgentTaskStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUSPENDED', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AgentTaskPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "AgentSignalSeverity" AS ENUM ('INFO', 'NOTICE', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "KnowledgeDomain" AS ENUM ('CODE', 'GAME', 'RENDERING', 'MUSIC', 'SPACE', 'SPECTRUM_SCIENCE', 'GENERAL');

-- CreateEnum
CREATE TYPE "KnowledgeStreamKind" AS ENUM ('SYNTAX', 'SYMBOL', 'SEMANTIC', 'BINARY', 'TIMESERIES', 'COORDINATE');

-- CreateEnum
CREATE TYPE "KnowledgeInterference" AS ENUM ('CLEAR', 'GRAY_NOISE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "MemoryLayer" AS ENUM ('WORKING', 'WARM', 'DEEP_ARCHIVE');

-- DropIndex
DROP INDEX "AuraIdentity_handle_idx";

-- CreateTable
CREATE TABLE "AgentResident" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "AgentResidentStatus" NOT NULL DEFAULT 'STANDBY',
    "scopes" JSONB,
    "config" JSONB,
    "heartbeatSeconds" INTEGER NOT NULL DEFAULT 30,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "AgentResident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentMemory" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "layer" "MemoryLayer" NOT NULL DEFAULT 'WORKING',
    "focus" JSONB NOT NULL,
    "summary" TEXT,
    "attentionScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "lastActivatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "agentId" TEXT NOT NULL,

    CONSTRAINT "AgentMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainClock" (
    "id" TEXT NOT NULL,
    "domain" "KnowledgeDomain" NOT NULL,
    "heartbeatSeconds" INTEGER NOT NULL DEFAULT 3600,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "cursor" JSONB,
    "lastTickAt" TIMESTAMP(3),
    "nextTickAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DomainClock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CanvasSnapshot" (
    "id" TEXT NOT NULL,
    "boardKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "CanvasSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeSource" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "sourceType" TEXT NOT NULL,
    "domain" "KnowledgeDomain" NOT NULL DEFAULT 'GENERAL',
    "trustScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "interference" "KnowledgeInterference" NOT NULL DEFAULT 'CLEAR',
    "lastFetchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestedArtifact" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "domain" "KnowledgeDomain" NOT NULL DEFAULT 'GENERAL',
    "interference" "KnowledgeInterference" NOT NULL DEFAULT 'CLEAR',
    "qualityScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "heat" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "rawDigest" TEXT NOT NULL,
    "metadata" JSONB,
    "freshnessUntil" TIMESTAMP(3),
    "deepArchivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "agentId" TEXT,
    "sourceId" TEXT,

    CONSTRAINT "IngestedArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeStream" (
    "id" TEXT NOT NULL,
    "kind" "KnowledgeStreamKind" NOT NULL,
    "content" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "tokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "artifactId" TEXT NOT NULL,

    CONSTRAINT "KnowledgeStream_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DerivedSkeleton" (
    "id" TEXT NOT NULL,
    "kind" "KnowledgeStreamKind" NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "artifactId" TEXT NOT NULL,

    CONSTRAINT "DerivedSkeleton_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentTask" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "AgentTaskStatus" NOT NULL DEFAULT 'QUEUED',
    "priority" "AgentTaskPriority" NOT NULL DEFAULT 'NORMAL',
    "payload" JSONB NOT NULL,
    "conclusion" JSONB,
    "error" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "agentId" TEXT,
    "createdById" TEXT,

    CONSTRAINT "AgentTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentResourceSample" (
    "id" TEXT NOT NULL,
    "fps" DOUBLE PRECISION,
    "cpuLoad" DOUBLE PRECISION,
    "memoryPressure" DOUBLE PRECISION,
    "gpuLoad" DOUBLE PRECISION,
    "batteryLevel" DOUBLE PRECISION,
    "loadScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "suggestedMode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agentId" TEXT NOT NULL,

    CONSTRAINT "AgentResourceSample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentSignal" (
    "id" TEXT NOT NULL,
    "severity" "AgentSignalSeverity" NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "body" TEXT,
    "payload" JSONB,
    "expiresAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agentId" TEXT,

    CONSTRAINT "AgentSignal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentResident_slug_key" ON "AgentResident"("slug");

-- CreateIndex
CREATE INDEX "AgentResident_status_lastSeenAt_idx" ON "AgentResident"("status", "lastSeenAt");

-- CreateIndex
CREATE INDEX "AgentMemory_agentId_layer_lastActivatedAt_idx" ON "AgentMemory"("agentId", "layer", "lastActivatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AgentMemory_agentId_key_key" ON "AgentMemory"("agentId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "DomainClock_domain_key" ON "DomainClock"("domain");

-- CreateIndex
CREATE INDEX "CanvasSnapshot_userId_updatedAt_idx" ON "CanvasSnapshot"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CanvasSnapshot_userId_boardKey_key" ON "CanvasSnapshot"("userId", "boardKey");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeSource_url_key" ON "KnowledgeSource"("url");

-- CreateIndex
CREATE INDEX "KnowledgeSource_domain_interference_idx" ON "KnowledgeSource"("domain", "interference");

-- CreateIndex
CREATE INDEX "IngestedArtifact_domain_heat_createdAt_idx" ON "IngestedArtifact"("domain", "heat", "createdAt");

-- CreateIndex
CREATE INDEX "IngestedArtifact_interference_deepArchivedAt_idx" ON "IngestedArtifact"("interference", "deepArchivedAt");

-- CreateIndex
CREATE INDEX "IngestedArtifact_agentId_createdAt_idx" ON "IngestedArtifact"("agentId", "createdAt");

-- CreateIndex
CREATE INDEX "KnowledgeStream_kind_idx" ON "KnowledgeStream"("kind");

-- CreateIndex
CREATE INDEX "KnowledgeStream_artifactId_kind_idx" ON "KnowledgeStream"("artifactId", "kind");

-- CreateIndex
CREATE INDEX "DerivedSkeleton_kind_createdAt_idx" ON "DerivedSkeleton"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "AgentTask_agentId_status_scheduledAt_idx" ON "AgentTask"("agentId", "status", "scheduledAt");

-- CreateIndex
CREATE INDEX "AgentTask_status_priority_scheduledAt_idx" ON "AgentTask"("status", "priority", "scheduledAt");

-- CreateIndex
CREATE INDEX "AgentResourceSample_agentId_createdAt_idx" ON "AgentResourceSample"("agentId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentSignal_severity_createdAt_idx" ON "AgentSignal"("severity", "createdAt");

-- CreateIndex
CREATE INDEX "AgentSignal_expiresAt_idx" ON "AgentSignal"("expiresAt");

-- AddForeignKey
ALTER TABLE "AgentResident" ADD CONSTRAINT "AgentResident_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentMemory" ADD CONSTRAINT "AgentMemory_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentResident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CanvasSnapshot" ADD CONSTRAINT "CanvasSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestedArtifact" ADD CONSTRAINT "IngestedArtifact_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentResident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestedArtifact" ADD CONSTRAINT "IngestedArtifact_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "KnowledgeSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeStream" ADD CONSTRAINT "KnowledgeStream_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "IngestedArtifact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DerivedSkeleton" ADD CONSTRAINT "DerivedSkeleton_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "IngestedArtifact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentTask" ADD CONSTRAINT "AgentTask_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentResident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentTask" ADD CONSTRAINT "AgentTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentResourceSample" ADD CONSTRAINT "AgentResourceSample_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentResident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentSignal" ADD CONSTRAINT "AgentSignal_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentResident"("id") ON DELETE SET NULL ON UPDATE CASCADE;
