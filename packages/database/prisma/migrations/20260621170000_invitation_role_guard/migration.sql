ALTER TABLE "organization_invitations"
  ADD CONSTRAINT "organization_invitations_no_active_owner_check"
  CHECK ("proposed_role" <> 'OWNER' OR "revoked_at" IS NOT NULL);
