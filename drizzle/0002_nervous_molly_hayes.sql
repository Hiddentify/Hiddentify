CREATE TABLE `ability_uses` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`player_id` text NOT NULL,
	`ability_id` text NOT NULL,
	`target_player_id` text,
	`result` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `game_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_ability_uses_session_player` ON `ability_uses` (`session_id`,`player_id`);--> statement-breakpoint
CREATE TABLE `interrogation_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`interrogation_id` text NOT NULL,
	`sender_player_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`interrogation_id`) REFERENCES `interrogations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sender_player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_interrogation_messages_channel_time` ON `interrogation_messages` (`interrogation_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `interrogations` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`initiator_player_id` text NOT NULL,
	`invitee_player_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`invite_expires_at` text NOT NULL,
	`ends_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `game_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`initiator_player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invitee_player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_interrogations_session_initiator` ON `interrogations` (`session_id`,`initiator_player_id`);--> statement-breakpoint
CREATE INDEX `idx_interrogations_session_status` ON `interrogations` (`session_id`,`status`);--> statement-breakpoint
PRAGMA optimize;
