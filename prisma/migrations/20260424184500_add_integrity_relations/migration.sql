-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AgentProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "wikiId" TEXT,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ai_generated',
    "headline" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "tagsJson" TEXT NOT NULL DEFAULT '[]',
    "skillsJson" TEXT NOT NULL DEFAULT '[]',
    "interestsJson" TEXT NOT NULL DEFAULT '[]',
    "offersJson" TEXT NOT NULL DEFAULT '[]',
    "wantsJson" TEXT NOT NULL DEFAULT '[]',
    "icebreakersJson" TEXT NOT NULL DEFAULT '[]',
    "templateKey" TEXT NOT NULL DEFAULT 'default',
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AgentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AgentProfile_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AgentProfile_wikiId_fkey" FOREIGN KEY ("wikiId") REFERENCES "ProfileWiki" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AgentProfile" ("agentId", "bio", "createdAt", "headline", "icebreakersJson", "id", "interestsJson", "offersJson", "publishedAt", "skillsJson", "slug", "status", "tagsJson", "templateKey", "updatedAt", "userId", "visibility", "wantsJson", "wikiId") SELECT "agentId", "bio", "createdAt", "headline", "icebreakersJson", "id", "interestsJson", "offersJson", "publishedAt", "skillsJson", "slug", "status", "tagsJson", "templateKey", "updatedAt", "userId", "visibility", "wantsJson", "wikiId" FROM "AgentProfile";
DROP TABLE "AgentProfile";
ALTER TABLE "new_AgentProfile" RENAME TO "AgentProfile";
CREATE UNIQUE INDEX "AgentProfile_slug_key" ON "AgentProfile"("slug");
CREATE TABLE "new_CardVisit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "visitorUserId" TEXT,
    "source" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CardVisit_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "AgentProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CardVisit_visitorUserId_fkey" FOREIGN KEY ("visitorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CardVisit" ("createdAt", "id", "profileId", "source", "visitorUserId") SELECT "createdAt", "id", "profileId", "source", "visitorUserId" FROM "CardVisit";
DROP TABLE "CardVisit";
ALTER TABLE "new_CardVisit" RENAME TO "CardVisit";
CREATE TABLE "new_RecommendationCandidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "reasonsJson" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecommendationCandidate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecommendationCandidate_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_RecommendationCandidate" ("createdAt", "id", "reasonsJson", "score", "status", "targetUserId", "userId") SELECT "createdAt", "id", "reasonsJson", "score", "status", "targetUserId", "userId" FROM "RecommendationCandidate";
DROP TABLE "RecommendationCandidate";
ALTER TABLE "new_RecommendationCandidate" RENAME TO "RecommendationCandidate";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

