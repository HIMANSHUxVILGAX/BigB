import React, { useEffect, useRef, useState } from 'react';
import { CandlestickData } from '../types/bitcoin';

interface CandlestickChartProps {
  data: CandlestickData[];
  loading: boolean;
  onTimeframeChange?: (timeframe: string) => void;
}

declare global {
  interface Window {
    TradingView: any;
  }
}

const CandlestickChart: React.FC<CandlestickChartProps> = ({
  data,
  loading,
  onTimeframeChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  const [timeframe, setTimeframe] = useState('1m');
  const [isScriptLoading, setIsScriptLoading] = useState(true);

  const timeframes = [
    { label: '1m', value: '1', description: '1 minute' },
    { label: '5m', value: '5', description: '5 minutes' },
    { label: '15m', value: '15', description: '15 minutes' },
    { label: '1h', value: '60', description: '1 hour' },
    { label: '4h', value: '240', description: '4 hours' },
    { label: '1d', value: '1D', description: '1 day' },
  ];

  // Load TradingView script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      setIsScriptLoading(false);
      script.remove();
    };
    script.onerror = () => {
      console.error('Failed to load TradingView script');
      setIsScriptLoading(false);
    };
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        script.remove();
      }
    };
  }, []);

  // Initialize TradingView widget
  useEffect(() => {
    if (!containerRef.current || isScriptLoading || !window.TradingView || loading) {
      return;
    }

    // Clean up previous widget
    if (widgetRef.current) {
      widgetRef.current.remove();
    }

    // Convert data to TradingView format
    const chartData = data.map(candle => ({
      time: Math.floor(candle.timestamp / 1000), // TradingView expects seconds
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));

    widgetRef.current = new window.TradingView.widget({
      container: containerRef.current,
      symbol: 'BTCUSDT',
      interval: timeframe,
      theme: 'dark',
      style: '1', // Candlesticks
      locale: 'en',
      toolbar_bg: '#1a1a1a',
      enable_publishing: false,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      container_id: 'tradingview_chart',
      datafeed: {
        onReady: (callback: any) => {
          setTimeout(() => {
            callback({
              supports_search: false,
              supports_group_request: false,
              supported_resolutions: ['1', '5', '15', '60', '240', '1D'],
              supports_marks: false,
              supports_timescale_marks: false,
            });
          }, 0);
        },
        resolveSymbol: (
          _symbolName: string,
          onSymbolResolvedCallback: any,
          _onResolveErrorCallback: any
        ) => {
          setTimeout(() => {
            onSymbolResolvedCallback({
              name: 'BTC/USDT',
              description: 'Bitcoin / TetherUS',
              type: 'crypto',
              session: '24x7',
              timezone: 'UTC',
              ticker: 'BTCUSDT',
              exchange: 'Binance',
              minmov: 1,
              pricescale: 100,
              has_intraday: true,
              has_daily: true,
              has_weekly_and_monthly: false,
              supported_resolutions: ['1', '5', '15', '60', '240', '1D'],
              volume_precision: 2,
              data_status: 'streaming',
            });
          }, 0);
        },
        getBars: (
          _symbolInfo: any,
          _resolution: string,
          periodParams: any,
          onHistoryCallback: any,
          onErrorCallback: any
        ) => {
          try {
            // Filter data based on the requested time period
            const fromTime = periodParams.from * 1000; // Convert to milliseconds
            const toTime = periodParams.to * 1000;

            const filteredData = chartData.filter(bar =>
              bar.time * 1000 >= fromTime && bar.time * 1000 <= toTime
            );

            onHistoryCallback(filteredData, { noData: filteredData.length === 0 });
          } catch (error) {
            console.error('Error fetching bars:', error);
            onErrorCallback(error);
          }
        },
        subscribeBars: (
          _symbolInfo: any,
          _resolution: string,
          _onRealtimeCallback: any,
          _subscriberUID: any,
          _onResetCacheNeededCallback: any
        ) => {
          // This would handle real-time updates in a real implementation
          console.log('Subscribed to real-time updates for:', symbolInfo.name);
        },
        unsubscribeBars: (subscriberUID: any) => {
          console.log('Unsubscribed from real-time updates:', subscriberUID);
        },
      },
      library_path: 'https://s3.tradingview.com/charting_library/',
      height: 500,
      width: '100%',
      studies_overrides: {},
      overrides: {
        'paneProperties.background': '#1a1a1a',
        'paneProperties.vertGridProperties.color': '#333333',
        'paneProperties.horzGridProperties.color': '#333333',
        'symbolWatermarkProperties.transparency': 90,
        'scalesProperties.textColor': '#999999',
        'mainSeriesProperties.candleStyle.wickUpColor': '#00ff88',
        'mainSeriesProperties.candleStyle.wickDownColor': '#ff4444',
        'mainSeriesProperties.candleStyle.upColor': '#00ff88',
        'mainSeriesProperties.candleStyle.downColor': '#ff4444',
        'mainSeriesProperties.candleStyle.borderUpColor': '#00ff88',
        'mainSeriesProperties.candleStyle.borderDownColor': '#ff4444',
      },
    });

    return () => {
      if (widgetRef.current) {
        widgetRef.current.remove();
      }
    };
  }, [data, timeframe, isScriptLoading, loading]);

  const handleTimeframeChange = (newTimeframe: string) => {
    setTimeframe(newTimeframe);
    onTimeframeChange?.(newTimeframe);
  };

  if (isScriptLoading) {
    return (
      <div className="candlestick-chart-container bg-secondary rounded p-6 shadow">
        <div className="h-[500px] flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-secondary">Loading chart...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!window.TradingView) {
    return (
      <div className="candlestick-chart-container bg-secondary rounded p-6 shadow">
        <div className="h-[500px] flex items-center justify-center">
          <div className="text-center">
            <div className="text-red mb-2">Failed to load chart library</div>
            <div className="text-secondary">Please check your internet connection</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="candlestick-chart-container bg-secondary rounded p-6 shadow">
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold">BTC/USDT Chart</h2>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-green"></div>
            <span className="text-sm text-secondary">Live</span>
          </div>
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-secondary mr-2">Timeframe:</span>
          <div className="flex space-x-1">
            {timeframes.map((tf) => (
              <button
                key={tf.value}
                onClick={() => handleTimeframeChange(tf.value)}
                className={`px-3 py-1 rounded text-sm font-medium transition-all duration-200 ${
                  timeframe === tf.value
                    ? 'bg-green text-black'
                    : 'bg-tertiary text-secondary hover:bg-tertiary hover:text-primary'
                }`}
                title={tf.description}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TradingView Chart Container */}
      <div
        ref={containerRef}
        id="tradingview_chart"
        className="w-full bg-primary rounded"
        style={{ height: '500px' }}
      >
        {loading && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <div className="text-secondary">Loading chart data...</div>
            </div>
          </div>
        )}
      </div>

      {/* Chart Footer */}
      <div className="mt-4 flex items-center justify-between text-sm text-secondary">
        <div className="flex items-center space-x-4">
          <span>Data points: {data.length}</span>
          {data.length > 0 && (
            <span>
              Range: {new Date(data[0]?.timestamp).toLocaleDateString()} - {new Date(data[data.length - 1]?.timestamp).toLocaleDateString()}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <span>Powered by</span>
          <span className="text-green">Binance</span>
          <span>+</span>
          <span className="text-green">TradingView</span>
        </div>
      </div>
    </div>
  );
};

export default CandlestickChart;