"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { io as ClientIO, Socket } from "socket.io-client";

type SocketContextType = {
    socket: Socket | null;
    isConnected: boolean;
};

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // 1. Initialize the socket connection
        // The path MUST match what you defined in server.ts
        const socketInstance = ClientIO(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000", {
            path: "/api/socket/io",
            addTrailingSlash: false,
        });

        socketInstance.on("connect", () => {
            console.log("Connected to Socket.io server");
            setIsConnected(true);
        });

        socketInstance.on("disconnect", () => {
            console.log("Disconnected from Socket.io server");
            setIsConnected(false);
        });

        setSocket(socketInstance);

        // 2. Cleanup on unmount
        return () => {
            socketInstance.disconnect();
        };
    }, []);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};
