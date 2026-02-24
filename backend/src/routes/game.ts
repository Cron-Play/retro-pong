import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { WebSocket } from 'ws';
import { eq, and, or } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { user } from '../db/auth-schema.js';
import type { App } from '../index.js';

interface CreateGameInviteBody {
  friendGameTag: string;
}

interface GameFinishBody {
  winnerId: string;
}

interface GameMessage {
  type: string;
  y?: number;
  player?: number;
  x?: number;
  ballX?: number;
  ballY?: number;
  paddle1Y?: number;
  paddle2Y?: number;
  velocityX?: number;
  velocityY?: number;
  ballVelocityX?: number;
  ballVelocityY?: number;
  player1Score?: number;
  player2Score?: number;
}

// Track active WebSocket connections per room
const roomConnections = new Map<string, { player1?: WebSocket; player2?: WebSocket; hostId: string; guestId?: string }>();

export function registerGameRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // POST /api/game/create - Creates a new game room
  app.fastify.post('/api/game/create', {
    schema: {
      description: 'Create a new game room',
      tags: ['game'],
      response: {
        201: {
          type: 'object',
          properties: {
            roomId: { type: 'string', format: 'uuid' },
            hostId: { type: 'string' },
            status: { type: 'string' },
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

    app.logger.info({ userId: session.user.id }, 'Creating game room');

    try {
      const [room] = await app.db
        .insert(schema.gameRooms)
        .values({
          hostId: session.user.id,
          status: 'waiting',
        })
        .returning();

      app.logger.info({ roomId: room.id, hostId: session.user.id }, 'Game room created');
      return reply.status(201).send({
        roomId: room.id,
        hostId: room.hostId,
        status: room.status,
      });
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Failed to create game room');
      throw error;
    }
  });

  // POST /api/game/:roomId/invite - Invites friend to game room
  app.fastify.post('/api/game/:roomId/invite', {
    schema: {
      description: 'Invite friend to game room',
      tags: ['game'],
      params: {
        type: 'object',
        required: ['roomId'],
        properties: {
          roomId: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        required: ['friendGameTag'],
        properties: {
          friendGameTag: { type: 'string' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: { inviteId: { type: 'string', format: 'uuid' } },
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
  }, async (
    request: FastifyRequest<{ Params: { roomId: string }; Body: CreateGameInviteBody }>,
    reply: FastifyReply
  ) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { roomId } = request.params;
    const { friendGameTag } = request.body;

    app.logger.info({ roomId, userId: session.user.id, friendGameTag }, 'Creating game invite');

    try {
      // Verify room exists and user is host
      const room = await app.db.query.gameRooms.findFirst({
        where: eq(schema.gameRooms.id, roomId),
      });

      if (!room) {
        app.logger.warn({ roomId }, 'Game room not found');
        return reply.status(404).send({ error: 'Room not found' });
      }

      if (room.hostId !== session.user.id) {
        app.logger.warn({ roomId, userId: session.user.id }, 'Not the host of this room');
        return reply.status(403).send({ error: 'Only room host can invite players' });
      }

      // Find friend by gameTag
      const friendProfile = await app.db.query.gameProfile.findFirst({
        where: eq(schema.gameProfile.gameTag, friendGameTag),
      });

      if (!friendProfile) {
        app.logger.warn({ friendGameTag }, 'Friend not found');
        return reply.status(404).send({ error: 'Friend not found' });
      }

      // Create invite
      const [invite] = await app.db
        .insert(schema.gameInvites)
        .values({
          roomId,
          fromUserId: session.user.id,
          toUserId: friendProfile.userId,
          status: 'pending',
        })
        .returning();

      app.logger.info({ inviteId: invite.id, roomId }, 'Game invite created');
      return reply.status(201).send({ inviteId: invite.id });
    } catch (error) {
      app.logger.error({ err: error, roomId }, 'Failed to create game invite');
      throw error;
    }
  });

  // GET /api/game/invites - Returns pending game invites
  app.fastify.get('/api/game/invites', {
    schema: {
      description: 'Get pending game invites',
      tags: ['game'],
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              roomId: { type: 'string', format: 'uuid' },
              fromUser: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  gameTag: { type: 'string' },
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

    app.logger.info({ userId: session.user.id }, 'Fetching game invites');

    const invites = await app.db
      .select()
      .from(schema.gameInvites)
      .where(
        and(
          eq(schema.gameInvites.toUserId, session.user.id),
          eq(schema.gameInvites.status, 'pending')
        )
      );

    const result = await Promise.all(
      invites.map(async (invite) => {
        const fromProfile = await app.db.query.gameProfile.findFirst({
          where: eq(schema.gameProfile.userId, invite.fromUserId),
        });

        const fromUser = await app.db.query.user.findFirst({
          where: eq(user.id, invite.fromUserId),
        });

        return {
          id: invite.id,
          roomId: invite.roomId,
          fromUser: {
            name: fromUser?.name || '',
            gameTag: fromProfile?.gameTag || '',
          },
          createdAt: invite.createdAt,
        };
      })
    );

    app.logger.info({ userId: session.user.id, count: result.length }, 'Game invites fetched');
    return result;
  });

  // PUT /api/game/invites/:inviteId/accept - Accept game invite
  app.fastify.put('/api/game/invites/:inviteId/accept', {
    schema: {
      description: 'Accept game invite and join room',
      tags: ['game'],
      params: {
        type: 'object',
        required: ['inviteId'],
        properties: {
          inviteId: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            roomId: { type: 'string', format: 'uuid' },
            room: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                hostId: { type: 'string' },
                guestId: { type: 'string' },
                status: { type: 'string' },
              },
            },
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
  }, async (request: FastifyRequest<{ Params: { inviteId: string } }>, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { inviteId } = request.params;

    app.logger.info({ inviteId, userId: session.user.id }, 'Accepting game invite');

    try {
      const invite = await app.db.query.gameInvites.findFirst({
        where: eq(schema.gameInvites.id, inviteId),
      });

      if (!invite) {
        app.logger.warn({ inviteId }, 'Game invite not found');
        return reply.status(404).send({ error: 'Invite not found' });
      }

      if (invite.toUserId !== session.user.id) {
        app.logger.warn({ inviteId, userId: session.user.id }, 'Not the recipient of this invite');
        return reply.status(403).send({ error: 'Cannot accept this invite' });
      }

      // Update invite status
      await app.db
        .update(schema.gameInvites)
        .set({ status: 'accepted' })
        .where(eq(schema.gameInvites.id, inviteId));

      // Update room to add guest
      const [updatedRoom] = await app.db
        .update(schema.gameRooms)
        .set({ guestId: session.user.id, status: 'playing' })
        .where(eq(schema.gameRooms.id, invite.roomId))
        .returning();

      app.logger.info({ inviteId, roomId: invite.roomId }, 'Game invite accepted, room updated');
      return {
        roomId: updatedRoom.id,
        room: {
          id: updatedRoom.id,
          hostId: updatedRoom.hostId,
          guestId: updatedRoom.guestId,
          status: updatedRoom.status,
        },
      };
    } catch (error) {
      app.logger.error({ err: error, inviteId }, 'Failed to accept game invite');
      throw error;
    }
  });

  // PUT /api/game/invites/:inviteId/reject - Reject game invite
  app.fastify.put('/api/game/invites/:inviteId/reject', {
    schema: {
      description: 'Reject game invite',
      tags: ['game'],
      params: {
        type: 'object',
        required: ['inviteId'],
        properties: {
          inviteId: { type: 'string', format: 'uuid' },
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
  }, async (request: FastifyRequest<{ Params: { inviteId: string } }>, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { inviteId } = request.params;

    app.logger.info({ inviteId, userId: session.user.id }, 'Rejecting game invite');

    try {
      const invite = await app.db.query.gameInvites.findFirst({
        where: eq(schema.gameInvites.id, inviteId),
      });

      if (!invite) {
        app.logger.warn({ inviteId }, 'Game invite not found');
        return reply.status(404).send({ error: 'Invite not found' });
      }

      if (invite.toUserId !== session.user.id) {
        app.logger.warn({ inviteId, userId: session.user.id }, 'Not the recipient of this invite');
        return reply.status(403).send({ error: 'Cannot reject this invite' });
      }

      await app.db
        .update(schema.gameInvites)
        .set({ status: 'rejected' })
        .where(eq(schema.gameInvites.id, inviteId));

      app.logger.info({ inviteId }, 'Game invite rejected');
      return { success: true };
    } catch (error) {
      app.logger.error({ err: error, inviteId }, 'Failed to reject game invite');
      throw error;
    }
  });

  // GET /api/game/:roomId - Returns game room details
  app.fastify.get('/api/game/:roomId', {
    schema: {
      description: 'Get game room details',
      tags: ['game'],
      params: {
        type: 'object',
        required: ['roomId'],
        properties: {
          roomId: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            host: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                gameTag: { type: 'string' },
              },
            },
            guest: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                gameTag: { type: 'string' },
              },
            },
            status: { type: 'string' },
            gameState: { type: 'object' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        404: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { roomId: string } }>, reply: FastifyReply) => {
    const { roomId } = request.params;

    app.logger.info({ roomId }, 'Fetching game room details');

    try {
      const room = await app.db.query.gameRooms.findFirst({
        where: eq(schema.gameRooms.id, roomId),
      });

      if (!room) {
        app.logger.warn({ roomId }, 'Game room not found');
        return reply.status(404).send({ error: 'Room not found' });
      }

      const hostProfile = await app.db.query.gameProfile.findFirst({
        where: eq(schema.gameProfile.userId, room.hostId),
      });

      const hostUser = await app.db.query.user.findFirst({
        where: eq(user.id, room.hostId),
      });

      let guestData = null;
      if (room.guestId) {
        const guestProfile = await app.db.query.gameProfile.findFirst({
          where: eq(schema.gameProfile.userId, room.guestId),
        });

        const guestUser = await app.db.query.user.findFirst({
          where: eq(user.id, room.guestId),
        });

        guestData = {
          id: room.guestId,
          name: guestUser?.name || '',
          gameTag: guestProfile?.gameTag || '',
        };
      }

      const result = {
        id: room.id,
        host: {
          id: room.hostId,
          name: hostUser?.name || '',
          gameTag: hostProfile?.gameTag || '',
        },
        guest: guestData,
        status: room.status,
        gameState: room.gameState,
        createdAt: room.createdAt,
      };

      app.logger.info({ roomId }, 'Game room details fetched');
      return result;
    } catch (error) {
      app.logger.error({ err: error, roomId }, 'Failed to fetch game room');
      throw error;
    }
  });

  // DELETE /api/game/:roomId - Deletes game room
  app.fastify.delete('/api/game/:roomId', {
    schema: {
      description: 'Delete game room',
      tags: ['game'],
      params: {
        type: 'object',
        required: ['roomId'],
        properties: {
          roomId: { type: 'string', format: 'uuid' },
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
  }, async (request: FastifyRequest<{ Params: { roomId: string } }>, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { roomId } = request.params;

    app.logger.info({ roomId, userId: session.user.id }, 'Deleting game room');

    try {
      const room = await app.db.query.gameRooms.findFirst({
        where: eq(schema.gameRooms.id, roomId),
      });

      if (!room) {
        app.logger.warn({ roomId }, 'Game room not found');
        return reply.status(404).send({ error: 'Room not found' });
      }

      if (room.hostId !== session.user.id) {
        app.logger.warn({ roomId, userId: session.user.id }, 'Not the host of this room');
        return reply.status(403).send({ error: 'Only room host can delete room' });
      }

      await app.db.delete(schema.gameRooms).where(eq(schema.gameRooms.id, roomId));

      app.logger.info({ roomId }, 'Game room deleted');
      return { success: true };
    } catch (error) {
      app.logger.error({ err: error, roomId }, 'Failed to delete game room');
      throw error;
    }
  });

  // GET /api/game/active - Returns user's active game rooms
  app.fastify.get('/api/game/active', {
    schema: {
      description: "Get user's active game rooms",
      tags: ['game'],
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              host: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  gameTag: { type: 'string' },
                },
              },
              guest: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  gameTag: { type: 'string' },
                },
              },
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

    app.logger.info({ userId: session.user.id }, 'Fetching active game rooms');

    // Get all rooms and filter for current user
    const allRooms = await app.db
      .select()
      .from(schema.gameRooms);

    const userRooms = allRooms.filter(
      r => r.hostId === session.user.id || r.guestId === session.user.id
    );

    const result = await Promise.all(
      userRooms.map(async (room) => {
        const hostProfile = await app.db.query.gameProfile.findFirst({
          where: eq(schema.gameProfile.userId, room.hostId),
        });

        const hostUser = await app.db.query.user.findFirst({
          where: eq(user.id, room.hostId),
        });

        let guestData = null;
        if (room.guestId) {
          const guestProfile = await app.db.query.gameProfile.findFirst({
            where: eq(schema.gameProfile.userId, room.guestId),
          });

          const guestUser = await app.db.query.user.findFirst({
            where: eq(user.id, room.guestId),
          });

          guestData = {
            id: room.guestId,
            name: guestUser?.name || '',
            gameTag: guestProfile?.gameTag || '',
          };
        }

        return {
          id: room.id,
          host: {
            id: room.hostId,
            name: hostUser?.name || '',
            gameTag: hostProfile?.gameTag || '',
          },
          guest: guestData,
          status: room.status,
          createdAt: room.createdAt,
        };
      })
    );

    app.logger.info({ userId: session.user.id, count: result.length }, 'Active rooms fetched');
    return result;
  });

  // POST /api/game/:roomId/finish - Marks game as finished
  app.fastify.post('/api/game/:roomId/finish', {
    schema: {
      description: 'Mark game as finished and update stats',
      tags: ['game'],
      params: {
        type: 'object',
        required: ['roomId'],
        properties: {
          roomId: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        required: ['winnerId'],
        properties: {
          winnerId: { type: 'string' },
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
        404: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (
    request: FastifyRequest<{ Params: { roomId: string }; Body: GameFinishBody }>,
    reply: FastifyReply
  ) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { roomId } = request.params;
    const { winnerId } = request.body;

    app.logger.info({ roomId, winnerId }, 'Finishing game');

    try {
      const room = await app.db.query.gameRooms.findFirst({
        where: eq(schema.gameRooms.id, roomId),
      });

      if (!room) {
        app.logger.warn({ roomId }, 'Game room not found');
        return reply.status(404).send({ error: 'Room not found' });
      }

      // Update room status and winner
      await app.db
        .update(schema.gameRooms)
        .set({ status: 'finished', winnerId })
        .where(eq(schema.gameRooms.id, roomId));

      // Update stats for both players
      const loser = winnerId === room.hostId ? room.guestId : room.hostId;

      // Update winner stats
      const winnerProfile = await app.db.query.gameProfile.findFirst({
        where: eq(schema.gameProfile.userId, winnerId),
      });

      if (winnerProfile) {
        await app.db
          .update(schema.gameProfile)
          .set({
            wins: winnerProfile.wins + 1,
            totalGames: winnerProfile.totalGames + 1,
          })
          .where(eq(schema.gameProfile.userId, winnerId));
      }

      // Update loser stats
      if (loser) {
        const loserProfile = await app.db.query.gameProfile.findFirst({
          where: eq(schema.gameProfile.userId, loser),
        });

        if (loserProfile) {
          await app.db
            .update(schema.gameProfile)
            .set({
              losses: loserProfile.losses + 1,
              totalGames: loserProfile.totalGames + 1,
            })
            .where(eq(schema.gameProfile.userId, loser));
        }
      }

      app.logger.info({ roomId, winnerId }, 'Game finished, stats updated');
      return { success: true };
    } catch (error) {
      app.logger.error({ err: error, roomId }, 'Failed to finish game');
      throw error;
    }
  });

  // WebSocket endpoint for real-time game updates
  app.fastify.route({
    method: 'GET',
    url: '/ws/game/:roomId',
    schema: {
      description: 'WebSocket endpoint for real-time multiplayer game. Send bearer token as first message to authenticate.',
      tags: ['websocket'],
      params: {
        type: 'object',
        required: ['roomId'],
        properties: {
          roomId: { type: 'string', format: 'uuid' },
        },
      },
    },
    wsHandler: (socket, request) => {
      const roomId = (request.params as any).roomId;
      let playerNumber: 1 | 2 | null = null;
      let authenticated = false;

      app.logger.info({ roomId }, 'WebSocket client connecting to game room');

      socket.on('message', async (raw) => {
        const data = raw.toString();

        // First message must be userId for authentication
        if (!authenticated) {
          try {
            const authData = JSON.parse(data);
            const userId = authData.userId;

            if (!userId) {
              app.logger.warn({ roomId }, 'WebSocket missing userId');
              socket.send(JSON.stringify({ error: 'Missing userId' }));
              socket.close();
              return;
            }

            // Verify room exists and user is in it
            const room = await app.db.query.gameRooms.findFirst({
              where: eq(schema.gameRooms.id, roomId),
            });

            if (!room) {
              app.logger.warn({ roomId }, 'Game room not found');
              socket.send(JSON.stringify({ error: 'Room not found' }));
              socket.close();
              return;
            }

            // Determine player number
            if (room.hostId === userId) {
              playerNumber = 1;
            } else if (room.guestId === userId) {
              playerNumber = 2;
            } else {
              app.logger.warn({ roomId, userId }, 'User not in this room');
              socket.send(JSON.stringify({ error: 'Not in this room' }));
              socket.close();
              return;
            }

            authenticated = true;

            // Initialize room connection tracker
            if (!roomConnections.has(roomId)) {
              roomConnections.set(roomId, { hostId: room.hostId, guestId: room.guestId });
            }

            const roomState = roomConnections.get(roomId)!;
            if (playerNumber === 1) {
              roomState.player1 = socket;
            } else {
              roomState.player2 = socket;
            }

            app.logger.info({ roomId, playerNumber, userId }, 'Player authenticated and joined');
            socket.send(JSON.stringify({ type: 'authenticated', player: playerNumber }));

            // Notify other player if connected
            const otherSocket = playerNumber === 1 ? roomState.player2 : roomState.player1;
            if (otherSocket && otherSocket.readyState === WebSocket.OPEN) {
              otherSocket.send(JSON.stringify({ type: 'player_joined', player: playerNumber }));
            }
            return;
          } catch (error) {
            app.logger.warn({ err: error, roomId }, 'Invalid authentication message');
            socket.send(JSON.stringify({ error: 'Invalid auth format' }));
            socket.close();
            return;
          }
        }

        // Parse game message
        try {
          const message: GameMessage = JSON.parse(data);

          // Broadcast game state to both players
          if (message.type === 'game_state') {
            const roomState = roomConnections.get(roomId);
            if (roomState) {
              const broadcast = {
                type: 'game_state',
                paddle1Y: message.paddle1Y,
                paddle2Y: message.paddle2Y,
                ballX: message.ballX,
                ballY: message.ballY,
                ballVelocityX: message.ballVelocityX,
                ballVelocityY: message.ballVelocityY,
                player1Score: message.player1Score,
                player2Score: message.player2Score,
              };

              if (roomState.player1 && roomState.player1.readyState === WebSocket.OPEN) {
                roomState.player1.send(JSON.stringify(broadcast));
              }
              if (roomState.player2 && roomState.player2.readyState === WebSocket.OPEN) {
                roomState.player2.send(JSON.stringify(broadcast));
              }
            }
          } else {
            app.logger.debug({ roomId, playerNumber, messageType: message.type }, 'Game message received');
          }
        } catch (error) {
          app.logger.warn({ err: error, roomId }, 'Invalid JSON message from WebSocket');
          socket.send(JSON.stringify({ type: 'error', content: 'Invalid JSON' }));
        }
      });

      socket.on('close', () => {
        if (authenticated && playerNumber) {
          app.logger.info({ roomId, playerNumber }, 'Player disconnected');

          const roomState = roomConnections.get(roomId);
          if (roomState) {
            if (playerNumber === 1) {
              roomState.player1 = undefined;
            } else {
              roomState.player2 = undefined;
            }

            // Notify other player
            const otherSocket = playerNumber === 1 ? roomState.player2 : roomState.player1;
            if (otherSocket && otherSocket.readyState === WebSocket.OPEN) {
              otherSocket.send(JSON.stringify({ type: 'player_left', player: playerNumber }));
            }

            // Clean up if both players disconnected
            if (!roomState.player1 && !roomState.player2) {
              roomConnections.delete(roomId);
            }
          }
        }
      });
    },
    handler: async (request, reply) => {
      return { protocol: 'ws', path: `/ws/game/${(request.params as any).roomId}` };
    },
  });
}
