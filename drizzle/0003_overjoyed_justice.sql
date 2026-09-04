CREATE TABLE `case_history` (
	`id` text PRIMARY KEY NOT NULL,
	`fingerprint` text NOT NULL,
	`setting` text NOT NULL,
	`method` text NOT NULL,
	`twist` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_case_history_created_at` ON `case_history` (`created_at`);--> statement-breakpoint
ALTER TABLE `game_sessions` ADD `killer_count` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
PRAGMA optimize;
