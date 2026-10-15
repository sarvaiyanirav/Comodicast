import React, { useState } from 'react';
import { Commodity } from '../types/commodity';
import { CurrencyCode, SUPPORTED_CURRENCIES, convertUSD, formatCurrencyAmount, convertUnitLabel } from '../lib/currencies';
import { Coins, ArrowRightLeft, TrendingUp, TrendingDown, Check, X, Calculator } from 'lucide-react';

interface CurrencyConverterWidgetProps {
  commodity: Commodity;
  selectedCurrency: CurrencyCode;
  onSelectCurrency: (code: CurrencyCode) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const CurrencyConverterWidget: React.FC<CurrencyConverterWidgetProps> = ({
  commodity,
  selectedCurrency,
  onSelectCurrency,
  isOpen,
  onClose,
}) => {
  const [quantity, setQuantity] = useState<number>(100);

  if (!isOpen) return null;

  const currentUSDPrice = commodity.currentPrice;
  const totalUSD = currentUSDPrice * quantity;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-[#111622] border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Multi-Currency Exchange & Valuation Matrix</span>
              </h3>
              <p className="text-xs text-slate-400">
                Real-time FX conversions, position valuations, and active display currency switcher
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

        {/* Commodity & Quantity Inputs */}
        <div className="mt-4 p-4 rounded-xl bg-[#0c1017] border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-mono text-slate-400">TARGET COMMODITY</div>
            <div className="text-sm font-bold text-white font-mono mt-0.5">
              {commodity.name} ({commodity.symbol})
            </div>
            <div className="text-xs text-cyan-400 font-mono">
              Spot: ${commodity.currentPrice.toLocaleString()} {commodity.unit}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">
                POSITION QUANTITY:
              </label>
              <div className="flex items-center bg-[#151D2E] border border-slate-700 rounded-lg px-2.5 py-1.5 focus-within:border-cyan-500">
                <Calculator className="w-3.5 h-3.5 text-slate-400 mr-2" />
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseFloat(e.target.value) || 1))}
                  className="w-24 bg-transparent text-sm font-mono text-white focus:outline-hidden"
                />
                <span className="text-xs text-slate-400 font-mono ml-1">
                  {commodity.unit.split('/')[1] || 'units'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Currencies Matrix Table */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-2">
            <span>CURRENCY & FX RATE</span>
            <div className="flex items-center gap-12">
              <span>UNIT PRICE</span>
              <span className="w-32 text-right">TOTAL NOTIONAL</span>
              <span className="w-16 text-right">ACTION</span>
            </div>
          </div>

          <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
            {(Object.keys(SUPPORTED_CURRENCIES) as CurrencyCode[]).map((code) => {
              const info = SUPPORTED_CURRENCIES[code];
              const isSelected = selectedCurrency === code;
              const convertedUnitPrice = convertUSD(currentUSDPrice, code);
              const convertedTotal = convertUSD(totalUSD, code);
              const isFxPos = info.change24h >= 0;

              return (
                <div
                  key={code}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all text-xs font-mono ${
                    isSelected
                      ? 'bg-[#151D2E] border-cyan-500/70 shadow-xs'
                      : 'bg-[#0b0e14] border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  {/* Currency info */}
                  <div className="flex items-center gap-3">
                    <span className="text-lg leading-none">{info.flag}</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white">{info.code}</span>
                        <span className="text-[11px] text-slate-400 hidden sm:inline">
                          ({info.name})
                        </span>
                        {isSelected && (
                          <span className="text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-700 px-1.5 py-0.2 rounded font-bold">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                        <span>1 USD = {info.rateAgainstUSD} {info.code}</span>
                        {info.code !== 'USD' && (
                          <span className={`flex items-center ${isFxPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isFxPos ? <TrendingUp className="w-2.5 h-2.5 mr-0.5" /> : <TrendingDown className="w-2.5 h-2.5 mr-0.5" />}
                            {isFxPos ? '+' : ''}{info.change24h}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Pricing and Action */}
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="font-semibold text-slate-200">
                        {formatCurrencyAmount(convertedUnitPrice, code)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        per {commodity.unit.split('/')[1] || 'unit'}
                      </div>
                    </div>

                    <div className="w-32 text-right">
                      <div className="font-bold text-white text-sm">
                        {formatCurrencyAmount(convertedTotal, code)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {quantity} {commodity.unit.split('/')[1] || 'units'}
                      </div>
                    </div>

                    <div className="w-16 text-right">
                      {isSelected ? (
                        <div className="flex items-center justify-end text-cyan-400">
                          <Check className="w-4 h-4" />
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            onSelectCurrency(code);
                            onClose();
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-cyan-600 hover:text-white text-slate-300 rounded text-[11px] font-medium transition-colors cursor-pointer"
                        >
                          Select
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Rates benchmarked against live FX feeds (ECB, Fed, BOJ, RBI).</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
