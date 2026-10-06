# Direct Cloudflare deployment

Strata now uses application sessions and Google OIDC / email-password accounts, not trusted Sites headers. The original hosted Sites deployment is not modified by these local changes. Its records and photos have not been migrated to the new Cloudflare account. Do not automatically link old records by email.

The deployed application uses the dedicated D1 database `strata`. R2 is not yet activated on this account, so no BUCKET binding is deployed and photo uploads return a storage-unavailable message. After activation, create `strata-photos`, add its BUCKET binding to wrangler.json and rebuild/deploy. Run `npm run build`, then `npm run deploy:built`. Google sign-in appears only when GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are configured as Worker secrets. Register the exact HTTPS `/api/auth/google/callback` URL with the Google OAuth web client. Publish the Google consent app for access beyond its test users; request only openid/email/profile. Do not copy Japan Planner secrets into source.

Email registration uses a password (10–200 characters); it does not send verification or password-reset emails. No email provider is configured. Google uses verified email but never silently merges an existing password account. Users can sign in with their password and connect Google on /account.

Security validation: fresh local D1 migrations; integration checks cover email registration, login, logout invalidation, secure cookies, cross-origin rejection, ignored forged Sites identity headers, and per-user record isolation. Google token tests validate signature, issuer, audience, expiry, nonce, azp and verified email.

Deployment on 2026-10-05: https://strata.third-ai.com, Worker version 77d7f2ad-2c8d-4518-a7cd-26ee36f4c688. All four D1 migrations applied successfully. Browser verification confirmed the email sign-in page and Piacenza map. Google credentials are still pending; Google sign-in is hidden until configured.
