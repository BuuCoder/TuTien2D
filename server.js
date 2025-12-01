const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;
// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    const httpServer = createServer(async (req, res) => {
        try {
            // Be sure to pass `true` as the second argument to `url.parse`.
            // This tells it to parse the query portion of the URL.
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
            origin: "*", // Allow all origins for now, or specify your frontend domain
            methods: ["GET", "POST"]
        }
    });

    // Channel state
    const channels = {
        1: new Map(), // Map<socketId, PlayerData>
        2: new Map(),
        3: new Map(),
    };

    const MAX_PLAYERS_PER_CHANNEL = 10;

    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);
        let currentChannel = null;

        // Handle joining a channel
        socket.on('join_channel', ({ channelId, playerData }) => {
            // Validate channel
            if (![1, 2, 3].includes(channelId)) {
                socket.emit('error', 'Invalid channel');
                return;
            }

            // Check if channel is full
            if (channels[channelId].size >= MAX_PLAYERS_PER_CHANNEL) {
                socket.emit('channel_full', { channelId });
                return;
            }

            // Leave previous channel if any
            if (currentChannel) {
                socket.leave(`channel_${currentChannel}`);
                channels[currentChannel].delete(socket.id);
                io.to(`channel_${currentChannel}`).emit('player_left', socket.id);
            }

            // Join new channel
            currentChannel = channelId;
            socket.join(`channel_${currentChannel}`);

            // Add player to channel data
            channels[channelId].set(socket.id, {
                id: socket.id,
                ...playerData
            });

            // Send current players in channel to the new player
            const playersInChannel = Array.from(channels[channelId].values());
            socket.emit('channel_joined', {
                channelId,
                players: playersInChannel
            });

            // Broadcast new player to others in channel
            socket.to(`channel_${channelId}`).emit('player_joined', {
                id: socket.id,
                ...playerData
            });

            console.log(`Socket ${socket.id} joined channel ${channelId}`);
        });

        // Handle movement updates
        socket.on('player_move', (data) => {
            if (!currentChannel) return;

            // Update player data in store
            const player = channels[currentChannel].get(socket.id);
            if (player) {
                const updatedPlayer = { ...player, ...data };
                channels[currentChannel].set(socket.id, updatedPlayer);

                // Broadcast to others in channel
                socket.to(`channel_${currentChannel}`).emit('player_moved', {
                    id: socket.id,
                    ...data
                });
            }
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            if (currentChannel) {
                channels[currentChannel].delete(socket.id);
                io.to(`channel_${currentChannel}`).emit('player_left', socket.id);
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
