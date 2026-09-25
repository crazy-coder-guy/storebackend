-- AlterTable
ALTER TABLE "push_notifications" ADD COLUMN "image" TEXT,
ADD COLUMN "actions" JSONB;

-- AlterTable
ALTER TABLE "notification_templates" ADD COLUMN "image" TEXT,
ADD COLUMN "actions" JSONB;
