import { createServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";

// const dev = process.env.NODE_ENV !== 'production';
// const hostname = 'localhost';
// const port = 3000;

const httpServer = createServer();
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:3000", // your Next.js frontend
        methods: ["GET", "POST"],
    },
});

// Redis adapter (important when you scale Socket.IO later)
const pubClient = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));


io.on('connection', (socket) => {
        console.log('Client socket connected:', socket.id);

        // Join board-specific room
        socket.on('join-board', (boardId: string) => {
            socket.join(`board:${boardId}`);
            console.log(`Socket ${socket.id} joined board:${boardId}`);
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
});

// Listen for events published by the Worker
const subscriber = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

subscriber.subscribe("job-updates", (err) => {
    if (err) console.error("Failed to subscribe", err);
});

subscriber.on("message", (channel, message) => {
    if (channel === "job-updates") {
        const data = JSON.parse(message);
        // Broadcast to everyone watching this job
        io.to(`job:${data.jobId}`).emit("job-update", data);
    }
});

const PORT = process.env.SOCKET_PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`Socket.IO server running on http://localhost:${PORT}`);
});
