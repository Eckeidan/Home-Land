# Asset Hub — Render deployment

## Services

- `asset-hub-web`: Next.js website/application
- `asset-hub-api`: NestJS API
- Existing Render PostgreSQL database, for example `AssetHub-db`

## Required Render environment values

Set these as secrets in Render, not in Git:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_REQUIRE_TLS=true
SMTP_USER=chrismonga@gmail.com
SMTP_PASSWORD=<gmail-app-password>
EMAIL_FROM=Asset Hub <chrismonga@gmail.com>
CONTACT_TO_EMAIL=chrismonga@gmail.com
MFA_ENCRYPTION_KEY=<32-byte-base64-key>
STRIPE_SECRET_KEY=<stripe-secret-or-placeholder>
STRIPE_WEBHOOK_SECRET=<stripe-webhook-secret-or-placeholder>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<stripe-publishable-or-placeholder>
```

Render provides `DATABASE_URL` automatically from `asset-hub-postgres`.
For free Render accounts, only one active free database is allowed. If a database
already exists, copy its internal connection string into the API service as:

```env
DATABASE_URL=<existing-render-postgres-internal-url>
```

## Important URLs

If Render changes the service URLs, update:

- API `WEB_ORIGIN`
- API `APP_PUBLIC_URL`
- Web `NEXT_PUBLIC_API_BASE_URL`

Email verification links use `APP_PUBLIC_URL`, so this value must be the public web URL.
