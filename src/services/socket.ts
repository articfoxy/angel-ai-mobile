import { io, Socket } from 'socket.io-client';
import { WS_URL } from '../config';
import { getStoredToken } from './auth';

let socket: Socket | null = null;

export async function connectSocket(): Promise<Socket> {
  const token = await getStoredToken();
  if (!token) throw new Error('Not authenticated');

  // If socket exists and is connected, reuse it
  if (socket?.connected) {
    return socket;
  }

  // If socket exists but is disconnected, destroy it so we create a fresh one
  // with a potentially refreshed token
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  socket = io(WS_URL, {
    auth: async (cb) => {
      // Dynamically fetch the current token on each connection/reconnection attempt
      const currentToken = await getStoredToken();
      cb({ token: currentToken });
    },
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
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
