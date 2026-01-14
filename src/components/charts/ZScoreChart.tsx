import { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, LineData, Time, LineSeries } from 'lightweight-charts';
import { useTheme } from '@/contexts/ThemeContext';

interface ZScoreChartProps {
  zScoreData: LineData<Time>[];
  entryThreshold?: number;
  exitThreshold?: number;
  height?: number;
}

export default function ZScoreChart({ 
  zScoreData, 
  entryThreshold = 2.0,
  exitThreshold = 0.5,
  height = 200 
}: ZScoreChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!containerRef.current || zScoreData.length === 0) return;

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
    });

    chartRef.current = chart;

    // Create horizontal threshold lines
    const times = zScoreData.map(d => d.time);

    // Upper entry threshold (+2σ)
    const upperEntryData = times.map(time => ({ time, value: entryThreshold }));
    const upperEntrySeries = chart.addSeries(LineSeries, {
      color: 'hsl(0, 62%, 50%)',
      lineWidth: 1,
      lineStyle: 2,
      title: `+${entryThreshold}σ`,
    });
    upperEntrySeries.setData(upperEntryData);

    // Lower entry threshold (-2σ)
    const lowerEntryData = times.map(time => ({ time, value: -entryThreshold }));
    const lowerEntrySeries = chart.addSeries(LineSeries, {
      color: 'hsl(142, 71%, 45%)',
      lineWidth: 1,
      lineStyle: 2,
      title: `-${entryThreshold}σ`,
    });
    lowerEntrySeries.setData(lowerEntryData);

    // Exit thresholds (±0.5σ) - subtle
    const upperExitData = times.map(time => ({ time, value: exitThreshold }));
    const upperExitSeries = chart.addSeries(LineSeries, {
      color: isDark ? 'hsl(215, 20%, 35%)' : 'hsl(220, 9%, 70%)',
      lineWidth: 1,
      lineStyle: 1,
    });
    upperExitSeries.setData(upperExitData);

    const lowerExitData = times.map(time => ({ time, value: -exitThreshold }));
    const lowerExitSeries = chart.addSeries(LineSeries, {
      color: isDark ? 'hsl(215, 20%, 35%)' : 'hsl(220, 9%, 70%)',
      lineWidth: 1,
      lineStyle: 1,
    });
    lowerExitSeries.setData(lowerExitData);

    // Zero line
    const zeroData = times.map(time => ({ time, value: 0 }));
    const zeroSeries = chart.addSeries(LineSeries, {
      color: isDark ? 'hsl(215, 20%, 45%)' : 'hsl(220, 9%, 60%)',
      lineWidth: 1,
      lineStyle: 0,
    });
    zeroSeries.setData(zeroData);

    // Z-Score line
    const zScoreSeries = chart.addSeries(LineSeries, {
      color: 'hsl(43, 96%, 56%)',
      lineWidth: 2,
      title: 'Z-OU',
    });
    zScoreSeries.setData(zScoreData);

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
  }, [zScoreData, entryThreshold, exitThreshold, height, theme]);

  return <div ref={containerRef} className="w-full" />;
}
