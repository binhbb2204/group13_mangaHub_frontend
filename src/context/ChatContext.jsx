import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { buildWebSocketUrl } from '../utils/api';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const socketRef = useRef(null);

  const connect = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Use your utility. Note: Passing the full path including the port swap if needed
    // If your backend binds WS to 9093, we override the default 8080 here
    const wsUrl = buildWebSocketUrl('/ws/chat').replace(':8080', ':9093');
    const fullUrl = `${wsUrl}?token=${token}`;

    const ws = new WebSocket(fullUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      // Fetch initial rooms list
      ws.send(JSON.stringify({ type: "command", command: "/rooms" }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "system") {
        if (msg.metadata?.rooms) setRooms(msg.metadata.rooms);
        if (msg.metadata?.history) setMessages(msg.metadata.history);
        if (msg.metadata?.users) setOnlineUsers(msg.metadata.users);
      } else if (msg.type === "text") {
        setMessages((prev) => [...prev, msg]);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setTimeout(connect, 3000); // Reconnect logic
    };
  }, []);

  useEffect(() => {
    connect();
    return () => socketRef.current?.close();
  }, [connect]);

  const sendMessage = (text, roomName) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "text",
        content: text,
        room: roomName
      }));
    }
  };

  const sendCommand = (cmd, roomName = "") => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "command",
        command: cmd,
        room: roomName
      }));
    }
  };

  return (
    <ChatContext.Provider value={{ 
      isConnected, rooms, messages, onlineUsers, 
      sendMessage, sendCommand, setMessages 
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);