CREATE UNIQUE INDEX "organization_invitations_one_pending_per_email"
  ON "organization_invitations"("organization_id", "email")
  WHERE "accepted_at" IS NULL AND "revoked_at" IS NULL;
