import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  joinProjectRoom: (projectId: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      const newSocket = io('http://localhost:5000', {
        withCredentials: true
      });
      setSocket(newSocket);
      return () => {
        newSocket.disconnect();
      };
    }
  }, [user]);

  const joinProjectRoom = (projectId: string) => {
    if (socket && user) {
      socket.emit('join_project_room', { projectId, userId: user.user_id });
    }
  };

  return (
    <SocketContext.Provider value={{ socket, joinProjectRoom }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within SocketProvider');
  return context;
};
