CREATE TABLE "IngestedArtifactTag" (
    "artifactId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "IngestedArtifactTag_pkey" PRIMARY KEY ("artifactId","tagId")
);

CREATE INDEX "IngestedArtifactTag_tagId_idx" ON "IngestedArtifactTag"("tagId");

ALTER TABLE "IngestedArtifactTag" ADD CONSTRAINT "IngestedArtifactTag_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "IngestedArtifact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IngestedArtifactTag" ADD CONSTRAINT "IngestedArtifactTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
