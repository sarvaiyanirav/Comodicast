/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User } from 'firebase/auth';
import { Commodity, CommoditySector, ForecastHorizon, PredictionResult, ScenarioShock } from './types/commodity';
import { CurrencyCode } from './lib/currencies';
import { COMMODITIES_CATALOG } from './lib/commoditiesData';
import { runQuantitativeForecast } from './lib/econometricModel';
import { initAuth, googleSignIn, logout } from './lib/firebase';
import { listSavedForecastsFromDrive } from './lib/drive';

import { Header } from './components/Header';
import { CommoditySelector } from './components/CommoditySelector';
import { InteractiveChart } from './components/InteractiveChart';
import { PredictionDashboard } from './components/PredictionDashboard';
import { ScenarioSimulator } from './components/ScenarioSimulator';
import { DriveExportModal } from './components/DriveExportModal';
import { DriveDossierManager } from './components/DriveDossierManager';
import { LiveMarketNews } from './components/LiveMarketNews';
import { CurrencyConverterWidget } from './components/CurrencyConverterWidget';
import { GitHubSyncModal } from './components/GitHubSyncModal';

const DEFAULT_SHOCKS: ScenarioShock = {
  dxyDeltaPercent: 0,
  geopoliticalEscalation: 5,
  supplyDisruptionPercent: 0,
  globalGdpGrowthDelta: 0,
  extremeWeatherSeverity: 5,
};

