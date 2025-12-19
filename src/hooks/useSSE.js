import { useEffect, useState, useRef } from 'react';

/**
 * Custom hook for Server-Sent Events (SSE) connection
 * @param {string} url - The SSE endpoint URL
 * @param {Object} options - Configuration options
 * @returns {Object} - { data, error, isConnected }
 */
export const useSSE = (url, options = {}) => {
  const { 
    enabled = true,
    onMessage = null,
    onError = null,
    onConnect = null,
    reconnectInterval = 3000 
  } = options;

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  useEffect(() => {
    if (!enabled || !url) return;

    const connectSSE = () => {
      try {
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }

        const eventSource = new EventSource(url);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          console.log('SSE connected');
          setIsConnected(true);
          setError(null);
          if (onConnect) onConnect();
        };

        eventSource.onmessage = (event) => {
          try {
            const parsedData = JSON.parse(event.data);
            setData(parsedData);
            if (onMessage) onMessage(parsedData);
          } catch (err) {
            console.error('Failed to parse SSE message:', err);
          }
        };

        eventSource.onerror = (err) => {
          console.error('SSE error:', err);
          setIsConnected(false);
          setError('Connection error');
          eventSource.close();
          
          if (onError) onError(err);

          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect SSE...');
            connectSSE();
          }, reconnectInterval);
        };
      } catch (err) {
        console.error('Failed to create SSE connection:', err);
        setError(err.message);
      }
    };

    connectSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [url, enabled, reconnectInterval]);

  return { data, error, isConnected };
};
