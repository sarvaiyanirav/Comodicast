import React, { useState, useEffect } from 'react';
import { Newspaper, Flame, RefreshCw, Compass, ShieldAlert, Sparkles, TrendingUp, TrendingDown } from 'lucide-react';

interface LiveMarketNewsProps {
  selectedSector: string;
}

interface CatalystItem {
  headline: string;
  impact: 'Bullish' | 'Bearish' | 'Neutral';
  sector: string;
}

interface IntelData {
  sentiment: string;
  sentimentScore: number;
  breakingCatalysts: CatalystItem[];
  macroSummary: string;
  isLive?: boolean;
}

export const LiveMarketNews: React.FC<LiveMarketNewsProps> = ({ selectedSector }) => {
  const [intel, setIntel] = useState<IntelData>({
    sentiment: 'Cautiously Bullish',
    sentimentScore: 66,
    breakingCatalysts: [
      {
        headline: 'OPEC+ voluntary crude production cuts extended through upcoming quarter',
        impact: 'Bullish',
        sector: 'Energy',
      },
      {
        headline: 'Global central bank bullion purchases surge to historic quarterly high',
        impact: 'Bullish',
        sector: 'Precious Metals',
      },
      {
        headline: 'LME Copper exchange warehouse inventories fall 14% on EV grid buildouts',
        impact: 'Bullish',
        sector: 'Industrial Metals',
      },
      {
        headline: 'Black Sea grain export transit corridors face elevated marine freight premiums',
        impact: 'Bullish',
        sector: 'Agriculture',
      },
    ],
    macroSummary:
      'Commodity markets are balancing physical supply tightness and geopolitical risk premiums against US Dollar currency volatility.',
    isLive: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchIntel = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/live-intel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sector: selectedSector }),
      });
      if (res.ok) {
        const data = await res.json();
        setIntel(data);
      }
    } catch (_) {
      // Graceful fallback already in place
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIntel();
  }, [selectedSector]);

  return (
    <div className="bg-[#10141E] border border-slate-800 rounded-xl p-4 text-slate-100">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
            Real-Time Market Catalysts & Intelligence
          </h3>
          {intel.isLive && (
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/50">
              Live Grounded
            </span>
          )}
        </div>

        <button
          onClick={fetchIntel}
          disabled={isLoading}
          className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-white px-2 py-1 rounded bg-[#090C12] border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Sentiment Meter Card */}
        <div className="bg-[#0b0e14] border border-slate-800/80 rounded-lg p-3 flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between mb-2">
              <span className="flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-amber-400" />
                Commodity Fear & Greed Index
              </span>
              <span className="font-bold text-white font-mono">{intel.sentimentScore}/100</span>
            </div>

            <div className="text-center py-2">
              <div className="text-lg font-bold font-mono text-cyan-300">
                {intel.sentiment}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Based on options skew, open interest, and prompt-month spreads
              </p>
            </div>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mt-2">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 transition-all duration-500"
              style={{ width: `${intel.sentimentScore}%` }}
            />
          </div>
        </div>

        {/* Breaking Catalysts List */}
        <div className="md:col-span-2 space-y-2">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>Breaking Catalysts & Physical Shifts</span>
          </div>

          <div className="space-y-1.5">
            {intel.breakingCatalysts.map((cat, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between gap-3 p-2 bg-[#0b0e14] border border-slate-800/60 rounded text-xs hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-bold shrink-0 mt-0.5 ${
                      cat.impact === 'Bullish'
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                        : cat.impact === 'Bearish'
                        ? 'bg-rose-950/60 text-rose-400 border border-rose-800/50'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {cat.impact}
                  </span>
                  <span className="text-slate-200 leading-snug">{cat.headline}</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono shrink-0">{cat.sector}</span>
              </div>
            ))}
          </div>

          {intel.macroSummary && (
            <p className="text-[11px] text-slate-400 italic pt-1 leading-relaxed">
              "{intel.macroSummary}"
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
