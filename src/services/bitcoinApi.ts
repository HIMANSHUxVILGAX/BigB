import axios from 'axios';
import { CandlestickData, HistoricalData } from '../types/bitcoin';

class BitcoinApiService {
  private readonly BINANCE_REST_URL = 'https://api.binance.com/api/v3';
  private readonly COINGECKO_URL = 'https://api.coingecko.com/api/v3';
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;

  /**
   * Fetch historical candlestick data from Binance API
   */
  async fetchHistoricalData(
    symbol: string = 'BTCUSDT',
    interval: string = '1m',
    limit: number = 1000
  ): Promise<HistoricalData> {
    const url = `${this.BINANCE_REST_URL}/klines`;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const response = await axios.get(url, {
          params: { symbol, interval, limit },
          timeout: 10000,
        });

        const klines = response.data;

        const candlestickData: CandlestickData[] = klines.map((kline: any[]) => ({
          timestamp: kline[0],
          open: parseFloat(kline[1]),
          high: parseFloat(kline[2]),
          low: parseFloat(kline[3]),
          close: parseFloat(kline[4]),
          volume: parseFloat(kline[5]),
        }));

        return {
          data: candlestickData,
          startTime: candlestickData[0]?.timestamp || Date.now(),
          endTime: candlestickData[candlestickData.length - 1]?.timestamp || Date.now(),
          symbol,
          interval,
        };
      } catch (error) {
        console.error(`Attempt ${attempt}/${this.MAX_RETRIES} failed:`, error);

        if (attempt === this.MAX_RETRIES) {
          // Fallback to CoinGecko for basic price data
          return this.fetchFallbackData(symbol);
        }

        // Wait before retrying
        await this.delay(this.RETRY_DELAY * attempt);
      }
    }

    throw new Error('Failed to fetch historical data after all retries');
  }

  /**
   * Fallback to CoinGecko API when Binance fails
   */
  private async fetchFallbackData(symbol: string): Promise<HistoricalData> {
    try {
      const coinId = symbol === 'BTCUSDT' ? 'bitcoin' : symbol.toLowerCase().replace('usdt', '');
      const url = `${this.COINGECKO_URL}/coins/${coinId}/market_chart`;

      const response = await axios.get(url, {
        params: {
          vs_currency: 'usd',
          days: 1, // Get 1 day of data as fallback
          interval: 'minute',
        },
        timeout: 10000,
      });

      const prices = response.data.prices;
      const volumes = response.data.total_volumes;

      const candlestickData: CandlestickData[] = prices.map((price: [number, number], index: number) => ({
        timestamp: price[0],
        open: price[1],
        high: price[1] * 1.001, // Small variation since we don't have real OHLC
        low: price[1] * 0.999,  // Small variation since we don't have real OHLC
        close: price[1],
        volume: volumes[index]?.[1] || 0,
      }));

      return {
        data: candlestickData,
        startTime: candlestickData[0]?.timestamp || Date.now(),
        endTime: candlestickData[candlestickData.length - 1]?.timestamp || Date.now(),
        symbol,
        interval: '1m',
      };
    } catch (error) {
      console.error('Fallback API also failed:', error);
      throw new Error('All data sources unavailable');
    }
  }

  /**
   * Get current price from multiple sources
   */
  async getCurrentPrice(symbol: string = 'BTCUSDT'): Promise<{ price: number; source: string }> {
    try {
      // Try Binance first
      const response = await axios.get(`${this.BINANCE_REST_URL}/ticker/price`, {
        params: { symbol },
        timeout: 5000,
      });

      return {
        price: parseFloat(response.data.price),
        source: 'Binance',
      };
    } catch (error) {
      console.warn('Binance price fetch failed, trying CoinGecko:', error);

      try {
        // Fallback to CoinGecko
        const coinId = symbol === 'BTCUSDT' ? 'bitcoin' : symbol.toLowerCase().replace('usdt', '');
        const response = await axios.get(`${this.COINGECKO_URL}/simple/price`, {
          params: {
            ids: coinId,
            vs_currencies: 'usd',
          },
          timeout: 5000,
        });

        return {
          price: response.data[coinId]?.usd || 0,
          source: 'CoinGecko',
        };
      } catch (fallbackError) {
        console.error('All price sources failed:', fallbackError);
        throw new Error('Unable to fetch current price');
      }
    }
  }

  /**
   * Get 24h ticker statistics
   */
  async get24hStats(symbol: string = 'BTCUSDT'): Promise<{
    priceChange: number;
    priceChangePercent: number;
    highPrice: number;
    lowPrice: number;
    openPrice: number;
    volume: number;
  }> {
    try {
      const response = await axios.get(`${this.BINANCE_REST_URL}/ticker/24hr`, {
        params: { symbol },
        timeout: 5000,
      });

      return {
        priceChange: parseFloat(response.data.priceChange),
        priceChangePercent: parseFloat(response.data.priceChangePercent),
        highPrice: parseFloat(response.data.highPrice),
        lowPrice: parseFloat(response.data.lowPrice),
        openPrice: parseFloat(response.data.openPrice),
        volume: parseFloat(response.data.volume),
      };
    } catch (error) {
      console.error('Failed to fetch 24h stats:', error);
      // Return default values
      return {
        priceChange: 0,
        priceChangePercent: 0,
        highPrice: 0,
        lowPrice: 0,
        openPrice: 0,
        volume: 0,
      };
    }
  }

  /**
   * Create WebSocket connection to Binance
   */
  createWebSocket(streams: string[]): WebSocket {
    const streamUrl = `wss://stream.binance.com:9443/ws/${streams.join('/')}`;
    return new WebSocket(streamUrl);
  }

  /**
   * Utility function to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test connectivity to all data sources
   */
  async testConnectivity(): Promise<{
    binance: boolean;
    coingecko: boolean;
    websocket: boolean;
  }> {
    const results = {
      binance: false,
      coingecko: false,
      websocket: false,
    };

    // Test Binance REST API
    try {
      await axios.get(`${this.BINANCE_REST_URL}/ping`, { timeout: 3000 });
      results.binance = true;
    } catch (error) {
      console.warn('Binance REST API connectivity test failed:', error);
    }

    // Test CoinGecko API
    try {
      await axios.get(`${this.COINGECKO_URL}/ping`, { timeout: 3000 });
      results.coingecko = true;
    } catch (error) {
      console.warn('CoinGecko API connectivity test failed:', error);
    }

    // Test WebSocket connectivity
    try {
      const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@ticker');
      results.websocket = await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          ws.close();
          resolve(false);
        }, 3000);

        ws.onopen = () => {
          clearTimeout(timeout);
          ws.close();
          resolve(true);
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };
      });
    } catch (error) {
      console.warn('WebSocket connectivity test failed:', error);
    }

    return results;
  }

  /**
   * Get server time for synchronization
   */
  async getServerTime(): Promise<number> {
    try {
      const response = await axios.get(`${this.BINANCE_REST_URL}/time`, {
        timeout: 3000,
      });
      return response.data.serverTime;
    } catch (error) {
      console.warn('Failed to get server time:', error);
      return Date.now();
    }
  }
}

// Create singleton instance
const bitcoinApiService = new BitcoinApiService();

export default bitcoinApiService;