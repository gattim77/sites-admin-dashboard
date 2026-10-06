CREATE TABLE IF NOT EXISTS third_admin_storage (
 user_id TEXT PRIMARY KEY, object_count INTEGER NOT NULL DEFAULT 0, bytes_used INTEGER NOT NULL DEFAULT 0,
 upload_count INTEGER NOT NULL DEFAULT 0, historical_uploads_unknown INTEGER NOT NULL DEFAULT 1,
 last_upload INTEGER, updated_at INTEGER NOT NULL
);
INSERT INTO third_admin_storage(user_id,object_count,bytes_used,upload_count,last_upload,updated_at)
 SELECT owner_id,COUNT(*),SUM(length(CAST(summary AS BLOB))),0,MAX(uploaded_at),CAST(strftime('%s','now') AS INTEGER)*1000
 FROM listening_profiles GROUP BY owner_id
 ON CONFLICT(user_id) DO UPDATE SET object_count=excluded.object_count,bytes_used=excluded.bytes_used,
 last_upload=MAX(third_admin_storage.last_upload,excluded.last_upload),updated_at=excluded.updated_at;
CREATE TRIGGER IF NOT EXISTS third_admin_profile_insert_guard BEFORE INSERT ON listening_profiles
BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM third_admin_controls WHERE user_id=NEW.owner_id AND (status='blocked' OR uploads_enabled=0)) THEN RAISE(ABORT,'Uploads unavailable') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM third_admin_controls c WHERE c.user_id=NEW.owner_id AND c.max_object_bytes IS NOT NULL AND length(CAST(NEW.summary AS BLOB))>c.max_object_bytes) THEN RAISE(ABORT,'File quota exceeded') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM third_admin_controls c WHERE c.user_id=NEW.owner_id AND c.max_bytes IS NOT NULL AND COALESCE((SELECT bytes_used FROM third_admin_storage WHERE user_id=NEW.owner_id),0)-COALESCE((SELECT length(CAST(summary AS BLOB)) FROM listening_profiles WHERE owner_id=NEW.owner_id AND role=NEW.role),0)+length(CAST(NEW.summary AS BLOB))>c.max_bytes) THEN RAISE(ABORT,'Storage quota exceeded') END;
END;
CREATE TRIGGER IF NOT EXISTS third_admin_profile_update_guard BEFORE UPDATE ON listening_profiles
BEGIN
 SELECT CASE WHEN NEW.owner_id!=OLD.owner_id THEN RAISE(ABORT,'Profile owner cannot change') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM third_admin_controls WHERE user_id=NEW.owner_id AND (status='blocked' OR uploads_enabled=0)) THEN RAISE(ABORT,'Uploads unavailable') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM third_admin_controls c WHERE c.user_id=NEW.owner_id AND c.max_object_bytes IS NOT NULL AND length(CAST(NEW.summary AS BLOB))>c.max_object_bytes) THEN RAISE(ABORT,'File quota exceeded') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM third_admin_controls c WHERE c.user_id=NEW.owner_id AND c.max_bytes IS NOT NULL AND COALESCE((SELECT bytes_used FROM third_admin_storage WHERE user_id=NEW.owner_id),0)-length(CAST(OLD.summary AS BLOB))+length(CAST(NEW.summary AS BLOB))>c.max_bytes) THEN RAISE(ABORT,'Storage quota exceeded') END;
END;
CREATE TRIGGER IF NOT EXISTS third_admin_profile_insert_account AFTER INSERT ON listening_profiles
BEGIN
 INSERT INTO third_admin_storage(user_id,object_count,bytes_used,upload_count,historical_uploads_unknown,last_upload,updated_at)
 VALUES(NEW.owner_id,1,length(CAST(NEW.summary AS BLOB)),1,0,NEW.uploaded_at,NEW.uploaded_at)
 ON CONFLICT(user_id) DO UPDATE SET object_count=object_count+1,bytes_used=bytes_used+excluded.bytes_used,
 upload_count=upload_count+1,last_upload=excluded.last_upload,updated_at=excluded.updated_at;
 INSERT INTO third_admin_activity(occurred_at,user_id,action,bytes) VALUES(NEW.uploaded_at,NEW.owner_id,'upload',length(CAST(NEW.summary AS BLOB)));
END;
CREATE TRIGGER IF NOT EXISTS third_admin_profile_update_account AFTER UPDATE ON listening_profiles
BEGIN
 UPDATE third_admin_storage SET bytes_used=bytes_used-length(CAST(OLD.summary AS BLOB))+length(CAST(NEW.summary AS BLOB)),upload_count=upload_count+1,last_upload=NEW.uploaded_at,updated_at=NEW.uploaded_at WHERE user_id=NEW.owner_id;
 INSERT INTO third_admin_activity(occurred_at,user_id,action,bytes) VALUES(NEW.uploaded_at,NEW.owner_id,'upload',length(CAST(NEW.summary AS BLOB)));
END;
CREATE TRIGGER IF NOT EXISTS third_admin_profile_delete_account AFTER DELETE ON listening_profiles
BEGIN
 UPDATE third_admin_storage SET object_count=object_count-1,bytes_used=bytes_used-length(CAST(OLD.summary AS BLOB)),updated_at=CAST(strftime('%s','now') AS INTEGER)*1000 WHERE user_id=OLD.owner_id;
 INSERT INTO third_admin_activity(occurred_at,user_id,action,bytes) VALUES(CAST(strftime('%s','now') AS INTEGER)*1000,OLD.owner_id,'delete',length(CAST(OLD.summary AS BLOB)));
END;
