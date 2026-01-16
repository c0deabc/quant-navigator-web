import { useEffect, useRef, useState, useMemo } from 'react';
import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  Time,
  LineSeries,
} from 'lightweight-charts';
import { useTheme } from '@/contexts/ThemeContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  computeZScore,
  computeRSI,
  computeZScoreRSIArrows,
  generateSyntheticPairPrice,
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
  const priceSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const { theme } = useTheme();

  // User configurable inputs
  const [zScoreLength, setZScoreLength] = useState(250);
  const [rsiLength, setRsiLength] = useState(14);

  // Generate synthetic pair data and compute indicators
  const { syntheticPrices, zScoreData, rsiData, arrows } = useMemo(() => {
    const numPoints = Math.max(zScoreLength + 50, 300);
    const syntheticPrices = generateSyntheticPairPrice(
      entryPriceA,
      entryPriceB,
      numPoints,
      0.015
    );
    const zScoreData = computeZScore(syntheticPrices, zScoreLength);
    const rsiData = computeRSI(syntheticPrices, rsiLength);
    const arrows = computeZScoreRSIArrows(syntheticPrices, zScoreData, rsiData);

    return { syntheticPrices, zScoreData, rsiData, arrows };
  }, [entryPriceA, entryPriceB, zScoreLength, rsiLength]);

  useEffect(() => {
    if (!containerRef.current) return;

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

    // Main synthetic price series
    const priceSeries = chart.addSeries(LineSeries, {
      color: 'hsl(43, 96%, 56%)',
      lineWidth: 2,
      title: `${symbolA}/${symbolB}`,
    });

    // Build line data with markers embedded
    const lineData = syntheticPrices.map((p, idx) => {
      const arrow = arrows.find((a) => a.time === p.time);
      if (arrow) {
        return {
          time: p.time,
          value: p.value,
          // Use custom data for markers
        };
      }
      return {
        time: p.time,
        value: p.value,
      };
    });
    priceSeries.setData(lineData);
    priceSeriesRef.current = priceSeries;

    // Add marker series for long signals using point markers
    const longArrows = arrows.filter((a) => a.direction === 'long');
    if (longArrows.length > 0) {
      const longSeries = chart.addSeries(LineSeries, {
        color: 'hsl(142, 71%, 45%)',
        lineWidth: 1,
        lineVisible: false,
        pointMarkersVisible: true,
        pointMarkersRadius: 6,
        title: 'LONG',
        lastValueVisible: false,
        priceLineVisible: false,
      });
      longSeries.setData(
        longArrows.map((a) => ({
          time: a.time,
          value: a.price * 0.995, // Slightly below price
        }))
      );
    }

    // Add marker series for short signals using point markers
    const shortArrows = arrows.filter((a) => a.direction === 'short');
    if (shortArrows.length > 0) {
      const shortSeries = chart.addSeries(LineSeries, {
        color: 'hsl(0, 84%, 60%)',
        lineWidth: 1,
        lineVisible: false,
        pointMarkersVisible: true,
        pointMarkersRadius: 6,
        title: 'SHORT',
        lastValueVisible: false,
        priceLineVisible: false,
      });
      shortSeries.setData(
        shortArrows.map((a) => ({
          time: a.time,
          value: a.price * 1.005, // Slightly above price
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
  }, [syntheticPrices, arrows, symbolA, symbolB, height, theme]);

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
            className="w-24 h-8 text-sm font-mono"
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
            className="w-24 h-8 text-sm font-mono"
            min={2}
            max={100}
          />
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground ml-auto">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-long" />
            <span>Long: Z &lt; -2 & RSI &lt; 30</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-short" />
            <span>Short: Z &gt; +2 & RSI &gt; 70</span>
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div ref={containerRef} className="w-full" />
    </div>
  );
}