export default function App() {
  const [commodities, setCommodities] = useState<Commodity[]>(COMMODITIES_CATALOG);
  const [selectedCommodityId, setSelectedCommodityId] = useState<string>('wti-crude');
  const [selectedSector, setSelectedSector] = useState<'ALL' | CommoditySector>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHorizon, setSelectedHorizon] = useState<ForecastHorizon>('30D');

  // Currency selection & conversion state
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('USD');
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);

  // GitHub Sync state
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);

  // Prediction state
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [isLoadingPrediction, setIsLoadingPrediction] = useState(false);
  const [activeShocks, setActiveShocks] = useState<ScenarioShock>(DEFAULT_SHOCKS);

  // Modals state
  const [isStressTestOpen, setIsStressTestOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isDriveManagerOpen, setIsDriveManagerOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Google Workspace / Firebase Auth state
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [savedDossiersCount, setSavedDossiersCount] = useState(0);

  // Currently selected commodity object
  const currentCommodity = useMemo(() => {
    return commodities.find((c) => c.id === selectedCommodityId) || commodities[0];
  }, [commodities, selectedCommodityId]);

  // Load count of saved dossiers from user's Google Drive
  const refreshDriveCount = useCallback(async (token: string) => {
    try {
      const list = await listSavedForecastsFromDrive(token);
      setSavedDossiersCount(list.length);
    } catch (e) {
      console.warn('Could not list drive files count:', e);
    }
  }, []);

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        if (token) {
          refreshDriveCount(token);
        }
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [refreshDriveCount]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        refreshDriveCount(result.accessToken);
      }
    } catch (err) {
      console.error('Google Sign In failed:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setAccessToken(null);
      setSavedDossiersCount(0);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  // Run or fetch prediction
  const fetchPrediction = useCallback(
    async (commodity: Commodity, horizon: ForecastHorizon, shocks: ScenarioShock) => {
      setIsLoadingPrediction(true);
      try {
        const response = await fetch('/api/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            commodityId: commodity.id,
            horizon,
            shocks,
          }),
        });

        if (response.ok) {
          const result: PredictionResult = await response.json();
          setPrediction(result);
        } else {
          const fallback = runQuantitativeForecast(commodity, horizon, shocks);
          setPrediction(fallback);
        }
      } catch (err) {
        console.warn('Prediction API call failed, falling back to local quantitative model:', err);
        const fallback = runQuantitativeForecast(commodity, horizon, shocks);
        setPrediction(fallback);
      } finally {
        setIsLoadingPrediction(false);
      }
    },
    []
  );

  // Trigger prediction update whenever commodity, horizon, or shocks change
  useEffect(() => {
    if (currentCommodity) {
      fetchPrediction(currentCommodity, selectedHorizon, activeShocks);
    }
  }, [currentCommodity.id, selectedHorizon, activeShocks, fetchPrediction]);

  // Real-time price tick simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setCommodities((prev) =>
        prev.map((c) => {
          if (Math.random() > 0.4) return c;

          const tickVol = (c.volatility30d / 100) * 0.0018;
          const deltaFactor = (Math.random() - 0.495) * tickVol;
          const newPrice = Number(Math.max(0.01, c.currentPrice * (1 + deltaFactor)).toFixed(2));
          const priceDiff = Number((newPrice - c.previousClose).toFixed(2));
          const pctDiff = Number(((priceDiff / c.previousClose) * 100).toFixed(2));

          const updatedHistory = [...c.history];
          if (updatedHistory.length > 0) {
            const last = { ...updatedHistory[updatedHistory.length - 1] };
            last.close = newPrice;
            last.high = Math.max(last.high, newPrice);
            last.low = Math.min(last.low, newPrice);
            updatedHistory[updatedHistory.length - 1] = last;
          }

          return {
            ...c,
            currentPrice: newPrice,
            change: priceDiff,
            changePercent: pctDiff,
            dayHigh: Math.max(c.dayHigh, newPrice),
            dayLow: Math.min(c.dayLow, newPrice),
            history: updatedHistory,
          };
        })
      );
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchPrediction(currentCommodity, selectedHorizon, activeShocks).then(() => {
      setTimeout(() => setIsRefreshing(false), 500);
    });
  };

  const handleApplyShocks = (shocks: ScenarioShock) => {
    setActiveShocks(shocks);
  };

  return (
    <div className="min-h-screen bg-[#080A0F] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Header with ticker tape, currency switcher, GitHub sync, and Google Drive auth */}
      <Header
        user={user}
        accessToken={accessToken}
        isLoggingIn={isLoggingIn}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onOpenDriveManager={() => setIsDriveManagerOpen(true)}
        savedDossiersCount={savedDossiersCount}
        commodities={commodities}
        selectedCommodityId={selectedCommodityId}
        onSelectCommodity={setSelectedCommodityId}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        isRefreshing={isRefreshing}
        onRefreshData={handleManualRefresh}
        selectedCurrency={selectedCurrency}
        onSelectCurrency={setSelectedCurrency}
        onOpenCurrencyModal={() => setIsCurrencyModalOpen(true)}
        onOpenGitHubModal={() => setIsGitHubModalOpen(true)}
      />

      {/* Main Terminal Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
        {/* Commodity Selector Bar */}
        <CommoditySelector
          commodities={commodities}
          selectedCommodityId={selectedCommodityId}
          onSelectCommodity={setSelectedCommodityId}
          selectedSector={selectedSector}
          onSelectSector={setSelectedSector}
          searchTerm={searchTerm}
          selectedCurrency={selectedCurrency}
        />

        {/* Core Layout: Chart & Real-Time Price Cone */}
        <div className="grid grid-cols-1 gap-5">
          <InteractiveChart
            commodity={currentCommodity}
            trajectory={prediction?.trajectory}
            predictedPrice={prediction?.predictedPrice}
            selectedCurrency={selectedCurrency}
          />
        </div>

        {/* Prediction Engine & Quantitative Analytics */}
        <PredictionDashboard
          commodity={currentCommodity}
          prediction={prediction}
          selectedHorizon={selectedHorizon}
          onSelectHorizon={setSelectedHorizon}
          isLoading={isLoadingPrediction}
          onOpenStressTest={() => setIsStressTestOpen(true)}
          onExportToDrive={() => setIsExportModalOpen(true)}
          isDriveConnected={Boolean(accessToken)}
          selectedCurrency={selectedCurrency}
          onOpenCurrencyModal={() => setIsCurrencyModalOpen(true)}
        />

        {/* Live Market Catalysts & Intelligence */}
        <LiveMarketNews selectedSector={currentCommodity.sector} />
      </main>

      {/* Currency Converter & FX Valuation Matrix Modal */}
      <CurrencyConverterWidget
        commodity={currentCommodity}
        selectedCurrency={selectedCurrency}
        onSelectCurrency={setSelectedCurrency}
        isOpen={isCurrencyModalOpen}
        onClose={() => setIsCurrencyModalOpen(false)}
      />

      {/* GitHub Sync & Export Modal */}
      <GitHubSyncModal
        isOpen={isGitHubModalOpen}
        onClose={() => setIsGitHubModalOpen(false)}
      />

      {/* Macroeconomic "What-If" Scenario Stress Tester Modal */}
      <ScenarioSimulator
        isOpen={isStressTestOpen}
        onClose={() => setIsStressTestOpen(false)}
        commodity={currentCommodity}
        currentShocks={activeShocks}
        onApplyShocks={handleApplyShocks}
      />

      {/* Google Drive Export Modal */}
      {prediction && (
        <DriveExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          commodity={currentCommodity}
          prediction={prediction}
          accessToken={accessToken}
          onLogin={handleLogin}
          onExportSuccess={() => {
            if (accessToken) refreshDriveCount(accessToken);
          }}
          selectedCurrency={selectedCurrency}
        />
      )}

      {/* Google Drive Dossier Manager Drawer */}
      <DriveDossierManager
        isOpen={isDriveManagerOpen}
        onClose={() => setIsDriveManagerOpen(false)}
        accessToken={accessToken}
        onRefreshCount={(c) => setSavedDossiersCount(c)}
      />

      {/* Terminal Footer */}
      <footer className="border-t border-slate-900 bg-[#080A0F] py-4 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>COMMODICAST TERMINAL • Real-Time Predictive Econometric Models</span>
          <span>Google Drive Cloud Sync Enabled • Active Currency: {selectedCurrency} • Historical Data: NYMEX, ICE, COMEX, CBOT, LME</span>
        </div>
      </footer>
    </div>
  );
}
