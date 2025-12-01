const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const db = require('./lib/db');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    const httpServer = createServer(async (req, res) => {
        try {
            const parsedUrl = parse(req.url, true);
            const { pathname, query } = parsedUrl;

            if (pathname === '/a') {
                await app.render(req, res, '/a', query);
            } else if (pathname === '/b') {
                await app.render(req, res, '/b', query);
            } else {
                await handle(req, res, parsedUrl);
            }
        } catch (err) {
            console.error('Error occurred handling', req.url, err);
            res.statusCode = 500;
            res.end('internal server error');
        }
    });

    const io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    const channels = {
        1: new Map(),
        2: new Map(),
        3: new Map(),
    };

    const MAX_PLAYERS_PER_CHANNEL = 10;
    const userSessions = new Map(); // userId -> {socketId, username}

    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);
        let currentChannel = null;
        let userId = null;
        let sessionId = null;
        let username = null;

        // Validate session
        socket.on('validate_session', async ({ userId: uid, sessionId: sid, username: uname }) => {
            userId = uid;
            sessionId = sid;
            username = uname;

            console.log(`[Session Validation] User ${userId} (${username}) attempting to connect`);

            const existingSession = userSessions.get(userId);
            if (existingSession && existingSession.socketId !== socket.id) {
                console.log(`[Session Conflict] Disconnecting old socket ${existingSession.socketId}`);
                const oldSocket = io.sockets.sockets.get(existingSession.socketId);
                if (oldSocket) {
                    oldSocket.emit('session_replaced', { message: 'Tài khoản đã đăng nhập ở tab khác' });
                    oldSocket.disconnect(true);
                }
            }

            userSessions.set(userId, { socketId: socket.id, username });
            socket.emit('session_validated', { success: true });
            console.log(`[Session Registered] User ${userId} (${username})`);
        });

        // Join channel
        socket.on('join_channel', ({ channelId, playerData }) => {
            if (![1, 2, 3].includes(channelId)) {
                socket.emit('error', 'Invalid channel');
                return;
            }

            if (channels[channelId].size >= MAX_PLAYERS_PER_CHANNEL) {
                socket.emit('channel_full', { channelId });
                return;
            }

            if (currentChannel) {
                socket.leave(`channel_${currentChannel}`);
                channels[currentChannel].delete(socket.id);
                io.to(`channel_${currentChannel}`).emit('player_left', socket.id);
            }

            currentChannel = channelId;
            socket.join(`channel_${currentChannel}`);

            channels[channelId].set(socket.id, {
                id: socket.id,
                userId: userId,
                username: username,
                ...playerData
            });

            const playersInChannel = Array.from(channels[channelId].values())
                .filter(p => p.userId !== userId);

            socket.emit('channel_joined', {
                channelId,
                players: playersInChannel
            });

            socket.to(`channel_${channelId}`).emit('player_joined', {
                id: socket.id,
                userId: userId,
                username: username,
                ...playerData
            });

            console.log(`User ${userId} (${username}) joined channel ${channelId}`);
        });

        // Player movement
        socket.on('player_move', (data) => {
            if (!currentChannel) return;

            const player = channels[currentChannel].get(socket.id);
            if (player) {
                const updatedPlayer = { ...player, ...data };
                channels[currentChannel].set(socket.id, updatedPlayer);

                socket.to(`channel_${currentChannel}`).emit('player_moved', {
                    id: socket.id,
                    ...data
                });
            }
        });

        // Chat messages
        socket.on('send_chat', async ({ message, channelId }) => {
            if (!currentChannel || !userId || !username) return;

            const chatMessage = {
                id: `${socket.id}-${Date.now()}`,
                userId: userId,
                username: username,
                message: message,
                timestamp: Date.now()
            };

            // Lưu vào database
            try {
                await db.query(
                    'INSERT INTO chat_messages (user_id, username, channel_id, message) VALUES (?, ?, ?, ?)',
                    [userId, username, currentChannel, message]
                );
            } catch (err) {
                console.error('Error saving chat:', err);
            }

            io.to(`channel_${currentChannel}`).emit('chat_message', chatMessage);
            console.log(`[Chat] ${username}: ${message}`);
        });

        // Friend requests
        socket.on('send_friend_request', ({ toUserId, toUsername }) => {
            if (!userId || !username) return;

            const targetSession = userSessions.get(toUserId);
            if (targetSession) {
                const requestId = `${userId}-${toUserId}-${Date.now()}`;

                io.to(targetSession.socketId).emit('friend_request', {
                    requestId,
                    fromUserId: userId,
                    fromUsername: username,
                    timestamp: Date.now()
                });

                console.log(`[Friend Request] ${username} -> User ${toUserId}`);
            }
        });

        // Friend request response
        socket.on('friend_request_response', async ({ requestId, fromUserId, accepted }) => {
            if (!userId || !username) return;

            if (accepted) {
                console.log(`[Friend Request] ${username} accepted from User ${fromUserId}`);

                // Lưu vào database trực tiếp
                try {
                    // Kiểm tra xem đã là bạn bè chưa
                    const [existing] = await db.query(
                        `SELECT * FROM friends 
                         WHERE (user_id_1 = ? AND user_id_2 = ?) 
                         OR (user_id_1 = ? AND user_id_2 = ?)`,
                        [fromUserId, userId, userId, fromUserId]
                    );

                    if (existing.length > 0) {
                        await db.query(
                            `UPDATE friends SET status = 'accepted', updated_at = NOW() 
                             WHERE (user_id_1 = ? AND user_id_2 = ?) 
                             OR (user_id_1 = ? AND user_id_2 = ?)`,
                            [fromUserId, userId, userId, fromUserId]
                        );
                    } else {
                        await db.query(
                            'INSERT INTO friends (user_id_1, user_id_2, status) VALUES (?, ?, ?)',
                            [fromUserId, userId, 'accepted']
                        );
                    }
                    console.log('[Friend Request] Saved to database');
                } catch (err) {
                    console.error('[Friend Request] Error saving to database:', err);
                }

                const targetSession = userSessions.get(fromUserId);
                if (targetSession) {
                    io.to(targetSession.socketId).emit('friend_request_response', {
                        success: true,
                        message: `${username} đã chấp nhận lời mời kết bạn!`
                    });
                }

                socket.emit('friend_request_response', {
                    success: true,
                    message: 'Đã kết bạn thành công!'
                });
            } else {
                console.log(`[Friend Request] ${username} rejected from User ${fromUserId}`);
            }
        });

        // Disconnect
        socket.on('disconnect', () => {
            if (currentChannel) {
                channels[currentChannel].delete(socket.id);
                io.to(`channel_${currentChannel}`).emit('player_left', socket.id);
            }

            if (userId) {
                const session = userSessions.get(userId);
                if (session && session.socketId === socket.id) {
                    userSessions.delete(userId);
                }
            }

            console.log('Client disconnected:', socket.id);
        });
    });

    httpServer
        .once('error', (err) => {
            console.error(err);
            process.exit(1);
        })
        .listen(port, () => {
            console.log(`> Ready on http://${hostname}:${port}`);
        });
});
