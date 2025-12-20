import { useEffect, useState, useRef } from 'react';

const MAX_RECONNECT_ATTEMPTS = 6;
const INITIAL_RECONNECT_DELAY = 3000;
const MAX_RECONNECT_DELAY = 30000;

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
    reconnectInterval = INITIAL_RECONNECT_DELAY
  } = options;

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);

  useEffect(() => {
    if (!enabled || !url) return;

    let isMounted = true;

    const connectSSE = () => {
      // Check if component is still mounted and max reconnect attempts not reached
      if (!isMounted || reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
        if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          console.warn('SSE max reconnection attempts reached. Stopping reconnection.');
          setError('Failed to connect to notification service');
        }
        return;
      }

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
          reconnectAttemptsRef.current = 0; // Reset attempts on successful connection
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
          // Check if error is due to invalid response (server misconfiguration)
          const readyState = eventSource.readyState;
          const isServerError = readyState === EventSource.CLOSED;

          console.error('SSE error:', { error: err, readyState });
          setIsConnected(false);
          eventSource.close();

          if (onError) onError(err);

          // Increment reconnect attempts
          reconnectAttemptsRef.current++;

          // Only retry if below max attempts and component is mounted
          if (isMounted && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            // Calculate exponential backoff delay
            const attempt = Math.min(reconnectAttemptsRef.current, MAX_RECONNECT_ATTEMPTS);
            const delay = Math.min(MAX_RECONNECT_DELAY, reconnectInterval * Math.pow(2, attempt - 1));

            const errorMsg = isServerError
              ? 'SSE server not properly configured'
              : 'Connection lost';

            console.log(`Attempting to reconnect SSE... (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS}) in ${delay}ms`);
            setError(`${errorMsg}. Retrying... (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);

            reconnectTimeoutRef.current = setTimeout(() => {
              connectSSE();
            }, delay);
          } else {
            console.error('SSE max reconnection attempts reached');
            setError(isServerError
              ? 'SSE server not available or misconfigured'
              : 'Failed to connect to notification service');
          }
        };
      } catch (err) {
        console.error('Failed to create SSE connection:', err);
        setError(err.message);
      }
    };

    connectSSE();

    return () => {
      isMounted = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      // Reset attempts on unmount
      reconnectAttemptsRef.current = 0;
    };
  }, [url, enabled, reconnectInterval, onMessage, onError, onConnect]);

  return { data, error, isConnected };
};
