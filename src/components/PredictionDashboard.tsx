import React from 'react';
import { Commodity, ForecastHorizon, PredictionResult } from '../types/commodity';
import {
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Target,
  Sparkles,
  ExternalLink,
  Sliders,
  HardDrive,
  Info,
  Clock,
  Globe2,
  Boxes,
} from 'lucide-react';

interface PredictionDashboardProps {
  commodity: Commodity;
  prediction: PredictionResult | null;
  selectedHorizon: ForecastHorizon;
  onSelectHorizon: (h: ForecastHorizon) => void;
  isLoading: boolean;
  onOpenStressTest: () => void;
  onExportToDrive: () => void;
  isDriveConnected: boolean;
}

const SIGNAL_CONFIG: Record<
  PredictionResult['signal'],
  { label: string; bg: string; text: string; border: string }
> = {
  STRONG_BUY: {
    label: 'STRONG BUY',
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400',
    border: 'border-emerald-500/40',
  },
  BUY: {
    label: 'BUY',
    bg: 'bg-teal-500/20',
    text: 'text-teal-400',
    border: 'border-teal-500/40',
  },
  HOLD: {
    label: 'HOLD / NEUTRAL',
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
    border: 'border-amber-500/40',
  },
  SELL: {
    label: 'SELL',
    bg: 'bg-rose-500/20',
    text: 'text-rose-400',
    border: 'border-rose-500/40',
  },
  STRONG_SELL: {
    label: 'STRONG SELL',
    bg: 'bg-red-600/20',
    text: 'text-red-400',
    border: 'border-red-500/40',
  },
};

