CREATE TABLE `game_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`status` text DEFAULT 'lobby' NOT NULL,
	`phase` integer DEFAULT 0 NOT NULL,
	`case_json` text,
	`host_player_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_game_sessions_code` ON `game_sessions` (`code`);--> statement-breakpoint
CREATE TABLE `players` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`name` text NOT NULL,
	`token_hash` text NOT NULL,
	`is_host` integer DEFAULT false NOT NULL,
	`role_index` integer,
	`accusation` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `game_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_players_session_id` ON `players` (`session_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_players_token_hash` ON `players` (`token_hash`);