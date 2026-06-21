ALTER TABLE "organizations"
  ADD COLUMN "locale" VARCHAR(16);

UPDATE "organizations"
SET "locale" = 'en-US'
WHERE "slug" IS NOT NULL
  AND "time_zone" IS NOT NULL
  AND "locale" IS NULL;

ALTER TABLE "organizations"
  ADD CONSTRAINT "organizations_workspace_configuration_check"
  CHECK (
    ("slug" IS NULL AND "time_zone" IS NULL AND "locale" IS NULL)
    OR
    ("slug" IS NOT NULL AND "time_zone" IS NOT NULL AND "locale" = 'en-US')
  );
