import React, { useState } from 'react';
import { Commodity, ScenarioShock } from '../types/commodity';
import { Sliders, RotateCcw, Zap, AlertCircle, X, Check } from 'lucide-react';

interface ScenarioSimulatorProps {
  isOpen: boolean;
  onClose: () => void;
  commodity: Commodity;
  currentShocks: ScenarioShock;
  onApplyShocks: (shocks: ScenarioShock) => void;
}

const PRESETS: {
  name: string;
  description: string;
  shocks: ScenarioShock;
}[] = [
  {
    name: 'Strait of Hormuz Sea Blockade',
    description: 'Maritime chokepoint closure causing 8% global petroleum curtailment and acute geopolitical escalation.',
    shocks: {
      dxyDeltaPercent: 1.5,
      geopoliticalEscalation: 9,
      supplyDisruptionPercent: -8,
      globalGdpGrowthDelta: -1.2,
      extremeWeatherSeverity: 5,
    },
  },
  {
    name: 'Rapid Central Bank Rate Cuts',
    description: 'Federal Reserve and ECB slash benchmark rates by 100bps, devaluing USD and sparking monetary hedge demand.',
    shocks: {
      dxyDeltaPercent: -4.5,
      geopoliticalEscalation: 4,
      supplyDisruptionPercent: 0,
      globalGdpGrowthDelta: 1.5,
      extremeWeatherSeverity: 5,
    },
  },
  {
    name: 'China Mega Infrastructure Stimulus',
    description: 'Beijing announces a $400B green grid and real-estate stabilization liquidity package.',
    shocks: {
      dxyDeltaPercent: -1.0,
      geopoliticalEscalation: 4,
      supplyDisruptionPercent: -2,
      globalGdpGrowthDelta: 2.2,
      extremeWeatherSeverity: 5,
    },
  },
  {
    name: 'Global Megadrought & Harvest Failure',
    description: 'Severe heatwave and soil moisture deficit across North America and South America.',
    shocks: {
      dxyDeltaPercent: 0.5,
      geopoliticalEscalation: 5,
      supplyDisruptionPercent: -6,
      globalGdpGrowthDelta: -0.5,
      extremeWeatherSeverity: 9,
    },
  },
];

const DEFAULT_SHOCKS: ScenarioShock = {
  dxyDeltaPercent: 0,
  geopoliticalEscalation: 5,
  supplyDisruptionPercent: 0,
  globalGdpGrowthDelta: 0,
  extremeWeatherSeverity: 5,
};

