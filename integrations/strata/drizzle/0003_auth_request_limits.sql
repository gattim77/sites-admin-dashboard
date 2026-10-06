CREATE TABLE app_request_limits (key TEXT PRIMARY KEY NOT NULL, attempts INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE INDEX idx_app_request_limits_expiry ON app_request_limits(expires_at);
