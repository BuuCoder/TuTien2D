// Load environment variables
require('dotenv').config();

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const db = require('./lib/db');
const { verifyToken } = require('./lib/jwt');
const rateLimiter = require('./lib/rateLimiter');
const validator = require('./lib/validator');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 4004;
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
    
    // Monster system
    const { MAP_MONSTERS } = require('./lib/monsterData');
    const monsterStates = new Map(); // monsterId -> {hp, isDead, respawnTimer, ...}
    
    // Initialize monsters
    Object.keys(MAP_MONSTERS).forEach(mapId => {
        MAP_MONSTERS[mapId].forEach(monster => {
            monsterStates.set(monster.monsterId, {
                ...monster,
                hp: monster.maxHp,
                isDead: false
            });
        });
    });

    // Cleanup rate limiter mỗi 5 phút
    setInterval(() => {
        rateLimiter.cleanup();
    }, 5 * 60 * 1000);

    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);
        let currentChannel = null;
        let userId = null;
        let sessionId = null;
        let username = null;
        let isAuthenticated = false; // Flag để kiểm tra đã xác thực chưa
        let lastPosition = { x: 0, y: 0 };
        let lastMoveTime = Date.now();
        let skillCooldowns = new Map(); // Server-side skill cooldowns

        // Request monsters for a map (register early)
        socket.on('request_monsters', ({ mapId }) => {
            const mapMonsters = MAP_MONSTERS[mapId] || [];
            
            const monstersWithState = mapMonsters.map(monster => {
                const state = monsterStates.get(monster.monsterId);
                return state || {
                    ...monster,
                    hp: monster.maxHp,
                    isDead: false
                };
            });

            socket.emit('monsters_data', {
                mapId,
                monsters: monstersWithState
            });
        });

        // Validate session với JWT token
        socket.on('validate_session', async ({ userId: uid, sessionId: sid, username: uname, token }) => {
            // Kiểm tra token
            if (!token) {
                console.log(`[Auth] No token provided for user ${uid}`);
                socket.emit('auth_error', { message: 'Token không hợp lệ' });
                socket.disconnect(true);
                return;
            }

            // Xác thực token
            const tokenResult = verifyToken(token);
            if (!tokenResult.valid) {
                console.log(`[Auth] Invalid token for user ${uid}: ${tokenResult.error}`);
                socket.emit('auth_error', { message: 'Token không hợp lệ hoặc đã hết hạn' });
                socket.disconnect(true);
                return;
            }

            // Kiểm tra token data khớp với thông tin gửi lên
            const tokenData = tokenResult.data;
            if (tokenData.userId !== uid || tokenData.username !== uname || tokenData.sessionId !== sid) {
                console.log(`[Auth] Token data mismatch for user ${uid}`);
                socket.emit('auth_error', { message: 'Thông tin xác thực không khớp' });
                socket.disconnect(true);
                return;
            }

            userId = uid;
            sessionId = sid;
            username = uname;
            isAuthenticated = true;

            console.log(`[Session Validation] User ${userId} (${username}) authenticated successfully`);

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
            if (!isAuthenticated) {
                socket.emit('error', 'Chưa xác thực');
                return;
            }

            if (![1, 2, 3].includes(channelId)) {
                socket.emit('error', 'Invalid channel');
                return;
            }

            // Nếu đang ở trong kênh này rồi thì không cần check full
            if (currentChannel !== channelId && channels[channelId].size >= MAX_PLAYERS_PER_CHANNEL) {
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
                mapId: playerData.mapId || 'map1', // Default to map1
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
                mapId: playerData.mapId || 'map1',
                ...playerData
            });

            console.log(`User ${userId} (${username}) joined channel ${channelId}`);
        });

        // Player movement với validation và rate limiting
        socket.on('player_move', (data) => {
            if (!isAuthenticated || !currentChannel) return;

            // Rate limiting
            const rateCheck = rateLimiter.check(userId, 'player_move');
            if (!rateCheck.allowed) {
                socket.emit('error', rateCheck.reason);
                return;
            }

            // Validate position
            const posCheck = validator.validatePosition(data.x, data.y, 2000, 2000);
            if (!posCheck.valid) {
                console.log(`[Security] Invalid position from ${username}: ${posCheck.reason}`);
                return;
            }

            // Validate movement speed (chống teleport)
            const now = Date.now();
            const deltaTime = now - lastMoveTime;
            if (deltaTime > 10) { // Chỉ check nếu > 10ms
                const moveCheck = validator.validateMovement(lastPosition, data, 10, deltaTime);
                if (!moveCheck.valid) {
                    console.log(`[Security] Suspicious movement from ${username}: ${moveCheck.reason}`);
                    // Không return, chỉ log để tránh false positive do lag
                }
            }

            lastPosition = { x: data.x, y: data.y };
            lastMoveTime = now;

            const player = channels[currentChannel].get(socket.id);
            if (player) {
                // Include mapId in player data
                const updatedPlayer = { 
                    ...player, 
                    ...data,
                    mapId: data.mapId || player.mapId || 'map1' // Default to map1 if not provided
                };
                channels[currentChannel].set(socket.id, updatedPlayer);

                socket.to(`channel_${currentChannel}`).emit('player_moved', {
                    id: socket.id,
                    ...data,
                    mapId: updatedPlayer.mapId
                });
            }
        });

        // PK Request - Chỉ gửi cho người được mời
        socket.on('send_pk_request', ({ requestId, toSocketId, toUserId, toUsername }) => {
            if (!isAuthenticated || !currentChannel || !userId || !username) return;

            // Rate limiting
            const rateCheck = rateLimiter.check(userId, 'send_pk_request');
            if (!rateCheck.allowed) {
                socket.emit('error', rateCheck.reason);
                return;
            }

            console.log(`[PK] ${username} sent PK request to ${toUsername}`);

            const targetSocket = io.sockets.sockets.get(toSocketId);
            if (targetSocket) {
                // CHỈ gửi cho người được mời, không broadcast
                targetSocket.emit('pk_request', {
                    requestId,
                    fromUserId: userId,
                    fromUsername: username,
                    fromSocketId: socket.id,
                    timestamp: Date.now(),
                    expiresAt: Date.now() + 10000 // 10 seconds
                });
            } else {
                socket.emit('pk_request_error', { message: `${toUsername} không trực tuyến!` });
            }
        });

        // PK Request Response - Chỉ gửi cho người gửi request
        socket.on('pk_request_response', ({ requestId, fromSocketId, accepted }) => {
            if (!isAuthenticated || !currentChannel || !userId || !username) return;

            console.log(`[PK] ${username} ${accepted ? 'accepted' : 'declined'} PK from ${fromSocketId}`);

            const requesterSocket = io.sockets.sockets.get(fromSocketId);
            if (requesterSocket) {
                // CHỈ gửi cho người gửi request, không broadcast
                requesterSocket.emit('pk_request_response', {
                    requestId,
                    accepted,
                    targetSocketId: socket.id,
                    targetUsername: username,
                    message: accepted 
                        ? `${username} đã chấp nhận PK!` 
                        : `${username} đã từ chối PK.`
                });
            }
        });

        // Combat: Use skill - Chỉ gửi cho target nếu có
        socket.on('use_skill', ({ skillId, targetId, position, isPK }) => {
            if (!isAuthenticated || !currentChannel) return;

            // Rate limiting
            const rateCheck = rateLimiter.check(userId, 'use_skill');
            if (!rateCheck.allowed) {
                socket.emit('error', rateCheck.reason);
                return;
            }

            // Validate skill
            const skillCheck = validator.validateSkillUsage(skillId, {}, skillCooldowns);
            if (!skillCheck.valid) {
                console.log(`[Security] Invalid skill usage from ${username}: ${skillCheck.reason}`);
                return;
            }

            // Set server-side cooldown
            const cooldownDurations = {
                'basic-attack': 1000,
                'slash': 2000,
                'charge': 3000,
                'fireball': 4000,
                'ice-spike': 5000,
                'heal': 10000,
                'holy-strike': 8000,
                'block': 5000
            };
            skillCooldowns.set(skillId, Date.now() + (cooldownDurations[skillId] || 1000));

            console.log(`[Combat] ${username} used skill ${skillId} on ${targetId || 'position'} (PK: ${isPK})`);

            const skillData = {
                casterId: socket.id,
                casterUserId: userId,
                casterUsername: username,
                skillId,
                targetId,
                position,
                timestamp: Date.now()
            };

            // Nếu là PK, chỉ gửi cho 2 người chơi
            if (isPK && targetId) {
                // Gửi cho target
                const targetSocket = io.sockets.sockets.get(targetId);
                if (targetSocket) {
                    targetSocket.emit('skill_used', skillData);
                }
                // Gửi lại cho caster (để hiển thị animation)
                socket.emit('skill_used', skillData);
            } else {
                // Broadcast cho tất cả trong channel (PvE hoặc không có target)
                io.to(`channel_${currentChannel}`).emit('skill_used', skillData);
            }
        });

        // Combat: Take damage - Chỉ gửi cho target
        socket.on('take_damage', ({ damage, attackerId, targetId, skillId, isPK }) => {
            if (!isAuthenticated || !currentChannel) return;

            console.log(`[Combat] Damage request: ${damage} from ${attackerId} (${socket.id}) to ${targetId} (PK: ${isPK})`);

            // Verify attacker is the one sending
            if (attackerId !== socket.id) {
                console.log('[Combat] ERROR: Attacker ID mismatch!');
                return;
            }

            // Send damage ONLY to specific target
            const targetSocket = io.sockets.sockets.get(targetId);
            if (targetSocket) {
                console.log(`[Combat] Sending damage to target ${targetId}`);
                targetSocket.emit('player_damaged', {
                    playerId: targetId,
                    damage,
                    attackerId,
                    skillId,
                    isPK,
                    timestamp: Date.now()
                });
            } else {
                console.log(`[Combat] Target ${targetId} not found`);
            }
        });

        // Combat: Player death - Chỉ gửi cho killer nếu là PK
        socket.on('player_death', ({ killerId, isPK }) => {
            if (!isAuthenticated || !currentChannel) return;

            console.log(`[Combat] ${username} was killed by ${killerId} (PK: ${isPK})`);

            const deathData = {
                playerId: socket.id,
                playerUsername: username,
                killerId,
                isPK,
                timestamp: Date.now()
            };

            // Nếu là PK, chỉ gửi cho killer
            if (isPK && killerId) {
                const killerSocket = io.sockets.sockets.get(killerId);
                if (killerSocket) {
                    killerSocket.emit('player_died', deathData);
                }
            } else {
                // Broadcast cho tất cả trong channel (PvE)
                io.to(`channel_${currentChannel}`).emit('player_died', deathData);
            }
        });

        // Combat: HP Update - Chỉ gửi cho opponent nếu đang PK
        socket.on('update_hp', ({ hp, maxHp, opponentId, isPK }) => {
            if (!isAuthenticated || !currentChannel) return;

            const player = channels[currentChannel].get(socket.id);
            if (player) {
                player.hp = hp;
                player.maxHp = maxHp;
                channels[currentChannel].set(socket.id, player);
            }

            const hpData = {
                playerId: socket.id,
                hp,
                maxHp,
                timestamp: Date.now()
            };

            // Nếu đang PK, chỉ gửi cho opponent
            if (isPK && opponentId) {
                const opponentSocket = io.sockets.sockets.get(opponentId);
                if (opponentSocket) {
                    opponentSocket.emit('player_hp_updated', hpData);
                }
            } else {
                // Broadcast cho tất cả trong channel
                io.to(`channel_${currentChannel}`).emit('player_hp_updated', hpData);
            }
        });

        // PK Forfeit (player left map) - Chỉ gửi cho opponent
        socket.on('pk_forfeit', ({ opponentId, reason }) => {
            if (!isAuthenticated || !currentChannel) return;

            console.log(`[PK] ${username} forfeited against ${opponentId} (${reason})`);

            // CHỈ gửi cho opponent
            const opponentSocket = io.sockets.sockets.get(opponentId);
            if (opponentSocket) {
                opponentSocket.emit('pk_forfeit', {
                    playerId: socket.id,
                    playerUsername: username,
                    reason
                });
            }
        });

        // PK Ended - Chỉ gửi cho opponent
        socket.on('pk_ended', ({ opponentId, winner, reason }) => {
            if (!isAuthenticated || !currentChannel) return;

            console.log(`[PK] Battle ended between ${socket.id} and ${opponentId}, winner: ${winner}`);

            // CHỈ gửi cho opponent
            const opponentSocket = io.sockets.sockets.get(opponentId);
            if (opponentSocket) {
                opponentSocket.emit('pk_ended', {
                    opponentId: socket.id,
                    winner,
                    reason
                });
            }
        });

        // Load chat history for map and channel
        socket.on('load_chat_history', async ({ mapId, channelId }) => {
            if (!mapId || !channelId) return;

            try {
                const [messages] = await db.query(
                    `SELECT user_id as userId, username, message, created_at as timestamp 
                     FROM chat_messages 
                     WHERE map_id = ? AND channel_id = ? 
                     ORDER BY created_at DESC 
                     LIMIT 50`,
                    [mapId, channelId]
                );

                // Reverse to show oldest first
                const history = messages.reverse().map(msg => ({
                    id: `history-${msg.userId}-${msg.timestamp}`,
                    userId: msg.userId,
                    username: msg.username,
                    message: msg.message,
                    mapId: mapId,
                    timestamp: new Date(msg.timestamp).getTime()
                }));

                socket.emit('chat_history', history);
            } catch (err) {
                console.error('[Chat] Error loading chat history:', err);
            }
        });

        // Chat messages (per map)
        socket.on('send_chat', async ({ message, mapId }) => {
            if (!isAuthenticated || !userId || !username || !mapId || !currentChannel) return;

            // Rate limiting
            const rateCheck = rateLimiter.check(userId, 'send_chat');
            if (!rateCheck.allowed) {
                socket.emit('error', rateCheck.reason);
                return;
            }

            // Validate message
            const msgCheck = validator.validateChatMessage(message);
            if (!msgCheck.valid) {
                socket.emit('error', msgCheck.reason);
                return;
            }

            // Sanitize message
            const sanitizedMessage = validator.sanitizeString(message, 500);

            const chatMessage = {
                id: `${socket.id}-${Date.now()}`,
                userId: userId,
                username: username,
                message: sanitizedMessage,
                mapId: mapId,
                timestamp: Date.now()
            };

            // Lưu vào database với map_id và channel_id
            try {
                await db.query(
                    'INSERT INTO chat_messages (user_id, username, channel_id, map_id, message) VALUES (?, ?, ?, ?, ?)',
                    [userId, username, currentChannel, mapId, sanitizedMessage]
                );
            } catch (err) {
                console.error('Error saving chat:', err);
            }

            // Broadcast to OTHER players on the same map (exclude sender)
            io.sockets.sockets.forEach((clientSocket) => {
                // Skip the sender
                if (clientSocket.id === socket.id) return;

                // Get player data from channels to check their map
                let playerMapId = null;
                for (const channelId of Object.keys(channels)) {
                    const player = channels[channelId].get(clientSocket.id);
                    if (player) {
                        playerMapId = player.mapId;
                        break;
                    }
                }

                // Send message only to players on the same map
                if (playerMapId === mapId) {
                    clientSocket.emit('chat_message', chatMessage);
                }
            });

            console.log(`[Chat] ${username} on ${mapId}: ${sanitizedMessage}`);
        });

        // Friend requests
        socket.on('send_friend_request', async ({ toUserId, toUsername }) => {
            if (!isAuthenticated || !userId || !username) return;

            // Rate limiting
            const rateCheck = rateLimiter.check(userId, 'send_friend_request');
            if (!rateCheck.allowed) {
                socket.emit('error', rateCheck.reason);
                return;
            }

            // Kiểm tra xem đã là bạn bè chưa
            try {
                const [existing] = await db.query(
                    `SELECT * FROM friends 
                     WHERE ((user_id_1 = ? AND user_id_2 = ?) OR (user_id_1 = ? AND user_id_2 = ?))
                     AND status = 'accepted'`,
                    [userId, toUserId, toUserId, userId]
                );

                if (existing.length > 0) {
                    socket.emit('friend_request_error', { message: `Bạn và ${toUsername} đã là bạn bè!` });
                    return;
                }
            } catch (err) {
                console.error('Error checking friendship:', err);
            }

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
            } else {
                socket.emit('friend_request_error', { message: `${toUsername} không trực tuyến hoặc không tìm thấy!` });
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

        // Monster attacks player
        socket.on('monster_attack', ({ monsterId, targetSocketId }) => {
            const monster = monsterStates.get(monsterId);
            if (!monster || monster.isDead) return;

            const damage = Math.max(1, monster.attack - 5); // Basic damage calculation

            console.log(`[Monster] ${monster.name} attacked player ${targetSocketId} for ${damage} damage`);

            io.to(targetSocketId).emit('monster_attacked_player', {
                monsterId,
                monsterName: monster.name,
                targetSocketId,
                damage,
                timestamp: Date.now()
            });
        });

        // Player attacks monster
        socket.on('attack_monster', ({ monsterId, damage }) => {
            if (!isAuthenticated) return;

            // Rate limiting
            const rateCheck = rateLimiter.check(userId, 'attack_monster');
            if (!rateCheck.allowed) {
                return; // Silent fail để không spam error
            }

            const monster = monsterStates.get(monsterId);
            if (!monster || monster.isDead) return;

            const newHp = Math.max(0, monster.hp - damage);
            monster.hp = newHp;

            console.log(`[Monster] ${username} attacked ${monster.name} for ${damage} damage (HP: ${newHp}/${monster.maxHp})`);

            if (newHp <= 0) {
                monster.isDead = true;
                monster.hp = 0;

                console.log(`[Monster] ${monster.name} died! Gold drop: ${monster.goldDrop}`);

                // Broadcast monster death
                if (currentChannel) {
                    io.to(`channel_${currentChannel}`).emit('monster_died', {
                        monsterId,
                        goldDrop: monster.goldDrop,
                        killerId: socket.id,
                        killerUsername: username
                    });
                }

                // Respawn after 30 seconds
                setTimeout(() => {
                    monster.hp = monster.maxHp;
                    monster.isDead = false;
                    delete monster.goldDrop;

                    console.log(`[Monster] ${monster.name} respawned`);

                    if (currentChannel) {
                        // Send full monster data for respawn
                        io.to(`channel_${currentChannel}`).emit('monster_respawned', {
                            ...monster,
                            hp: monster.maxHp,
                            isDead: false
                        });
                    }
                }, 30000);
            } else {
                // Broadcast HP update
                if (currentChannel) {
                    io.to(`channel_${currentChannel}`).emit('monster_updated', {
                        monsterId,
                        hp: newHp,
                        maxHp: monster.maxHp
                    });
                }
            }
        });

        // Pickup gold from dead monster
        socket.on('pickup_gold', ({ monsterId }) => {
            const monster = monsterStates.get(monsterId);
            
            // Validate: monster must be dead and have gold
            if (!monster || !monster.isDead || !monster.goldDrop) {
                return;
            }

            const goldAmount = monster.goldDrop;
            console.log(`[Monster] ${username} picked up ${goldAmount} gold from ${monsterId}`);

            // Remove gold drop flag (only first person gets it)
            delete monster.goldDrop;

            // Send gold to picker
            socket.emit('gold_received', {
                monsterId,
                amount: goldAmount
            });

            // Broadcast to ALL players to remove gold visual
            if (currentChannel) {
                io.to(`channel_${currentChannel}`).emit('gold_picked_up', {
                    monsterId,
                    playerId: socket.id,
                    playerName: username
                });
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
                
                // Clear rate limiter
                rateLimiter.clear(userId);
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
