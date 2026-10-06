# Integration status

Inspection: 2026-10-06. The requested admin repository was empty, with `main` as the intended branch; no admin Worker existed.

| Application | Production hostname | Source | D1 database | Authentication |
|---|---|---|---|---|
| Mitchometro | mitchometro.third-ai.com | gattim77/Mitchometro, main | 36a2e0ed-e14f-40f8-8283-3c0208ae2601 | Local email/password and configured Google OAuth; server sessions |
| TABI | japan-planner.third-ai.com | gattim77/japan-planner, main | bac4c9a4-df6b-4b40-896d-58644b5f27b4 | Local email/password, Google OIDC with explicit linking; server sessions |
| Strata | strata.third-ai.com | Previously local Git with manual Wrangler deployment; source preserved in integrations/strata | ebda54a8-1126-4094-924c-0b14b2de84fb | Local email/password; Google implementation present but unconfigured |

Actual production schemas were inspected read-only through the Cloudflare D1 API. Registered account totals at inspection were 1, 1, 0 respectively. Mitchometro's stored summaries already use internal owner IDs; there is no R2 binding. Strata R2 and Google setup remain disabled/pending in the existing environment. No Cloudflare Web Analytics beacon was present in the inspected returned HTML; the existing OAuth credential has no permission to inspect the RUM API (403). Web Analytics configuration must not be assumed absent solely from that response.

Zero Trust onboarding reached `Activate Zero Trust Free`. The screen requires a payment method, acceptance of terms and authorization for usage charges beyond free limits. Activation was not submitted. Access policies, TOTP enrollment and real owner dashboard login remain unverified until the account owner completes/authorizes this setup.

Local verification: cryptographic JWT denial/allow cases, CSRF denial, protected static assets, unknown-host denial, UTF-8 storage totals, replacement/deletion accounting, quota failures, disabled uploads, blocked sessions, unblock, reconciliation and transaction rollback are covered by executable tests. Application type checks and builds are required before pushing integrations. Production verification is pending; do not treat a locked deployment as an operational dashboard.

## Resumed production verification

Mitchometro and TABI code deployed successfully through their existing GitHub Workers Builds. Mitchometro initially deployed without its new migrations because its existing deploy command called Wrangler directly. Safe committed migrations were applied, and its Cloudflare deploy command was corrected to `npm run deploy:built`. Storage guards were adjusted for Wrangler SQL statement parsing and verified with a fresh local D1 migration run. TABI migrations were already applied by its build. Strata administration/event/anonymous tables were applied from pushed source, preserving existing tables and data; its updated Worker still awaits a repository build connection.

Live verification with disposable accounts passed on Mitchometro and TABI: registration/login, active protected API, block/session revocation/login denial, unblock/restored access, and audit writes using the actual administrative mutation handler against live D1. Mitchometro additionally passed persisted UTF-8 byte/count attribution, quota denial, upload disable/enable and confirmed profile deletion/accounting. Disposable accounts and their operational test rows were removed; audit records retained. This invokes the handler locally with live D1 bindings; it does **not** verify the undeployed protected admin hostname or Access login.

Existing registered accounts remain 1/1/0. Mitchometro existing persisted profile data totals 273,035 bytes with zero unmatched owners. Mitchometro/TABI aggregate counters began collecting successfully. Local read handlers returned live overview, users, analytics and audit data; Strata collection requires deployment of its wrapper. Synthetic browser QA verified user drill-down, confirmation and audit presentation.

The admin Worker still does not exist, and `admin.third-ai.com` returned HTTP 522 at verification. GitHub's installed Cloudflare app is restricted to the two existing repositories; adding `sites-admin-dashboard` is blocked by owner passkey/password reauthentication and pending action-time access approval. Zero Trust remains at checkout, requiring card/terms/overage authorization. The portal remains disabled in source. Owner login, alternate-identity rejection, TOTP enrollment and full portal production verification remain incomplete.
