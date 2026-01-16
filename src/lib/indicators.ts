import { Time } from 'lightweight-charts';

export interface IndicatorDataPoint {
  time: Time;
  value: number;
}

export interface ArrowSignal {
  time: Time;
  price: number;
  direction: 'long' | 'short';
}

/**
 * Compute Z-Score of a price series using a rolling window
 */
export function computeZScore(
  prices: IndicatorDataPoint[],
  length: number = 250
): IndicatorDataPoint[] {
  const result: IndicatorDataPoint[] = [];
  
  for (let i = 0; i < prices.length; i++) {
    if (i < length - 1) {
      // Not enough data for full window
      result.push({ time: prices[i].time, value: 0 });
      continue;
    }
    
    // Get rolling window
    const window = prices.slice(i - length + 1, i + 1).map(p => p.value);
    const mean = window.reduce((a, b) => a + b, 0) / length;
    const variance = window.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / length;
    const std = Math.sqrt(variance);
    
    const zScore = std > 0 ? (prices[i].value - mean) / std : 0;
    result.push({ time: prices[i].time, value: zScore });
  }
  
  return result;
}

/**
 * Compute RSI (Relative Strength Index)
 */
export function computeRSI(
  prices: IndicatorDataPoint[],
  length: number = 14
): IndicatorDataPoint[] {
  const result: IndicatorDataPoint[] = [];
  const gains: number[] = [];
  const losses: number[] = [];
  
  for (let i = 0; i < prices.length; i++) {
    if (i === 0) {
      result.push({ time: prices[i].time, value: 50 });
      continue;
    }
    
    const change = prices[i].value - prices[i - 1].value;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    
    gains.push(gain);
    losses.push(loss);
    
    if (i < length) {
      result.push({ time: prices[i].time, value: 50 });
      continue;
    }
    
    // Calculate average gain and loss
    const windowGains = gains.slice(-length);
    const windowLosses = losses.slice(-length);
    
    const avgGain = windowGains.reduce((a, b) => a + b, 0) / length;
    const avgLoss = windowLosses.reduce((a, b) => a + b, 0) / length;
    
    const rs = avgLoss > 0 ? avgGain / avgLoss : 100;
    const rsi = 100 - (100 / (1 + rs));
    
    result.push({ time: prices[i].time, value: rsi });
  }
  
  return result;
}

/**
 * Generate Z-Score bands (mean and ±n standard deviations)
 */
export function computeZScoreBands(
  zScoreData: IndicatorDataPoint[]
): {
  upperBand2: IndicatorDataPoint[];
  upperBand1: IndicatorDataPoint[];
  meanLine: IndicatorDataPoint[];
  lowerBand1: IndicatorDataPoint[];
  lowerBand2: IndicatorDataPoint[];
} {
  return {
    upperBand2: zScoreData.map(d => ({ time: d.time, value: 2 })),
    upperBand1: zScoreData.map(d => ({ time: d.time, value: 1 })),
    meanLine: zScoreData.map(d => ({ time: d.time, value: 0 })),
    lowerBand1: zScoreData.map(d => ({ time: d.time, value: -1 })),
    lowerBand2: zScoreData.map(d => ({ time: d.time, value: -2 })),
  };
}

/**
 * Generate combined Z-Score + RSI arrow signals
 */
export function computeZScoreRSIArrows(
  syntheticPrices: IndicatorDataPoint[],
  zScoreData: IndicatorDataPoint[],
  rsiData: IndicatorDataPoint[],
  zScoreThreshold: number = 2,
  rsiOverbought: number = 70,
  rsiOversold: number = 30
): ArrowSignal[] {
  const signals: ArrowSignal[] = [];
  
  for (let i = 0; i < syntheticPrices.length; i++) {
    const zScore = zScoreData[i]?.value ?? 0;
    const rsi = rsiData[i]?.value ?? 50;
    const price = syntheticPrices[i].value;
    const time = syntheticPrices[i].time;
    
    // Short signal: Z-Score > +2 AND RSI > 70
    if (zScore > zScoreThreshold && rsi > rsiOverbought) {
      signals.push({ time, price, direction: 'short' });
    }
    // Long signal: Z-Score < -2 AND RSI < 30
    else if (zScore < -zScoreThreshold && rsi < rsiOversold) {
      signals.push({ time, price, direction: 'long' });
    }
  }
  
  return signals;
}

/**
 * Generate synthetic pair price data (Price A / Price B)
 */
export function generateSyntheticPairPrice(
  priceA: number,
  priceB: number,
  numPoints: number = 250,
  volatility: number = 0.02
): IndicatorDataPoint[] {
  const data: IndicatorDataPoint[] = [];
  const start = Date.now() - numPoints * 15 * 60 * 1000; // 15min bars
  
  let currentPriceA = priceA;
  let currentPriceB = priceB;
  
  for (let i = 0; i < numPoints; i++) {
    const time = Math.floor((start + i * 15 * 60 * 1000) / 1000) as Time;
    
    // Add correlated random walks with mean reversion
    const sharedMove = (Math.random() - 0.5) * volatility;
    const idioA = (Math.random() - 0.5) * volatility * 0.3;
    const idioB = (Math.random() - 0.5) * volatility * 0.3;
    
    currentPriceA = currentPriceA * (1 + sharedMove + idioA);
    currentPriceB = currentPriceB * (1 + sharedMove + idioB);
    
    // Synthetic price = A / B
    const syntheticPrice = currentPriceA / currentPriceB;
    data.push({ time, value: syntheticPrice });
  }
  
  return data;
}
