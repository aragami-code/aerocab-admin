import { io, Socket } from 'socket.io-client';

const SOCKET_URL = (import.meta.env.VITE_API_URL as string | undefined)
  ?.replace('/api', '') ?? 'http://localhost:3000';

let socket: Socket | null = null;

export function connectAdminSocket(token: string): Socket {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: 10,
  });

  return socket;
}

export function disconnectAdminSocket(): void {
  socket?.disconnect();
  socket = null;
}

export function getAdminSocket(): Socket | null {
  return socket;
}
