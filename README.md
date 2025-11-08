# Bitcoin Trading Assistant

A modern web application that displays real-time Bitcoin price data with an interactive candlestick chart and uses machine learning to predict next candlestick movements (bullish or bearish). The application helps users monitor market trends and make informed trading decisions through data-driven insights.

## Features

- **Real-time Bitcoin Price Display**: Live price updates with 24-hour change statistics
- **Interactive Candlestick Chart**: Professional TradingView chart integration with multiple timeframes
- **AI-Powered Predictions**: Machine learning model that predicts next candle direction with confidence scores
- **Technical Analysis**: RSI, MACD, Bollinger Bands, and moving averages
- **Dark Trading Theme**: Optimized interface for extended trading sessions
- **WebSocket Connectivity**: Real-time data streaming from Binance
- **Fallback Data Sources**: REST API integration for reliability

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Machine Learning**: TensorFlow.js (LSTM neural networks)
- **Charts**: TradingView Widget API
- **Real-time Data**: Binance WebSocket API
- **Styling**: CSS with custom trading theme

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd BigB
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

### Build for Production

```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.

## Project Structure

```
BigB/
├── src/
│   ├── components/          # React components
│   │   ├── PriceDisplay.tsx
│   │   ├── CandlestickChart.tsx
│   │   ├── PredictionPanel.tsx
│   │   └── Dashboard.tsx
│   ├── hooks/              # Custom React hooks
│   │   ├── useBitcoinData.ts
│   │   └── useWebSocket.ts
│   ├── services/           # External service integrations
│   │   ├── bitcoinApi.ts
│   │   └── mlService.ts
│   ├── types/              # TypeScript type definitions
│   │   └── bitcoin.ts
│   ├── App.tsx             # Root application component
│   ├── main.tsx            # Application entry point
│   └── *.css               # Styling files
├── public/                 # Static assets
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

## How It Works

### Real-time Data Streaming

The application connects to Binance WebSocket API to receive live Bitcoin price data:
- WebSocket endpoint: `wss://stream.binance.com:9443/ws/btcusdt@kline_1m`
- Automatic reconnection with exponential backoff
- Fallback to REST API if WebSocket fails

### Machine Learning Predictions

The ML service uses a Long Short-Term Memory (LSTM) neural network:

**Input Features (13 total):**
- OHLCV data (Open, High, Low, Close, Volume)
- Technical indicators (RSI, MACD, Bollinger Bands, SMAs)
- Time-based features (hour of day)
- Volume ratios

**Output:**
- Direction: Bullish or Bearish
- Confidence score: 0-100%
- Reasoning: Technical analysis explanation

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance Considerations

- TensorFlow.js model loads asynchronously (~2-3 seconds)
- WebSocket connection establishes within 1-2 seconds
- Chart rendering optimized for 500+ candlesticks
- Memory usage: ~50MB (including ML model)

## Limitations

- **Demo Model**: The ML model uses randomly initialized weights for demonstration
- **Prediction Accuracy**: Not intended for actual trading decisions
- **Single Cryptocurrency**: Only Bitcoin/USDT pair supported
- **Timeframe**: 1-minute candlesticks only

## Disclaimer

**This application is for educational and demonstration purposes only.**

- The AI predictions should not be considered financial advice
- Always do your own research before making trading decisions
- Cryptocurrency trading involves substantial risk of loss
- Past performance does not guarantee future results

---

**Built with ❤️ for the Bitcoin trading community**