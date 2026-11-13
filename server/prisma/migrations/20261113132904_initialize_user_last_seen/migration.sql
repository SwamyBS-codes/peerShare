UPDATE "User" AS user_record
SET "lastSeenAt" = COALESCE(
  (SELECT MAX(activity."createdAt")
   FROM "Activity" AS activity
   WHERE activity."senderId" = user_record."id"),
  user_record."createdAt"
)
WHERE user_record."lastSeenAt" IS NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "lastSeenAt" SET NOT NULL,
ALTER COLUMN "lastSeenAt" SET DEFAULT CURRENT_TIMESTAMP;
