import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
export const records=sqliteTable('records',{id:text('id').primaryKey(),owner:text('owner').notNull(),kind:text('kind').notNull(),name:text('name').notNull(),lat:real('lat'),lng:real('lng'),payload:text('payload').notNull(),created:text('created').notNull()},t=>[index('records_owner_kind').on(t.owner,t.kind)]);
export const cache=sqliteTable('source_cache',{key:text('key').primaryKey(),payload:text('payload').notNull(),expires:integer('expires').notNull()});
export const sync=sqliteTable('source_sync',{id:text('id').primaryKey(),lastSuccess:text('last_success'),error:text('error')});
export const limits=sqliteTable('request_limits',{key:text('key').primaryKey(),next:integer('next').notNull()});
export const photos=sqliteTable('photos',{id:text('id').primaryKey(),owner:text('owner').notNull(),type:text('type').notNull(),created:text('created').notNull()},t=>[index('photos_owner').on(t.owner)]);
