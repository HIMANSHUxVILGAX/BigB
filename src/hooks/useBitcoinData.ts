import { useState, useEffect, useCallback } from 'react';
import useWebSocket from './useWebSocket';
import { CandlestickData, PriceData } from '../types/bitcoin';

const MAX_CANDLESTICKS = 1000; // Keep last 1000 candlesticks
const DATA_STORAGE_KEY = 'bitcoin_candlestick_data';

const useBitcoinData = () => {
  const [historicalData, setHistoricalData] = useState<CandlestickData[]>([]);
  const [currentPrice, setCurrentPrice] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(true);

  const { connectionStatus, candlestickData, error } = useWebSocket();

  // Load stored data on mount
  useEffect(() => {
    try {
      const storedData = localStorage.getItem(DATA_STORAGE_KEY);
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        setHistoricalData(parsedData.slice(-MAX_CANDLESTICKS));
      }
    } catch (err) {
      console.warn('Failed to load stored data:', err);
    }
    setLoading(false);
  }, []);

  // Store data to localStorage whenever it changes
  useEffect(() => {
    if (historicalData.length > 0) {
      try {
        localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(historicalData));
      } catch (err) {
        console.warn('Failed to store data:', err);
      }
    }
  }, [historicalData]);

  // Process new candlestick data from WebSocket
  useEffect(() => {
    if (candlestickData) {
      const newPrice: PriceData = {
        price: candlestickData.close,
        price24hChange: 0, // Will be calculated below
        price24hChangePercent: 0, // Will be calculated below
        lastUpdate: candlestickData.timestamp,
      };

      // Calculate 24-hour change
      if (historicalData.length > 0) {
        const twentyFourHoursAgo = candlestickData.timestamp - (24 * 60 * 60 * 1000);
        const price24hAgo = historicalData.find(candle =>
          candle.timestamp >= twentyFourHoursAgo
        )?.open || historicalData[0]?.open || candlestickData.close;

        newPrice.price24hChange = candlestickData.close - price24hAgo;
        newPrice.price24hChangePercent = (newPrice.price24hChange / price24hAgo) * 100;
      }

      setCurrentPrice(newPrice);

      // Update historical data
      setHistoricalData(prevData => {
        const existingIndex = prevData.findIndex(
          candle => candle.timestamp === candlestickData.timestamp
        );

        let newData: CandlestickData[];

        if (existingIndex !== -1) {
          // Update existing candlestick
          newData = [...prevData];
          newData[existingIndex] = candlestickData;
        } else {
          // Add new candlestick
          newData = [...prevData, candlestickData];

          // Remove old data if exceeding limit
          if (newData.length > MAX_CANDLESTICKS) {
            newData = newData.slice(-MAX_CANDLESTICKS);
          }
        }

        return newData.sort((a, b) => a.timestamp - b.timestamp);
      });
    }
  }, [candlestickData, historicalData.length]);

  // Fetch initial historical data if we don't have any
  const fetchInitialData = useCallback(async () => {
    if (historicalData.length === 0) {
      try {
        // Fetch last 500 candlesticks from Binance REST API
        const response = await fetch(
          'https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=500'
        );

        if (!response.ok) {
          throw new Error('Failed to fetch historical data');
        }

        const klines = await response.json();

        const formattedData: CandlestickData[] = klines.map((kline: any[]) => ({
          timestamp: kline[0],
          open: parseFloat(kline[1]),
          high: parseFloat(kline[2]),
          low: parseFloat(kline[3]),
          close: parseFloat(kline[4]),
          volume: parseFloat(kline[5]),
        }));

        setHistoricalData(formattedData);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch initial data:', err);
        setLoading(false);
      }
    }
  }, [historicalData.length]);

  // Get the latest N candlesticks for ML processing
  const getRecentData = useCallback((count: number): CandlestickData[] => {
    return historicalData.slice(-count);
  }, [historicalData]);

  // Get data for specific time range
  const getDataInTimeRange = useCallback((startTime: number, endTime: number): CandlestickData[] => {
    return historicalData.filter(
      candle => candle.timestamp >= startTime && candle.timestamp <= endTime
    );
  }, [historicalData]);

  // Clear all stored data
  const clearData = useCallback(() => {
    setHistoricalData([]);
    setCurrentPrice(null);
    localStorage.removeItem(DATA_STORAGE_KEY);
  }, []);

  // Get data for different timeframes
  const getTimeframeData = useCallback((minutes: number): CandlestickData[] => {
    if (historicalData.length === 0) return [];

    const timeframeData: CandlestickData[] = [];
    const timeframeMs = minutes * 60 * 1000;

    let currentCandle: CandlestickData | null = null;

    for (const candle of historicalData) {
      const candleTime = Math.floor(candle.timestamp / timeframeMs) * timeframeMs;

      if (!currentCandle || currentCandle.timestamp !== candleTime) {
        if (currentCandle) {
          timeframeData.push(currentCandle);
        }

        currentCandle = {
          timestamp: candleTime,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
        };
      } else {
        // Update the current candle
        currentCandle.high = Math.max(currentCandle.high, candle.high);
        currentCandle.low = Math.min(currentCandle.low, candle.low);
        currentCandle.close = candle.close;
        currentCandle.volume += candle.volume;
      }
    }

    if (currentCandle) {
      timeframeData.push(currentCandle);
    }

    return timeframeData;
  }, [historicalData]);

  // Initialize data if needed
  useEffect(() => {
    if (connectionStatus.connected && historicalData.length === 0) {
      fetchInitialData();
    }
  }, [connectionStatus.connected, historicalData.length, fetchInitialData]);

  return {
    historicalData,
    currentPrice,
    connectionStatus,
    loading: loading || !connectionStatus.connected,
    error,
    getRecentData,
    getDataInTimeRange,
    getTimeframeData,
    clearData,
    fetchInitialData,
  };
};

export default useBitcoinData;