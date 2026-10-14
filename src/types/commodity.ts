export type CommoditySector = 'ENERGY' | 'PRECIOUS_METALS' | 'INDUSTRIAL_METALS' | 'AGRICULTURE' | 'SOFTS';

export interface PricePoint {
  date: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Commodity {
  id: string;
  name: string;
  symbol: string;
  sector: CommoditySector;
  unit: string;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  yearHigh: number;
  yearLow: number;
  volume: string;
  volatility30d: number; // percentage, e.g. 24.5%
  rsi14: number; // 0-100
  history: PricePoint[];
  exchange: string;
  description: string;
  correlations: {
    dxy: number; // -1 to 1 (Dollar index correlation)
    inflation: number; // -1 to 1
    sp500: number; // -1 to 1
  };
}

export type ForecastHorizon = '24H' | '7D' | '30D' | '90D';

export interface TrajectoryPoint {
  label: string;
  timestamp: number;
  p10: number; // Bearish bound
  p50: number; // Base projection
  p90: number; // Bullish bound
}

export interface MarketDriver {
  title: string;
  impact: 'bullish' | 'bearish' | 'neutral';
  weight: number; // 1 to 5
  explanation: string;
  category: 'supply' | 'demand' | 'geopolitical' | 'macro' | 'weather';
}

export interface PredictionResult {
  commodityId: string;
  horizon: ForecastHorizon;
  timestamp: number;
  currentPrice: number;
  predictedPrice: number;
  expectedChangePercent: number;
  signal: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  convictionScore: number; // 0 to 100
  confidenceInterval: {
    lowerP10: number;
    medianP50: number;
    upperP90: number;
  };
  recommendedStopLoss: number;
  recommendedTakeProfit: number;
  trajectory: TrajectoryPoint[];
  drivers: MarketDriver[];
  keyRisks: string[];
  macroSensitivities: {
    dxyImpact: string;
    geopoliticalRiskScore: number; // 1-10
    supplyChainRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
    inventoryOutlook: string;
  };
  aiAnalysisSummary: string;
  groundingSources?: { title: string; url?: string }[];
  isRealtimeGrounded: boolean;
}

export interface ScenarioShock {
  dxyDeltaPercent: number; // e.g. +3% or -3%
  geopoliticalEscalation: number; // 1 to 10
  supplyDisruptionPercent: number; // e.g. -5% (curtailment) or +5% (glut)
  globalGdpGrowthDelta: number; // e.g. -1% or +1%
  extremeWeatherSeverity: number; // 1 to 10
}

export interface DriveSavedForecast {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  modifiedTime: string;
  size?: string;
  webViewLink?: string;
  description?: string;
}
