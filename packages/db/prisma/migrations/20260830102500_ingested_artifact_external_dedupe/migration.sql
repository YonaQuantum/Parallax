-- Avoid repeated homepage signals when the same agent sees the same external item again.
CREATE UNIQUE INDEX "IngestedArtifact_agentId_externalId_key" ON "IngestedArtifact"("agentId", "externalId");
