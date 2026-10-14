import { GoogleGenAI } from '@google/genai';
import { Commodity, ForecastHorizon, PredictionResult, ScenarioShock } from '../src/types/commodity';

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
      // Find outermost curly braces
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

    return {
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
  } catch (err) {
    console.warn('Gemini forecast generation failed or parsed invalid JSON, falling back:', err);
    return null;
  }
}

export async function fetchLiveMarketIntelligence(sector: string): Promise<any> {
  const ai = getGeminiClient();
  if (!ai) {
    return {
      sentiment: 'Cautiously Bullish',
      sentimentScore: 64,
      breakingCatalysts: [
        { headline: 'OPEC+ output limits remain steady through current quarter', impact: 'Bullish', sector: 'Energy' },
        { headline: 'Central bank physical gold accumulation reaches monthly high', impact: 'Bullish', sector: 'Precious Metals' },
        { headline: 'Copper warehouse stockpiles contract amidst global grid expansion', impact: 'Bullish', sector: 'Industrial Metals' },
      ],
      macroSummary: 'Commodity markets are balancing firm manufacturing demand in energy transition materials against currency fluctuations.',
      isLive: false,
    };
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
    return { ...data, isLive: true };
  } catch (err) {
    console.warn('Failed to fetch live intel from Gemini:', err);
    return {
      sentiment: 'Neutral to Bullish',
      sentimentScore: 59,
      breakingCatalysts: [
        { headline: 'Supply chains adapting to geopolitical sea chokepoints', impact: 'Bullish', sector: 'Energy' },
        { headline: 'Industrial demand resilient for electrification metals', impact: 'Bullish', sector: 'Metals' },
      ],
      macroSummary: 'Market participants are watching US economic prints and central bank interest rate trajectories.',
      isLive: false,
    };
  }
}
