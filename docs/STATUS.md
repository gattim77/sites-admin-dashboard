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
