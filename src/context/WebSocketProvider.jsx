// src/context/WebSocketProvider.jsx
import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';

export const WebSocketContext = createContext(null);

const STORAGE_KEY = 'roomMessagesCache';

function getToken() {
  return (
    localStorage.getItem('authToken') ||
    localStorage.getItem('token') ||
    localStorage.getItem('jwt') ||
    ''
  );
}

function makeWsUrl() {
  const host = window.location.hostname || 'localhost';
  const token = getToken();
  return `ws://${host}:9093/ws/chat?token=${encodeURIComponent(token)}`;
}

async function fetchMangaTitle(mangaId) {
  const host = window.location.hostname || 'localhost';
  try {
    const res = await fetch(`http://${host}:8080/manga/info/${mangaId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.title || null;
  } catch {
    return null;
  }
}

export default function WebSocketProvider({ children }) {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [roomList, setRoomList] = useState([]);
  const [roomMessages, setRoomMessages] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const reconnectAttempts = useRef(0);
  const currentRoom = useRef(null);
  const queueRef = useRef([]);

  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (cached && typeof cached === 'object' && Object.keys(cached).length > 0) {
        console.log('[WS] Loaded cached messages:', cached);
        setRoomMessages(cached);
      }
    } catch (e) {
      console.warn('[WS] Failed to load cache', e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(roomMessages));
      console.log('[WS] Cached messages:', roomMessages);
    } catch (e) {
      console.warn('[WS] Failed to save cache', e);
    }
  }, [roomMessages]);

  const sendOrQueue = useCallback((obj) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(obj));
      return true;
    }
    console.log('[WS] Queueing command:', obj);
    queueRef.current.push(obj);
    return false;
  }, []);

  const flushQueue = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    console.log('[WS] Flushing queue, pending:', queueRef.current.length);
    while (queueRef.current.length) {
      const obj = queueRef.current.shift();
      ws.send(JSON.stringify(obj));
    }
  }, []);

  const addMessage = useCallback((room, msg) => {
    setRoomMessages((prev) => {
      const list = prev[room] || [];
      const exists = list.some((m) => m.id === msg.id);
      if (exists) return prev;
      const next = [...list, msg];
      console.log(`[WS] Added message to ${room}:`, msg);
      return { ...prev, [room]: next };
    });
  }, []);

  const handleSystem = useCallback(async (payload) => {
    const { metadata, room } = payload || {};
    
    if (metadata && Array.isArray(metadata.rooms)) {
      // Fetch manga titles for manga rooms
      const roomsWithTitles = await Promise.all(
        metadata.rooms.map(async (r) => {
          if (r.type === 'manga' && r.name && r.name.startsWith('manga-')) {
            const mangaId = r.name.replace('manga-', '');
            const title = await fetchMangaTitle(mangaId);
            return { 
              ...r, 
              displayName: title || r.name,
              mangaId 
            };
          }
          return { ...r, displayName: r.name };
        })
      );
      
      console.log('[WS] Rooms with titles:', roomsWithTitles);
      setRoomList(roomsWithTitles);
      setIsLoading(false);
    }
    
    if (metadata && metadata.room_name) {
      const newRoom = {
        name: metadata.room_name,
        type: metadata.role === 'owner' ? 'custom' : metadata.type || 'custom',
        messageCount: 0,
        displayName: metadata.room_name,
      };
      setRoomList((prev) => {
        const exists = prev.some((r) => r.name === newRoom.name);
        return exists ? prev : [newRoom, ...prev];
      });
    }
    
    if (metadata && (metadata.userJoined || metadata.userLeft) && room) {
      const msg = {
        type: 'system',
        content: metadata.userJoined
          ? `${metadata.userJoined.username} joined`
          : `${metadata.userLeft.username} left`,
        room,
        timestamp: new Date().toISOString(),
      };
      addMessage(room, msg);
    }
  }, [addMessage]);

  const handleHistory = useCallback((payload) => {
    const { metadata, room } = payload || {};
    console.log('[WS] History response:', { room, metadataCount: metadata?.messages?.length });
    
    if (!metadata || !Array.isArray(metadata.messages)) {
      console.warn('[WS] No messages in history response');
      return;
    }

    const roomName = room || 'global';
    const normalized = metadata.messages.map((m, idx) => ({
      id: m.id || m.message_id || `hist-${idx}-${roomName}`,
      type: 'text',
      from: m.from || m.username || m.sender_username || m.sender || m.user || 'Unknown',
      content: m.content || m.message || '',
      timestamp: m.timestamp || m.created_at || m.createdAt || new Date().toISOString(),
      room: roomName,
    }));

    console.log(`[WS] Normalized ${normalized.length} messages for ${roomName}`);
    setRoomMessages((prev) => ({
      ...prev,
      [roomName]: normalized,
    }));
  }, []);

  const handleIncoming = useCallback((evt) => {
    try {
      const data = JSON.parse(evt.data);
      console.log('[WS] Incoming:', data.type, data);

      if (data.type === 'text' || data.type === 'message') {
        const room = data.room || 'global';
        addMessage(room, data);
      } else if (data.type === 'system') {
        handleSystem(data);
      } else if (data.type === 'history') {
        handleHistory(data);
      } else if (data.type === 'error') {
        setError(data.content || 'Unknown error');
      }
    } catch (e) {
      console.error('[WS] Parse error', e);
    }
  }, [addMessage, handleSystem, handleHistory]);

  const connect = useCallback(() => {
    setError('');
    const url = makeWsUrl();
    console.log('[WS] Connecting to', url);
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS] Connected');
      setConnected(true);
      reconnectAttempts.current = 0;
      setIsLoading(false);
      flushQueue();
      
      sendOrQueue({ type: 'command', command: '/rooms' });
      if (currentRoom.current) {
        console.log('[WS] Refetching history for room:', currentRoom.current);
        sendOrQueue({ type: 'command', room: currentRoom.current, command: '/history 50' });
      }
    };

    ws.onmessage = handleIncoming;

    ws.onerror = (e) => {
      console.warn('[WS] Error', e);
      setError('Connection error');
    };

    ws.onclose = () => {
      console.log('[WS] Disconnected');
      setConnected(false);
      const attempt = Math.min(reconnectAttempts.current + 1, 6);
      reconnectAttempts.current = attempt;
      const delay = Math.min(30000, 1000 * Math.pow(2, attempt));
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      reconnectTimer.current = setTimeout(connect, delay);
    };
  }, [flushQueue, handleIncoming, sendOrQueue]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) ws.close();
    };
  }, [connect]);

  const fetchRooms = useCallback(() => {
    setIsLoading(true);
    sendOrQueue({ type: 'command', command: '/rooms' });
  }, [sendOrQueue]);

  const createRoom = useCallback((roomName) => {
    if (!roomName || !roomName.trim()) return;
    sendOrQueue({ type: 'command', command: `/create ${roomName.trim()}` });
  }, [sendOrQueue]);

  const joinRoom = useCallback((roomName) => {
    console.log('[WS] Joining room:', roomName);
    currentRoom.current = roomName;
    sendOrQueue({ type: 'command', room: roomName, command: '/history 50' });
  }, [sendOrQueue]);

  const leaveRoom = useCallback((roomName) => {
    if (currentRoom.current === roomName) currentRoom.current = null;
  }, []);

  const sendMessage = useCallback((roomName, content) => {
    if (!content || !content.trim()) return;
    sendOrQueue({ type: 'text', room: roomName || 'global', content: content.trim() });
  }, [sendOrQueue]);

  const value = useMemo(() => ({
    connected,
    error,
    isLoading,
    roomList,
    roomMessages,
    fetchRooms,
    createRoom,
    joinRoom,
    leaveRoom,
    sendMessage,
  }), [connected, error, isLoading, roomList, roomMessages, fetchRooms, createRoom, joinRoom, leaveRoom, sendMessage]);

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}