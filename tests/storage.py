import sqlite3, pathlib, unittest
root=pathlib.Path(__file__).resolve().parents[1]
class Storage(unittest.TestCase):
 def setUp(self):
  self.db=sqlite3.connect(':memory:')
  self.db.executescript('CREATE TABLE app_users(id TEXT PRIMARY KEY,email TEXT,created_at INTEGER); CREATE TABLE app_sessions(token_hash TEXT PRIMARY KEY,user_id TEXT,created_at INTEGER); CREATE TABLE listening_profiles(owner_id TEXT,role TEXT,summary TEXT,uploaded_at INTEGER,plays INTEGER,PRIMARY KEY(owner_id,role)); INSERT INTO app_users VALUES ("u","test@example.invalid",0); INSERT INTO listening_profiles VALUES("u","user","old",1,1);')
  self.db.executescript((root/'migrations/account-controls.sql').read_text())
  self.db.executescript((root/'migrations/mitchometro-storage.sql').read_text())
 def usage(self):return self.db.execute('SELECT object_count,bytes_used,upload_count FROM third_admin_storage WHERE user_id="u"').fetchone()
 def upload(self,s):self.db.execute('INSERT INTO listening_profiles VALUES("u","user",?,2,1) ON CONFLICT(owner_id,role) DO UPDATE SET summary=excluded.summary,uploaded_at=excluded.uploaded_at',(s,))
 def test_backfill_replacement_delete(self):
  self.assertEqual(self.usage(),(1,3,0)); self.upload('é😀');self.assertEqual(self.usage(),(1,6,1));self.upload('x');self.assertEqual(self.usage(),(1,1,2));self.db.execute('DELETE FROM listening_profiles');self.assertEqual(self.usage(),(0,0,2))
 def test_quota_atomic(self):
  self.db.execute('INSERT INTO third_admin_controls(user_id,max_bytes,max_object_bytes,updated_at) VALUES("u",5,4,0)')
  with self.assertRaises(sqlite3.IntegrityError):self.upload('12345')
  self.assertEqual(self.usage(),(1,3,0));self.upload('1234');self.assertEqual(self.usage(),(1,4,1))
  with self.assertRaises(sqlite3.IntegrityError):self.db.execute('INSERT INTO listening_profiles VALUES("u","master","xx",3,1)')
  self.assertEqual(self.usage(),(1,4,1))
 def test_disabled_and_blocked(self):
  self.db.execute('INSERT INTO third_admin_controls(user_id,status,updated_at) VALUES("u","blocked",0)')
  with self.assertRaises(sqlite3.IntegrityError):self.upload('x')
  with self.assertRaises(sqlite3.IntegrityError):self.db.execute('INSERT INTO app_sessions VALUES("token","u",1)')
  self.db.execute('UPDATE third_admin_controls SET status="active",uploads_enabled=0')
  self.db.execute('INSERT INTO app_sessions VALUES("token","u",1)')
  with self.assertRaises(sqlite3.IntegrityError):self.upload('x')
  self.db.execute('UPDATE third_admin_controls SET uploads_enabled=1');self.upload('x');self.assertEqual(self.usage(),(1,1,1))
 def test_audit_rollback(self):
  self.db.commit()
  with self.assertRaises(sqlite3.IntegrityError):
   with self.db:
    self.upload('replacement')
    self.db.execute('INSERT INTO third_admin_audit(id,occurred_at,actor,action,target_user,details) VALUES(NULL,0,NULL,"x","u","x")')
  self.assertEqual(self.usage(),(1,3,0))
 def test_reconciliation_preserves_counts(self):
  self.upload('new');self.db.executescript((root/'migrations/mitchometro-storage.sql').read_text());self.assertEqual(self.usage(),(1,3,1))
if __name__=='__main__':unittest.main()
