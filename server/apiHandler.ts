import { IncomingMessage, ServerResponse } from 'http';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
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

    // Download full repository as a ZIP file
    if (url === '/api/download-zip' && req.method === 'GET') {
      const zipPath = '/tmp/commodicast.zip';
      try {
        execSync(
          'git init -b main 2>/dev/null || true && git config user.name "AI Studio" 2>/dev/null || true && git config user.email "aistudio@google.com" 2>/dev/null || true && git add -A && git commit -m "Export snapshot" 2>/dev/null || true && git archive --format=zip HEAD -o /tmp/commodicast.zip',
          { stdio: 'pipe' }
        );

        if (fs.existsSync(zipPath)) {
          const stat = fs.statSync(zipPath);
          res.writeHead(200, {
            'Content-Type': 'application/zip',
            'Content-Length': stat.size,
            'Content-Disposition': 'attachment; filename="commodicast.zip"',
            'Access-Control-Allow-Origin': '*',
          });
          const stream = fs.createReadStream(zipPath);
          stream.pipe(res);
          return true;
        } else {
          sendJson(res, 500, { error: 'Failed to create zip archive' });
          return true;
        }
      } catch (err: any) {
        console.error('ZIP generation error:', err);
        sendJson(res, 500, { error: err.message || 'ZIP creation failed' });
        return true;
      }
    }

    // Direct GitHub Synchronization
    if (url === '/api/github/sync' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const { repoUrl, token, branch = 'main', commitMessage = 'Update CommodiCast from AI Studio' } = body;

      if (!repoUrl || !token) {
        sendJson(res, 400, { error: 'Both Repository URL and GitHub Personal Access Token are required.' });
        return true;
      }

      // Sanitize repo url
      let cleanUrl = repoUrl.trim();
      cleanUrl = cleanUrl.replace(/^https?:\/\//, '').replace(/^git@github\.com:/, 'github.com/');
      if (cleanUrl.endsWith('.git')) {
        cleanUrl = cleanUrl.slice(0, -4);
      }

      const authenticatedRemote = `https://${token.trim()}@${cleanUrl}.git`;

      try {
        // Ensure git repo is initialized and committed
        execSync(
          `git init -b ${branch} 2>/dev/null || true && ` +
          `git config user.name "Nirav Sarvaiya" && ` +
          `git config user.email "sarvaiyanirav@gmail.com" && ` +
          `git add -A && ` +
          `git commit -m "${commitMessage.replace(/"/g, '\\"')}" 2>/dev/null || true && ` +
          `git remote remove origin 2>/dev/null || true && ` +
          `git remote add origin "${authenticatedRemote}" && ` +
          `git branch -M ${branch} && ` +
          `git push -u origin ${branch} --force`,
          { stdio: 'pipe' }
        );

        // Remove token from remote for security
        try {
          execSync(`git remote set-url origin "https://${cleanUrl}.git"`, { stdio: 'pipe' });
        } catch (_) {}

        sendJson(res, 200, {
          success: true,
          message: `Successfully synchronized and pushed to GitHub repository (${branch} branch)!`,
          repoUrl: `https://${cleanUrl}`,
          branch,
        });
        return true;
      } catch (gitErr: any) {
        const errorMsg = gitErr.stderr ? gitErr.stderr.toString() : gitErr.message;
        console.error('Git push error:', errorMsg);
        
        let friendly = errorMsg;
        if (errorMsg.includes('Authentication failed') || errorMsg.includes('Invalid username or password')) {
          friendly = 'GitHub authentication failed. Please verify your Personal Access Token has the "repo" scope.';
        } else if (errorMsg.includes('Repository not found')) {
          friendly = 'GitHub repository not found. Please make sure you have created the repository on GitHub first.';
        }

        sendJson(res, 500, { error: friendly });
        return true;
      }
    }

    sendJson(res, 404, { error: 'API route not found' });
    return true;
  } catch (error: any) {
    console.error('API Error:', error);
    sendJson(res, 500, { error: error.message || 'Internal server error' });
    return true;
  }
}
