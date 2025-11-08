import { useState, useEffect, useRef, useCallback } from 'react';
import { ConnectionStatus, KlineData, CandlestickData } from '../types/bitcoin';

const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws/btcusdt@kline_1m';

const useWebSocket = () => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    reconnecting: false,
  });
  const [lastMessage, setLastMessage] = useState<KlineData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 1000; // Start with 1 second

  const connect = useCallback(() => {
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        return;
      }

      setConnectionStatus(prev => ({
        ...prev,
        connected: false,
        reconnecting: reconnectAttemptsRef.current > 0
      }));

      wsRef.current = new WebSocket(BINANCE_WS_URL);

      wsRef.current.onopen = () => {
        setConnectionStatus({
          connected: true,
          reconnecting: false,
          lastConnected: Date.now(),
        });
        setError(null);
        reconnectAttemptsRef.current = 0;
        console.log('WebSocket connected to Binance');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle different message formats
          if (data.e === 'kline') {
            // Direct kline event
            setLastMessage(data);
          } else if (data.data) {
            // Stream message with data property
            setLastMessage(data.data);
          }

          // Reset reconnect attempts on successful message
          if (reconnectAttemptsRef.current > 0) {
            reconnectAttemptsRef.current = 0;
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
          setError('Failed to parse incoming data');
        }
      };

      wsRef.current.onclose = (event) => {
        setConnectionStatus(prev => ({
          ...prev,
          connected: false,
          error: event.wasClean ? undefined : 'Connection lost'
        }));

        console.log('WebSocket disconnected:', event.code, event.reason);

        // Attempt reconnection if not explicitly closed
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = reconnectDelay * Math.pow(2, reconnectAttemptsRef.current - 1); // Exponential backoff

          console.log(`Attempting reconnection ${reconnectAttemptsRef.current}/${maxReconnectAttempts} in ${delay}ms`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setError('Failed to reconnect after multiple attempts');
        }
      };

      wsRef.current.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('WebSocket connection error');
        setConnectionStatus(prev => ({
          ...prev,
          connected: false,
          error: 'Connection error'
        }));
      };

    } catch (err) {
      console.error('Error creating WebSocket connection:', err);
      setError('Failed to create connection');
      setConnectionStatus(prev => ({
        ...prev,
        connected: false,
        error: 'Connection failed'
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }

    setConnectionStatus({
      connected: false,
      reconnecting: false,
    });
    setLastMessage(null);
    setError(null);
    reconnectAttemptsRef.current = 0;
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    setTimeout(() => {
      connect();
    }, 1000);
  }, [disconnect, connect]);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Convert KlineData to CandlestickData for easier consumption
  const candlestickData: CandlestickData | null = lastMessage ? {
    timestamp: lastMessage.kline.endTime,
    open: parseFloat(lastMessage.kline.openPrice),
    high: parseFloat(lastMessage.kline.highPrice),
    low: parseFloat(lastMessage.kline.lowPrice),
    close: parseFloat(lastMessage.kline.closePrice),
    volume: parseFloat(lastMessage.kline.volume),
  } : null;

  return {
    connectionStatus,
    lastMessage,
    candlestickData,
    error,
    connect,
    disconnect,
    reconnect,
  };
};

export default useWebSocket;