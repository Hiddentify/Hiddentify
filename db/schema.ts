import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const gameSessions = sqliteTable("game_sessions", {
  id: text("id").primaryKey(),
  code: text("code").notNull(),
  status: text("status").notNull().default("lobby"),
  phase: integer("phase").notNull().default(0),
  caseJson: text("case_json"),
  killerCount: integer("killer_count").notNull().default(1),
  gameMode: text("game_mode").notNull().default("detective"),
  hostPlayerId: text("host_player_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_game_sessions_code").on(table.code)]);

export const caseHistory = sqliteTable("case_history", {
  id: text("id").primaryKey(),
  fingerprint: text("fingerprint").notNull(),
  setting: text("setting").notNull(),
  method: text("method").notNull(),
  twist: text("twist").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_case_history_created_at").on(table.createdAt)]);

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  platformUserId: text("platform_user_id").notNull(),
  email: text("email").notNull(),
  username: text("username").notNull(),
  usernameKey: text("username_key").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_accounts_platform_user_id").on(table.platformUserId),
  uniqueIndex("idx_accounts_email").on(table.email),
  uniqueIndex("idx_accounts_username_key").on(table.usernameKey),
]);

export const players = sqliteTable("players", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => gameSessions.id, { onDelete: "cascade" }),
  accountId: text("account_id").references(() => accounts.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  tokenHash: text("token_hash").notNull(),
  isHost: integer("is_host", { mode: "boolean" }).notNull().default(false),
  roleIndex: integer("role_index"),
  accusation: text("accusation"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_players_session_id").on(table.sessionId),
  uniqueIndex("idx_players_token_hash").on(table.tokenHash),
  uniqueIndex("idx_players_session_account").on(table.sessionId, table.accountId),
]);

export const playerActions = sqliteTable("player_actions", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => gameSessions.id, { onDelete: "cascade" }),
  playerId: text("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  phase: integer("phase").notNull(),
  actionType: text("action_type").notNull(),
  targetPlayerId: text("target_player_id").references(() => players.id, { onDelete: "set null" }),
  result: text("result").notNull(),
  publicEffect: text("public_effect"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_player_actions_round").on(table.sessionId, table.playerId, table.phase),
  index("idx_player_actions_session_phase").on(table.sessionId, table.phase),
]);

export const abilityUses = sqliteTable("ability_uses", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => gameSessions.id, { onDelete: "cascade" }),
  playerId: text("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  abilityId: text("ability_id").notNull(),
  targetPlayerId: text("target_player_id").references(() => players.id, { onDelete: "set null" }),
  result: text("result").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_ability_uses_session_player").on(table.sessionId, table.playerId),
]);

export const interrogations = sqliteTable("interrogations", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => gameSessions.id, { onDelete: "cascade" }),
  initiatorPlayerId: text("initiator_player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  inviteePlayerId: text("invitee_player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"),
  inviteExpiresAt: text("invite_expires_at").notNull(),
  endsAt: text("ends_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_interrogations_session_initiator").on(table.sessionId, table.initiatorPlayerId),
  index("idx_interrogations_session_status").on(table.sessionId, table.status),
]);

export const interrogationMessages = sqliteTable("interrogation_messages", {
  id: text("id").primaryKey(),
  interrogationId: text("interrogation_id").notNull().references(() => interrogations.id, { onDelete: "cascade" }),
  senderPlayerId: text("sender_player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_interrogation_messages_channel_time").on(table.interrogationId, table.createdAt),
]);