export const PredictionDashboard: React.FC<PredictionDashboardProps> = ({
  commodity,
  prediction,
  selectedHorizon,
  onSelectHorizon,
  isLoading,
  onOpenStressTest,
  onExportToDrive,
  isDriveConnected,
}) => {
  if (isLoading || !prediction) {
    return (
      <div className="bg-[#10141E] border border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center min-h-[360px] text-center">
        <div className="relative mb-4">
          <div className="w-12 h-12 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
          <Sparkles className="w-5 h-5 text-cyan-400 absolute inset-0 m-auto" />
        </div>
        <h3 className="text-base font-semibold text-white mb-1">
          Running Real-Time Predictive Econometric Models...
        </h3>
        <p className="text-xs text-slate-400 max-w-sm">
          Synthesizing spot prices, futures curve, supply-demand balances, and global macroeconomic indicators for {commodity.name}.
        </p>
      </div>
    );
  }

  const signalStyle = SIGNAL_CONFIG[prediction.signal] || SIGNAL_CONFIG.HOLD;
  const isPos = prediction.expectedChangePercent >= 0;

  return (
    <div className="space-y-4">
      {/* Top Banner: Horizon Selector & Action Buttons */}
      <div className="bg-[#10141E] border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        {/* Horizon Tabs */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            Horizon:
          </span>
          <div className="flex items-center bg-[#090C12] border border-slate-800 rounded-lg p-0.5 text-xs font-mono">
            {(['24H', '7D', '30D', '90D'] as const).map((h) => (
              <button
                key={h}
                onClick={() => onSelectHorizon(h)}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  selectedHorizon === h
                    ? 'bg-cyan-500/25 text-cyan-300 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {h === '24H' ? '24 Hours' : h === '7D' ? '7 Days' : h === '30D' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
        </div>

        {/* Tools: Stress Testing & Drive Export */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenStressTest}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#141B28] hover:bg-[#1A2334] text-slate-200 border border-slate-700/80 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Macro Stress Test</span>
          </button>

          <button
            onClick={onExportToDrive}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-950/40 transition-all cursor-pointer"
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>{isDriveConnected ? 'Save to Google Drive' : 'Sync to Google Drive'}</span>
          </button>
        </div>
      </div>

      {/* Main Prediction Scorecards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Signal & Conviction */}
        <div className="bg-[#10141E] border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="text-xs font-mono text-slate-400 flex items-center justify-between mb-2">
            <span>RECOMMENDATION</span>
            <span className="text-[10px] text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
              {prediction.isRealtimeGrounded ? 'Search-Grounded' : 'Econometric'}
            </span>
          </div>

          <div className={`p-2.5 rounded-lg border text-center my-1 ${signalStyle.bg} ${signalStyle.border}`}>
            <span className={`text-base font-bold font-mono tracking-wide ${signalStyle.text}`}>
              {signalStyle.label}
            </span>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-800/70">
            <div className="flex items-center justify-between text-xs font-mono text-slate-300 mb-1">
              <span>Conviction Score</span>
              <span className="font-bold text-white">{prediction.convictionScore}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-cyan-400 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${prediction.convictionScore}%` }}
              />
            </div>
          </div>
        </div>

        {/* Target Price & Return */}
        <div className="bg-[#10141E] border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="text-xs font-mono text-slate-400 mb-1">PRICE TARGET ({selectedHorizon})</div>
          
          <div>
            <div className="text-2xl font-bold font-mono text-white tracking-tight">
              ${prediction.predictedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-400 font-mono mt-0.5">
              Spot: ${commodity.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {commodity.unit}
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-800/70 flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">Expected Drift</span>
            <span
              className={`flex items-center font-mono text-sm font-bold ${
                isPos ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isPos ? <TrendingUp className="w-3.5 h-3.5 mr-1" /> : <TrendingDown className="w-3.5 h-3.5 mr-1" />}
              {isPos ? '+' : ''}{prediction.expectedChangePercent.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Confidence Interval (P10 - P50 - P90) */}
        <div className="bg-[#10141E] border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="text-xs font-mono text-slate-400 flex items-center justify-between mb-2">
            <span>PROBABILISTIC RANGE</span>
            <span className="text-[10px] text-slate-500 font-mono">90% C.I.</span>
          </div>

          <div className="space-y-1.5 font-mono text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-rose-400/90">P10 (Bearish):</span>
              <span className="font-semibold text-slate-200">${prediction.confidenceInterval.lowerP10.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300 bg-slate-900/60 px-2 py-1 rounded">
              <span className="text-cyan-400 font-medium">P50 (Median):</span>
              <span className="font-bold text-white">${prediction.confidenceInterval.medianP50.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-emerald-400/90">P90 (Bullish):</span>
              <span className="font-semibold text-slate-200">${prediction.confidenceInterval.upperP90.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-800/70 text-[11px] text-slate-400 font-mono text-right">
            Spread: ${(prediction.confidenceInterval.upperP90 - prediction.confidenceInterval.lowerP10).toFixed(2)}
          </div>
        </div>

        {/* Risk Management / Execution Bounds */}
        <div className="bg-[#10141E] border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="text-xs font-mono text-slate-400 flex items-center gap-1 mb-2">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>RISK PARAMETERS</span>
          </div>

          <div className="space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between p-1.5 bg-rose-950/20 border border-rose-900/40 rounded">
              <span className="text-rose-400 font-medium">Stop-Loss Target:</span>
              <span className="font-bold text-white">${prediction.recommendedStopLoss.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between p-1.5 bg-emerald-950/20 border border-emerald-900/40 rounded">
              <span className="text-emerald-400 font-medium">Take-Profit Target:</span>
              <span className="font-bold text-white">${prediction.recommendedTakeProfit.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-800/70 text-[11px] text-slate-400 font-mono flex items-center justify-between">
            <span>R:R Ratio</span>
            <span className="text-cyan-300 font-semibold">1 : 2.14</span>
          </div>
        </div>
      </div>

      {/* AI Synthesis Thesis & Catalyst Drivers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Executive Thesis & Macro Sensitivities */}
        <div className="lg:col-span-1 bg-[#10141E] border border-slate-800 rounded-xl p-4 space-y-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Predictive Thesis Summary</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed bg-[#0b0e14] border border-slate-800/90 rounded-lg p-3">
              {prediction.aiAnalysisSummary}
            </p>
          </div>

          {/* Macro Sensitivity Breakdown */}
          <div>
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Globe2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Macro Factor Sensitivities</span>
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between p-2 bg-[#090C12] rounded border border-slate-800/70">
                <span className="text-slate-400">US Dollar (DXY):</span>
                <span className="text-slate-200 font-semibold">{prediction.macroSensitivities.dxyImpact}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-[#090C12] rounded border border-slate-800/70">
                <span className="text-slate-400">Geopolitical Risk:</span>
                <span className="text-amber-400 font-bold">{prediction.macroSensitivities.geopoliticalRiskScore} / 10</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-[#090C12] rounded border border-slate-800/70">
                <span className="text-slate-400">Supply Chain Pressure:</span>
                <span
                  className={`font-bold ${
                    prediction.macroSensitivities.supplyChainRisk === 'CRITICAL' ||
                    prediction.macroSensitivities.supplyChainRisk === 'HIGH'
                      ? 'text-rose-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {prediction.macroSensitivities.supplyChainRisk}
                </span>
              </div>
            </div>
          </div>

          {/* Key Risks */}
          {prediction.keyRisks.length > 0 && (
            <div>
              <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>Primary Downside Risks</span>
              </div>
              <ul className="space-y-1 text-[11px] text-slate-400 list-disc list-inside">
                {prediction.keyRisks.map((risk, idx) => (
                  <li key={idx} className="leading-snug">
                    {risk}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Market Driver Factors */}
        <div className="lg:col-span-2 bg-[#10141E] border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-300 uppercase tracking-wider">
                <Boxes className="w-3.5 h-3.5 text-cyan-400" />
                <span>Catalyst & Fundamental Drivers</span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">Weighted by market impact</span>
            </div>

            <div className="space-y-2.5">
              {prediction.drivers.map((driver, index) => {
                const isBull = driver.impact === 'bullish';
                const isBear = driver.impact === 'bearish';

                return (
                  <div
                    key={index}
                    className="p-3 rounded-lg bg-[#0c1017] border border-slate-800/80 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                            isBull
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : isBear
                              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              : 'bg-slate-700/40 text-slate-300 border border-slate-600'
                          }`}
                        >
                          {driver.impact}
                        </span>
                        <h4 className="text-xs font-semibold text-slate-100">{driver.title}</h4>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                        <span>Weight:</span>
                        <span className="text-cyan-400 font-bold">{driver.weight}/5</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed mt-1">
                      {driver.explanation}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grounding Citations */}
          {prediction.groundingSources && prediction.groundingSources.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-800/80">
              <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5 mb-2">
                <Globe2 className="w-3 h-3 text-cyan-400" />
                <span>Live Grounded Intelligence Sources:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {prediction.groundingSources.map((src, i) => (
                  <a
                    key={i}
                    href={src.url || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[10px] bg-slate-900 hover:bg-slate-800 text-cyan-300 px-2 py-1 rounded border border-slate-800 hover:border-cyan-700 transition-colors"
                  >
                    <span className="truncate max-w-[200px]">{src.title}</span>
                    <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-70" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
