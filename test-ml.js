// Simple test script for ML service functionality
import mlService from './src/services/mlService.js';

// Create mock candlestick data for testing
const createMockData = (count) => {
  const data = [];
  let basePrice = 50000;
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const timestamp = now - (count - i) * 60000; // 1-minute intervals
    const change = (Math.random() - 0.5) * 1000; // Random price change
    basePrice += change;

    const open = basePrice;
    const close = basePrice + (Math.random() - 0.5) * 200;
    const high = Math.max(open, close) + Math.random() * 100;
    const low = Math.min(open, close) - Math.random() * 100;
    const volume = Math.random() * 1000000 + 500000;

    data.push({
      timestamp,
      open,
      high,
      low,
      close,
      volume,
    });
  }

  return data;
};

async function testMLService() {
  console.log('Testing ML Service...');

  try {
    // Initialize ML service
    console.log('1. Initializing ML model...');
    await mlService.initializeModel();
    console.log('✓ ML model initialized successfully');

    // Create test data
    console.log('2. Creating test data...');
    const testData = createMockData(50);
    console.log(`✓ Created ${testData.length} mock candlesticks`);

    // Generate prediction
    console.log('3. Generating prediction...');
    const prediction = await mlService.generatePrediction(testData);
    console.log('✓ Prediction generated:', {
      direction: prediction.direction,
      confidence: prediction.confidence.toFixed(2) + '%',
      reasoning: prediction.reasoning,
      timestamp: new Date(prediction.timestamp).toLocaleString(),
    });

    // Get model metrics
    console.log('4. Getting model metrics...');
    const metrics = mlService.getModelMetrics();
    console.log('✓ Model metrics:', {
      accuracy: metrics.accuracy.toFixed(2) + '%',
      totalPredictions: metrics.totalPredictions,
      modelVersion: metrics.modelVersion,
    });

    // Get prediction history
    console.log('5. Getting prediction history...');
    const history = mlService.getPredictionHistory(5);
    console.log('✓ Recent prediction history:', history.length, 'predictions');

    console.log('\n🎉 All ML service tests passed!');

  } catch (error) {
    console.error('❌ ML service test failed:', error);
  } finally {
    // Clean up
    mlService.dispose();
    console.log('🧹 ML service disposed');
  }
}

testMLService();