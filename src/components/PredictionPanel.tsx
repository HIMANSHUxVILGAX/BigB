import React from 'react';
import { PredictionResult, MLModelMetrics, PredictionHistory } from '../types/bitcoin';

interface PredictionPanelProps {
  currentPrediction: PredictionResult | null;
  modelMetrics: MLModelMetrics | null;
  predictionHistory: PredictionHistory[];
  loading: boolean;
  error: string | null;
}

const PredictionPanel: React.FC<PredictionPanelProps> = ({
  currentPrediction,
  modelMetrics,
  predictionHistory,
  loading,
  error,
}) => {
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 75) return 'var(--accent-green)';
    if (confidence >= 60) return '#ffa500';
    return 'var(--accent-red)';
  };

  const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 75) return 'High';
    if (confidence >= 60) return 'Medium';
    return 'Low';
  };

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getAccuracyColor = (accuracy: number): string => {
    if (accuracy >= 65) return 'var(--accent-green)';
    if (accuracy >= 55) return '#ffa500';
    return 'var(--accent-red)';
  };

  if (error) {
    return (
      <div className="prediction-panel-container bg-secondary rounded p-6 shadow">
        <div className="text-center py-8">
          <div className="text-red mb-2">Prediction Error</div>
          <div className="text-secondary text-sm">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="prediction-panel-container bg-secondary rounded p-6 shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">AI Prediction</h2>
        {modelMetrics && (
          <div className="text-xs text-secondary">
            Model v{modelMetrics.modelVersion}
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-2 border-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-secondary">Analyzing market patterns...</div>
        </div>
      ) : currentPrediction ? (
        <>
          {/* Main Prediction Display */}
          <div className="text-center mb-8">
            {/* Direction Indicator */}
            <div className="flex items-center justify-center mb-4">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 ${
                currentPrediction.direction === 'bullish'
                  ? 'border-green bg-green bg-opacity-10'
                  : 'border-red bg-red bg-opacity-10'
              }`}>
                <div className="text-center">
                  <div className={`text-4xl mb-1 ${
                    currentPrediction.direction === 'bullish' ? 'text-green' : 'text-red'
                  }`}>
                    {currentPrediction.direction === 'bullish' ? '↗' : '↘'}
                  </div>
                  <div className={`text-sm font-bold uppercase ${
                    currentPrediction.direction === 'bullish' ? 'text-green' : 'text-red'
                  }`}>
                    {currentPrediction.direction}
                  </div>
                </div>
              </div>
            </div>

            {/* Confidence Score */}
            <div className="mb-4">
              <div className="text-sm text-secondary mb-2">Confidence</div>
              <div className="relative h-8 bg-tertiary rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-1000 ease-out flex items-center justify-center"
                  style={{
                    width: `${currentPrediction.confidence}%`,
                    backgroundColor: getConfidenceColor(currentPrediction.confidence),
                  }}
                >
                  <span className="text-sm font-medium text-white">
                    {currentPrediction.confidence.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="text-xs text-secondary mt-1">
                {getConfidenceLabel(currentPrediction.confidence)} confidence
              </div>
            </div>

            {/* Prediction Reasoning */}
            {currentPrediction.reasoning && (
              <div className="p-3 bg-tertiary rounded mb-4">
                <div className="text-xs text-secondary mb-1">Analysis based on:</div>
                <div className="text-sm text-primary">
                  {currentPrediction.reasoning}
                </div>
              </div>
            )}

            {/* Prediction Time */}
            <div className="text-xs text-secondary">
              Generated: {formatTime(currentPrediction.timestamp)}
            </div>
          </div>

          {/* Model Performance Metrics */}
          {modelMetrics && (
            <div className="border-t pt-4 mb-6">
              <div className="text-sm font-medium mb-3">Model Performance</div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-secondary">Accuracy:</span>
                  <div className="flex items-center space-x-2">
                    <div className="text-sm font-medium" style={{ color: getAccuracyColor(modelMetrics.accuracy) }}>
                      {modelMetrics.accuracy.toFixed(1)}%
                    </div>
                    <div className="text-xs text-secondary">
                      ({modelMetrics.correctPredictions}/{modelMetrics.totalPredictions})
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-secondary">Total Predictions:</span>
                  <span className="text-sm font-medium">{modelMetrics.totalPredictions}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-secondary">Last Updated:</span>
                  <span className="text-sm font-medium">
                    {formatTime(modelMetrics.lastUpdated)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Recent Predictions History */}
          {predictionHistory.length > 0 && (
            <div className="border-t pt-4">
              <div className="text-sm font-medium mb-3">Recent Predictions</div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {predictionHistory.slice(-5).reverse().map((item, index) => (
                  <div
                    key={`${item.prediction.timestamp}-${index}`}
                    className="flex items-center justify-between p-2 bg-tertiary rounded text-sm"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        item.prediction.direction === 'bullish'
                          ? 'bg-green bg-opacity-20 text-green'
                          : 'bg-red bg-opacity-20 text-red'
                      }`}>
                        <span className="text-xs">
                          {item.prediction.direction === 'bullish' ? '↗' : '↘'}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium capitalize">
                          {item.prediction.direction}
                        </div>
                        <div className="text-xs text-secondary">
                          {formatTime(item.prediction.timestamp)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="text-xs text-secondary">
                        {item.prediction.confidence.toFixed(0)}%
                      </div>
                      {item.wasCorrect !== undefined && (
                        <div className={`text-xs font-medium ${
                          item.wasCorrect ? 'text-green' : 'text-red'
                        }`}>
                          {item.wasCorrect ? '✓' : '✗'}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="mt-6 p-3 bg-tertiary rounded text-xs text-secondary">
            <div className="font-medium mb-1">Disclaimer:</div>
            <div>
              This AI prediction is for informational purposes only and should not be considered financial advice.
              Always do your own research before making trading decisions.
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <div className="text-secondary mb-2">No prediction available</div>
          <div className="text-xs text-secondary">
            Waiting for sufficient market data...
          </div>
        </div>
      )}
    </div>
  );
};

export default PredictionPanel;