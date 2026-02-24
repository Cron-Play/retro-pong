import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, or } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { user } from '../db/auth-schema.js';
import type { App } from '../index.js';

interface FriendRequestBody {
  gameTag: string;
}

export function registerFriendsRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/friends - Returns user's friends list
  app.fastify.get('/api/friends', {
    schema: {
      description: "Get current user's friends list",
      tags: ['friends'],
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              gameTag: { type: 'string' },
              avatar: { type: 'string' },
              status: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        401: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id }, 'Fetching friends list');

    const friendships = await app.db
      .select()
      .from(schema.friendships)
      .where(
        and(
          eq(schema.friendships.userId, session.user.id),
          eq(schema.friendships.status, 'accepted')
        )
      );

    const friends = await Promise.all(
      friendships.map(async (friendship) => {
        const friendProfile = await app.db.query.gameProfile.findFirst({
          where: eq(schema.gameProfile.userId, friendship.friendId),
        });

        const friendUser = await app.db.query.user.findFirst({
          where: eq(user.id, friendship.friendId),
        });

        return {
          id: friendship.friendId,
          name: friendUser?.name || '',
          gameTag: friendProfile?.gameTag || '',
          avatar: friendProfile?.avatar || '',
          status: friendship.status,
          createdAt: friendship.createdAt,
        };
      })
    );

    app.logger.info({ userId: session.user.id, count: friends.length }, 'Friends list fetched');
    return friends;
  });

  // POST /api/friends/request - Send friend request by gameTag
  app.fastify.post('/api/friends/request', {
    schema: {
      description: 'Send friend request by game tag',
      tags: ['friends'],
      body: {
        type: 'object',
        required: ['gameTag'],
        properties: {
          gameTag: { type: 'string' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            friendship: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                userId: { type: 'string' },
                friendId: { type: 'string' },
                status: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
        400: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        401: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        404: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (
    request: FastifyRequest<{ Body: FriendRequestBody }>,
    reply: FastifyReply
  ) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { gameTag } = request.body;

    app.logger.info({ userId: session.user.id, gameTag }, 'Sending friend request');

    try {
      // Find user by gameTag
      const friendProfile = await app.db.query.gameProfile.findFirst({
        where: eq(schema.gameProfile.gameTag, gameTag),
      });

      if (!friendProfile) {
        app.logger.warn({ gameTag }, 'Friend profile not found');
        return reply.status(404).send({ error: 'User not found' });
      }

      if (friendProfile.userId === session.user.id) {
        app.logger.warn({ userId: session.user.id }, 'Cannot add self as friend');
        return reply.status(400).send({ error: 'Cannot add yourself as a friend' });
      }

      // Check if friendship already exists
      const existing = await app.db.query.friendships.findFirst({
        where: or(
          and(
            eq(schema.friendships.userId, session.user.id),
            eq(schema.friendships.friendId, friendProfile.userId)
          ),
          and(
            eq(schema.friendships.userId, friendProfile.userId),
            eq(schema.friendships.friendId, session.user.id)
          )
        ),
      });

      if (existing) {
        app.logger.warn({ userId: session.user.id, friendId: friendProfile.userId }, 'Friendship already exists');
        return reply.status(400).send({ error: 'Friendship already exists' });
      }

      // Create friendship request
      const [friendship] = await app.db
        .insert(schema.friendships)
        .values({
          userId: session.user.id,
          friendId: friendProfile.userId,
          status: 'pending',
        })
        .returning();

      app.logger.info({ friendshipId: friendship.id, userId: session.user.id }, 'Friend request sent');
      return reply.status(201).send({ success: true, friendship });
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Failed to send friend request');
      throw error;
    }
  });

  // PUT /api/friends/:friendshipId/accept - Accept friend request
  app.fastify.put('/api/friends/:friendshipId/accept', {
    schema: {
      description: 'Accept friend request',
      tags: ['friends'],
      params: {
        type: 'object',
        required: ['friendshipId'],
        properties: {
          friendshipId: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            friendId: { type: 'string' },
            status: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        401: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        403: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        404: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { friendshipId: string } }>, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { friendshipId } = request.params;

    app.logger.info({ friendshipId, userId: session.user.id }, 'Accepting friend request');

    try {
      const friendship = await app.db.query.friendships.findFirst({
        where: eq(schema.friendships.id, friendshipId),
      });

      if (!friendship) {
        app.logger.warn({ friendshipId }, 'Friendship not found');
        return reply.status(404).send({ error: 'Friendship not found' });
      }

      if (friendship.friendId !== session.user.id) {
        app.logger.warn({ friendshipId, userId: session.user.id }, 'Not the recipient of this friend request');
        return reply.status(403).send({ error: 'Cannot accept this friend request' });
      }

      const [updated] = await app.db
        .update(schema.friendships)
        .set({ status: 'accepted' })
        .where(eq(schema.friendships.id, friendshipId))
        .returning();

      app.logger.info({ friendshipId }, 'Friend request accepted');
      return updated;
    } catch (error) {
      app.logger.error({ err: error, friendshipId }, 'Failed to accept friend request');
      throw error;
    }
  });

  // PUT /api/friends/:friendshipId/reject - Reject friend request
  app.fastify.put('/api/friends/:friendshipId/reject', {
    schema: {
      description: 'Reject friend request',
      tags: ['friends'],
      params: {
        type: 'object',
        required: ['friendshipId'],
        properties: {
          friendshipId: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: { success: { type: 'boolean' } },
        },
        401: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        403: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        404: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { friendshipId: string } }>, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { friendshipId } = request.params;

    app.logger.info({ friendshipId, userId: session.user.id }, 'Rejecting friend request');

    try {
      const friendship = await app.db.query.friendships.findFirst({
        where: eq(schema.friendships.id, friendshipId),
      });

      if (!friendship) {
        app.logger.warn({ friendshipId }, 'Friendship not found');
        return reply.status(404).send({ error: 'Friendship not found' });
      }

      if (friendship.friendId !== session.user.id) {
        app.logger.warn({ friendshipId, userId: session.user.id }, 'Not the recipient of this friend request');
        return reply.status(403).send({ error: 'Cannot reject this friend request' });
      }

      await app.db
        .update(schema.friendships)
        .set({ status: 'rejected' })
        .where(eq(schema.friendships.id, friendshipId));

      app.logger.info({ friendshipId }, 'Friend request rejected');
      return { success: true };
    } catch (error) {
      app.logger.error({ err: error, friendshipId }, 'Failed to reject friend request');
      throw error;
    }
  });

  // DELETE /api/friends/:friendshipId - Remove friend
  app.fastify.delete('/api/friends/:friendshipId', {
    schema: {
      description: 'Remove friend',
      tags: ['friends'],
      params: {
        type: 'object',
        required: ['friendshipId'],
        properties: {
          friendshipId: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: { success: { type: 'boolean' } },
        },
        401: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        403: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        404: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { friendshipId: string } }>, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { friendshipId } = request.params;

    app.logger.info({ friendshipId, userId: session.user.id }, 'Removing friend');

    try {
      const friendship = await app.db.query.friendships.findFirst({
        where: eq(schema.friendships.id, friendshipId),
      });

      if (!friendship) {
        app.logger.warn({ friendshipId }, 'Friendship not found');
        return reply.status(404).send({ error: 'Friendship not found' });
      }

      if (friendship.userId !== session.user.id && friendship.friendId !== session.user.id) {
        app.logger.warn({ friendshipId, userId: session.user.id }, 'Not part of this friendship');
        return reply.status(403).send({ error: 'Cannot remove this friendship' });
      }

      await app.db
        .delete(schema.friendships)
        .where(eq(schema.friendships.id, friendshipId));

      app.logger.info({ friendshipId }, 'Friend removed');
      return { success: true };
    } catch (error) {
      app.logger.error({ err: error, friendshipId }, 'Failed to remove friend');
      throw error;
    }
  });

  // GET /api/friends/pending - Returns pending friend requests
  app.fastify.get('/api/friends/pending', {
    schema: {
      description: 'Get pending friend requests',
      tags: ['friends'],
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              fromUser: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  gameTag: { type: 'string' },
                  avatar: { type: 'string' },
                },
              },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        401: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id }, 'Fetching pending friend requests');

    const pendingRequests = await app.db
      .select()
      .from(schema.friendships)
      .where(
        and(
          eq(schema.friendships.friendId, session.user.id),
          eq(schema.friendships.status, 'pending')
        )
      );

    const requests = await Promise.all(
      pendingRequests.map(async (friendship) => {
        const fromProfile = await app.db.query.gameProfile.findFirst({
          where: eq(schema.gameProfile.userId, friendship.userId),
        });

        const fromUser = await app.db.query.user.findFirst({
          where: eq(user.id, friendship.userId),
        });

        return {
          id: friendship.id,
          fromUser: {
            id: friendship.userId,
            name: fromUser?.name || '',
            gameTag: fromProfile?.gameTag || '',
            avatar: fromProfile?.avatar || '',
          },
          createdAt: friendship.createdAt,
        };
      })
    );

    app.logger.info({ userId: session.user.id, count: requests.length }, 'Pending requests fetched');
    return requests;
  });
}
