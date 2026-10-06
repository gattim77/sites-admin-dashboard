CREATE TABLE `app_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text,
	`password_salt` text,
	`password_hash` text,
	`google_sub` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_app_users_email` ON `app_users` (`email`);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_app_users_google_sub` ON `app_users` (`google_sub`);
--> statement-breakpoint
CREATE TABLE `app_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `app_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_app_sessions_user` ON `app_sessions` (`user_id`);
--> statement-breakpoint
CREATE TABLE `app_login_limits` (
	`email` text PRIMARY KEY NOT NULL,
	`failed_count` integer NOT NULL,
	`locked_until` integer NOT NULL
);
