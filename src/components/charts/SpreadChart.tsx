import { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, LineData, Time, LineSeries } from 'lightweight-charts';
import { useTheme } from '@/contexts/ThemeContext';

interface SpreadChartProps {
  spreadData: LineData<Time>[];
  upperBand: LineData<Time>[];
  lowerBand: LineData<Time>[];
  meanLine: LineData<Time>[];
  height?: number;
  title?: string;
}

export default function SpreadChart({ 
  spreadData, 
  upperBand, 
  lowerBand, 
  meanLine,
  height = 250,
  title = 'OU Spread'
}: SpreadChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
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

    // Upper band (+2σ) - red dashed
    const upperSeries = chart.addSeries(LineSeries, {
      color: 'hsl(0, 62%, 50%)',
      lineWidth: 1,
      lineStyle: 2,
      title: '+2σ',
    });
    upperSeries.setData(upperBand);

    // Lower band (-2σ) - green dashed
    const lowerSeries = chart.addSeries(LineSeries, {
      color: 'hsl(142, 71%, 45%)',
      lineWidth: 1,
      lineStyle: 2,
      title: '-2σ',
    });
    lowerSeries.setData(lowerBand);

    // Mean line (0) - gray
    const meanSeries = chart.addSeries(LineSeries, {
      color: isDark ? 'hsl(215, 20%, 45%)' : 'hsl(220, 9%, 60%)',
      lineWidth: 1,
      lineStyle: 1,
      title: 'Mean',
    });
    meanSeries.setData(meanLine);

    // Spread line - primary
    const spreadSeries = chart.addSeries(LineSeries, {
      color: 'hsl(43, 96%, 56%)',
      lineWidth: 2,
      title: title,
    });
    spreadSeries.setData(spreadData);

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
  }, [spreadData, upperBand, lowerBand, meanLine, height, title, theme]);

  return <div ref={containerRef} className="w-full" />;
}
