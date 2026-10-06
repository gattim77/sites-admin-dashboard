# Production status

Admin uses direct password + authenticator TOTP at https://admin.third-ai.com. Cloudflare Access / Zero Trust has been removed at the owner's request. Source is GitHub main with automatic Workers Builds. Owner enrollment requires a private single-use setup link; there is no public administrator signup. The owner must enter a new password and scan the QR personally. Until enrollment is complete, all administrative data and dashboard assets remain inaccessible.

Authentication state lives in separate third_admin_auth_* tables in the existing Mitchometro database. Existing Mitchometro authentication, app databases, anonymous aggregates, storage quotas, blocking and audit integration remain in place. No paid service, new database or billing activation is added.

The native auth test suite checks RFC TOTP output, encrypted secrets, salted passwords, owner allowlist, bootstrap expiry, first enrollment, password rejection, replay prevention, session expiry/logout, rate limits, CSRF and protected routes. Production negative checks and commit verification are recorded in the workspace verification output. Real owner enrollment and subsequent dashboard sign in await the human owner.
