import { LineData, Time } from 'lightweight-charts';

// Generate mock time series data for charts
export function generateMockPriceData(
  basePrice: number,
  volatility: number,
  numPoints: number = 100,
  startTime?: number
): LineData<Time>[] {
  const data: LineData<Time>[] = [];
  const start = startTime || Date.now() - numPoints * 15 * 60 * 1000; // 15min bars
  let price = basePrice;

  for (let i = 0; i < numPoints; i++) {
    const time = Math.floor((start + i * 15 * 60 * 1000) / 1000) as Time;
    const change = (Math.random() - 0.5) * volatility * basePrice;
    price = Math.max(price + change, basePrice * 0.5);
    data.push({ time, value: price });
  }

  return data;
}

// Generate correlated price series (for pair B based on pair A)
export function generateCorrelatedPriceData(
  priceDataA: LineData<Time>[],
  correlation: number,
  beta: number,
  baseRatio: number = 1
): LineData<Time>[] {
  return priceDataA.map((pointA) => {
    // Add some noise inversely proportional to correlation
    const noise = (1 - correlation) * (Math.random() - 0.5) * 0.1;
    const value = (pointA.value * beta * baseRatio) + (pointA.value * noise);
    return { time: pointA.time, value };
  });
}

// Normalize price series to percentage change from first value
export function normalizePriceData(data: LineData<Time>[]): LineData<Time>[] {
  if (data.length === 0) return [];
  const firstValue = data[0].value;
  return data.map(point => ({
    time: point.time,
    value: ((point.value - firstValue) / firstValue) * 100,
  }));
}

// Generate spread data from two price series
export function generateSpreadData(
  priceDataA: LineData<Time>[],
  priceDataB: LineData<Time>[],
  beta: number
): LineData<Time>[] {
  return priceDataA.map((pointA, idx) => {
    const pointB = priceDataB[idx];
    const spread = Math.log(pointA.value) - beta * Math.log(pointB.value);
    return { time: pointA.time, value: spread };
  });
}

// Generate Z-score data with mean reversion dynamics
export function generateZScoreData(
  spreadData: LineData<Time>[],
  halfLife: number = 20
): { zScoreData: LineData<Time>[]; mean: number; std: number } {
  if (spreadData.length === 0) return { zScoreData: [], mean: 0, std: 0 };

  // Calculate rolling mean and std
  const values = spreadData.map(d => d.value);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  const std = Math.sqrt(variance);

  // Add mean reversion dynamics
  const theta = Math.log(2) / halfLife;
  let zScore = 0;

  const zScoreData: LineData<Time>[] = spreadData.map((point, idx) => {
    const rawZ = (point.value - mean) / std;
    // Smooth with OU dynamics
    zScore = zScore + theta * (rawZ - zScore) + (Math.random() - 0.5) * 0.1;
    return { time: point.time, value: zScore };
  });

  return { zScoreData, mean, std };
}

// Generate band data (mean ± n*std)
export function generateBandData(
  times: Time[],
  mean: number,
  std: number,
  multiplier: number
): LineData<Time>[] {
  return times.map(time => ({
    time,
    value: mean + multiplier * std,
  }));
}

// Generate complete mock data for a signal
export interface SignalChartData {
  normalizedPriceA: LineData<Time>[];
  normalizedPriceB: LineData<Time>[];
  spreadData: LineData<Time>[];
  upperBand: LineData<Time>[];
  lowerBand: LineData<Time>[];
  meanLine: LineData<Time>[];
  zScoreData: LineData<Time>[];
}

export function generateSignalChartData(
  basePriceA: number,
  basePriceB: number,
  correlation: number,
  beta: number,
  halfLife: number = 20,
  numPoints: number = 100
): SignalChartData {
  // Generate price data
  const priceDataA = generateMockPriceData(basePriceA, 0.02, numPoints);
  const priceDataB = generateCorrelatedPriceData(priceDataA, correlation, 1 / beta, basePriceB / basePriceA);

  // Normalize for display
  const normalizedPriceA = normalizePriceData(priceDataA);
  const normalizedPriceB = normalizePriceData(priceDataB);

  // Generate spread
  const spreadData = generateSpreadData(priceDataA, priceDataB, beta);

  // Generate Z-score
  const { zScoreData, mean, std } = generateZScoreData(spreadData, halfLife);

  // Generate bands
  const times = spreadData.map(d => d.time);
  const upperBand = generateBandData(times, mean, std, 2);
  const lowerBand = generateBandData(times, mean, std, -2);
  const meanLine = generateBandData(times, mean, std, 0);

  return {
    normalizedPriceA,
    normalizedPriceB,
    spreadData,
    upperBand,
    lowerBand,
    meanLine,
    zScoreData,
  };
}
