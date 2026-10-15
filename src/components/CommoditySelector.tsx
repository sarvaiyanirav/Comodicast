import React from 'react';
import { Commodity, CommoditySector } from '../types/commodity';
import { CurrencyCode, convertUSD, formatCurrencyAmount } from '../lib/currencies';
import { Flame, Coins, Hammer, Wheat, Coffee, Layers, TrendingUp, TrendingDown } from 'lucide-react';

interface CommoditySelectorProps {
  commodities: Commodity[];
  selectedCommodityId: string;
  onSelectCommodity: (id: string) => void;
  selectedSector: 'ALL' | CommoditySector;
  onSelectSector: (sector: 'ALL' | CommoditySector) => void;
  searchTerm: string;
  selectedCurrency: CurrencyCode;
}

const SECTOR_ICONS: Record<CommoditySector, React.ReactNode> = {
  ENERGY: <Flame className="w-3.5 h-3.5 text-orange-400" />,
  PRECIOUS_METALS: <Coins className="w-3.5 h-3.5 text-amber-400" />,
  INDUSTRIAL_METALS: <Hammer className="w-3.5 h-3.5 text-cyan-400" />,
  AGRICULTURE: <Wheat className="w-3.5 h-3.5 text-emerald-400" />,
  SOFTS: <Coffee className="w-3.5 h-3.5 text-rose-400" />,
};

const SECTOR_LABELS: Record<'ALL' | CommoditySector, string> = {
  ALL: 'All Commodities',
  ENERGY: 'Energy',
  PRECIOUS_METALS: 'Precious Metals',
  INDUSTRIAL_METALS: 'Industrial Metals',
  AGRICULTURE: 'Agriculture',
  SOFTS: 'Softs',
};

export const CommoditySelector: React.FC<CommoditySelectorProps> = ({
  commodities,
  selectedCommodityId,
  onSelectCommodity,
  selectedSector,
  onSelectSector,
  searchTerm,
  selectedCurrency,
}) => {
  const filtered = commodities.filter((c) => {
    const matchesSector = selectedSector === 'ALL' || c.sector === selectedSector;
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSector && matchesSearch;
  });

  return (
    <div className="space-y-3">
      {/* Sector Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {(['ALL', 'ENERGY', 'PRECIOUS_METALS', 'INDUSTRIAL_METALS', 'AGRICULTURE', 'SOFTS'] as const).map((sec) => {
          const isActive = selectedSector === sec;
          return (
            <button
              key={sec}
              onClick={() => onSelectSector(sec)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                  : 'bg-[#111622] text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
              }`}
            >
              {sec !== 'ALL' && SECTOR_ICONS[sec]}
              {sec === 'ALL' && <Layers className="w-3.5 h-3.5 text-slate-400" />}
              <span>{SECTOR_LABELS[sec]}</span>
            </button>
          );
        })}
      </div>

      {/* Commodity Grid Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5">
        {filtered.map((commodity) => {
          const isSelected = commodity.id === selectedCommodityId;
          const isPos = commodity.change >= 0;
          const convertedPrice = convertUSD(commodity.currentPrice, selectedCurrency);

          return (
            <button
              key={commodity.id}
              onClick={() => onSelectCommodity(commodity.id)}
              className={`text-left p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
                isSelected
                  ? 'bg-[#151D2E] border-cyan-500/80 shadow-md shadow-cyan-950/50 ring-1 ring-cyan-500/40'
                  : 'bg-[#10141E] border-slate-800/80 hover:border-slate-700 hover:bg-[#131826]'
              }`}
            >
              {isSelected && (
                <div className="absolute top-0 right-0 w-2 h-2 bg-cyan-400 rounded-bl-sm" />
              )}

              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-xs font-bold text-slate-200 tracking-wide">
                  {commodity.symbol}
                </span>
                <span className="flex items-center text-[10px] text-slate-400 gap-1">
                  {SECTOR_ICONS[commodity.sector]}
                </span>
              </div>

              <div className="text-xs font-medium text-slate-300 truncate mb-2" title={commodity.name}>
                {commodity.name}
              </div>

              <div className="flex items-baseline justify-between gap-1 mb-1">
                <span className="font-mono text-sm font-bold text-white">
                  {formatCurrencyAmount(convertedPrice, selectedCurrency)}
                </span>
                <span
                  className={`flex items-center font-mono text-[11px] font-semibold ${
                    isPos ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {isPos ? <TrendingUp className="w-2.5 h-2.5 mr-0.5" /> : <TrendingDown className="w-2.5 h-2.5 mr-0.5" />}
                  {isPos ? '+' : ''}{commodity.changePercent.toFixed(2)}%
                </span>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1.5 border-t border-slate-800/60">
                <span>Vol {commodity.volatility30d}%</span>
                <span className={commodity.rsi14 > 60 ? 'text-emerald-400/80' : commodity.rsi14 < 40 ? 'text-rose-400/80' : 'text-slate-400'}>
                  RSI {commodity.rsi14.toFixed(0)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
