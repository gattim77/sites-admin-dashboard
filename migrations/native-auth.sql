CREATE TABLE IF NOT EXISTS third_admin_auth_credentials (id INTEGER PRIMARY KEY CHECK(id=1),email TEXT NOT NULL CHECK(email='gattim@gmail.com'),salt TEXT NOT NULL,password_hash TEXT NOT NULL,totp_secret TEXT NOT NULL,last_step INTEGER NOT NULL,created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS third_admin_auth_bootstrap (id INTEGER PRIMARY KEY CHECK(id=1),token_hash TEXT NOT NULL,expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS third_admin_auth_pending (token_hash TEXT PRIMARY KEY,salt TEXT NOT NULL,password_hash TEXT NOT NULL,totp_secret TEXT NOT NULL,expires_at INTEGER NOT NULL,attempts INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS third_admin_auth_sessions (token_hash TEXT PRIMARY KEY,email TEXT NOT NULL CHECK(email='gattim@gmail.com'),expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS third_admin_auth_limits (bucket TEXT PRIMARY KEY,attempts INTEGER NOT NULL,expires_at INTEGER NOT NULL);
