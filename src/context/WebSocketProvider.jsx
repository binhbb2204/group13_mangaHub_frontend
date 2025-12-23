import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { buildWebSocketUrl, buildApiUrl } from '../utils/api';

export const WebSocketContext = createContext(null);

const STORAGE_KEY = 'roomMessagesCache';
const MAX_RECONNECT_ATTEMPTS = 6;

function getToken() {
  return (
    localStorage.getItem('authToken') ||
    localStorage.getItem('token') ||
    localStorage.getItem('jwt') ||
    ''
  );
}

async function fetchMangaTitle(mangaId) {
  try {
    const res = await fetch(buildApiUrl(`/manga/info/${mangaId}`));
    if (!res.ok) return null;
    const data = await res.json();
    return data?.title ?? null;
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
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const currentRoomRef = useRef(null);
  const messageQueueRef = useRef([]);

  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (cached && typeof cached === 'object') {
        setRoomMessages(cached);
      }
    } catch { }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(roomMessages));
    } catch { }
  }, [roomMessages]);

  const enqueueOrSend = useCallback((payload) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
      return;
    }
    messageQueueRef.current.push(payload);
  }, []);

  const flushQueue = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    while (messageQueueRef.current.length) {
      ws.send(JSON.stringify(messageQueueRef.current.shift()));
    }
  }, []);

  const appendMessage = useCallback((room, message) => {
    setRoomMessages((prev) => {
      const list = prev[room] || [];
      if (list.some((m) => m.id === message.id)) return prev;
      return { ...prev, [room]: [...list, message] };
    });
  }, []);

  const handleSystem = useCallback(
    async ({ metadata, room }) => {
      if (Array.isArray(metadata?.rooms)) {
        const enrichedRooms = await Promise.all(
          metadata.rooms.map(async (r) => {
            if (r.type === 'manga' && r.name?.startsWith('manga-')) {
              const mangaId = r.name.replace('manga-', '');
              const title = await fetchMangaTitle(mangaId);
              return {
                ...r,
                mangaId,
                displayName: title || r.name,
              };
            }
            return { ...r, displayName: r.name };
          })
        );

        setRoomList(enrichedRooms);
        setIsLoading(false);
      }

      if (metadata?.room_name) {
        setRoomList((prev) => {
          if (prev.some((r) => r.name === metadata.room_name)) return prev;
          return [
            {
              name: metadata.room_name,
              type: metadata.type || 'custom',
              displayName: metadata.room_name,
              messageCount: 0,
            },
            ...prev,
          ];
        });
      }

      if (room && (metadata?.userJoined || metadata?.userLeft)) {
        appendMessage(room, {
          type: 'system',
          content: metadata.userJoined
            ? `${metadata.userJoined.username} joined`
            : `${metadata.userLeft.username} left`,
          timestamp: new Date().toISOString(),
          room,
        });
      }
    },
    [appendMessage]
  );

  const handleHistory = useCallback(({ metadata, room }) => {
    if (!Array.isArray(metadata?.messages)) return;

    const roomName = room || 'global';
    const normalized = metadata.messages.map((m, i) => ({
      id: m.id || m.message_id || `hist-${i}-${roomName}`,
      type: 'text',
      from:
        m.from ||
        m.username ||
        m.sender_username ||
        m.sender ||
        m.user ||
        'Unknown',
      content: m.content || m.message || '',
      timestamp:
        m.timestamp || m.created_at || m.createdAt || new Date().toISOString(),
      room: roomName,
    }));

    setRoomMessages((prev) => ({ ...prev, [roomName]: normalized }));
  }, []);

  const handleMessage = useCallback(
    (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'text' || data.type === 'message') {
          appendMessage(data.room || 'global', data);
        } else if (data.type === 'system') {
          handleSystem(data);
        } else if (data.type === 'history') {
          handleHistory(data);
        } else if (data.type === 'error') {
          setError(data.content || 'Unknown error');
        }
      } catch { }
    },
    [appendMessage, handleHistory, handleSystem]
  );

  const connect = useCallback(() => {
    if (!getToken()) {
      console.warn('No authentication token found. Cannot connect to WebSocket.');
      return;
    }

    // Check if max reconnect attempts reached
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      console.warn('WebSocket max reconnection attempts reached. Stopping reconnection.');
      setError('Failed to connect after multiple attempts');
      return;
    }

    try {
      const token = getToken();
      const wsUrl = `${buildWebSocketUrl('/ws/chat')}?token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);
        setError('');
        reconnectAttemptsRef.current = 0;
        flushQueue();
        enqueueOrSend({ type: 'command', command: '/rooms' });

        if (currentRoomRef.current) {
          enqueueOrSend({
            type: 'command',
            room: currentRoomRef.current,
            command: '/users',
          });
          enqueueOrSend({
            type: 'command',
            room: currentRoomRef.current,
            command: '/history 50',
          });
        }
      };

      ws.onmessage = handleMessage;

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setError('Connection error');
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setConnected(false);

        // Only attempt reconnect if not a normal closure and below max attempts
        if (event.code !== 1000 && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;

          const attempt = Math.min(reconnectAttemptsRef.current, MAX_RECONNECT_ATTEMPTS);
          const delay = Math.min(30000, 1000 * Math.pow(2, attempt));

          console.log(`Attempting to reconnect WebSocket... (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS}) in ${delay}ms`);
          setError(`Connection lost. Retrying... (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);

          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = setTimeout(connect, delay);
        } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          setError('Failed to connect to chat service');
        }
      };
    } catch (e) {
      console.error('Failed to create WebSocket connection:', e);
      setError(e.message);
    }
  }, [enqueueOrSend, flushQueue, handleMessage]);

  useEffect(() => {
    let isMounted = true;

    if (isMounted) {
      connect();
    }

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimerRef.current);
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close(1000, 'Component unmounting');
      }
    };
  }, [connect]);

  useEffect(() => {
    const interval = setInterval(() => {
      const ws = wsRef.current;
      const hasToken = getToken();
      const shouldReconnect = hasToken &&
        !connected &&
        (!ws || ws.readyState === WebSocket.CLOSED) &&
        reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS;

      if (shouldReconnect) {
        connect();
      }
    }, 5000); // Check every 5 seconds instead of 1

    return () => clearInterval(interval);
  }, [connected, connect]);

  const value = useMemo(
    () => ({
      connected,
      error,
      isLoading,
      roomList,
      roomMessages,
      fetchRooms: () => {
        setIsLoading(true);
        enqueueOrSend({ type: 'command', command: '/rooms' });
      },
      createRoom: (name) => {
        if (name?.trim()) {
          enqueueOrSend({ type: 'command', command: `/create ${name.trim()}` });
        }
      },
      joinRoom: (room) => {
        currentRoomRef.current = room;
        enqueueOrSend({
          type: 'command',
          room,
          command: '/users',
        });
        enqueueOrSend({
          type: 'command',
          room,
          command: '/history 50',
        });
      },
      leaveRoom: (room) => {
        if (currentRoomRef.current === room) {
          currentRoomRef.current = null;
        }
      },
      sendMessage: (room, content) => {
        if (content?.trim()) {
          enqueueOrSend({
            type: 'text',
            room: room || 'global',
            content: content.trim(),
          });
        }
      },
    }),
    [
      connected,
      error,
      isLoading,
      roomList,
      roomMessages,
      enqueueOrSend,
    ]
  );

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}
