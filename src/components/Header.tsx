import React, { useState, useRef, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Commodity } from '../types/commodity';
import { CurrencyCode, SUPPORTED_CURRENCIES, convertUSD, formatCurrencyAmount } from '../lib/currencies';
import {
  TrendingUp,
  TrendingDown,
  HardDrive,
  LogOut,
  Sparkles,
  RefreshCw,
  Search,
  ChevronDown,
  ArrowRightLeft,
  Github,
} from 'lucide-react';

interface HeaderProps {
  user: User | null;
  accessToken: string | null;
  isLoggingIn: boolean;
  onLogin: () => void;
  onLogout: () => void;
  onOpenDriveManager: () => void;
  savedDossiersCount: number;
  commodities: Commodity[];
  selectedCommodityId: string;
  onSelectCommodity: (id: string) => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  isRefreshing: boolean;
  onRefreshData: () => void;
  selectedCurrency: CurrencyCode;
  onSelectCurrency: (code: CurrencyCode) => void;
  onOpenCurrencyModal: () => void;
  onOpenGitHubModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  accessToken,
  isLoggingIn,
  onLogin,
  onLogout,
  onOpenDriveManager,
  savedDossiersCount,
  commodities,
  selectedCommodityId,
  onSelectCommodity,
  searchTerm,
  onSearchChange,
  isRefreshing,
  onRefreshData,
  selectedCurrency,
  onSelectCurrency,
  onOpenCurrencyModal,
  onOpenGitHubModal,
}) => {
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeCurrencyInfo = SUPPORTED_CURRENCIES[selectedCurrency] || SUPPORTED_CURRENCIES.USD;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCurrencyDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="border-b border-slate-800 bg-[#0B0E14] sticky top-0 z-40 text-slate-100">
      {/* Top Real-Time Ticker Tape */}
      <div className="bg-[#080A0F] border-b border-slate-800/80 px-4 py-1.5 overflow-x-auto no-scrollbar flex items-center gap-6 text-xs font-mono">
        <div className="flex items-center gap-2 text-cyan-400 font-bold shrink-0 tracking-wider">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          MARKET FEED ({selectedCurrency}):
        </div>

        <div className="flex items-center gap-6 shrink-0">
          {commodities.slice(0, 8).map((c) => {
            const isPos = c.change >= 0;
            const isSelected = c.id === selectedCommodityId;
            const convertedPrice = convertUSD(c.currentPrice, selectedCurrency);
            return (
              <button
                key={c.id}
                onClick={() => onSelectCommodity(c.id)}
                className={`flex items-center gap-2 hover:text-white transition-colors cursor-pointer py-0.5 px-2 rounded ${
                  isSelected ? 'bg-cyan-950/60 border border-cyan-700/50 text-cyan-200' : 'text-slate-300'
                }`}
              >
                <span className="font-semibold text-slate-200">{c.symbol}</span>
                <span className="text-slate-100 font-mono">
                  {formatCurrencyAmount(convertedPrice, selectedCurrency)}
                </span>
                <span className={`flex items-center text-[11px] ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isPos ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                  {isPos ? '+' : ''}{c.changePercent.toFixed(2)}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Tagline */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-950/40 border border-cyan-400/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white font-sans flex items-center gap-1.5">
                COMMODI<span className="text-cyan-400">CAST</span>
              </h1>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                PRO TERMINAL
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              AI Quantitative Commodity Price Predictor & Drive Sync
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-xs w-full hidden md:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search Crude, Gold, Copper, Wheat..."
            className="w-full bg-[#111622] border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all font-sans"
          />
        </div>

        {/* Actions, Currency Selector, GitHub & Google Drive Auth */}
        <div className="flex items-center gap-2">
          {/* Currency Switcher Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
              className="flex items-center gap-1.5 bg-[#111622] hover:bg-[#161D2B] text-slate-200 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors shadow-xs cursor-pointer"
              title="Select Terminal Base Currency"
            >
              <span className="text-sm">{activeCurrencyInfo.flag}</span>
              <span className="font-bold text-white">{activeCurrencyInfo.code}</span>
              <span className="text-slate-400 font-semibold">{activeCurrencyInfo.symbol}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isCurrencyDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Quick Currency Dropdown Menu */}
            {isCurrencyDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-56 bg-[#111622] border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 text-xs font-mono animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2.5 py-1.5 text-[10px] text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 flex items-center justify-between">
                  <span>Display Currency</span>
                  <span>1 USD =</span>
                </div>

                <div className="max-h-60 overflow-y-auto py-1 space-y-0.5">
                  {(Object.keys(SUPPORTED_CURRENCIES) as CurrencyCode[]).map((code) => {
                    const info = SUPPORTED_CURRENCIES[code];
                    const isSelected = selectedCurrency === code;
                    return (
                      <button
                        key={code}
                        onClick={() => {
                          onSelectCurrency(code);
                          setIsCurrencyDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{info.flag}</span>
                          <span>{info.code}</span>
                          <span className="text-[10px] text-slate-500">({info.symbol})</span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {info.rateAgainstUSD}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-1.5 border-t border-slate-800">
                  <button
                    onClick={() => {
                      setIsCurrencyDropdownOpen(false);
                      onOpenCurrencyModal();
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/40 rounded-lg transition-colors cursor-pointer"
                  >
                    <ArrowRightLeft className="w-3 h-3" />
                    <span>Open FX Valuation Matrix</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* GitHub Sync Button */}
          <button
            onClick={onOpenGitHubModal}
            className="flex items-center gap-1.5 bg-[#121824] hover:bg-[#182030] text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-xs cursor-pointer"
            title="Sync with GitHub Repository or Download ZIP"
          >
            <Github className="w-3.5 h-3.5 text-slate-300" />
            <span className="hidden sm:inline">Sync GitHub</span>
          </button>

          {/* Refresh Real-Time Data */}
          <button
            onClick={onRefreshData}
            disabled={isRefreshing}
            title="Refresh Real-Time Market Calculations"
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          {/* Google Drive Workspace Section */}
          {user && accessToken ? (
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenDriveManager}
                className="flex items-center gap-2 bg-[#121824] hover:bg-[#182030] text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-sm cursor-pointer"
                title="Open Google Drive Dossiers"
              >
                <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Drive Files</span>
                <span className="bg-blue-900/60 text-blue-300 border border-blue-600/40 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                  {savedDossiersCount}
                </span>
              </button>

              <div className="flex items-center gap-2 bg-[#10141e] border border-slate-800 rounded-lg p-1 pl-2">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-6 h-6 rounded-full border border-slate-700"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                    {user.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <span className="text-xs text-slate-300 hidden lg:inline max-w-[110px] truncate">
                  {user.displayName || user.email?.split('@')[0]}
                </span>
                <button
                  onClick={onLogout}
                  title="Sign out of Google Drive"
                  className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            /* Official Google Sign-In Button */
            <button
              onClick={onLogin}
              disabled={isLoggingIn}
              className="flex items-center gap-2.5 bg-white hover:bg-slate-100 text-slate-800 px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-all cursor-pointer border border-slate-200 disabled:opacity-50"
              title="Connect Google Drive to save and sync prediction reports"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              <span>{isLoggingIn ? 'Connecting...' : 'Sign in with Google'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
