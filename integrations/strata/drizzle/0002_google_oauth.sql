CREATE TABLE app_oauth_states (
  state_hash TEXT PRIMARY KEY NOT NULL,
  browser_hash TEXT NOT NULL,
  nonce TEXT NOT NULL,
  verifier TEXT NOT NULL,
  return_to TEXT NOT NULL,
  link_user_id TEXT,
  expires_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX idx_app_oauth_expiry ON app_oauth_states (expires_at);
