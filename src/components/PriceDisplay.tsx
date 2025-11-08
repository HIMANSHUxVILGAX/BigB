import React, { useState, useEffect } from 'react';
import { PriceData, ConnectionStatus } from '../types/bitcoin';

interface PriceDisplayProps {
  currentPrice: PriceData | null;
  connectionStatus: ConnectionStatus;
  loading: boolean;
}

const PriceDisplay: React.FC<PriceDisplayProps> = ({
  currentPrice,
  connectionStatus,
  loading,
}) => {
  const [previousPrice, setPreviousPrice] = useState<number | null>(null);
  const [priceAnimation, setPriceAnimation] = useState(false);

  // Trigger animation when price changes
  useEffect(() => {
    if (currentPrice && previousPrice !== null && currentPrice.price !== previousPrice) {
      setPriceAnimation(true);
      const timer = setTimeout(() => setPriceAnimation(false), 500);
      return () => clearTimeout(timer);
    }
    if (currentPrice) {
      setPreviousPrice(currentPrice.price);
    }
  }, [currentPrice, previousPrice]);

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const formatPercentage = (percent: number): string => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  const getConnectionStatusColor = (): string => {
    if (connectionStatus.connected) return 'var(--accent-green)';
    if (connectionStatus.reconnecting) return '#ffa500';
    return 'var(--accent-red)';
  };

  const getConnectionStatusText = (): string => {
    if (connectionStatus.connected) return 'Connected';
    if (connectionStatus.reconnecting) return 'Reconnecting...';
    if (connectionStatus.error) return `Error: ${connectionStatus.error}`;
    return 'Disconnected';
  };

  const formatLastUpdate = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 1000) return 'Just now';
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return new Date(timestamp).toLocaleTimeString();
  };

  if (loading) {
    return (
      <div className="price-display-container bg-secondary rounded p-6 shadow">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-secondary text-sm mb-2">Bitcoin Price</div>
            <div className="h-10 w-48 bg-tertiary rounded loading"></div>
          </div>
          <div className="text-center">
            <div className="w-3 h-3 bg-tertiary rounded-full loading"></div>
            <div className="text-xs text-secondary mt-1">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="price-display-container bg-secondary rounded p-6 shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 rounded-full animate-pulse"
               style={{ backgroundColor: getConnectionStatusColor() }}></div>
          <span className="text-sm text-secondary">
            {getConnectionStatusText()}
          </span>
        </div>

        {currentPrice && (
          <div className="text-right">
            <div className="text-xs text-secondary">
              Last updated: {formatLastUpdate(currentPrice.lastUpdate)}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="text-sm text-secondary mb-2">Bitcoin (BTC/USD)</div>

          {currentPrice ? (
            <>
              <div className={`text-4xl font-bold mb-2 transition-all duration-300 ${
                priceAnimation ? 'scale-105' : 'scale-100'
              }`}>
                <span className={
                  currentPrice.price24hChange >= 0 ? 'text-green' : 'text-red'
                }>
                  {formatPrice(currentPrice.price)}
                </span>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-secondary">24h Change:</span>
                  <span className={`text-sm font-medium ${
                    currentPrice.price24hChange >= 0 ? 'text-green' : 'text-red'
                  }`}>
                    {formatPrice(currentPrice.price24hChange)} ({formatPercentage(currentPrice.price24hChangePercent)})
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="w-8 h-4 rounded overflow-hidden bg-tertiary">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: '100%',
                        backgroundColor: currentPrice.price24hChange >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                        transform: `scaleX(${Math.abs(currentPrice.price24hChangePercent) / 10})`,
                        transformOrigin: 'left',
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-2xl text-secondary">No price data available</div>
          )}
        </div>

        <div className="flex flex-col items-center ml-6">
          <div className="relative w-16 h-16 mb-2">
            {/* Bitcoin logo or icon */}
            <div className="w-full h-full rounded-full bg-tertiary flex items-center justify-center">
              <span className="text-xl font-bold text-primary">₿</span>
            </div>

            {/* Status indicator ring */}
            <div className={`absolute -inset-1 rounded-full border-2 animate-pulse`}
                 style={{ borderColor: getConnectionStatusColor() }}></div>
          </div>

          <div className="text-xs text-secondary text-center max-w-[100px]">
            Real-time data
          </div>
        </div>
      </div>

      {/* Additional information when price changes significantly */}
      {currentPrice && Math.abs(currentPrice.price24hChangePercent) > 5 && (
        <div className="mt-4 p-3 bg-tertiary rounded border">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-secondary">Significant movement:</span>
            <span className={`text-sm font-medium ${
              currentPrice.price24hChangePercent >= 0 ? 'text-green' : 'text-red'
            }`}>
              {formatPercentage(currentPrice.price24hChangePercent)} in 24h
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceDisplay;