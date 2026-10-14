import { IncomingMessage, ServerResponse } from 'http';
import { COMMODITIES_CATALOG } from '../src/lib/commoditiesData';
import { runQuantitativeForecast } from '../src/lib/econometricModel';
import { generateAIPrediction, fetchLiveMarketIntelligence } from './geminiService';
import { ForecastHorizon, ScenarioShock } from '../src/types/commodity';

function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, data: any) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(data));
}

export async function handleApiRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = req.url || '';
  if (!url.startsWith('/api/')) {
    return false;
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return true;
  }

  try {
    if (url === '/api/status' && req.method === 'GET') {
      sendJson(res, 200, {
        status: 'online',
        hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
        model: 'gemini-3.8-flash',
      });
      return true;
    }

    if (url === '/api/predict' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const { commodityId, horizon = '30D', shocks } = body as {
        commodityId: string;
        horizon: ForecastHorizon;
        shocks?: ScenarioShock;
      };

      const commodity = COMMODITIES_CATALOG.find(c => c.id === commodityId);
      if (!commodity) {
        sendJson(res, 404, { error: 'Commodity not found' });
        return true;
      }

      // Try AI prediction with Google search grounding
      let result = await generateAIPrediction(commodity, horizon, shocks);

      // If AI prediction failed or key not configured, fall back to quantitative econometric model
      if (!result) {
        result = runQuantitativeForecast(commodity, horizon, shocks);
      }

      sendJson(res, 200, result);
      return true;
    }

    if (url === '/api/live-intel' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const sector = body.sector || 'All';
      const intel = await fetchLiveMarketIntelligence(sector);
      sendJson(res, 200, intel);
      return true;
    }

    if (url === '/api/stress-test' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const { commodityId, shocks } = body;
      const commodity = COMMODITIES_CATALOG.find(c => c.id === commodityId);
      if (!commodity) {
        sendJson(res, 404, { error: 'Commodity not found' });
        return true;
      }

      const result = runQuantitativeForecast(commodity, '30D', shocks);
      sendJson(res, 200, result);
      return true;
    }

    sendJson(res, 404, { error: 'API route not found' });
    return true;
  } catch (error: any) {
    console.error('API Error:', error);
    sendJson(res, 500, { error: error.message || 'Internal server error' });
    return true;
  }
}
