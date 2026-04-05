import { io, Socket } from 'socket.io-client';
import { WS_URL } from '../config';
import { getStoredToken } from './auth';

let socket: Socket | null = null;

export async function connectSocket(): Promise<Socket> {
  const token = await getStoredToken();
  if (!token) throw new Error('Not authenticated');

  if (socket?.connected) {
    return socket;
  }

  socket = io(WS_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
