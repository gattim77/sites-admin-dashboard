# Third-AI administration

Privileged Cloudflare Worker at https://admin.third-ai.com. Source of truth: https://github.com/gattim77/sites-admin-dashboard, production branch `main`.

## Security boundary

The administrator is fixed to `gattim@gmail.com`. Direct login requires a separate Admin password and a six-digit TOTP authenticator code, following Mitchometro's authenticator pattern. Cloudflare Access / Zero Trust is not used. Only the login page, its two assets, and tightly scoped authentication endpoints are public. Every dashboard page, asset and API requires a valid server session; forged identity headers have no effect. workers.dev and preview hostnames are disabled and rejected.

Password derivation follows Mitchometro's three domain-separated PBKDF2 SHA-256 stages (100,000 iterations each). TOTP secrets use AES-GCM with a Worker secret key. Tokens are random 256-bit values; only SHA-256 hashes are stored. Cookies are host-only, Secure, HttpOnly, SameSite=Strict, expire after one hour, and are revoked on logout. TOTP steps are claimed atomically to prevent reuse. Authentication has atomic limits of ten attempts per endpoint per 15 minutes; enrollment confirmation allows five tries. Limits intentionally apply globally because there is exactly one administrator. Login credentials never appear in audit records.

First enrollment requires a cryptographically random private token whose hash and 24-hour expiry are stored in D1. Enrollment displays a fresh QR code, requires a valid authenticator code, and inserts singleton owner credentials atomically. Successful enrollment consumes the bootstrap and pending secrets; existing credentials cannot be replaced by the setup endpoints. Setup cookies expire after ten minutes. There is no public signup or password reset. Recovery requires the account owner to rotate authentication configuration through their existing Cloudflare/GitHub account. Keep the Worker encryption key and authenticator setup key secure; changing the Worker encryption key without re-enrollment makes stored TOTP unreadable.

All mutations require same-origin JSON, an explicit custom header, the exact target internal user ID, and a reason. Deletion additionally requires `DELETE STORED PROFILES`. Mutations, session revocation and audit records commit in one D1 batch. Sensitive data is never cached. Security headers prohibit framing, external scripts and external connections.

## Production setup

1. Connect Cloudflare Workers Builds to this repository, branch `main`, root `/`. Build: `npm run build`. Deploy: `npm run deploy:built`. The build embeds the Git commit and refuses uncommitted source changes. The deploy script requires CI and verifies the embedded revision. It never provisions a paid service.
2. Connect Strata to this same repository using root `/integrations/strata`, build `npm run build`, deploy `npm run deploy:built`. This directory is the actual previously deployed source snapshot (upstream local commit `f2db693b050ae306d6fdf87aa9e608bb71e50d9b`) with administration integration. Strata previously had no GitHub repository or Git deployment integration.
3. Mitchometro and TABI retain their existing GitHub repositories and Workers Builds integrations. Their migrations apply before Worker deployment; apply account controls before enabling the portal.
4. Keep all existing D1 bindings and Google secrets. No R2 service is activated. Bindings for the dashboard reference the three existing D1 databases in wrangler.json.
5. Apply `migrations/native-auth.sql` to the existing Mitchometro D1 database; these separate `third_admin_auth_*` tables do not alter Mitchometro's own administrator credentials.
6. Set a random 32-byte base64url `ADMIN_AUTH_KEY` as an encrypted Worker secret. Insert a random bootstrap token's SHA-256 hash and expiry into `third_admin_auth_bootstrap`, only when no credentials exist. Provide the private URL fragment `https://admin.third-ai.com/login#setup=<token>` directly to the owner. The browser removes the fragment immediately; it is never part of the HTTP URL or referrer. Do not commit, log, or publish this token.
7. The repository config sets `ADMIN_ENABLED=true` and exact `ADMIN_EMAIL`; without a valid encryption secret and D1 binding the Worker remains locked. Git deployment applies repository variables while retaining encrypted Worker secrets. Build and deploy still run exclusively through GitHub Workers Builds.
8. The owner enters their password, scans the QR, and confirms a code. Verify owner dashboard access and sign out / sign in after this human enrollment step. Automated tests cover enrollment, password failure, other emails, expiry, CSRF and code reuse without enrolling a production test administrator.

`npm ci`, `npm test`, `npm run check`, `python3 tests/storage.py`, `npm run build`. Builds require a clean committed checkout. `src/revision.mjs` is a generated ignored artifact; the repository contains its generator. There is no authentication bypass in production source.

## Data and costs

Existing databases are authoritative. User passwords, password hashes, salts, Google subjects, OAuth states and session tokens are never returned by the dashboard. Email addresses are exposed only to the authenticated administrator. Accounts remain scoped to applications; email matches can show memberships but do not merge security identities.

Mitchometro persists normalized `listening_profiles.summary` JSON in D1, not original imported files or R2 objects. Triggers maintain exact UTF-8 payload byte totals and object counts atomically on insert, replacement and deletion. Historical upload counts are explicitly unknown; cumulative counts begin at instrumentation. Quotas are nullable (unlimited) by default. SQL guards enforce account status, upload enablement and byte quotas transactionally. Periodic manual reconciliation can rerun the storage backfill SQL; it preserves cumulative upload counts. Unmatched legacy owner IDs stay attributable by internal ID and require review; they are not assigned to another user.

Anonymous traffic uses D1 hourly aggregates with 90-day retention: canonical page route, country, broad device/browser/OS family and referrer hostname. No IPs, visitor IDs, cookies, account IDs or query strings are stored. Counts represent successful server HTML responses, including bots; client-only navigation is not counted. Unique individuals and visits/sessions are not inferred. Collection starts at integration deployment. Instrumentation failures do not affect public requests. Optional Cloudflare Web Analytics is preferred when configured and verified; store an account-scoped analytics **read-only** API token as `CF_ANALYTICS_TOKEN` and configure `CF_ACCOUNT_ID` / `RUM_SITE_TAGS`. Do not use an account-owner OAuth token as a runtime secret. Its GraphQL schema must be validated during integration before relying on results.

Workers Free and D1 Free stop/degrade when quotas are exhausted. D1 currently includes 5 million rows read/day, 100,000 rows written/day and 5 GB account-wide storage. Anonymous counters consume writes across existing applications; watch account-wide limits. No paid analytics, Analytics Engine, R2, external database or paid SaaS is added. Cloudflare Zero Trust is not required.

## Operational limits

Strata's photo service currently has no R2 binding and returns storage unavailable. The portal does not claim to measure nonexistent object storage. Deployment and native authentication enrollment status are recorded in `docs/STATUS.md`; unfinished production checks must not be reported as successful.

## GeoConversion operational analytics

GeoConversion appears in global traffic and application selection, with a dedicated `#site/geoconversion` detail page. It has no registered users or sessions. Apply `migrations/geoconversion.sql` to Strata's existing D1 database before deployment. The converter has a Cloudflare service binding to this Worker; the internal aggregate endpoint uses the unrouted hostname `geoconversion.telemetry.internal`. Public `admin.third-ai.com` continues to require the existing password/MFA session and cannot access that ingestion route. Accepted fields are event and source-format enums, integer processing duration, input-size bucket and Cloudflare country code. Unknown fields are rejected. Stored data is hourly counters and duration sums, retained 90 days. No files, GPS data, imported timestamps, filenames, account IDs or visitor IDs are collected. Existing site bindings, authentication and account controls are preserved.
