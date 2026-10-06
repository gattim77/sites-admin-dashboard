# Third-AI administration

Privileged Cloudflare Worker at https://admin.third-ai.com. Source of truth: https://github.com/gattim77/sites-admin-dashboard, production branch `main`.

## Security boundary

Every request, including static HTML/JS/CSS, runs through the Worker first. The Worker validates the signed Cloudflare Access JWT, its issuer, audience, expiry, subject and exact email `gattim@gmail.com`. The internal administrator allowlist is this same fixed email. `ADMIN_ENABLED=false` is a fail-closed deployment lock. The backend never trusts an email header on its own. workers.dev and preview hostnames are disabled and rejected.

All mutations require same-origin JSON, an explicit custom header, the exact target internal user ID, and a reason. Deletion additionally requires `DELETE STORED PROFILES`. Mutations, session revocation and audit records commit in one D1 batch. Sensitive data is never cached. Security headers prohibit framing, external scripts and external connections.

## Production setup

1. Connect Cloudflare Workers Builds to this repository, branch `main`, root `/`. Build: `npm run build`. Deploy: `npm run deploy:built`. The build embeds the Git commit and refuses uncommitted source changes. The deploy script requires CI and verifies the embedded revision. It never provisions a paid service.
2. Connect Strata to this same repository using root `/integrations/strata`, build `npm run build`, deploy `npm run deploy:built`. This directory is the actual previously deployed source snapshot (upstream local commit `f2db693b050ae306d6fdf87aa9e608bb71e50d9b`) with administration integration. Strata previously had no GitHub repository or Git deployment integration.
3. Mitchometro and TABI retain their existing GitHub repositories and Workers Builds integrations. Their migrations apply before Worker deployment; apply account controls before enabling the portal.
4. Keep all existing D1 bindings and Google secrets. No R2 service is activated. Bindings for the dashboard reference the three existing D1 databases in wrangler.json.
5. Activate **Zero Trust Free** only with explicit account-owner approval of Cloudflare's payment-method, terms and overage authorization requirements. No billing-dependent feature may be enabled by the deployment script.
6. Create a self-hosted Access application for the entire `admin.third-ai.com` hostname. Allow exactly `gattim@gmail.com`; no bypass, public or service-token policies. Require **Independent MFA: authenticator application / TOTP**, including initial enrollment. Use a short Access session (e.g. one hour). Validate the actual policy and first-login enrollment with the owner.
7. Configure `ACCESS_ISSUER` (exact `https://<team>.cloudflareaccess.com`), `ACCESS_AUD` (application audience tag), and `ADMIN_EMAIL=gattim@gmail.com`. Only after policy and enforcement verification set `ADMIN_ENABLED=true` in Cloudflare runtime variables. `--keep-vars` preserves these settings across Git deployments.
8. Verify owner login, rejection of another account, TOTP enrollment, user drill-down, audit entries and blocking in production. Never unblock the portal merely to test it.

`npm ci`, `npm test`, `npm run check`, `python3 tests/storage.py`, `npm run build`. Builds require a clean committed checkout. `src/revision.mjs` is a generated ignored artifact; the repository contains its generator. There is no authentication bypass in production source.

## Data and costs

Existing databases are authoritative. User passwords, password hashes, salts, Google subjects, OAuth states and session tokens are never returned by the dashboard. Email addresses are exposed only to the authenticated administrator. Accounts remain scoped to applications; email matches can show memberships but do not merge security identities.

Mitchometro persists normalized `listening_profiles.summary` JSON in D1, not original imported files or R2 objects. Triggers maintain exact UTF-8 payload byte totals and object counts atomically on insert, replacement and deletion. Historical upload counts are explicitly unknown; cumulative counts begin at instrumentation. Quotas are nullable (unlimited) by default. SQL guards enforce account status, upload enablement and byte quotas transactionally. Periodic manual reconciliation can rerun the storage backfill SQL; it preserves cumulative upload counts. Unmatched legacy owner IDs stay attributable by internal ID and require review; they are not assigned to another user.

Anonymous traffic uses D1 hourly aggregates with 90-day retention: canonical page route, country, broad device/browser/OS family and referrer hostname. No IPs, visitor IDs, cookies, account IDs or query strings are stored. Counts represent successful server HTML responses, including bots; client-only navigation is not counted. Unique individuals and visits/sessions are not inferred. Collection starts at integration deployment. Instrumentation failures do not affect public requests. Optional Cloudflare Web Analytics is preferred when configured and verified; store an account-scoped analytics **read-only** API token as `CF_ANALYTICS_TOKEN` and configure `CF_ACCOUNT_ID` / `RUM_SITE_TAGS`. Do not use an account-owner OAuth token as a runtime secret. Its GraphQL schema must be validated during integration before relying on results.

Workers Free and D1 Free stop/degrade when quotas are exhausted. D1 currently includes 5 million rows read/day, 100,000 rows written/day and 5 GB account-wide storage. Anonymous counters consume writes across existing applications; watch account-wide limits. No paid analytics, Analytics Engine, R2, external database or paid SaaS is added. Zero Trust activation is a separate owner decision because its UI requires a card and overage authorization despite the $0 base plan.

## Operational limits

Strata's photo service currently has no R2 binding and returns storage unavailable. The portal does not claim to measure nonexistent object storage. First deployment and Access activation status are recorded in `docs/STATUS.md`; unfinished production checks must not be reported as successful.
