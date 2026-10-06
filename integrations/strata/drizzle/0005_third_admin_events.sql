CREATE TRIGGER IF NOT EXISTS third_admin_records_insert_guard BEFORE INSERT ON records
WHEN EXISTS(SELECT 1 FROM third_admin_controls WHERE user_id=NEW.owner AND status='blocked')
BEGIN SELECT RAISE(ABORT,'Account unavailable'); END;
CREATE TRIGGER IF NOT EXISTS third_admin_records_update_guard BEFORE UPDATE ON records
WHEN EXISTS(SELECT 1 FROM third_admin_controls WHERE user_id=NEW.owner AND status='blocked')
BEGIN SELECT RAISE(ABORT,'Account unavailable'); END;
CREATE TRIGGER IF NOT EXISTS third_admin_records_activity AFTER INSERT ON records
BEGIN INSERT INTO third_admin_activity(occurred_at,user_id,action) VALUES(CAST(strftime('%s','now') AS INTEGER)*1000,NEW.owner,'records_created'); END;
CREATE TRIGGER IF NOT EXISTS third_admin_photos_insert_guard BEFORE INSERT ON photos
WHEN EXISTS(SELECT 1 FROM third_admin_controls WHERE user_id=NEW.owner AND status='blocked')
BEGIN SELECT RAISE(ABORT,'Account unavailable'); END;
CREATE TRIGGER IF NOT EXISTS third_admin_photos_update_guard BEFORE UPDATE ON photos
WHEN EXISTS(SELECT 1 FROM third_admin_controls WHERE user_id=NEW.owner AND status='blocked')
BEGIN SELECT RAISE(ABORT,'Account unavailable'); END;
CREATE TRIGGER IF NOT EXISTS third_admin_photos_activity AFTER INSERT ON photos
BEGIN INSERT INTO third_admin_activity(occurred_at,user_id,action) VALUES(CAST(strftime('%s','now') AS INTEGER)*1000,NEW.owner,'photos_created'); END;
