import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { user } from '../db/auth-schema.js';
import type { App } from '../index.js';

interface UpdateProfileBody {
  name?: string;
  gameTag?: string;
  avatar?: string;
}

export function registerProfileRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/profile - Returns current user profile
  app.fastify.get('/api/profile', {
    schema: {
      description: 'Get current user profile',
      tags: ['profile'],
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            gameTag: { type: 'string' },
            avatar: { type: 'string' },
            wins: { type: 'integer' },
            losses: { type: 'integer' },
            totalGames: { type: 'integer' },
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

    app.logger.info({ userId: session.user.id }, 'Fetching user profile');

    try {
      let profile = await app.db.query.gameProfile.findFirst({
        where: eq(schema.gameProfile.userId, session.user.id),
      });

      // Create profile if it doesn't exist
      if (!profile) {
        app.logger.info({ userId: session.user.id }, 'Creating game profile for user');
        const defaultGameTag = `player_${session.user.id.slice(0, 8)}`;

        const [newProfile] = await app.db
          .insert(schema.gameProfile)
          .values({
            userId: session.user.id,
            gameTag: defaultGameTag,
            avatar: null,
            wins: 0,
            losses: 0,
            totalGames: 0,
          })
          .onConflictDoNothing()
          .returning();

        if (!newProfile) {
          // If insert failed due to conflict, fetch the existing one
          profile = await app.db.query.gameProfile.findFirst({
            where: eq(schema.gameProfile.userId, session.user.id),
          });
        } else {
          profile = newProfile;
        }
      }

      if (!profile) {
        app.logger.warn({ userId: session.user.id }, 'Profile not found');
        return reply.status(404).send({ error: 'Profile not found' });
      }

      const result = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        gameTag: profile.gameTag,
        avatar: profile.avatar,
        wins: profile.wins,
        losses: profile.losses,
        totalGames: profile.totalGames,
      };

      app.logger.info({ userId: session.user.id }, 'Profile fetched successfully');
      return result;
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Failed to fetch profile');
      throw error;
    }
  });

  // PUT /api/profile - Updates user profile
  app.fastify.put('/api/profile', {
    schema: {
      description: 'Update user profile',
      tags: ['profile'],
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          gameTag: { type: 'string' },
          avatar: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            gameTag: { type: 'string' },
            avatar: { type: 'string' },
            wins: { type: 'integer' },
            losses: { type: 'integer' },
            totalGames: { type: 'integer' },
          },
        },
        401: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        409: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (
    request: FastifyRequest<{ Body: UpdateProfileBody }>,
    reply: FastifyReply
  ) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { name, gameTag, avatar } = request.body;

    app.logger.info({ userId: session.user.id, body: request.body }, 'Updating user profile');

    try {
      // Check if gameTag is already taken (if provided)
      if (gameTag) {
        const existingTag = await app.db.query.gameProfile.findFirst({
          where: eq(schema.gameProfile.gameTag, gameTag),
        });

        if (existingTag && existingTag.userId !== session.user.id) {
          app.logger.warn({ gameTag, userId: session.user.id }, 'Game tag already taken');
          return reply.status(409).send({ error: 'Game tag already taken' });
        }
      }

      // Update game profile
      const [updated] = await app.db.update(schema.gameProfile)
        .set({
          gameTag: gameTag || undefined,
          avatar: avatar || undefined,
        })
        .where(eq(schema.gameProfile.userId, session.user.id))
        .returning();

      if (!updated) {
        app.logger.warn({ userId: session.user.id }, 'Profile not found for update');
        return reply.status(404).send({ error: 'Profile not found' });
      }

      const result = {
        id: session.user.id,
        email: session.user.email,
        name: name || session.user.name,
        gameTag: updated.gameTag,
        avatar: updated.avatar,
        wins: updated.wins,
        losses: updated.losses,
        totalGames: updated.totalGames,
      };

      app.logger.info({ userId: session.user.id }, 'Profile updated successfully');
      return result;
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Failed to update profile');
      throw error;
    }
  });

  // GET /api/profile/:gameTag - Returns public profile by gameTag
  app.fastify.get('/api/profile/:gameTag', {
    schema: {
      description: 'Get public profile by game tag',
      tags: ['profile'],
      params: {
        type: 'object',
        required: ['gameTag'],
        properties: {
          gameTag: { type: 'string', description: 'Game tag' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            gameTag: { type: 'string' },
            avatar: { type: 'string' },
            wins: { type: 'integer' },
            losses: { type: 'integer' },
            totalGames: { type: 'integer' },
          },
        },
        404: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { gameTag: string } }>, reply: FastifyReply) => {
    const { gameTag } = request.params;

    app.logger.info({ gameTag }, 'Fetching public profile');

    const profile = await app.db.query.gameProfile.findFirst({
      where: eq(schema.gameProfile.gameTag, gameTag),
    });

    if (!profile) {
      app.logger.warn({ gameTag }, 'Public profile not found');
      return reply.status(404).send({ error: 'Profile not found' });
    }

    // Get user info from Better Auth user table
    const userData = await app.db.query.user.findFirst({
      where: eq(user.id, profile.userId),
    });

    if (!userData) {
      app.logger.warn({ userId: profile.userId }, 'User not found for profile');
      return reply.status(404).send({ error: 'User not found' });
    }

    const result = {
      id: profile.userId,
      name: userData.name,
      gameTag: profile.gameTag,
      avatar: profile.avatar,
      wins: profile.wins,
      losses: profile.losses,
      totalGames: profile.totalGames,
    };

    app.logger.info({ gameTag }, 'Public profile fetched successfully');
    return result;
  });
}
