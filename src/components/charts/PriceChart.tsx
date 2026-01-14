import { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, LineData, Time, LineSeries } from 'lightweight-charts';
import { useTheme } from '@/contexts/ThemeContext';

interface PriceChartProps {
  dataA: LineData<Time>[];
  dataB: LineData<Time>[];
  symbolA: string;
  symbolB: string;
  height?: number;
}

export default function PriceChart({ dataA, dataB, symbolA, symbolB, height = 300 }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesARef = useRef<ISeriesApi<'Line'> | null>(null);
  const seriesBRef = useRef<ISeriesApi<'Line'> | null>(null);
  const { theme } = useTheme();

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
    });

    chartRef.current = chart;

    // Series A (primary color - amber)
    const seriesA = chart.addSeries(LineSeries, {
      color: 'hsl(43, 96%, 56%)',
      lineWidth: 2,
      title: symbolA,
    });
    seriesA.setData(dataA);
    seriesARef.current = seriesA;

    // Series B (secondary color - blue)
    const seriesB = chart.addSeries(LineSeries, {
      color: 'hsl(217, 91%, 60%)',
      lineWidth: 2,
      title: symbolB,
    });
    seriesB.setData(dataB);
    seriesBRef.current = seriesB;

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
  }, [dataA, dataB, symbolA, symbolB, height, theme]);

  return <div ref={containerRef} className="w-full" />;
}
