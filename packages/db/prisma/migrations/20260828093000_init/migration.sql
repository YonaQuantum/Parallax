CREATE TYPE "UserRole" AS ENUM ('OWNER', 'MODERATOR', 'MEMBER');
CREATE TYPE "ContentType" AS ENUM ('ARTICLE', 'DOC', 'VIDEO', 'NOTE');
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "BodyFormat" AS ENUM ('TIPTAP_JSON', 'MARKDOWN', 'MDX');
CREATE TYPE "ReactionType" AS ENUM ('LIKE', 'THANKS', 'INSIGHTFUL');
CREATE TYPE "MediaProvider" AS ENUM ('LOCAL', 'S3', 'REMOTE_URL');
CREATE TYPE "ExtensionStatus" AS ENUM ('PROPOSED', 'ACTIVE', 'DISABLED');
CREATE TYPE "RelationType" AS ENUM ('REFERENCES', 'BUILDS_ON', 'RELATED', 'SERIES_NEXT');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "name" TEXT,
  "email" TEXT,
  "emailVerified" TIMESTAMP(3),
  "passwordHash" TEXT,
  "image" TEXT,
  "handle" TEXT NOT NULL,
  "bio" TEXT,
  "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Account" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" INTEGER,
  "token_type" TEXT,
  "scope" TEXT,
  "id_token" TEXT,
  "session_state" TEXT,
  CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
  "id" TEXT NOT NULL,
  "sessionToken" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VerificationToken" (
  "identifier" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "Content" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "excerpt" TEXT,
  "body" JSONB NOT NULL,
  "bodyFormat" "BodyFormat" NOT NULL DEFAULT 'TIPTAP_JSON',
  "type" "ContentType" NOT NULL,
  "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
  "coverImage" TEXT,
  "videoUrl" TEXT,
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "viewCount" INTEGER NOT NULL DEFAULT 0,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "authorId" TEXT NOT NULL,
  CONSTRAINT "Content_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Tag" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContentTag" (
  "contentId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  CONSTRAINT "ContentTag_pkey" PRIMARY KEY ("contentId", "tagId")
);

CREATE TABLE "Comment" (
  "id" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "contentId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "parentId" TEXT,
  CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Reaction" (
  "id" TEXT NOT NULL,
  "type" "ReactionType" NOT NULL DEFAULT 'LIKE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "contentId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  CONSTRAINT "Reaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Bookmark" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "contentId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaFile" (
  "id" TEXT NOT NULL,
  "provider" "MediaProvider" NOT NULL DEFAULT 'LOCAL',
  "bucket" TEXT,
  "objectKey" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "byteSize" BIGINT NOT NULL,
  "publicUrl" TEXT,
  "checksum" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "uploaderId" TEXT NOT NULL,
  "contentId" TEXT,
  CONSTRAINT "MediaFile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" TEXT NOT NULL,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommunityExtension" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "manifest" JSONB NOT NULL,
  "status" "ExtensionStatus" NOT NULL DEFAULT 'PROPOSED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "authorId" TEXT NOT NULL,
  CONSTRAINT "CommunityExtension_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContentRelation" (
  "id" TEXT NOT NULL,
  "type" "RelationType" NOT NULL DEFAULT 'RELATED',
  "label" TEXT,
  "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sourceId" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  CONSTRAINT "ContentRelation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_handle_key" ON "User"("handle");
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");
CREATE UNIQUE INDEX "Content_slug_key" ON "Content"("slug");
CREATE INDEX "Content_status_type_publishedAt_idx" ON "Content"("status", "type", "publishedAt");
CREATE INDEX "Content_authorId_idx" ON "Content"("authorId");
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");
CREATE INDEX "Comment_contentId_createdAt_idx" ON "Comment"("contentId", "createdAt");
CREATE UNIQUE INDEX "Reaction_contentId_userId_type_key" ON "Reaction"("contentId", "userId", "type");
CREATE UNIQUE INDEX "Bookmark_contentId_userId_key" ON "Bookmark"("contentId", "userId");
CREATE INDEX "MediaFile_provider_objectKey_idx" ON "MediaFile"("provider", "objectKey");
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");
CREATE UNIQUE INDEX "CommunityExtension_slug_key" ON "CommunityExtension"("slug");
CREATE UNIQUE INDEX "ContentRelation_sourceId_targetId_type_key" ON "ContentRelation"("sourceId", "targetId", "type");
CREATE INDEX "ContentRelation_targetId_idx" ON "ContentRelation"("targetId");

ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Content" ADD CONSTRAINT "Content_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentTag" ADD CONSTRAINT "ContentTag_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentTag" ADD CONSTRAINT "ContentTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MediaFile" ADD CONSTRAINT "MediaFile_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MediaFile" ADD CONSTRAINT "MediaFile_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityExtension" ADD CONSTRAINT "CommunityExtension_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentRelation" ADD CONSTRAINT "ContentRelation_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentRelation" ADD CONSTRAINT "ContentRelation_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
