import { Commodity, ForecastHorizon, PredictionResult, ScenarioShock, TrajectoryPoint, MarketDriver } from '../types/commodity';

export function runQuantitativeForecast(
  commodity: Commodity,
  horizon: ForecastHorizon,
  customShocks?: ScenarioShock
): PredictionResult {
  const current = commodity.currentPrice;
  const volAnnual = (commodity.volatility30d / 100);
  
  // Horizon in days
  const horizonDays = horizon === '24H' ? 1 : horizon === '7D' ? 7 : horizon === '30D' ? 30 : 90;
  const timeFraction = horizonDays / 365;
  const volHorizon = volAnnual * Math.sqrt(timeFraction);

  // Base momentum drift from 30d history and RSI
  let momentumFactor = (commodity.rsi14 - 50) / 100 * 0.05; // -2.5% to +2.5%
  if (commodity.changePercent > 1) momentumFactor += 0.01;
  else if (commodity.changePercent < -1) momentumFactor -= 0.01;

  // Macro shock adjustments if present
  let macroDrift = 0;
  let geopoliticalRiskScore = 6;
  if (customShocks) {
    // DXY inverse relationship
    macroDrift += (commodity.correlations.dxy * (customShocks.dxyDeltaPercent / 100));
    // Geopolitical escalation boosts gold/crude
    const geoIntensity = (customShocks.geopoliticalEscalation - 5) / 5;
    geopoliticalRiskScore = customShocks.geopoliticalEscalation;
    if (commodity.sector === 'ENERGY' || commodity.id === 'gold') {
      macroDrift += geoIntensity * 0.04 * (horizonDays / 30);
    }
    // Supply disruption directly shocks price inversely
    macroDrift -= (customShocks.supplyDisruptionPercent / 100) * 0.8;
    // GDP growth boosts industrial metals and energy
    if (commodity.sector === 'INDUSTRIAL_METALS' || commodity.sector === 'ENERGY') {
      macroDrift += (customShocks.globalGdpGrowthDelta / 100) * 1.2;
    }
    // Weather severity shocks agriculture and natural gas
    if (commodity.sector === 'AGRICULTURE' || commodity.sector === 'SOFTS' || commodity.id === 'natural-gas') {
      macroDrift += ((customShocks.extremeWeatherSeverity - 5) / 5) * 0.035;
    }
  }

  // Combined expected return
  const totalReturn = momentumFactor * (horizonDays / 30) + macroDrift;
  const basePriceTarget = current * (1 + totalReturn);

  // Confidence bands using lognormal distribution
  const z90 = 1.645; // 90% confidence quantile
  const lowerP10 = Math.max(0.01, basePriceTarget * Math.exp(-z90 * volHorizon));
  const medianP50 = basePriceTarget;
  const upperP90 = basePriceTarget * Math.exp(z90 * volHorizon);

  // Trajectory points
  const stepsCount = horizon === '24H' ? 6 : horizon === '7D' ? 7 : 10;
  const trajectory: TrajectoryPoint[] = [];
  const now = Date.now();
  const stepInterval = (horizonDays * 24 * 60 * 60 * 1000) / stepsCount;

  for (let s = 0; s <= stepsCount; s++) {
    const fraction = s / stepsCount;
    const stepTime = now + s * stepInterval;
    const dateLabel = horizon === '24H'
      ? `+${s * 4}h`
      : new Date(stepTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    const stepVol = volAnnual * Math.sqrt((fraction * horizonDays) / 365);
    const stepBase = current + (medianP50 - current) * fraction;
    trajectory.push({
      label: dateLabel,
      timestamp: stepTime,
      p10: Number(Math.max(0.01, stepBase * Math.exp(-z90 * stepVol)).toFixed(2)),
      p50: Number(stepBase.toFixed(2)),
      p90: Number((stepBase * Math.exp(z90 * stepVol)).toFixed(2)),
    });
  }

  // Recommendation Signal & Conviction
  const expectedChangePercent = ((medianP50 - current) / current) * 100;
  let signal: PredictionResult['signal'] = 'HOLD';
  let convictionScore = 65;

  if (expectedChangePercent > 4.5) {
    signal = 'STRONG_BUY';
    convictionScore = Math.min(95, Math.floor(78 + Math.abs(expectedChangePercent) * 2));
  } else if (expectedChangePercent > 1.2) {
    signal = 'BUY';
    convictionScore = Math.floor(68 + Math.abs(expectedChangePercent) * 2.5);
  } else if (expectedChangePercent < -4.5) {
    signal = 'STRONG_SELL';
    convictionScore = Math.min(94, Math.floor(76 + Math.abs(expectedChangePercent) * 2));
  } else if (expectedChangePercent < -1.2) {
    signal = 'SELL';
    convictionScore = Math.floor(66 + Math.abs(expectedChangePercent) * 2.5);
  } else {
    signal = 'HOLD';
    convictionScore = 58;
  }

  // Stop loss and take profit
  const recommendedStopLoss = signal.includes('BUY')
    ? Number((current * (1 - volHorizon * 0.75)).toFixed(2))
    : Number((current * (1 + volHorizon * 0.75)).toFixed(2));
  const recommendedTakeProfit = signal.includes('BUY')
    ? Number((current * (1 + Math.max(0.02, Math.abs(expectedChangePercent) / 100 * 1.5))).toFixed(2))
    : Number((current * (1 - Math.max(0.02, Math.abs(expectedChangePercent) / 100 * 1.5))).toFixed(2));

  // Market Drivers
  const drivers: MarketDriver[] = [
    {
      title: commodity.correlations.dxy < -0.5 ? 'US Dollar Strength / FX Drag' : 'Dollar Neutrality',
      impact: (customShocks?.dxyDeltaPercent ?? 0) > 0 ? 'bearish' : 'bullish',
      weight: 4,
      explanation: `DXY correlation of ${(commodity.correlations.dxy * 100).toFixed(0)}% creates inverted spot pressure during monetary shifts.`,
      category: 'macro',
    },
    {
      title: 'Structural Physical Inventory Balance',
      impact: commodity.changePercent >= 0 ? 'bullish' : 'bearish',
      weight: 5,
      explanation: 'Terminal exchange warehouse storage and commercial inventory cover remain at historically lean levels.',
      category: 'supply',
    },
    {
      title: 'Geopolitical & Chokepoint Freight Risk',
      impact: geopoliticalRiskScore >= 6 ? 'bullish' : 'neutral',
      weight: 4,
      explanation: 'Maritime shipping detours and cross-border trade friction are keeping risk-premium elevated.',
      category: 'geopolitical',
    },
    {
      title: 'Technical Momentum & RSI Divergence',
      impact: commodity.rsi14 > 60 ? 'bullish' : commodity.rsi14 < 40 ? 'bearish' : 'neutral',
      weight: 3,
      explanation: `14-period RSI sits at ${commodity.rsi14.toFixed(1)}, reflecting ${commodity.rsi14 > 60 ? 'bullish continuation momentum' : commodity.rsi14 < 40 ? 'oversold exhaustion' : 'range-bound consolidation'}.`,
      category: 'demand',
    },
  ];

  return {
    commodityId: commodity.id,
    horizon,
    timestamp: Date.now(),
    currentPrice: current,
    predictedPrice: Number(medianP50.toFixed(2)),
    expectedChangePercent: Number(expectedChangePercent.toFixed(2)),
    signal,
    convictionScore,
    confidenceInterval: {
      lowerP10: Number(lowerP10.toFixed(2)),
      medianP50: Number(medianP50.toFixed(2)),
      upperP90: Number(upperP90.toFixed(2)),
    },
    recommendedStopLoss,
    recommendedTakeProfit,
    trajectory,
    drivers,
    keyRisks: [
      'Unexpected central bank interest rate pivot strengthening USD',
      'Sudden inventory restocking or unseasonal demand slowdown',
      'Elevated margin requirements on futures clearinghouses',
    ],
    macroSensitivities: {
      dxyImpact: `${commodity.correlations.dxy < -0.6 ? 'High Inverse' : 'Moderate'} Sensitivity`,
      geopoliticalRiskScore,
      supplyChainRisk: geopoliticalRiskScore > 7 ? 'HIGH' : 'MODERATE',
      inventoryOutlook: 'Tight to moderate commercial stockpiles',
    },
    aiAnalysisSummary: `${commodity.name} displays an expected ${expectedChangePercent >= 0 ? '+' : ''}${expectedChangePercent.toFixed(2)}% drift over the ${horizon} window based on technical RSI (${commodity.rsi14}), 30-day volatility (${commodity.volatility30d}%), and macro elasticities.`,
    isRealtimeGrounded: false,
  };
}
