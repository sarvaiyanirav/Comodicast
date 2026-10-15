import { GoogleGenAI } from '@google/genai';
import { Commodity, ForecastHorizon, PredictionResult, ScenarioShock } from '../src/types/commodity';

// In-memory cache to prevent burning API quota
const predictionCache = new Map<string, { result: PredictionResult; expiresAt: number }>();
const intelCache = new Map<string, { data: any; expiresAt: number }>();

// Quota circuit breaker: if 429 is encountered, avoid making calls until cooldown expires
let quotaCooldownUntil = 0;

function isQuotaExceeded(err: any): boolean {
  if (!err) return false;
  const str = String(err.message || err.status || JSON.stringify(err));
  return str.includes('429') || str.includes('RESOURCE_EXHAUSTED') || str.includes('quota') || str.includes('rate-limit');
}

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function generateAIPrediction(
  commodity: Commodity,
  horizon: ForecastHorizon,
  customShocks?: ScenarioShock
): Promise<PredictionResult | null> {
  // Check in-memory cache first (valid for 10 minutes)
  const cacheKey = `${commodity.id}:${horizon}:${JSON.stringify(customShocks || {})}`;
  const cached = predictionCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.result;
  }

  // If in quota cooldown, skip API call silently and return null to use econometric engine
  if (Date.now() < quotaCooldownUntil) {
    return null;
  }

  const ai = getGeminiClient();
  if (!ai) {
    return null;
  }

  const shocksContext = customShocks
    ? `\nCUSTOM MACRO SHOCKS APPLIED:
- US Dollar Index Shift: ${customShocks.dxyDeltaPercent}%
- Geopolitical Escalation: ${customShocks.geopoliticalEscalation}/10
- Supply Shock / Disruption: ${customShocks.supplyDisruptionPercent}%
- Global GDP Growth Delta: ${customShocks.globalGdpGrowthDelta}%
- Weather Severity Index: ${customShocks.extremeWeatherSeverity}/10`
    : '';

  const prompt = `You are an elite quantitative commodities strategist and senior macroeconomic analyst at a leading global trading desk.
Analyze real-time market data, supply-demand fundamentals, geopolitics, and inventory levels for the following commodity to generate a rigorous price forecast:

COMMODITY DETAILS:
- Name: ${commodity.name} (${commodity.symbol})
- Sector: ${commodity.sector}
- Spot Price: ${commodity.currentPrice} ${commodity.unit}
- 24h Change: ${commodity.changePercent}%
- 30-Day Volatility: ${commodity.volatility30d}%
- 14-Day RSI: ${commodity.rsi14}
- DXY Correlation: ${commodity.correlations.dxy}
- Exchange: ${commodity.exchange}
- Target Prediction Horizon: ${horizon}
${shocksContext}

Use your live market knowledge and Google Search grounding to incorporate recent catalysts (OPEC+ policies, Red Sea/maritime logistics, interest rate dynamics, central bank buying, weather shocks, Chinese demand, mining output).

You MUST output ONLY a valid JSON object matching this exact structure:
{
  "predictedPrice": number (realistic target price in ${commodity.unit}),
  "expectedChangePercent": number (e.g. 3.4 or -2.1),
  "signal": "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL",
  "convictionScore": number (0-100),
  "confidenceInterval": {
    "lowerP10": number (bearish 10th percentile bound),
    "medianP50": number (base case),
    "upperP90": number (bullish 90th percentile bound)
  },
  "recommendedStopLoss": number,
  "recommendedTakeProfit": number,
  "trajectory": [
    { "label": string (e.g. "+1d", "+3d" or "+10d"), "p10": number, "p50": number, "p90": number }
  ],
  "drivers": [
    {
      "title": string,
      "impact": "bullish" | "bearish" | "neutral",
      "weight": number (1 to 5),
      "explanation": string,
      "category": "supply" | "demand" | "geopolitical" | "macro" | "weather"
    }
  ],
  "keyRisks": string[],
  "macroSensitivities": {
    "dxyImpact": string,
    "geopoliticalRiskScore": number (1 to 10),
    "supplyChainRisk": "LOW" | "MODERATE" | "HIGH" | "CRITICAL",
    "inventoryOutlook": string
  },
  "aiAnalysisSummary": string (concise 2-3 sentence executive thesis explaining catalyst drivers and trajectory)
}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text?.trim() || '';
    
    // Extract JSON from markdown backticks if present
    let cleanedJson = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      cleanedJson = jsonMatch[1];
    } else {
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        cleanedJson = text.substring(firstBrace, lastBrace + 1);
      }
    }

    const parsed = JSON.parse(cleanedJson);

    // Extract grounding sources from candidate metadata
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const groundingSources = groundingChunks
      .filter((chunk: any) => chunk.web?.title)
      .map((chunk: any) => ({
        title: chunk.web?.title || 'Market Source',
        url: chunk.web?.uri,
      }))
      .slice(0, 5);

    // Build Trajectory with timestamps
    const horizonDays = horizon === '24H' ? 1 : horizon === '7D' ? 7 : horizon === '30D' ? 30 : 90;
    const now = Date.now();
    const trajRaw = Array.isArray(parsed.trajectory) ? parsed.trajectory : [];
    const trajectory = trajRaw.map((pt: any, idx: number) => ({
      label: pt.label || `T+${idx + 1}`,
      timestamp: now + ((idx + 1) / Math.max(1, trajRaw.length)) * horizonDays * 86400000,
      p10: Number(pt.p10 || parsed.confidenceInterval?.lowerP10 || commodity.currentPrice * 0.95),
      p50: Number(pt.p50 || parsed.predictedPrice || commodity.currentPrice),
      p90: Number(pt.p90 || parsed.confidenceInterval?.upperP90 || commodity.currentPrice * 1.05),
    }));

    const result: PredictionResult = {
      commodityId: commodity.id,
      horizon,
      timestamp: Date.now(),
      currentPrice: commodity.currentPrice,
      predictedPrice: Number(parsed.predictedPrice),
      expectedChangePercent: Number(parsed.expectedChangePercent),
      signal: parsed.signal || 'HOLD',
      convictionScore: Number(parsed.convictionScore || 70),
      confidenceInterval: {
        lowerP10: Number(parsed.confidenceInterval?.lowerP10),
        medianP50: Number(parsed.confidenceInterval?.medianP50 || parsed.predictedPrice),
        upperP90: Number(parsed.confidenceInterval?.upperP90),
      },
      recommendedStopLoss: Number(parsed.recommendedStopLoss),
      recommendedTakeProfit: Number(parsed.recommendedTakeProfit),
      trajectory,
      drivers: Array.isArray(parsed.drivers) ? parsed.drivers : [],
      keyRisks: Array.isArray(parsed.keyRisks) ? parsed.keyRisks : [],
      macroSensitivities: parsed.macroSensitivities || {
        dxyImpact: 'Moderate',
        geopoliticalRiskScore: 6,
        supplyChainRisk: 'MODERATE',
        inventoryOutlook: 'Neutral',
      },
      aiAnalysisSummary: parsed.aiAnalysisSummary || 'Real-time market analysis conducted.',
      groundingSources,
      isRealtimeGrounded: true,
    };

    // Store in cache for 10 minutes
    predictionCache.set(cacheKey, { result, expiresAt: Date.now() + 10 * 60 * 1000 });
    return result;
  } catch (err: any) {
    if (isQuotaExceeded(err)) {
      // Cooldown for 5 minutes without dumping stack trace to console
      quotaCooldownUntil = Date.now() + 5 * 60 * 1000;
    }
    return null;
  }
}

const SECTOR_INTEL_DEFAULTS: Record<string, any> = {
  ENERGY: {
    sentiment: 'Cautiously Bullish',
    sentimentScore: 68,
    breakingCatalysts: [
      { headline: 'OPEC+ production voluntary discipline remains firm through upcoming quarter', impact: 'Bullish', sector: 'Energy' },
      { headline: 'Red Sea maritime shipping detours maintain freight tanker risk premium', impact: 'Bullish', sector: 'Energy' },
      { headline: 'US commercial crude inventories post larger-than-expected seasonal draw', impact: 'Bullish', sector: 'Energy' },
      { headline: 'Refinery utilization rates rise ahead of seasonal driving demand peak', impact: 'Neutral', sector: 'Energy' },
    ],
    macroSummary: 'Energy markets are balancing geopolitical chokepoint risks against non-OPEC production growth and macroeconomic interest rate expectations.',
  },
  PRECIOUS_METALS: {
    sentiment: 'Strongly Bullish',
    sentimentScore: 82,
    breakingCatalysts: [
      { headline: 'Sovereign central banks add record physical bullion to strategic currency reserves', impact: 'Bullish', sector: 'Precious Metals' },
      { headline: 'COMEX registered silver inventories drop to multi-year lows amid industrial solar draw', impact: 'Bullish', sector: 'Precious Metals' },
      { headline: 'Market pricing in further global monetary easing cycles across major central banks', impact: 'Bullish', sector: 'Precious Metals' },
      { headline: 'Geopolitical hedging demand offsets temporary US Dollar Index bounces', impact: 'Bullish', sector: 'Precious Metals' },
    ],
    macroSummary: 'Gold and silver are supported by persistent de-dollarization flows, structural central bank demand, and robust industrial photovoltaic consumption.',
  },
  INDUSTRIAL_METALS: {
    sentiment: 'Moderately Bullish',
    sentimentScore: 65,
    breakingCatalysts: [
      { headline: 'Global clean energy and power grid buildouts accelerate copper cathode demand', impact: 'Bullish', sector: 'Industrial Metals' },
      { headline: 'Battery-grade lithium carbonate spot inquiries stabilize following supply curtailments', impact: 'Neutral', sector: 'Industrial Metals' },
      { headline: 'Smelter treatment and refining charges (TC/RCs) hover near historic lows, signaling tight mine concentrates', impact: 'Bullish', sector: 'Industrial Metals' },
    ],
    macroSummary: 'Doctor Copper and electrification metals are buoyed by supply-side mine bottlenecks and strong renewable infrastructure investment.',
  },
  AGRICULTURE: {
    sentiment: 'Neutral to Bullish',
    sentimentScore: 58,
    breakingCatalysts: [
      { headline: 'USDA crop condition reports reflect variable moisture in key grain belts', impact: 'Neutral', sector: 'Agriculture' },
      { headline: 'Black Sea port infrastructure repairs safeguard prompt shipping transit', impact: 'Neutral', sector: 'Agriculture' },
      { headline: 'Global export competition active as Northern Hemisphere harvest progresses', impact: 'Bearish', sector: 'Agriculture' },
    ],
    macroSummary: 'Agricultural grains are navigating seasonal supply influxes while closely monitoring weather forecasts and export pace.',
  },
  SOFTS: {
    sentiment: 'Bullish',
    sentimentScore: 74,
    breakingCatalysts: [
      { headline: 'West Africa cocoa bean deliveries to ports trail five-year seasonal averages', impact: 'Bullish', sector: 'Softs' },
      { headline: 'Brazilian Arabica coffee growing regions monitor flowering stage precipitation', impact: 'Bullish', sector: 'Softs' },
      { headline: 'Port container turnaround times and logistics costs remain elevated for tropical commodities', impact: 'Bullish', sector: 'Softs' },
    ],
    macroSummary: 'Soft commodities continue to experience structural supply tightness and acute sensitivity to tropical weather disruptions.',
  },
};

export async function fetchLiveMarketIntelligence(sector: string): Promise<any> {
  const normSector = (sector || 'ENERGY').toUpperCase();
  const defaultData = SECTOR_INTEL_DEFAULTS[normSector] || SECTOR_INTEL_DEFAULTS.ENERGY;

  // Check cache (valid for 15 minutes)
  const cached = intelCache.get(normSector);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  // If in quota cooldown, immediately return rich default data
  if (Date.now() < quotaCooldownUntil) {
    return { ...defaultData, isLive: false };
  }

  const ai = getGeminiClient();
  if (!ai) {
    return { ...defaultData, isLive: false };
  }

  try {
    const prompt = `Provide a real-time market intelligence brief for global commodities, specifically focusing on ${sector || 'Energy, Metals, and Agriculture'}.
Summarize recent breaking catalysts, supply disruptions, and investor sentiment.
Respond in JSON format:
{
  "sentiment": string (e.g. "Bullish", "Moderately Bearish", etc.),
  "sentimentScore": number (0 to 100),
  "breakingCatalysts": [
    { "headline": string, "impact": "Bullish" | "Bearish" | "Neutral", "sector": string }
  ],
  "macroSummary": string
}`;

    const res = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = res.text?.trim() || '';
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const cleaned = jsonMatch ? jsonMatch[1] : text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
    const data = JSON.parse(cleaned);
    const result = { ...data, isLive: true };

    // Store in cache for 15 minutes
    intelCache.set(normSector, { data: result, expiresAt: Date.now() + 15 * 60 * 1000 });
    return result;
  } catch (err: any) {
    if (isQuotaExceeded(err)) {
      quotaCooldownUntil = Date.now() + 5 * 60 * 1000;
    }
    // Return rich default sector data seamlessly
    return { ...defaultData, isLive: false };
  }
}
