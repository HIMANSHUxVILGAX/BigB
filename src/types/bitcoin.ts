export interface KlineData {
  eventType: string;
  eventTime: number;
  symbol: string;
  kline: {
    startTime: number;
    endTime: number;
    symbol: string;
    interval: string;
    firstTradeId: number;
    lastTradeId: number;
    openPrice: string;
    closePrice: string;
    highPrice: string;
    lowPrice: string;
    volume: string;
    numberOfTrades: number;
    isKlineClosed: boolean;
  };
}

export interface CandlestickData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PredictionResult {
  direction: 'bullish' | 'bearish';
  confidence: number;
  timestamp: number;
  modelVersion: string;
  reasoning?: string;
}

export interface ConnectionStatus {
  connected: boolean;
  reconnecting: boolean;
  error?: string;
  lastConnected?: number;
}

export interface PriceData {
  price: number;
  price24hChange: number;
  price24hChangePercent: number;
  lastUpdate: number;
}

export interface HistoricalData {
  data: CandlestickData[];
  startTime: number;
  endTime: number;
  symbol: string;
  interval: string;
}

export interface MLModelMetrics {
  accuracy: number;
  totalPredictions: number;
  correctPredictions: number;
  lastUpdated: number;
  modelVersion: string;
}

export interface WebSocketMessage {
  stream: string;
  data: KlineData;
}

export interface PredictionHistory {
  prediction: PredictionResult;
  actualResult?: 'bullish' | 'bearish';
  wasCorrect?: boolean;
}

export interface AppState {
  connectionStatus: ConnectionStatus;
  currentPrice: PriceData | null;
  candlestickData: CandlestickData[];
  currentPrediction: PredictionResult | null;
  predictionHistory: PredictionHistory[];
  modelMetrics: MLModelMetrics | null;
  loading: boolean;
  error: string | null;
}