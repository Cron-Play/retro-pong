import { pgTable, text, uuid, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './auth-schema.js';

// Game profile extension for Better Auth users
// Better Auth's user table has id (TEXT), email, name, image, emailVerified, createdAt, updatedAt
export const gameProfile = pgTable('game_profile', {
  userId: text('user_id').primaryKey(),
  gameTag: text('game_tag').notNull().unique(),
  avatar: text('avatar'),
  wins: integer('wins').default(0).notNull(),
  losses: integer('losses').default(0).notNull(),
  totalGames: integer('total_games').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Friendships between users
export const friendships = pgTable('friendships', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  friendId: text('friend_id').notNull(),
  status: text('status', { enum: ['pending', 'accepted', 'rejected'] }).default('pending').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
});

// Game rooms for multiplayer matches
export const gameRooms = pgTable('game_rooms', {
  id: uuid('id').primaryKey().defaultRandom(),
  hostId: text('host_id').notNull(),
  guestId: text('guest_id'),
  status: text('status', { enum: ['waiting', 'playing', 'finished'] }).default('waiting').notNull(),
  winnerId: text('winner_id'),
  gameState: jsonb('game_state'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
});

// Game invites to join a room
export const gameInvites = pgTable('game_invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomId: uuid('room_id').notNull().references(() => gameRooms.id, { onDelete: 'cascade' }),
  fromUserId: text('from_user_id').notNull(),
  toUserId: text('to_user_id').notNull(),
  status: text('status', { enum: ['pending', 'accepted', 'rejected'] }).default('pending').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Relations
export const gameProfileRelations = relations(gameProfile, ({ many }) => ({
  friendshipsInitiated: many(friendships, { relationName: 'userFriendships' }),
  friendshipsReceived: many(friendships, { relationName: 'friendFriendships' }),
  roomsHosted: many(gameRooms, { relationName: 'hostRooms' }),
  roomsGuest: many(gameRooms, { relationName: 'guestRooms' }),
  invitesSent: many(gameInvites, { relationName: 'sentInvites' }),
  invitesReceived: many(gameInvites, { relationName: 'receivedInvites' }),
}));

export const friendshipsRelations = relations(friendships, ({ one }) => ({
  user: one(gameProfile, {
    fields: [friendships.userId],
    references: [gameProfile.userId],
    relationName: 'userFriendships',
  }),
  friend: one(gameProfile, {
    fields: [friendships.friendId],
    references: [gameProfile.userId],
    relationName: 'friendFriendships',
  }),
}));

export const gameRoomsRelations = relations(gameRooms, ({ one, many }) => ({
  host: one(gameProfile, {
    fields: [gameRooms.hostId],
    references: [gameProfile.userId],
    relationName: 'hostRooms',
  }),
  guest: one(gameProfile, {
    fields: [gameRooms.guestId],
    references: [gameProfile.userId],
    relationName: 'guestRooms',
  }),
  invites: many(gameInvites),
}));

export const gameInvitesRelations = relations(gameInvites, ({ one }) => ({
  room: one(gameRooms, {
    fields: [gameInvites.roomId],
    references: [gameRooms.id],
  }),
  fromUser: one(gameProfile, {
    fields: [gameInvites.fromUserId],
    references: [gameProfile.userId],
    relationName: 'sentInvites',
  }),
  toUser: one(gameProfile, {
    fields: [gameInvites.toUserId],
    references: [gameProfile.userId],
    relationName: 'receivedInvites',
  }),
}));
