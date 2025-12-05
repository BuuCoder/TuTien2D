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
const cache = require('./lib/cache');

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
        },
        // Performance optimizations
        pingTimeout: 60000,
        pingInterval: 25000,
        upgradeTimeout: 30000,
        maxHttpBufferSize: 1e6, // 1MB
        transports: ['websocket', 'polling'],
        allowEIO3: true
    });

    const channels = {
        1: new Map(),
        2: new Map(),
        3: new Map(),
    };

    const MAX_PLAYERS_PER_CHANNEL = 10;
    const userSessions = new Map(); // userId -> {socketId, username}
    
    // Monster system - MỖI CHANNEL CÓ MONSTER STATE RIÊNG
    const { MAP_MONSTERS } = require('./lib/monsterData');
    
    // monsterStates: channelId -> Map(monsterId -> {hp, isDead, ...})
    const monsterStates = {
        1: new Map(),
        2: new Map(),
        3: new Map()
    };
    
    // Initialize monsters cho từng channel
    [1, 2, 3].forEach(channelId => {
        Object.keys(MAP_MONSTERS).forEach(mapId => {
            MAP_MONSTERS[mapId].forEach(monster => {
                const uniqueId = `${monster.monsterId}-ch${channelId}`;
                monsterStates[channelId].set(uniqueId, {
                    ...monster,
                    monsterId: uniqueId,
                    originalMonsterId: monster.monsterId,
                    hp: monster.maxHp,
                    isDead: false,
                    channelId: channelId
                });
            });
        });
    });

    // Cleanup rate limiter mỗi 1 phút (thay vì 5 phút)
    setInterval(() => {
        rateLimiter.cleanup();
    }, 60 * 1000);

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
            if (!currentChannel) {
                console.log('[Monster] No channel selected, cannot send monsters');
                return;
            }

            const mapMonsters = MAP_MONSTERS[mapId] || [];
            const channelMonsters = monsterStates[currentChannel];
            
            const monstersWithState = mapMonsters.map(monster => {
                const uniqueId = `${monster.monsterId}-ch${currentChannel}`;
                const state = channelMonsters.get(uniqueId);
                return state || {
                    ...monster,
                    monsterId: uniqueId,
                    hp: monster.maxHp,
                    isDead: false,
                    channelId: currentChannel
                };
            });

            console.log(`[Monster] Sending ${monstersWithState.length} monsters for map ${mapId} channel ${currentChannel}`);

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
            
            // Invalidate cache khi user login (để load stats mới)
            cache.delete(`user_stats:${userId}`);
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
        socket.on('pk_request_response', async ({ requestId, fromSocketId, accepted }) => {
            if (!isAuthenticated || !currentChannel || !userId || !username) return;

            console.log(`[PK] ${username} ${accepted ? 'accepted' : 'declined'} PK from ${fromSocketId}`);

            const requesterSocket = io.sockets.sockets.get(fromSocketId);
            if (requesterSocket) {
                // Nếu accepted, recalculate stats và restore HP/MP cho cả 2
                if (accepted) {
                    try {
                        const { SKINS } = require('./lib/skinData');
                        
                        // Recalculate và restore cho accepter (người chấp nhận)
                        const [accepterUser] = await db.query('SELECT skin FROM users WHERE id = ?', [userId]);
                        const [accepterStats] = await db.query(
                            'SELECT base_max_hp, base_max_mp, base_attack, base_defense, base_speed FROM user_stats WHERE user_id = ?',
                            [userId]
                        );
                        
                        if (accepterStats.length > 0) {
                            const accepterSkin = accepterUser[0]?.skin || 'knight';
                            const accepterSkinData = SKINS[accepterSkin];
                            
                            const baseMaxHp = accepterStats[0].base_max_hp || 500;
                            const baseMaxMp = accepterStats[0].base_max_mp || 200;
                            const baseAttack = accepterStats[0].base_attack || 10;
                            const baseDefense = accepterStats[0].base_defense || 5;
                            const baseSpeed = accepterStats[0].base_speed || 5.00;
                            
                            const hpBonus = accepterSkinData?.stats?.maxHpBonus || 0;
                            const mpBonus = accepterSkinData?.stats?.maxMpBonus || 0;
                            const attackBonus = accepterSkinData?.stats?.attackBonus || 0;
                            const defenseBonus = accepterSkinData?.stats?.defenseBonus || 0;
                            const speedBonus = accepterSkinData?.stats?.speedBonus || 0;
                            
                            const finalMaxHp = Math.floor(baseMaxHp * (1 + hpBonus / 100));
                            const finalMaxMp = Math.floor(baseMaxMp * (1 + mpBonus / 100));
                            const finalAttack = Math.floor(baseAttack * (1 + attackBonus / 100));
                            const finalDefense = Math.floor(baseDefense * (1 + defenseBonus / 100));
                            const finalSpeed = baseSpeed * (1 + speedBonus / 100);
                            
                            await db.query(
                                'UPDATE user_stats SET max_hp = ?, hp = ?, max_mp = ?, mp = ?, attack = ?, defense = ?, speed = ? WHERE user_id = ?',
                                [finalMaxHp, finalMaxHp, finalMaxMp, finalMaxMp, finalAttack, finalDefense, finalSpeed, userId]
                            );
                            
                            console.log(`[PK] Restored ${username} (accepter): HP=${finalMaxHp}, MP=${finalMaxMp}, Attack=${finalAttack}`);
                        }
                        
                        // Recalculate và restore cho requester (người gửi request)
                        const requesterUserId = requesterSocket.data?.userId;
                        if (requesterUserId) {
                            const [requesterUser] = await db.query('SELECT skin FROM users WHERE id = ?', [requesterUserId]);
                            const [requesterStats] = await db.query(
                                'SELECT base_max_hp, base_max_mp, base_attack, base_defense, base_speed FROM user_stats WHERE user_id = ?',
                                [requesterUserId]
                            );
                            
                            if (requesterStats.length > 0) {
                                const requesterSkin = requesterUser[0]?.skin || 'knight';
                                const requesterSkinData = SKINS[requesterSkin];
                                
                                const baseMaxHp = requesterStats[0].base_max_hp || 500;
                                const baseMaxMp = requesterStats[0].base_max_mp || 200;
                                const baseAttack = requesterStats[0].base_attack || 10;
                                const baseDefense = requesterStats[0].base_defense || 5;
                                const baseSpeed = requesterStats[0].base_speed || 5.00;
                                
                                const hpBonus = requesterSkinData?.stats?.maxHpBonus || 0;
                                const mpBonus = requesterSkinData?.stats?.maxMpBonus || 0;
                                const attackBonus = requesterSkinData?.stats?.attackBonus || 0;
                                const defenseBonus = requesterSkinData?.stats?.defenseBonus || 0;
                                const speedBonus = requesterSkinData?.stats?.speedBonus || 0;
                                
                                const finalMaxHp = Math.floor(baseMaxHp * (1 + hpBonus / 100));
                                const finalMaxMp = Math.floor(baseMaxMp * (1 + mpBonus / 100));
                                const finalAttack = Math.floor(baseAttack * (1 + attackBonus / 100));
                                const finalDefense = Math.floor(baseDefense * (1 + defenseBonus / 100));
                                const finalSpeed = baseSpeed * (1 + speedBonus / 100);
                                
                                await db.query(
                                    'UPDATE user_stats SET max_hp = ?, hp = ?, max_mp = ?, mp = ?, attack = ?, defense = ?, speed = ? WHERE user_id = ?',
                                    [finalMaxHp, finalMaxHp, finalMaxMp, finalMaxMp, finalAttack, finalDefense, finalSpeed, requesterUserId]
                                );
                                
                                console.log(`[PK] Restored ${requesterSocket.data?.username} (requester): HP=${finalMaxHp}, MP=${finalMaxMp}, Attack=${finalAttack}`);
                            }
                        }
                    } catch (error) {
                        console.error('[PK] Error restoring stats:', error);
                    }
                }
                
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
        socket.on('take_damage', ({ damage, attackerId, attackerUserId, targetId, skillId, isPK }) => {
            if (!isAuthenticated || !currentChannel) return;

            console.log(`[Combat] Damage request from user ${attackerUserId} (${attackerId}) to ${targetId} (PK: ${isPK})`);

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
                    damage, // Client damage (for display only)
                    attackerId,
                    attackerUserId, // Server sẽ dùng này để tính damage thực
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

            // Broadcast to players on the same map (optimized)
            // Chỉ loop qua players trong channel hiện tại thay vì tất cả sockets
            const playersInChannel = channels[currentChannel];
            playersInChannel.forEach((player, socketId) => {
                if (player.mapId === mapId) {
                    const targetSocket = io.sockets.sockets.get(socketId);
                    if (targetSocket) {
                        targetSocket.emit('chat_message', chatMessage);
                    }
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
            if (!currentChannel) return;
            
            const channelMonsters = monsterStates[currentChannel];
            const monster = channelMonsters.get(monsterId);
            if (!monster || monster.isDead) return;

            const damage = Math.max(1, monster.attack - 5);

            console.log(`[Monster] ${monster.name} attacked player ${targetSocketId} for ${damage} damage (Channel ${currentChannel})`);

            io.to(targetSocketId).emit('monster_attacked_player', {
                monsterId,
                monsterName: monster.name,
                targetSocketId,
                damage,
                timestamp: Date.now()
            });
        });

        // Player attacks monster
        socket.on('attack_monster', async ({ monsterId, skillId }) => {
            if (!isAuthenticated || !currentChannel) return;

            const rateCheck = rateLimiter.check(userId, 'attack_monster');
            if (!rateCheck.allowed) {
                return;
            }

            const channelMonsters = monsterStates[currentChannel];
            const monster = channelMonsters.get(monsterId);
            if (!monster || monster.isDead) return;

            try {
                // Lấy attack từ cache hoặc DB (đã có skin bonus)
                const cacheKey = `user_stats:${userId}`;
                let playerAttack = cache.get(cacheKey)?.attack;
                
                if (!playerAttack) {
                    const [statsRows] = await db.query(
                        'SELECT attack FROM user_stats WHERE user_id = ?',
                        [userId]
                    );
                    playerAttack = statsRows[0]?.attack || 10;
                    
                    // Cache for 2 minutes
                    cache.set(cacheKey, { attack: playerAttack }, 120000);
                }

                // Định nghĩa base damage cho các skill
                const skillBaseDamage = {
                    'basic-attack': 10,
                    'slash': 25,
                    'charge': 35,
                    'fireball': 40,
                    'ice-spike': 45,
                    'holy-strike': 50
                };

                const baseSkillDamage = skillBaseDamage[skillId] || 10;

                // Công thức đơn giản: Damage = DB.attack + skill_damage
                // Monster không có defense
                const totalDamage = playerAttack + baseSkillDamage;
                const finalDamage = Math.floor(totalDamage);

                console.log(`[Monster Ch${currentChannel}] ${username} attacked ${monster.name}:`, {
                    skillId,
                    baseSkillDamage,
                    playerAttack,
                    totalDamage,
                    finalDamage
                });

                const newHp = Math.max(0, monster.hp - finalDamage);
                monster.hp = newHp;

                console.log(`[Monster Ch${currentChannel}] ${monster.name} took ${finalDamage} damage (HP: ${newHp}/${monster.maxHp})`);

                if (newHp <= 0) {
                    monster.isDead = true;
                    monster.hp = 0;

                    console.log(`[Monster Ch${currentChannel}] ${monster.name} died! Gold drop: ${monster.goldDrop}`);

                    io.to(`channel_${currentChannel}`).emit('monster_died', {
                        monsterId,
                        goldDrop: monster.goldDrop,
                        killerId: socket.id,
                        killerUsername: username
                    });

                    // Respawn after 30 seconds
                    const respawnChannel = currentChannel;
                    setTimeout(() => {
                        monster.hp = monster.maxHp;
                        monster.isDead = false;
                        delete monster.goldDrop;

                        console.log(`[Monster Ch${respawnChannel}] ${monster.name} respawned`);

                        io.to(`channel_${respawnChannel}`).emit('monster_respawned', {
                            ...monster,
                            hp: monster.maxHp,
                            isDead: false
                        });
                    }, 30000);
                } else {
                    io.to(`channel_${currentChannel}`).emit('monster_updated', {
                        monsterId,
                        hp: newHp,
                        maxHp: monster.maxHp
                    });
                }
            } catch (error) {
                console.error('[Monster Attack] Error:', error);
            }
        });

        // Pickup gold from dead monster
        socket.on('pickup_gold', async ({ monsterId }) => {
            if (!currentChannel || !userId) return;
            
            const channelMonsters = monsterStates[currentChannel];
            const monster = channelMonsters.get(monsterId);
            
            // Validate: Monster phải chết và có gold
            if (!monster || !monster.isDead || !monster.goldDrop) {
                console.log(`[Gold] Invalid pickup attempt by ${username}`);
                return;
            }

            const goldAmount = monster.goldDrop;
            
            // Xóa gold drop để không ai nhặt lại
            delete monster.goldDrop;

            try {
                // Cập nhật gold trong database (SERVER-SIDE)
                const [currentInventory] = await db.query(
                    'SELECT gold FROM user_inventory WHERE user_id = ?',
                    [userId]
                );

                const currentGold = currentInventory[0]?.gold || 0;
                const newGold = currentGold + goldAmount;

                await db.query(
                    'UPDATE user_inventory SET gold = ? WHERE user_id = ?',
                    [newGold, userId]
                );

                console.log(`[Gold Ch${currentChannel}] ${username} picked up ${goldAmount} gold (${currentGold} → ${newGold})`);

                // Gửi gold mới cho client (từ database)
                socket.emit('gold_received', {
                    monsterId,
                    amount: goldAmount,
                    newGold: newGold  // Tổng gold mới từ server
                });

                // Thông báo cho các client khác
                io.to(`channel_${currentChannel}`).emit('gold_picked_up', {
                    monsterId,
                    playerId: socket.id,
                    playerName: username
                });

            } catch (error) {
                console.error('[Gold] Error updating gold:', error);
                socket.emit('error', 'Không thể nhặt vàng');
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
