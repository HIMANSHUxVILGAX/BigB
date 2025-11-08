import React, { useState, useEffect, useCallback } from 'react';
import PriceDisplay from './PriceDisplay';
import CandlestickChart from './CandlestickChart';
import PredictionPanel from './PredictionPanel';
import useBitcoinData from '../hooks/useBitcoinData';
import mlService from '../services/mlService';
import { PredictionResult, MLModelMetrics, PredictionHistory } from '../types/bitcoin';

const Dashboard: React.FC = () => {
  const [currentPrediction, setCurrentPrediction] = useState<PredictionResult | null>(null);
  const [modelMetrics, setModelMetrics] = useState<MLModelMetrics | null>(null);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('1m');

  const {
    historicalData,
    currentPrice,
    connectionStatus,
    loading,
    error,
    getRecentData,
  } = useBitcoinData();

  // Initialize ML service
  useEffect(() => {
    const initializeML = async () => {
      try {
        await mlService.initializeModel();
        console.log('ML service initialized successfully');
      } catch (error) {
        console.error('Failed to initialize ML service:', error);
        setPredictionError('Failed to initialize prediction service');
      }
    };

    initializeML();

    return () => {
      mlService.dispose();
    };
  }, []);

  // Generate predictions when new data is available
  const generatePrediction = useCallback(async () => {
    if (historicalData.length < 20) {
      console.log('Insufficient data for prediction');
      return;
    }

    setPredictionLoading(true);
    setPredictionError(null);

    try {
      const prediction = await mlService.generatePrediction(historicalData);
      setCurrentPrediction(prediction);
      console.log('New prediction generated:', prediction);
    } catch (error) {
      console.error('Prediction failed:', error);
      setPredictionError('Failed to generate prediction');
    } finally {
      setPredictionLoading(false);
    }
  }, [historicalData]);

  // Update model metrics
  const updateModelMetrics = useCallback(() => {
    const metrics = mlService.getModelMetrics();
    setModelMetrics(metrics);
  }, []);

  // Generate prediction when enough data is available
  useEffect(() => {
    if (historicalData.length >= 20 && !predictionLoading) {
      generatePrediction();
      updateModelMetrics();
    }
  }, [historicalData, generatePrediction, updateModelMetrics, predictionLoading]);

  // Auto-refresh predictions every minute
  useEffect(() => {
    const interval = setInterval(() => {
      if (historicalData.length >= 20 && connectionStatus.connected) {
        generatePrediction();
      }
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, [generatePrediction, historicalData.length, connectionStatus.connected]);

  // Handle manual prediction refresh
  const handleRefreshPrediction = () => {
    generatePrediction();
  };

  // Handle timeframe change
  const handleTimeframeChange = (timeframe: string) => {
    setSelectedTimeframe(timeframe);
  };

  // Get prediction history from ML service
  const getPredictionHistory = (): PredictionHistory[] => {
    return mlService.getPredictionHistory(10).map(item => ({
      prediction: item.prediction,
      actualResult: item.actualResult,
      wasCorrect: item.wasCorrect,
    }));
  };

  return (
    <div className="dashboard min-h-screen bg-primary">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-primary flex items-center space-x-2">
                <span className="text-green">₿</span>
                <span>Bitcoin Trading Assistant</span>
              </h1>
              <div className="flex items-center space-x-2 text-sm text-secondary">
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus.connected ? 'bg-green' : 'bg-red'
                }`}></div>
                <span>
                  {connectionStatus.connected ? 'Live' : 'Offline'}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Connection Status */}
              <div className="text-sm text-secondary">
                {connectionStatus.connected ? (
                  <span className="text-green">● Real-time Data</span>
                ) : connectionStatus.reconnecting ? (
                  <span className="text-yellow">● Reconnecting...</span>
                ) : (
                  <span className="text-red">● Disconnected</span>
                )}
              </div>

              {/* Data Source */}
              <div className="text-sm text-secondary">
                Data: <span className="text-green">Binance</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red bg-opacity-10 border border-red rounded-lg">
            <div className="flex items-center space-x-2">
              <span className="text-red">⚠</span>
              <span className="text-red">{error}</span>
            </div>
          </div>
        )}

        {/* Price Display */}
        <div className="mb-6">
          <PriceDisplay
            currentPrice={currentPrice}
            connectionStatus={connectionStatus}
            loading={loading}
          />
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart Section - Takes 2 columns on large screens */}
          <div className="lg:col-span-2">
            <CandlestickChart
              data={historicalData}
              loading={loading}
              onTimeframeChange={handleTimeframeChange}
            />
          </div>

          {/* Prediction Panel - Takes 1 column on large screens */}
          <div className="lg:col-span-1">
            <PredictionPanel
              currentPrediction={currentPrediction}
              modelMetrics={modelMetrics}
              predictionHistory={getPredictionHistory()}
              loading={predictionLoading}
              error={predictionError}
            />

            {/* Manual Refresh Button */}
            <div className="mt-4 text-center">
              <button
                onClick={handleRefreshPrediction}
                disabled={predictionLoading || !connectionStatus.connected}
                className="px-4 py-2 bg-green text-black font-medium rounded-lg
                         hover:bg-green hover:opacity-90 transition-all duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center space-x-2 mx-auto"
              >
                {predictionLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <span>🔄</span>
                    <span>Refresh Prediction</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Information */}
        <div className="mt-8 pt-6 border-t border-gray-800">
          <div className="flex flex-col md:flex-row items-center justify-between text-sm text-secondary">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
              <span>Historical Data Points: {historicalData.length}</span>
              <span>•</span>
              <span>Selected Timeframe: {selectedTimeframe}</span>
              <span>•</span>
              <span>
                Data Range: {historicalData.length > 0 &&
                  `${new Date(historicalData[0]?.timestamp).toLocaleDateString()} - ${new Date(historicalData[historicalData.length - 1]?.timestamp).toLocaleDateString()}`
                }
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <span>Powered by</span>
              <span className="text-green">TensorFlow.js</span>
              <span>+</span>
              <span className="text-green">TradingView</span>
            </div>
          </div>
        </div>
      </main>

      {/* Status Bar */}
      <footer className="border-t border-gray-800 py-2">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between text-xs text-secondary">
            <div className="flex items-center space-x-4">
              <span>
                Last Update: {currentPrice?.lastUpdate ?
                  new Date(currentPrice.lastUpdate).toLocaleString() : 'N/A'
                }
              </span>
              <span>•</span>
              <span>
                Model Status: {modelMetrics ? 'Active' : 'Initializing...'}
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <span>Bitcoin Real-Time Price & Prediction System</span>
              <span>•</span>
              <span>v1.0.0</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;