import { useEffect, useRef, useState, useMemo } from 'react';
import {
  createChart,
  ColorType,
  IChartApi,
  CandlestickSeries,
  LineSeries,
} from 'lightweight-charts';
import { useTheme } from '@/contexts/ThemeContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';
import {
  computeZScore,
  computeRSI,
  computeZScoreRSIArrows,
  computePriceBands,
  generateSyntheticPairOHLC,
  ohlcToClose,
} from '@/lib/indicators';

interface SyntheticPairChartProps {
  entryPriceA: number;
  entryPriceB: number;
  symbolA: string;
  symbolB: string;
  height?: number;
}

export default function SyntheticPairChart({
  entryPriceA,
  entryPriceB,
  symbolA,
  symbolB,
  height = 400,
}: SyntheticPairChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const { theme } = useTheme();

  // User configurable inputs
  const [zScoreLength, setZScoreLength] = useState(250);
  const [rsiLength, setRsiLength] = useState(14);
  const [zThreshold, setZThreshold] = useState(2);
  const [rsiOversold, setRsiOversold] = useState(30);
  const [rsiOverbought, setRsiOverbought] = useState(70);

  // Check if we have valid OHLC data
  const hasOHLCData = entryPriceA > 0 && entryPriceB > 0;

  // Generate synthetic pair OHLC data and compute indicators
  const chartData = useMemo(() => {
    if (!hasOHLCData) return null;

    const numPoints = Math.max(zScoreLength + 50, 300);
    const ohlcData = generateSyntheticPairOHLC(
      entryPriceA,
      entryPriceB,
      numPoints,
      0.015
    );
    
    const closePrices = ohlcToClose(ohlcData);
    const zScoreData = computeZScore(closePrices, zScoreLength);
    const rsiData = computeRSI(closePrices, rsiLength);
    const priceBands = computePriceBands(closePrices, zScoreLength);
    const arrows = computeZScoreRSIArrows(
      ohlcData, 
      zScoreData, 
      rsiData, 
      zThreshold, 
      rsiOverbought, 
      rsiOversold
    );

    return { ohlcData, priceBands, arrows };
  }, [entryPriceA, entryPriceB, zScoreLength, rsiLength, zThreshold, rsiOversold, rsiOverbought, hasOHLCData]);

  useEffect(() => {
    if (!containerRef.current || !chartData) return;

    const isDark = theme === 'dark';

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: isDark ? 'hsl(215, 20%, 65%)' : 'hsl(220, 9%, 46%)',
      },
      grid: {
        vertLines: { color: isDark ? 'hsl(225, 15%, 18%)' : 'hsl(220, 13%, 91%)' },
        horzLines: { color: isDark ? 'hsl(225, 15%, 18%)' : 'hsl(220, 13%, 91%)' },
      },
      width: containerRef.current.clientWidth,
      height,
      crosshair: {
        mode: 1,
        vertLine: {
          color: isDark ? 'hsl(43, 96%, 56%)' : 'hsl(43, 96%, 40%)',
          width: 1,
          style: 2,
        },
        horzLine: {
          color: isDark ? 'hsl(43, 96%, 56%)' : 'hsl(43, 96%, 40%)',
          width: 1,
          style: 2,
        },
      },
      rightPriceScale: {
        borderColor: isDark ? 'hsl(225, 15%, 18%)' : 'hsl(220, 13%, 91%)',
      },
      timeScale: {
        borderColor: isDark ? 'hsl(225, 15%, 18%)' : 'hsl(220, 13%, 91%)',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: true,
      handleScale: true,
    });

    chartRef.current = chart;

    // Add Z-Score bands as overlay lines (draw first so candles are on top)
    const { priceBands, ohlcData, arrows } = chartData;

    // Upper Band 2 (+2σ)
    const upperBand2Series = chart.addSeries(LineSeries, {
      color: 'rgba(239, 68, 68, 0.6)', // red
      lineWidth: 1,
      lineStyle: 2, // dashed
      title: '+2σ',
      priceLineVisible: false,
      lastValueVisible: false,
    });
    upperBand2Series.setData(priceBands.upperBand2);

    // Upper Band 1 (+1σ)
    const upperBand1Series = chart.addSeries(LineSeries, {
      color: 'rgba(251, 191, 36, 0.5)', // amber
      lineWidth: 1,
      lineStyle: 2,
      title: '+1σ',
      priceLineVisible: false,
      lastValueVisible: false,
    });
    upperBand1Series.setData(priceBands.upperBand1);

    // Mean line
    const meanSeries = chart.addSeries(LineSeries, {
      color: 'rgba(148, 163, 184, 0.7)', // slate
      lineWidth: 2,
      title: 'Mean',
      priceLineVisible: false,
      lastValueVisible: false,
    });
    meanSeries.setData(priceBands.meanLine);

    // Lower Band 1 (-1σ)
    const lowerBand1Series = chart.addSeries(LineSeries, {
      color: 'rgba(251, 191, 36, 0.5)', // amber
      lineWidth: 1,
      lineStyle: 2,
      title: '-1σ',
      priceLineVisible: false,
      lastValueVisible: false,
    });
    lowerBand1Series.setData(priceBands.lowerBand1);

    // Lower Band 2 (-2σ)
    const lowerBand2Series = chart.addSeries(LineSeries, {
      color: 'rgba(34, 197, 94, 0.6)', // green
      lineWidth: 1,
      lineStyle: 2,
      title: '-2σ',
      priceLineVisible: false,
      lastValueVisible: false,
    });
    lowerBand2Series.setData(priceBands.lowerBand2);

    // Main candlestick series
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: 'hsl(142, 71%, 45%)',
      downColor: 'hsl(0, 84%, 60%)',
      borderUpColor: 'hsl(142, 71%, 45%)',
      borderDownColor: 'hsl(0, 84%, 60%)',
      wickUpColor: 'hsl(142, 71%, 45%)',
      wickDownColor: 'hsl(0, 84%, 60%)',
      title: `${symbolA}/${symbolB}`,
    });
    candlestickSeries.setData(ohlcData);

    // Add arrow signals as separate line series with point markers (lightweight-charts v5 approach)
    const longArrows = arrows.filter((a) => a.direction === 'long');
    if (longArrows.length > 0) {
      const longSeries = chart.addSeries(LineSeries, {
        color: 'hsl(142, 71%, 45%)',
        lineWidth: 1,
        lineVisible: false,
        pointMarkersVisible: true,
        pointMarkersRadius: 6,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      longSeries.setData(
        longArrows.map((a) => ({
          time: a.time,
          value: a.price * 0.997, // Slightly below candle low
        }))
      );
    }

    const shortArrows = arrows.filter((a) => a.direction === 'short');
    if (shortArrows.length > 0) {
      const shortSeries = chart.addSeries(LineSeries, {
        color: 'hsl(0, 84%, 60%)',
        lineWidth: 1,
        lineVisible: false,
        pointMarkersVisible: true,
        pointMarkersRadius: 6,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      shortSeries.setData(
        shortArrows.map((a) => ({
          time: a.time,
          value: a.price * 1.003, // Slightly above candle high
        }))
      );
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [chartData, symbolA, symbolB, height, theme]);

  if (!hasOHLCData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <AlertCircle className="h-12 w-12 mb-4 text-warning" />
        <p className="text-center">
          Need OHLC data for both symbols to render candlesticks + overlay bands.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Indicator Settings */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-1.5">
          <Label htmlFor="zscoreLength" className="text-xs text-muted-foreground">
            Z-Score Length
          </Label>
          <Input
            id="zscoreLength"
            type="number"
            value={zScoreLength}
            onChange={(e) => setZScoreLength(Math.max(10, parseInt(e.target.value) || 250))}
            className="w-20 h-8 text-sm font-mono"
            min={10}
            max={500}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rsiLength" className="text-xs text-muted-foreground">
            RSI Length
          </Label>
          <Input
            id="rsiLength"
            type="number"
            value={rsiLength}
            onChange={(e) => setRsiLength(Math.max(2, parseInt(e.target.value) || 14))}
            className="w-20 h-8 text-sm font-mono"
            min={2}
            max={100}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="zThreshold" className="text-xs text-muted-foreground">
            Z Threshold
          </Label>
          <Input
            id="zThreshold"
            type="number"
            value={zThreshold}
            onChange={(e) => setZThreshold(Math.max(0.5, parseFloat(e.target.value) || 2))}
            className="w-20 h-8 text-sm font-mono"
            min={0.5}
            max={5}
            step={0.1}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rsiOversold" className="text-xs text-muted-foreground">
            RSI Oversold
          </Label>
          <Input
            id="rsiOversold"
            type="number"
            value={rsiOversold}
            onChange={(e) => setRsiOversold(Math.max(5, Math.min(45, parseInt(e.target.value) || 30)))}
            className="w-20 h-8 text-sm font-mono"
            min={5}
            max={45}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rsiOverbought" className="text-xs text-muted-foreground">
            RSI Overbought
          </Label>
          <Input
            id="rsiOverbought"
            type="number"
            value={rsiOverbought}
            onChange={(e) => setRsiOverbought(Math.max(55, Math.min(95, parseInt(e.target.value) || 70)))}
            className="w-20 h-8 text-sm font-mono"
            min={55}
            max={95}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-[rgba(239,68,68,0.6)]" />
          <span>+2σ</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-[rgba(251,191,36,0.5)]" />
          <span>±1σ</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-[rgba(148,163,184,0.7)]" />
          <span>Mean</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-[rgba(34,197,94,0.6)]" />
          <span>-2σ</span>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[8px] border-b-long" />
            <span>Long: Z &lt; -{zThreshold} & RSI &lt; {rsiOversold}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[8px] border-t-short" />
            <span>Short: Z &gt; +{zThreshold} & RSI &gt; {rsiOverbought}</span>
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div ref={containerRef} className="w-full" />
    </div>
  );
}
