CREATE TABLE `player_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`player_id` text NOT NULL,
	`phase` integer NOT NULL,
	`action_type` text NOT NULL,
	`target_player_id` text,
	`result` text NOT NULL,
	`public_effect` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `game_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_player_actions_round` ON `player_actions` (`session_id`,`player_id`,`phase`);--> statement-breakpoint
CREATE INDEX `idx_player_actions_session_phase` ON `player_actions` (`session_id`,`phase`);