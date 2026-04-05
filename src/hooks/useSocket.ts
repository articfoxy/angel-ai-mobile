import { useState, useEffect, useCallback, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export function useSocket(): UseSocketReturn {
  const [socket, setSocket] = useState<Socket | null>(getSocket());
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const connect = useCallback(async () => {
    try {
      const s = await connectSocket();
      socketRef.current = s;
      setSocket(s);

      s.on('connect', () => {
        setIsConnected(true);
      });

      s.on('disconnect', () => {
        setIsConnected(false);
      });

      s.on('connect_error', () => {
        setIsConnected(false);
      });

      if (s.connected) {
        setIsConnected(true);
      }
    } catch {
      setIsConnected(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    disconnectSocket();
    socketRef.current = null;
    setSocket(null);
    setIsConnected(false);
  }, []);

  useEffect(() => {
    return () => {
      // Clean up listeners on unmount but don't disconnect
      // (parent might still need the socket)
      const s = socketRef.current;
      if (s) {
        s.off('connect');
        s.off('disconnect');
        s.off('connect_error');
      }
    };
  }, []);

  return { socket, isConnected, connect, disconnect };
}
