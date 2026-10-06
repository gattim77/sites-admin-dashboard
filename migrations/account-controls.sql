CREATE TABLE IF NOT EXISTS third_admin_controls (
 user_id TEXT PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','blocked')),
 blocked_at INTEGER, block_reason TEXT, max_bytes INTEGER CHECK(max_bytes IS NULL OR max_bytes >= 0),
 max_object_bytes INTEGER CHECK(max_object_bytes IS NULL OR max_object_bytes >= 0),
 uploads_enabled INTEGER NOT NULL DEFAULT 1 CHECK(uploads_enabled IN (0,1)), updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS third_admin_audit (
 id TEXT PRIMARY KEY, occurred_at INTEGER NOT NULL, actor TEXT NOT NULL,
 action TEXT NOT NULL, target_user TEXT NOT NULL, details TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS third_admin_audit_time ON third_admin_audit(occurred_at);
CREATE TABLE IF NOT EXISTS third_admin_activity (
 id INTEGER PRIMARY KEY AUTOINCREMENT, occurred_at INTEGER NOT NULL, user_id TEXT NOT NULL,
 action TEXT NOT NULL, bytes INTEGER
);
CREATE INDEX IF NOT EXISTS third_admin_activity_time ON third_admin_activity(occurred_at);
CREATE TABLE IF NOT EXISTS third_admin_user_activity (
 user_id TEXT PRIMARY KEY, last_login INTEGER, last_activity INTEGER
);
CREATE TRIGGER IF NOT EXISTS third_admin_session_block BEFORE INSERT ON app_sessions
WHEN EXISTS(SELECT 1 FROM third_admin_controls WHERE user_id=NEW.user_id AND status='blocked')
BEGIN SELECT RAISE(ABORT,'Account unavailable'); END;
CREATE TRIGGER IF NOT EXISTS third_admin_login_activity AFTER INSERT ON app_sessions
BEGIN
 INSERT INTO third_admin_user_activity(user_id,last_login,last_activity) VALUES(NEW.user_id,NEW.created_at,NEW.created_at)
 ON CONFLICT(user_id) DO UPDATE SET last_login=excluded.last_login,last_activity=excluded.last_activity;
 INSERT INTO third_admin_activity(occurred_at,user_id,action) VALUES(NEW.created_at,NEW.user_id,'login');
END;
CREATE INDEX IF NOT EXISTS third_admin_users_created ON app_users(created_at);
CREATE TRIGGER IF NOT EXISTS third_admin_signup_activity AFTER INSERT ON app_users
BEGIN
 INSERT INTO third_admin_activity(occurred_at,user_id,action) VALUES(NEW.created_at,NEW.id,'signup');
END;
INSERT INTO third_admin_user_activity(user_id,last_login,last_activity)
 SELECT user_id,MAX(created_at),MAX(created_at) FROM app_sessions GROUP BY user_id
 ON CONFLICT(user_id) DO UPDATE SET last_login=MAX(last_login,excluded.last_login),last_activity=MAX(last_activity,excluded.last_activity);
CREATE TRIGGER IF NOT EXISTS third_admin_user_update_block BEFORE UPDATE ON app_users
WHEN EXISTS(SELECT 1 FROM third_admin_controls WHERE user_id=OLD.id AND status='blocked')
BEGIN SELECT RAISE(ABORT,'Account unavailable'); END;
