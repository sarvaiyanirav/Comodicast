import React, { useState, useMemo } from 'react';
import { Commodity, PricePoint, TrajectoryPoint } from '../types/commodity';
import { BarChart3, LineChart, Eye, Activity, Calendar } from 'lucide-react';

interface InteractiveChartProps {
  commodity: Commodity;
  trajectory?: TrajectoryPoint[];
  predictedPrice?: number;
}

type ChartMode = 'candlestick' | 'line';
type Timeframe = '1D' | '1W' | '1M' | '3M' | '1Y';

export const InteractiveChart: React.FC<InteractiveChartProps> = ({
  commodity,
  trajectory = [],
  predictedPrice,
}) => {
  const [chartMode, setChartMode] = useState<ChartMode>('candlestick');
  const [timeframe, setTimeframe] = useState<Timeframe>('3M');
  const [showSMA, setShowSMA] = useState(true);
  const [showForecastCone, setShowForecastCone] = useState(true);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Filter historical points by timeframe
  const historyData = useMemo(() => {
    const all = commodity.history;
    const count =
      timeframe === '1D' ? 12 :
      timeframe === '1W' ? 24 :
      timeframe === '1M' ? 30 :
      timeframe === '3M' ? 60 : all.length;
    return all.slice(-count);
  }, [commodity.history, timeframe]);

  // Compute 20-period EMA and 50-period SMA for history
  const { ema20, sma50 } = useMemo(() => {
    const closes = historyData.map((d) => d.close);
    const ema: (number | null)[] = [];
    const sma: (number | null)[] = [];

    const k = 2 / (20 + 1);
    let prevEma: number | null = null;

    for (let i = 0; i < closes.length; i++) {
      // EMA 20
      if (i < 19) {
        ema.push(null);
      } else if (i === 19) {
        const sum = closes.slice(0, 20).reduce((a, b) => a + b, 0);
        prevEma = sum / 20;
        ema.push(prevEma);
      } else {
        prevEma = closes[i] * k + (prevEma as number) * (1 - k);
        ema.push(prevEma);
      }

      // SMA 50
      if (i < 49) {
        sma.push(null);
      } else {
        const sum = closes.slice(i - 49, i + 1).reduce((a, b) => a + b, 0);
        sma.push(sum / 50);
      }
    }

    return { ema20: ema, sma50: sma };
  }, [historyData]);

  // Determine min & max price bounds including forecast cone
  const { minPrice, maxPrice, maxVolume } = useMemo(() => {
    let min = Math.min(...historyData.map((d) => d.low));
    let max = Math.max(...historyData.map((d) => d.high));
    let maxVol = Math.max(...historyData.map((d) => d.volume), 1);

    if (showForecastCone && trajectory.length > 0) {
      const trajMin = Math.min(...trajectory.map((t) => t.p10));
      const trajMax = Math.max(...trajectory.map((t) => t.p90));
      min = Math.min(min, trajMin);
      max = Math.max(max, trajMax);
    }

    if (predictedPrice) {
      min = Math.min(min, predictedPrice);
      max = Math.max(max, predictedPrice);
    }

    const padding = (max - min) * 0.08;
    return {
      minPrice: Math.max(0, min - padding),
      maxPrice: max + padding,
      maxVolume: maxVol,
    };
  }, [historyData, trajectory, showForecastCone, predictedPrice]);

  // Chart dimensions
  const svgWidth = 840;
  const svgHeight = 360;
  const paddingRight = 65;
  const paddingBottom = 40;
  const paddingTop = 20;
  const paddingLeft = 10;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;
  const volumeHeight = 60;
  const priceChartHeight = chartHeight - volumeHeight - 15;

  const totalPoints = historyData.length + (showForecastCone ? trajectory.length : 0);
  const stepX = chartWidth / Math.max(totalPoints - 1, 1);

  const priceToY = (price: number) => {
    const range = maxPrice - minPrice;
    if (range <= 0) return priceChartHeight / 2;
    return paddingTop + priceChartHeight - ((price - minPrice) / range) * priceChartHeight;
  };

  const volumeToH = (vol: number) => {
    return (vol / maxVolume) * volumeHeight;
  };

  // Hovered item calculations
  const hoveredPoint = hoverIndex !== null && hoverIndex < historyData.length ? historyData[hoverIndex] : null;

  return (
    <div className="bg-[#10141E] border border-slate-800 rounded-xl p-4 text-slate-200">
      {/* Chart Top Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-bold text-white">{commodity.name}</span>
              <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/50 px-2 py-0.5 rounded">
                {commodity.exchange}:{commodity.symbol}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5 font-mono">
              <span>Unit: {commodity.unit}</span>
              <span>24h Range: ${commodity.dayLow} - ${commodity.dayHigh}</span>
              <span>52W: ${commodity.yearLow} - ${commodity.yearHigh}</span>
            </div>
          </div>
        </div>

        {/* View toggles & Timeframes */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Mode Switch */}
          <div className="flex items-center bg-[#090C12] border border-slate-800 rounded-lg p-0.5 text-xs font-mono">
            <button
              onClick={() => setChartMode('candlestick')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                chartMode === 'candlestick' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Candles</span>
            </button>
            <button
              onClick={() => setChartMode('line')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                chartMode === 'line' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LineChart className="w-3.5 h-3.5" />
              <span>Line</span>
            </button>
          </div>

          {/* Indicator toggles */}
          <button
            onClick={() => setShowSMA(!showSMA)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono border transition-colors cursor-pointer ${
              showSMA
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                : 'bg-[#090C12] text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3 h-3" />
            <span>EMA 20</span>
          </button>

          <button
            onClick={() => setShowForecastCone(!showForecastCone)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono border transition-colors cursor-pointer ${
              showForecastCone
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-[#090C12] text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Forecast Cone</span>
          </button>

          {/* Timeframes */}
          <div className="flex items-center bg-[#090C12] border border-slate-800 rounded-lg p-0.5 text-xs font-mono">
            {(['1D', '1W', '1M', '3M', '1Y'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                  timeframe === tf ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Hover Readout Bar */}
      <div className="h-6 flex items-center justify-between text-xs font-mono px-2 mb-2 text-slate-300">
        {hoveredPoint ? (
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-cyan-400 font-bold">{hoveredPoint.date}</span>
            <span>O: <strong className="text-white">${hoveredPoint.open}</strong></span>
            <span>H: <strong className="text-emerald-400">${hoveredPoint.high}</strong></span>
            <span>L: <strong className="text-rose-400">${hoveredPoint.low}</strong></span>
            <span>C: <strong className="text-white">${hoveredPoint.close}</strong></span>
            <span className="text-slate-400">Vol: {hoveredPoint.volume.toLocaleString()}</span>
          </div>
        ) : (
          <div className="flex items-center gap-4 text-slate-400">
            <span>Hover chart to inspect historical price bars & forecast projections</span>
            {predictedPrice && (
              <span className="text-cyan-300 font-semibold">
                AI Target: ${predictedPrice.toFixed(2)}
              </span>
            )}
          </div>
        )}
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          {showSMA && <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-amber-400 inline-block"></span> EMA 20</span>}
          {showForecastCone && <span className="flex items-center gap-1"><span className="w-2.5 h-1.5 bg-cyan-500/30 border border-cyan-400 inline-block rounded-xs"></span> P10-P90 Forecast</span>}
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto cursor-crosshair overflow-visible"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            {/* Forecast Band Gradient */}
            <linearGradient id="forecastBandGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.12" />
            </linearGradient>
            {/* Price Line Area Gradient */}
            <linearGradient id="priceAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines (horizontal price levels) */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const price = minPrice + (maxPrice - minPrice) * (1 - pct);
            const y = paddingTop + priceChartHeight * pct;
            return (
              <g key={pct}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="#1e293b"
                  strokeDasharray="3 3"
                />
                <text
                  x={svgWidth - paddingRight + 8}
                  y={y + 4}
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  ${price.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Current Spot Price Reference Line */}
          <line
            x1={paddingLeft}
            y1={priceToY(commodity.currentPrice)}
            x2={svgWidth - paddingRight}
            y2={priceToY(commodity.currentPrice)}
            stroke="#0ea5e9"
            strokeWidth="1.2"
            strokeDasharray="4 4"
            opacity="0.7"
          />

          {/* Volume separator */}
          <line
            x1={paddingLeft}
            y1={paddingTop + priceChartHeight + 15}
            x2={svgWidth - paddingRight}
            y2={paddingTop + priceChartHeight + 15}
            stroke="#1e293b"
          />

          {/* Volume Bars */}
          {historyData.map((d, i) => {
            const x = paddingLeft + i * stepX;
            const barW = Math.max(stepX * 0.65, 2);
            const barH = volumeToH(d.volume);
            const y = svgHeight - paddingBottom - barH;
            const isBullish = d.close >= d.open;
            return (
              <rect
                key={`vol-${i}`}
                x={x - barW / 2}
                y={y}
                width={barW}
                height={barH}
                fill={isBullish ? '#10b981' : '#f43f5e'}
                opacity={hoverIndex === i ? 0.8 : 0.35}
              />
            );
          })}

          {/* Candlesticks or Line */}
          {chartMode === 'candlestick' ? (
            historyData.map((d, i) => {
              const x = paddingLeft + i * stepX;
              const barW = Math.max(stepX * 0.7, 3);
              const isBullish = d.close >= d.open;
              const color = isBullish ? '#10b981' : '#f43f5e';

              const yOpen = priceToY(d.open);
              const yClose = priceToY(d.close);
              const yHigh = priceToY(d.high);
              const yLow = priceToY(d.low);

              const top = Math.min(yOpen, yClose);
              const bodyHeight = Math.max(Math.abs(yClose - yOpen), 1.5);

              return (
                <g key={`candle-${i}`}>
                  {/* High/Low Wick */}
                  <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth="1.2" />
                  {/* Body */}
                  <rect
                    x={x - barW / 2}
                    y={top}
                    width={barW}
                    height={bodyHeight}
                    fill={color}
                    rx="1"
                  />
                </g>
              );
            })
          ) : (
            // Line Chart Mode with Area fill
            <>
              {/* Area path */}
              <path
                d={`
                  M ${paddingLeft} ${paddingTop + priceChartHeight}
                  ${historyData.map((d, i) => `L ${paddingLeft + i * stepX} ${priceToY(d.close)}`).join(' ')}
                  L ${paddingLeft + (historyData.length - 1) * stepX} ${paddingTop + priceChartHeight}
                  Z
                `}
                fill="url(#priceAreaGrad)"
              />
              {/* Line path */}
              <path
                d={historyData
                  .map((d, i) => `${i === 0 ? 'M' : 'L'} ${paddingLeft + i * stepX} ${priceToY(d.close)}`)
                  .join(' ')}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="2"
              />
            </>
          )}

          {/* EMA 20 Line */}
          {showSMA && (
            <path
              d={historyData
                .map((_, i) => {
                  const val = ema20[i];
                  if (val === null) return '';
                  const x = paddingLeft + i * stepX;
                  const y = priceToY(val);
                  return `${ema20.slice(0, i).every((v) => v === null) ? 'M' : 'L'} ${x} ${y}`;
                })
                .filter(Boolean)
                .join(' ')}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="1.5"
            />
          )}

          {/* Forecast Cone Projection (extends into the right side of the canvas) */}
          {showForecastCone && trajectory.length > 0 && (() => {
            const startX = paddingLeft + (historyData.length - 1) * stepX;
            const startPrice = historyData[historyData.length - 1].close;
            const startY = priceToY(startPrice);

            // Upper band points
            const upperPoints = trajectory.map((pt, idx) => {
              const x = startX + (idx + 1) * stepX;
              const y = priceToY(pt.p90);
              return `${x},${y}`;
            });

            // Lower band points in reverse
            const lowerPointsRev = trajectory
              .slice()
              .reverse()
              .map((pt, idx) => {
                const trajIdx = trajectory.length - 1 - idx;
                const x = startX + (trajIdx + 1) * stepX;
                const y = priceToY(pt.p10);
                return `${x},${y}`;
              });

            const bandPathD = `M ${startX},${startY} L ${upperPoints.join(' L ')} L ${lowerPointsRev.join(' L ')} Z`;

            // Median P50 line
            const p50PathD = `M ${startX},${startY} ${trajectory
              .map((pt, idx) => `L ${startX + (idx + 1) * stepX} ${priceToY(pt.p50)}`)
              .join(' ')}`;

            return (
              <g className="forecast-cone">
                {/* Shaded confidence interval band */}
                <path d={bandPathD} fill="url(#forecastBandGrad)" stroke="#06b6d4" strokeWidth="0.8" strokeDasharray="3 3" />
                {/* Median P50 projected trajectory line */}
                <path d={p50PathD} fill="none" stroke="#38bdf8" strokeWidth="2.2" strokeDasharray="5 3" />
                
                {/* Terminal predicted target pin */}
                {trajectory.length > 0 && (() => {
                  const lastPt = trajectory[trajectory.length - 1];
                  const endX = startX + trajectory.length * stepX;
                  const endY = priceToY(lastPt.p50);
                  return (
                    <g>
                      <circle cx={endX} cy={endY} r="4.5" fill="#06b6d4" stroke="#ffffff" strokeWidth="1.5" />
                      <text
                        x={endX + 6}
                        y={endY - 6}
                        fill="#38bdf8"
                        fontSize="10"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        Target: ${lastPt.p50}
                      </text>
                    </g>
                  );
                })()}
              </g>
            );
          })()}

          {/* Interactive Mouse Capture Area & Crosshair */}
          {historyData.map((d, i) => {
            const x = paddingLeft + i * stepX;
            return (
              <rect
                key={`hit-${i}`}
                x={x - stepX / 2}
                y={paddingTop}
                width={stepX}
                height={svgHeight - paddingTop - paddingBottom}
                fill="transparent"
                onMouseEnter={() => setHoverIndex(i)}
              />
            );
          })}

          {/* Crosshair indicator when hovering */}
          {hoverIndex !== null && hoverIndex < historyData.length && (() => {
            const pt = historyData[hoverIndex];
            const x = paddingLeft + hoverIndex * stepX;
            const y = priceToY(pt.close);
            return (
              <g>
                <line x1={x} y1={paddingTop} x2={x} y2={svgHeight - paddingBottom} stroke="#94a3b8" strokeWidth="0.8" strokeDasharray="2 2" />
                <line x1={paddingLeft} y1={y} x2={svgWidth - paddingRight} y2={y} stroke="#94a3b8" strokeWidth="0.8" strokeDasharray="2 2" />
                <circle cx={x} cy={y} r="4" fill="#06b6d4" stroke="#ffffff" strokeWidth="1.5" />
              </g>
            );
          })()}

          {/* Time axis labels */}
          {historyData.map((d, i) => {
            // Display label every 7-10 points
            const interval = Math.max(Math.floor(historyData.length / 5), 1);
            if (i % interval !== 0 && i !== historyData.length - 1) return null;
            const x = paddingLeft + i * stepX;
            return (
              <text
                key={`date-${i}`}
                x={x}
                y={svgHeight - 12}
                textAnchor="middle"
                fill="#64748b"
                fontSize="10"
                fontFamily="monospace"
              >
                {d.date}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
