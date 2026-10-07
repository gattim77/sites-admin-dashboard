-- Operational buckets only. There are no uploaded files, GPS coordinates, filenames,
-- imported times, visitor identifiers, cookies, health contents or route contents.
CREATE TABLE IF NOT EXISTS geoconversion_operational (
 hour INTEGER NOT NULL, event TEXT NOT NULL, format TEXT NOT NULL,
 size_bucket TEXT NOT NULL, country TEXT NOT NULL,
 count INTEGER NOT NULL DEFAULT 0, duration_ms INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(hour,event,format,size_bucket,country)
);
