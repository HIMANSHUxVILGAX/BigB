import * as tf from '@tensorflow/tfjs';
import { CandlestickData, PredictionResult, MLModelMetrics } from '../types/bitcoin';

interface TechnicalIndicators {
  rsi: number;
  macd: number;
  macdSignal: number;
  bollingerUpper: number;
  bollingerLower: number;
  sma20: number;
  sma50: number;
  volumeSMA: number;
}

class MLService {
  private model: tf.LayersModel | null = null;
  private readonly modelVersion = '1.0.0';
  private readonly sequenceLength = 20; // Use last 20 candlesticks
  private readonly featureCount = 13; // Number of input features
  private isInitialized = false;
  private predictionHistory: Array<{
    prediction: PredictionResult;
    actualResult?: 'bullish' | 'bearish';
    timestamp: number;
  }> = [];

  /**
   * Initialize the ML model
   */
  async initializeModel(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('Initializing ML model...');

      // Create a simple LSTM model
      this.model = this.createLSTMModel();

      // Load pre-trained weights if available (for demo, we'll use random weights)
      // In production, you would load actual trained weights
      await this.loadOrInitializeWeights();

      this.isInitialized = true;
      console.log('ML model initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ML model:', error);
      throw new Error('ML model initialization failed');
    }
  }

  /**
   * Create LSTM model architecture
   */
  private createLSTMModel(): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        tf.layers.lstm({
          units: 50,
          returnSequences: true,
          inputShape: [this.sequenceLength, this.featureCount],
          kernelInitializer: 'glorotUniform',
          recurrentInitializer: 'orthogonal',
          dropout: 0.2,
          recurrentDropout: 0.2,
        }),
        tf.layers.lstm({
          units: 30,
          returnSequences: false,
          kernelInitializer: 'glorotUniform',
          recurrentInitializer: 'orthogonal',
          dropout: 0.2,
          recurrentDropout: 0.2,
        }),
        tf.layers.dense({
          units: 15,
          activation: 'relu',
          kernelInitializer: 'glorotUniform',
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: 2, // [bearish_prob, bullish_prob]
          activation: 'softmax',
          kernelInitializer: 'glorotUniform',
        }),
      ],
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy'],
    });

    return model;
  }

  /**
   * Load pre-trained weights or initialize with random weights
   */
  private async loadOrInitializeWeights(): Promise<void> {
    // In a real implementation, you would load weights from storage
    // For demo purposes, we'll use randomly initialized weights
    console.log('Using randomly initialized weights for demo');
  }

  /**
   * Calculate technical indicators from candlestick data
   */
  private calculateTechnicalIndicators(data: CandlestickData[]): TechnicalIndicators[] {
    const indicators: TechnicalIndicators[] = [];

    for (let i = 0; i < data.length; i++) {
      const rsi = this.calculateRSI(data, i);
      const macdData = this.calculateMACD(data, i);
      const bollingerData = this.calculateBollingerBands(data, i);
      const sma20 = this.calculateSMA(data, i, 20);
      const sma50 = this.calculateSMA(data, i, 50);
      const volumeSMA = this.calculateVolumeSMA(data, i, 20);

      indicators.push({
        rsi,
        macd: macdData.macd,
        macdSignal: macdData.signal,
        bollingerUpper: bollingerData.upper,
        bollingerLower: bollingerData.lower,
        sma20,
        sma50,
        volumeSMA,
      });
    }

    return indicators;
  }

  /**
   * Calculate RSI (Relative Strength Index)
   */
  private calculateRSI(data: CandlestickData[], index: number, period: number = 14): number {
    if (index < period) return 50; // Neutral RSI for insufficient data

    let gains = 0;
    let losses = 0;

    for (let i = index - period + 1; i <= index; i++) {
      const change = data[i].close - data[i - 1].close;
      if (change > 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    return rsi;
  }

  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   */
  private calculateMACD(data: CandlestickData[], index: number): { macd: number; signal: number } {
    if (index < 26) return { macd: 0, signal: 0 };

    const ema12 = this.calculateEMA(data, index, 12);
    const ema26 = this.calculateEMA(data, index, 26);
    const macd = ema12 - ema26;

    // Simple signal line calculation (in reality, this would be EMA of MACD)
    const signal = macd * 0.9; // Simplified for demo

    return { macd, signal };
  }

  /**
   * Calculate EMA (Exponential Moving Average)
   */
  private calculateEMA(data: CandlestickData[], index: number, period: number): number {
    if (index === 0) return data[0].close;

    const multiplier = 2 / (period + 1);
    const ema = (data[index].close - this.calculateEMA(data, index - 1, period)) * multiplier +
                this.calculateEMA(data, index - 1, period);

    return ema;
  }

  /**
   * Calculate Bollinger Bands
   */
  private calculateBollingerBands(data: CandlestickData[], index: number, period: number = 20): {
    upper: number;
    lower: number;
  } {
    if (index < period) {
      return { upper: data[index].close, lower: data[index].close };
    }

    let sum = 0;
    for (let i = index - period + 1; i <= index; i++) {
      sum += data[i].close;
    }
    const sma = sum / period;

    let variance = 0;
    for (let i = index - period + 1; i <= index; i++) {
      variance += Math.pow(data[i].close - sma, 2);
    }
    const stdDev = Math.sqrt(variance / period);

    return {
      upper: sma + (2 * stdDev),
      lower: sma - (2 * stdDev),
    };
  }

  /**
   * Calculate SMA (Simple Moving Average)
   */
  private calculateSMA(data: CandlestickData[], index: number, period: number): number {
    if (index < period) return data[index].close;

    let sum = 0;
    for (let i = index - period + 1; i <= index; i++) {
      sum += data[i].close;
    }
    return sum / period;
  }

  /**
   * Calculate Volume SMA
   */
  private calculateVolumeSMA(data: CandlestickData[], index: number, period: number): number {
    if (index < period) return data[index].volume;

    let sum = 0;
    for (let i = index - period + 1; i <= index; i++) {
      sum += data[i].volume;
    }
    return sum / period;
  }

  /**
   * Prepare data for model inference
   */
  private prepareInferenceData(data: CandlestickData[]): tf.Tensor2D {
    const indicators = this.calculateTechnicalIndicators(data);
    const features: number[][] = [];

    for (let i = this.sequenceLength - 1; i < data.length; i++) {
      const sequence: number[] = [];

      // Get the last sequenceLength candlesticks
      for (let j = i - this.sequenceLength + 1; j <= i; j++) {
        const candle = data[j];
        const indicator = indicators[j];

        // Normalize price data (divide by 100000 for Bitcoin)
        const normalizedOpen = candle.open / 100000;
        const normalizedHigh = candle.high / 100000;
        const normalizedLow = candle.low / 100000;
        const normalizedClose = candle.close / 100000;

        // Normalize volume (log scale)
        const normalizedVolume = Math.log(candle.volume + 1) / 20;

        // Normalize technical indicators
        const normalizedRSI = indicator.rsi / 100;
        const normalizedMACD = Math.tanh(indicator.macd / 100);
        const normalizedMACDSignal = Math.tanh(indicator.macdSignal / 100);
        const normalizedBollingerPosition = (candle.close - indicator.bollingerLower) /
                                           (indicator.bollingerUpper - indicator.bollingerLower + 0.001);
        const normalizedSMA20 = indicator.sma20 / 100000;
        const normalizedSMA50 = indicator.sma50 / 100000;
        const normalizedVolumeRatio = candle.volume / (indicator.volumeSMA + 0.001);

        // Time-based features
        const hourOfDay = (new Date(candle.timestamp).getHours()) / 24;
        // const dayOfWeek = (new Date(candle.timestamp).getDay()) / 7;

        sequence.push(
          normalizedOpen,
          normalizedHigh,
          normalizedLow,
          normalizedClose,
          normalizedVolume,
          normalizedRSI,
          normalizedMACD,
          normalizedMACDSignal,
          normalizedBollingerPosition,
          normalizedSMA20,
          normalizedSMA50,
          normalizedVolumeRatio,
          hourOfDay
        );
      }

      features.push(sequence);
    }

    return tf.tensor2d(features);
  }

  /**
   * Generate prediction for the next candlestick
   */
  async generatePrediction(data: CandlestickData[]): Promise<PredictionResult> {
    if (!this.isInitialized || !this.model) {
      await this.initializeModel();
    }

    if (data.length < this.sequenceLength) {
      throw new Error(`Insufficient data: need at least ${this.sequenceLength} candlesticks`);
    }

    try {
      // Get the most recent sequence
      const recentData = data.slice(-this.sequenceLength);
      const inputTensor = this.prepareInferenceData(recentData);

      // Get the last sequence (most recent)
      const lastSequence = inputTensor.slice([0, 0], [1, this.sequenceLength * this.featureCount]);
      const reshapedInput = lastSequence.reshape([1, this.sequenceLength, this.featureCount]);

      if (!this.model) {
        throw new Error('Model not initialized');
      }

      // Make prediction
      const prediction = this.model.predict(reshapedInput) as tf.Tensor2D;
      const probabilities = await prediction.data();

      // Clean up tensors
      inputTensor.dispose();
      lastSequence.dispose();
      reshapedInput.dispose();
      prediction.dispose();

      const [bearishProb, bullishProb] = probabilities;
      const direction = bullishProb > bearishProb ? 'bullish' : 'bearish';
      const confidence = Math.max(bullishProb, bearishProb) * 100;

      const result: PredictionResult = {
        direction,
        confidence,
        timestamp: Date.now(),
        modelVersion: this.modelVersion,
        reasoning: this.generateReasoning(recentData, direction, confidence),
      };

      // Store prediction for tracking
      this.predictionHistory.push({
        prediction: result,
        timestamp: Date.now(),
      });

      // Keep only last 100 predictions
      if (this.predictionHistory.length > 100) {
        this.predictionHistory = this.predictionHistory.slice(-100);
      }

      return result;
    } catch (error) {
      console.error('Prediction failed:', error);
      throw new Error('Failed to generate prediction');
    }
  }

  /**
   * Generate human-readable reasoning for the prediction
   */
  private generateReasoning(data: CandlestickData[], direction: 'bullish' | 'bearish', _confidence: number): string {
    const latest = data[data.length - 1];
    const previous = data[data.length - 2];
    const priceChange = ((latest.close - previous.close) / previous.close) * 100;

    const indicators = this.calculateTechnicalIndicators(data);
    const latestIndicators = indicators[indicators.length - 1];

    const reasons = [];

    if (direction === 'bullish') {
      if (priceChange > 0.1) reasons.push('Recent price momentum');
      if (latestIndicators.rsi < 30) reasons.push('Oversold conditions (RSI)');
      if (latest.close < latestIndicators.bollingerLower) reasons.push('Below Bollinger Band');
      if (latestIndicators.macd > latestIndicators.macdSignal) reasons.push('MACD bullish crossover');
    } else {
      if (priceChange < -0.1) reasons.push('Recent price decline');
      if (latestIndicators.rsi > 70) reasons.push('Overbought conditions (RSI)');
      if (latest.close > latestIndicators.bollingerUpper) reasons.push('Above Bollinger Band');
      if (latestIndicators.macd < latestIndicators.macdSignal) reasons.push('MACD bearish crossover');
    }

    return reasons.length > 0 ? reasons.join(', ') : 'Technical analysis pattern';
  }

  /**
   * Calculate model performance metrics
   */
  getModelMetrics(): MLModelMetrics {
    const relevantHistory = this.predictionHistory.filter(h => h.actualResult !== undefined);
    const totalPredictions = relevantHistory.length;
    const correctPredictions = relevantHistory.filter(h => (h as any).wasCorrect).length;
    const accuracy = totalPredictions > 0 ? (correctPredictions / totalPredictions) * 100 : 0;

    return {
      accuracy,
      totalPredictions,
      correctPredictions,
      lastUpdated: Date.now(),
      modelVersion: this.modelVersion,
    };
  }

  /**
   * Update prediction with actual result
   */
  updatePredictionResult(predictionId: number, actualResult: 'bullish' | 'bearish'): void {
    if (predictionId >= 0 && predictionId < this.predictionHistory.length) {
      const prediction = this.predictionHistory[predictionId];
      prediction.actualResult = actualResult;
      (prediction as any).wasCorrect = prediction.prediction.direction === actualResult;
    }
  }

  /**
   * Get recent prediction history
   */
  getPredictionHistory(limit: number = 10): Array<{
    prediction: PredictionResult;
    actualResult?: 'bullish' | 'bearish';
    wasCorrect?: boolean;
    timestamp: number;
  }> {
    return this.predictionHistory.slice(-limit);
  }

  /**
   * Dispose of the model and clean up resources
   */
  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
    this.isInitialized = false;
  }
}

// Create singleton instance
const mlService = new MLService();

export default mlService;