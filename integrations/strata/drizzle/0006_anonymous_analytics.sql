CREATE TABLE IF NOT EXISTS third_admin_traffic (
 hour INTEGER NOT NULL, route TEXT NOT NULL, country TEXT NOT NULL, device TEXT NOT NULL,
 browser TEXT NOT NULL, os TEXT NOT NULL, referrer TEXT NOT NULL,
 page_views INTEGER NOT NULL DEFAULT 0, errors INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(hour,route,country,device,browser,os,referrer)
) WITHOUT ROWID;
