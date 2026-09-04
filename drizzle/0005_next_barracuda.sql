CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`platform_user_id` text NOT NULL,
	`email` text NOT NULL,
	`username` text NOT NULL,
	`username_key` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_accounts_platform_user_id` ON `accounts` (`platform_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_accounts_email` ON `accounts` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_accounts_username_key` ON `accounts` (`username_key`);--> statement-breakpoint
ALTER TABLE `players` ADD `account_id` text REFERENCES accounts(id) ON DELETE SET NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_players_session_account` ON `players` (`session_id`,`account_id`);
