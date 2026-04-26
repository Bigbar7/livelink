-- Prepared only. Do not run without explicit confirmation.
--
-- This deletes all rows in "User". The Prisma schema defines cascading
-- foreign keys from User to the related user-data tables, so Agent,
-- SourceDocument, ProfileFact, ProfileProject, ProfileWiki, AgentProfile,
-- ConnectionRequest, and RecommendationCandidate rows should be removed by
-- the database. CardVisit rows tied to deleted AgentProfile rows should also
-- cascade through AgentProfile.

BEGIN;

DELETE FROM "User";

SELECT 'User' AS table_name, count(*) FROM "User"
UNION ALL SELECT 'Agent', count(*) FROM "Agent"
UNION ALL SELECT 'SourceDocument', count(*) FROM "SourceDocument"
UNION ALL SELECT 'ProfileFact', count(*) FROM "ProfileFact"
UNION ALL SELECT 'ProfileProject', count(*) FROM "ProfileProject"
UNION ALL SELECT 'ProfileWiki', count(*) FROM "ProfileWiki"
UNION ALL SELECT 'AgentProfile', count(*) FROM "AgentProfile"
UNION ALL SELECT 'ConnectionRequest', count(*) FROM "ConnectionRequest"
UNION ALL SELECT 'CardVisit', count(*) FROM "CardVisit"
UNION ALL SELECT 'RecommendationCandidate', count(*) FROM "RecommendationCandidate"
ORDER BY table_name;

COMMIT;