export const ScenarioSimulator: React.FC<ScenarioSimulatorProps> = ({
  isOpen,
  onClose,
  commodity,
  currentShocks,
  onApplyShocks,
}) => {
  const [shocks, setShocks] = useState<ScenarioShock>(currentShocks || DEFAULT_SHOCKS);

  if (!isOpen) return null;

  const handleReset = () => {
    setShocks(DEFAULT_SHOCKS);
  };

  const handleApply = () => {
    onApplyShocks(shocks);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-[#111622] border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Macroeconomic "What-If" Stress Tester
              </h3>
              <p className="text-xs text-slate-400">
                Simulate macro shocks and evaluate econometric price elasticity for {commodity.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preset Shock Scenarios */}
        <div className="mt-4">
          <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Preset Crisis & Shock Scenarios</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PRESETS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => setShocks(preset.shocks)}
                className="text-left p-2.5 rounded-lg bg-[#0c1017] border border-slate-800 hover:border-amber-500/50 hover:bg-[#131926] transition-all cursor-pointer group"
              >
                <div className="text-xs font-semibold text-slate-200 group-hover:text-amber-300">
                  {preset.name}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {preset.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Shock Sliders */}
        <div className="mt-6 space-y-4 pt-4 border-t border-slate-800">
          {/* US Dollar Index Shift */}
          <div>
            <div className="flex items-center justify-between text-xs font-mono mb-1.5">
              <span className="text-slate-300">US Dollar Index (DXY) Movement:</span>
              <span className={`font-bold ${shocks.dxyDeltaPercent > 0 ? 'text-rose-400' : shocks.dxyDeltaPercent < 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                {shocks.dxyDeltaPercent > 0 ? '+' : ''}{shocks.dxyDeltaPercent.toFixed(1)}%
              </span>
            </div>
            <input
              type="range"
              min="-10"
              max="10"
              step="0.5"
              value={shocks.dxyDeltaPercent}
              onChange={(e) => setShocks({ ...shocks, dxyDeltaPercent: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>-10% (Dollar Devaluation)</span>
              <span>0% (Neutral)</span>
              <span>+10% (Strong Dollar)</span>
            </div>
          </div>

          {/* Geopolitical Escalation Score */}
          <div>
            <div className="flex items-center justify-between text-xs font-mono mb-1.5">
              <span className="text-slate-300">Geopolitical Friction & Conflict Index:</span>
              <span className={`font-bold ${shocks.geopoliticalEscalation >= 7 ? 'text-rose-400' : shocks.geopoliticalEscalation >= 5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {shocks.geopoliticalEscalation} / 10
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={shocks.geopoliticalEscalation}
              onChange={(e) => setShocks({ ...shocks, geopoliticalEscalation: parseInt(e.target.value) })}
              className="w-full accent-amber-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>1 (Calm & Open Borders)</span>
              <span>5 (Baseline)</span>
              <span>10 (Full War / Major Blockades)</span>
            </div>
          </div>

          {/* Supply Disruption */}
          <div>
            <div className="flex items-center justify-between text-xs font-mono mb-1.5">
              <span className="text-slate-300">Physical Supply Disruption / Outage:</span>
              <span className={`font-bold ${shocks.supplyDisruptionPercent < 0 ? 'text-emerald-400' : shocks.supplyDisruptionPercent > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                {shocks.supplyDisruptionPercent > 0 ? '+' : ''}{shocks.supplyDisruptionPercent.toFixed(1)}% (
                {shocks.supplyDisruptionPercent < 0 ? 'Supply Cut / Shortage' : shocks.supplyDisruptionPercent > 0 ? 'Supply Glut' : 'Balanced'})
              </span>
            </div>
            <input
              type="range"
              min="-15"
              max="15"
              step="1"
              value={shocks.supplyDisruptionPercent}
              onChange={(e) => setShocks({ ...shocks, supplyDisruptionPercent: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>-15% (Severe Curtailment)</span>
              <span>0% (Normal)</span>
              <span>+15% (Oversupply / Dumping)</span>
            </div>
          </div>

          {/* Global GDP Growth Delta */}
          <div>
            <div className="flex items-center justify-between text-xs font-mono mb-1.5">
              <span className="text-slate-300">Global GDP Growth Shock:</span>
              <span className={`font-bold ${shocks.globalGdpGrowthDelta > 0 ? 'text-emerald-400' : shocks.globalGdpGrowthDelta < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                {shocks.globalGdpGrowthDelta > 0 ? '+' : ''}{shocks.globalGdpGrowthDelta.toFixed(1)}%
              </span>
            </div>
            <input
              type="range"
              min="-4"
              max="4"
              step="0.5"
              value={shocks.globalGdpGrowthDelta}
              onChange={(e) => setShocks({ ...shocks, globalGdpGrowthDelta: parseFloat(e.target.value) })}
              className="w-full accent-blue-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>-4% (Global Recession)</span>
              <span>0% (Consensus)</span>
              <span>+4% (Booming Industrial Expansion)</span>
            </div>
          </div>

          {/* Weather Severity */}
          <div>
            <div className="flex items-center justify-between text-xs font-mono mb-1.5">
              <span className="text-slate-300">Extreme Weather Anomaly (El Niño / La Niña / Polar Vortex):</span>
              <span className="text-cyan-400 font-bold">
                {shocks.extremeWeatherSeverity} / 10
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={shocks.extremeWeatherSeverity}
              onChange={(e) => setShocks({ ...shocks, extremeWeatherSeverity: parseInt(e.target.value) })}
              className="w-full accent-teal-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>1 (Optimal Climate)</span>
              <span>5 (Moderate)</span>
              <span>10 (Historic Crop Freeze/Drought)</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Baseline</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors shadow-lg shadow-cyan-950/40 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Apply & Recalculate Forecast</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
