import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

const SOCKET_URL = window.location.origin.includes('localhost') 
  ? 'http://localhost:5000' 
  : window.location.origin;

export const useSocket = () => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user) return;

    socketRef.current = io(SOCKET_URL);

    socketRef.current.on('connect', () => {
      console.log('✅ Connected to WebSocket');
      setConnected(true);
      socketRef.current.emit('join', user.id);
    });

    socketRef.current.on('disconnect', () => {
      console.log('❌ Disconnected from WebSocket');
      setConnected(false);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user]);

  return {
    socket: socketRef.current,
    connected
  };
};
