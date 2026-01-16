import { useEffect, useRef, useMemo } from 'react';
import {
  createChart,
  ColorType,
  IChartApi,
  Time,
  LineSeries,
} from 'lightweight-charts';
import { useTheme } from '@/contexts/ThemeContext';
import {
  computeZScore,
  computeRSI,
  generateSyntheticPairPrice,
} from '@/lib/indicators';

interface ZScoreRSISubChartProps {
  entryPriceA: number;
  entryPriceB: number;
  zScoreLength: number;
  rsiLength: number;
  height?: number;
}

export default function ZScoreRSISubChart({
  entryPriceA,
  entryPriceB,
  zScoreLength,
  rsiLength,
  height = 200,
}: ZScoreRSISubChartProps) {
  const zScoreContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const zScoreChartRef = useRef<IChartApi | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);
  const { theme } = useTheme();

  // Generate data
  const { zScoreData, rsiData } = useMemo(() => {
    const numPoints = Math.max(zScoreLength + 50, 300);
    const syntheticPrices = generateSyntheticPairPrice(
      entryPriceA,
      entryPriceB,
      numPoints,
      0.015
    );
    const zScoreData = computeZScore(syntheticPrices, zScoreLength);
    const rsiData = computeRSI(syntheticPrices, rsiLength);

    return { zScoreData, rsiData };
  }, [entryPriceA, entryPriceB, zScoreLength, rsiLength]);

  // Z-Score chart
  useEffect(() => {
    if (!zScoreContainerRef.current) return;

    const isDark = theme === 'dark';

    const chart = createChart(zScoreContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: isDark ? 'hsl(215, 20%, 65%)' : 'hsl(220, 9%, 46%)',
      },
      grid: {
        vertLines: { color: isDark ? 'hsl(225, 15%, 18%)' : 'hsl(220, 13%, 91%)' },
        horzLines: { color: isDark ? 'hsl(225, 15%, 18%)' : 'hsl(220, 13%, 91%)' },
      },
      width: zScoreContainerRef.current.clientWidth,
      height,
      rightPriceScale: {
        borderColor: isDark ? 'hsl(225, 15%, 18%)' : 'hsl(220, 13%, 91%)',
      },
      timeScale: {
        borderColor: isDark ? 'hsl(225, 15%, 18%)' : 'hsl(220, 13%, 91%)',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    zScoreChartRef.current = chart;

    // Z-Score bands
    const bandColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const times = zScoreData.map((d) => d.time);

    // +2 band
    const upper2 = chart.addSeries(LineSeries, {
      color: 'hsl(0, 84%, 60%)',
      lineWidth: 1,
      lineStyle: 2,
      title: '+2σ',
    });
    upper2.setData(times.map((t) => ({ time: t, value: 2 })));

    // +1 band
    const upper1 = chart.addSeries(LineSeries, {
      color: bandColor,
      lineWidth: 1,
      lineStyle: 2,
    });
    upper1.setData(times.map((t) => ({ time: t, value: 1 })));

    // Mean
    const mean = chart.addSeries(LineSeries, {
      color: isDark ? 'hsl(215, 20%, 50%)' : 'hsl(220, 9%, 50%)',
      lineWidth: 1,
      lineStyle: 1,
      title: 'Mean',
    });
    mean.setData(times.map((t) => ({ time: t, value: 0 })));

    // -1 band
    const lower1 = chart.addSeries(LineSeries, {
      color: bandColor,
      lineWidth: 1,
      lineStyle: 2,
    });
    lower1.setData(times.map((t) => ({ time: t, value: -1 })));

    // -2 band
    const lower2 = chart.addSeries(LineSeries, {
      color: 'hsl(142, 71%, 45%)',
      lineWidth: 1,
      lineStyle: 2,
      title: '-2σ',
    });
    lower2.setData(times.map((t) => ({ time: t, value: -2 })));

    // Z-Score line
    const zScoreSeries = chart.addSeries(LineSeries, {
      color: 'hsl(43, 96%, 56%)',
      lineWidth: 2,
      title: 'Z-Score',
    });
    zScoreSeries.setData(zScoreData.map((d) => ({ time: d.time, value: d.value })));

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (zScoreContainerRef.current) {
        chart.applyOptions({ width: zScoreContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [zScoreData, height, theme]);

  // RSI chart
  useEffect(() => {
    if (!rsiContainerRef.current) return;

    const isDark = theme === 'dark';

    const chart = createChart(rsiContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: isDark ? 'hsl(215, 20%, 65%)' : 'hsl(220, 9%, 46%)',
      },
      grid: {
        vertLines: { color: isDark ? 'hsl(225, 15%, 18%)' : 'hsl(220, 13%, 91%)' },
        horzLines: { color: isDark ? 'hsl(225, 15%, 18%)' : 'hsl(220, 13%, 91%)' },
      },
      width: rsiContainerRef.current.clientWidth,
      height,
      rightPriceScale: {
        borderColor: isDark ? 'hsl(225, 15%, 18%)' : 'hsl(220, 13%, 91%)',
      },
      timeScale: {
        borderColor: isDark ? 'hsl(225, 15%, 18%)' : 'hsl(220, 13%, 91%)',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    rsiChartRef.current = chart;

    const times = rsiData.map((d) => d.time);

    // Overbought line (70)
    const overbought = chart.addSeries(LineSeries, {
      color: 'hsl(0, 84%, 60%)',
      lineWidth: 1,
      lineStyle: 2,
      title: '70',
    });
    overbought.setData(times.map((t) => ({ time: t, value: 70 })));

    // Middle line (50)
    const middle = chart.addSeries(LineSeries, {
      color: isDark ? 'hsl(215, 20%, 50%)' : 'hsl(220, 9%, 50%)',
      lineWidth: 1,
      lineStyle: 1,
    });
    middle.setData(times.map((t) => ({ time: t, value: 50 })));

    // Oversold line (30)
    const oversold = chart.addSeries(LineSeries, {
      color: 'hsl(142, 71%, 45%)',
      lineWidth: 1,
      lineStyle: 2,
      title: '30',
    });
    oversold.setData(times.map((t) => ({ time: t, value: 30 })));

    // RSI line
    const rsiSeries = chart.addSeries(LineSeries, {
      color: 'hsl(217, 91%, 60%)',
      lineWidth: 2,
      title: 'RSI',
    });
    rsiSeries.setData(rsiData.map((d) => ({ time: d.time, value: d.value })));

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (rsiContainerRef.current) {
        chart.applyOptions({ width: rsiContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [rsiData, height, theme]);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-muted-foreground mb-2">Z-Score (Length: {zScoreLength})</p>
        <div ref={zScoreContainerRef} className="w-full" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-2">RSI (Length: {rsiLength})</p>
        <div ref={rsiContainerRef} className="w-full" />
      </div>
    </div>
  );
}
