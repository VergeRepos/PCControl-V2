import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ConnectionContextType {
  isConnected: boolean;
  isConnecting: boolean;
  pcInfo: {
    ip: string;
    hostname: string;
  } | null;
  stats: any | null;
  connect: (ip: string) => Promise<void>;
  disconnect: () => void;
  sendApiRequest: (method: string, path: string, body?: any) => Promise<any>;
}

const ConnectionContext = createContext<ConnectionContextType | null>(null);

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [pcInfo, setPcInfo] = useState<{ ip: string; hostname: string } | null>(null);
  const [stats, setStats] = useState<any | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    loadSavedConnection();
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, []);

  const loadSavedConnection = async () => {
    try {
      const savedIp = await AsyncStorage.getItem('pc_ip');
      if (savedIp) {
        await connect(savedIp);
      }
    } catch (error) {
      console.error('Failed to load saved connection:', error);
    }
  };

  const connect = async (ip: string) => {
    setIsConnecting(true);

    try {
      const credentialsStr = await AsyncStorage.getItem('device_credentials');
      if (!credentialsStr) {
        throw new Error('No credentials found');
      }

      const credentials = JSON.parse(credentialsStr);

      // Connect WebSocket
      const ws = new WebSocket(`ws://${ip}:8421/ws`);

      ws.onopen = () => {
        // Send authentication
        ws.send(
          JSON.stringify({
            type: 'auth',
            token: credentials.access_token,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'system.stats') {
            setStats(data.data);
            setIsConnected(true);
            setIsConnecting(false);
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
        setIsConnecting(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
      };

      setSocket(ws);
      setPcInfo({ ip, hostname: 'Desktop PC' });
      await AsyncStorage.setItem('pc_ip', ip);
    } catch (error) {
      console.error('Connection failed:', error);
      setIsConnecting(false);
      throw error;
    }
  };

  const disconnect = () => {
    if (socket) {
      socket.close();
      setSocket(null);
    }
    setIsConnected(false);
    setStats(null);
  };

  const sendApiRequest = async (method: string, path: string, body?: any) => {
    if (!pcInfo) {
      throw new Error('Not connected');
    }

    const credentialsStr = await AsyncStorage.getItem('device_credentials');
    if (!credentialsStr) {
      throw new Error('No credentials found');
    }

    const credentials = JSON.parse(credentialsStr);

    const response = await fetch(`http://${pcInfo.ip}:8421/api${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${credentials.access_token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API request failed');
    }

    return response.json();
  };

  return (
    <ConnectionContext.Provider
      value={{
        isConnected,
        isConnecting,
        pcInfo,
        stats,
        connect,
        disconnect,
        sendApiRequest,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection() {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error('useConnection must be used within a ConnectionProvider');
  }
  return context;
}
