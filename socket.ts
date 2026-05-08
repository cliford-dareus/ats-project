import { createServer } from 'node:http';
import next from 'next';
import { Server } from 'socket.io';
import {parse} from "node:url";
import {setupWorker} from "@/lib/queue";

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;
// When using middleware, hostname and port must be provided below
const app = next({ dev, hostname, port,  dir: process.cwd() });
const handler = app.getRequestHandler();

app.prepare().then(() => {
    const httpServer = createServer((req, res) => {
        const parsedUrl = parse(req.url!, true);
        handler(req, res, parsedUrl);
    });

    const io = new Server(httpServer, {
        path: "/api/socket/io",
        addTrailingSlash: false,
        cors: { origin: "*" }
    });

    // --- Initialize BullMQ Worker and pass IO ---
    const worker = setupWorker(io);
    // --------------------------------------------

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

    const server = httpServer
        .once('error', (err) => {
            console.error(err);
            process.exit(1);
        })
        .listen(port, () => {
            console.log(`> Ready on http://${hostname}:${port}`);
        });

    // --- GRACEFUL SHUTDOWN LOGIC ---
    const shutdown = async () => {
        console.log("\nStopping server gracefully...");

        // 1. Close BullMQ connections (recommended)
        if (worker) await worker.close();

        // 2. Stop accepting new socket connections
        io.close();

        // 3. Close the HTTP server
        server.close(() => {
            console.log("HTTP server closed.");
            process.exit(0);
        });
    };

    // Listen for Ctrl+C (SIGINT) and System Stop (SIGTERM)
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
});

