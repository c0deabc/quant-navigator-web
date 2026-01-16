import { Time } from 'lightweight-charts';

export interface IndicatorDataPoint {
  time: Time;
  value: number;
}

export interface OHLCDataPoint {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface ArrowSignal {
  time: Time;
  price: number;
  direction: 'long' | 'short';
  position: 'aboveBar' | 'belowBar';
}

export interface PriceBands {
  upperBand2: IndicatorDataPoint[];
  upperBand1: IndicatorDataPoint[];
  meanLine: IndicatorDataPoint[];
  lowerBand1: IndicatorDataPoint[];
  lowerBand2: IndicatorDataPoint[];
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
      result.push({ time: prices[i].time, value: 0 });
      continue;
    }
    
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
 * Compute rolling mean and standard deviation for price-space bands
 */
export function computeRollingMeanStd(
  prices: IndicatorDataPoint[],
  length: number = 250
): { mean: IndicatorDataPoint[]; std: IndicatorDataPoint[] } {
  const meanResult: IndicatorDataPoint[] = [];
  const stdResult: IndicatorDataPoint[] = [];
  
  for (let i = 0; i < prices.length; i++) {
    if (i < length - 1) {
      meanResult.push({ time: prices[i].time, value: prices[i].value });
      stdResult.push({ time: prices[i].time, value: 0 });
      continue;
    }
    
    const window = prices.slice(i - length + 1, i + 1).map(p => p.value);
    const mean = window.reduce((a, b) => a + b, 0) / length;
    const variance = window.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / length;
    const std = Math.sqrt(variance);
    
    meanResult.push({ time: prices[i].time, value: mean });
    stdResult.push({ time: prices[i].time, value: std });
  }
  
  return { mean: meanResult, std: stdResult };
}

/**
 * Generate price-space Z-Score bands (mean ± n*std mapped to price)
 */
export function computePriceBands(
  prices: IndicatorDataPoint[],
  length: number = 250
): PriceBands {
  const { mean, std } = computeRollingMeanStd(prices, length);
  
  return {
    upperBand2: mean.map((m, i) => ({ time: m.time, value: m.value + 2 * std[i].value })),
    upperBand1: mean.map((m, i) => ({ time: m.time, value: m.value + 1 * std[i].value })),
    meanLine: mean,
    lowerBand1: mean.map((m, i) => ({ time: m.time, value: m.value - 1 * std[i].value })),
    lowerBand2: mean.map((m, i) => ({ time: m.time, value: m.value - 2 * std[i].value })),
  };
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
 * Generate combined Z-Score + RSI arrow signals with configurable thresholds
 */
export function computeZScoreRSIArrows(
  ohlcData: OHLCDataPoint[],
  zScoreData: IndicatorDataPoint[],
  rsiData: IndicatorDataPoint[],
  zScoreThreshold: number = 2,
  rsiOverbought: number = 70,
  rsiOversold: number = 30
): ArrowSignal[] {
  const signals: ArrowSignal[] = [];
  
  for (let i = 0; i < ohlcData.length; i++) {
    const zScore = zScoreData[i]?.value ?? 0;
    const rsi = rsiData[i]?.value ?? 50;
    const candle = ohlcData[i];
    const time = candle.time;
    
    // Short signal: Z-Score > +threshold AND RSI > overbought
    if (zScore > zScoreThreshold && rsi > rsiOverbought) {
      signals.push({ 
        time, 
        price: candle.high, 
        direction: 'short',
        position: 'aboveBar'
      });
    }
    // Long signal: Z-Score < -threshold AND RSI < oversold
    else if (zScore < -zScoreThreshold && rsi < rsiOversold) {
      signals.push({ 
        time, 
        price: candle.low, 
        direction: 'long',
        position: 'belowBar'
      });
    }
  }
  
  return signals;
}

/**
 * Generate synthetic pair OHLC data (Ratio = A/B)
 */
export function generateSyntheticPairOHLC(
  priceA: number,
  priceB: number,
  numPoints: number = 250,
  volatility: number = 0.02
): OHLCDataPoint[] {
  const data: OHLCDataPoint[] = [];
  const start = Date.now() - numPoints * 15 * 60 * 1000; // 15min bars
  
  let currentOpenA = priceA;
  let currentOpenB = priceB;
  
  for (let i = 0; i < numPoints; i++) {
    const time = Math.floor((start + i * 15 * 60 * 1000) / 1000) as Time;
    
    // Generate OHLC for symbol A
    const moveA = (Math.random() - 0.5) * volatility;
    const highMoveA = Math.random() * volatility * 0.5;
    const lowMoveA = Math.random() * volatility * 0.5;
    
    const openA = currentOpenA;
    const closeA = openA * (1 + moveA);
    const highA = Math.max(openA, closeA) * (1 + highMoveA);
    const lowA = Math.min(openA, closeA) * (1 - lowMoveA);
    
    // Generate OHLC for symbol B (correlated with A)
    const sharedMove = moveA * 0.7; // 70% correlation
    const idioB = (Math.random() - 0.5) * volatility * 0.5;
    const moveB = sharedMove + idioB;
    const highMoveB = Math.random() * volatility * 0.5;
    const lowMoveB = Math.random() * volatility * 0.5;
    
    const openB = currentOpenB;
    const closeB = openB * (1 + moveB);
    const highB = Math.max(openB, closeB) * (1 + highMoveB);
    const lowB = Math.min(openB, closeB) * (1 - lowMoveB);
    
    // Compute ratio OHLC
    const ratioOpen = openA / openB;
    const ratioHigh = highA / highB;
    const ratioLow = lowA / lowB;
    const ratioClose = closeA / closeB;
    
    data.push({
      time,
      open: ratioOpen,
      high: Math.max(ratioOpen, ratioHigh, ratioLow, ratioClose),
      low: Math.min(ratioOpen, ratioHigh, ratioLow, ratioClose),
      close: ratioClose,
    });
    
    // Update for next bar
    currentOpenA = closeA;
    currentOpenB = closeB;
  }
  
  return data;
}

/**
 * Convert OHLC data to close prices for indicator calculation
 */
export function ohlcToClose(ohlcData: OHLCDataPoint[]): IndicatorDataPoint[] {
  return ohlcData.map(d => ({ time: d.time, value: d.close }));
}

/**
 * Generate synthetic pair price data (Price A / Price B) - Legacy function
 */
export function generateSyntheticPairPrice(
  priceA: number,
  priceB: number,
  numPoints: number = 250,
  volatility: number = 0.02
): IndicatorDataPoint[] {
  const ohlc = generateSyntheticPairOHLC(priceA, priceB, numPoints, volatility);
  return ohlcToClose(ohlc);
}
