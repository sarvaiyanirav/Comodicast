import React, { useState } from 'react';
import { Commodity, PredictionResult } from '../types/commodity';
import { saveForecastReportToDrive } from '../lib/drive';
import { HardDrive, CheckCircle2, ExternalLink, X, FileText, Code2, FileCode, AlertCircle, Loader2 } from 'lucide-react';

interface DriveExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  commodity: Commodity;
  prediction: PredictionResult;
  accessToken: string | null;
  onLogin: () => void;
  onExportSuccess: () => void;
}

type ExportFormat = 'markdown' | 'html' | 'json';

export const DriveExportModal: React.FC<DriveExportModalProps> = ({
  isOpen,
  onClose,
  commodity,
  prediction,
  accessToken,
  onLogin,
  onExportSuccess,
}) => {
  const [format, setFormat] = useState<ExportFormat>('markdown');
  const [reportTitle, setReportTitle] = useState(
    `CommodiCast_${commodity.symbol}_${prediction.horizon}_Forecast_${new Date().toISOString().slice(0, 10)}`
  );
  const [analystNotes, setAnalystNotes] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [successLink, setSuccessLink] = useState<string | null>(null);

  if (!isOpen) return null;

  const generateReportContent = () => {
    const timestamp = new Date().toLocaleString();
    if (format === 'json') {
      return JSON.stringify(
        {
          application: 'CommodiCast Pro Terminal',
          exportedAt: timestamp,
          commodity: {
            id: commodity.id,
            name: commodity.name,
            symbol: commodity.symbol,
            sector: commodity.sector,
            unit: commodity.unit,
            spotPrice: commodity.currentPrice,
            exchange: commodity.exchange,
            rsi14: commodity.rsi14,
            volatility30d: commodity.volatility30d,
          },
          prediction,
          analystNotes,
        },
        null,
        2
      );
    }

    if (format === 'html') {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${commodity.name} Prediction Report - CommodiCast</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0B0E14; color: #E2E8F0; padding: 40px; max-width: 800px; margin: auto; }
    h1 { color: #38BDF8; border-bottom: 2px solid #1E293B; padding-bottom: 12px; }
    .card { background: #111622; border: 1px solid #1E293B; border-radius: 8px; padding: 20px; margin: 16px 0; }
    .metric { font-size: 24px; font-weight: bold; color: #F8FAFC; }
    .bull { color: #34D399; }
    .bear { color: #F87171; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid #1E293B; }
  </style>
</head>
<body>
  <h1>CommodiCast Research Dossier: ${commodity.name} (${commodity.symbol})</h1>
  <p>Exported: ${timestamp} | Horizon: ${prediction.horizon} | Recommendation: <strong>${prediction.signal}</strong></p>
  <div class="card">
    <div class="metric">Target Price: $${prediction.predictedPrice} ${commodity.unit} (${prediction.expectedChangePercent >= 0 ? '+' : ''}${prediction.expectedChangePercent}%)</div>
    <p>Spot Price: $${commodity.currentPrice} | Conviction Score: ${prediction.convictionScore}%</p>
    <p>Probabilistic 90% C.I.: P10 $${prediction.confidenceInterval.lowerP10} — P50 $${prediction.confidenceInterval.medianP50} — P90 $${prediction.confidenceInterval.upperP90}</p>
    <p>Recommended Stop-Loss: $${prediction.recommendedStopLoss} | Take-Profit: $${prediction.recommendedTakeProfit}</p>
  </div>
  <div class="card">
    <h3>Executive Thesis</h3>
    <p>${prediction.aiAnalysisSummary}</p>
    ${analystNotes ? `<h4>Desk Notes</h4><p>${analystNotes}</p>` : ''}
  </div>
  <div class="card">
    <h3>Key Market Drivers</h3>
    <table>
      <tr><th>Driver</th><th>Impact</th><th>Weight</th></tr>
      ${prediction.drivers.map(d => `<tr><td>${d.title}</td><td>${d.impact.toUpperCase()}</td><td>${d.weight}/5</td></tr>`).join('')}
    </table>
  </div>
</body>
</html>`;
    }

    // Default: Markdown (.md)
    return `# CommodiCast Executive Intelligence Dossier
**Commodity:** ${commodity.name} (${commodity.symbol})  
**Exchange:** ${commodity.exchange} | **Sector:** ${commodity.sector}  
**Forecast Horizon:** ${prediction.horizon}  
**Generated At:** ${timestamp}  

---

## 1. Executive Summary & Action Signal
* **Recommendation:** **${prediction.signal}**
* **Conviction Score:** ${prediction.convictionScore}%
* **Current Spot Price:** $${commodity.currentPrice} ${commodity.unit}
* **Projected Target Price:** **$${prediction.predictedPrice}** (${prediction.expectedChangePercent >= 0 ? '+' : ''}${prediction.expectedChangePercent}%)
* **Recommended Stop-Loss:** $${prediction.recommendedStopLoss}
* **Recommended Take-Profit:** $${prediction.recommendedTakeProfit}

### Probabilistic Confidence Cone (90% C.I.)
* **P10 (Bearish Case):** $${prediction.confidenceInterval.lowerP10}
* **P50 (Median Baseline):** $${prediction.confidenceInterval.medianP50}
* **P90 (Bullish Case):** $${prediction.confidenceInterval.upperP90}

---

## 2. Core Market Thesis
${prediction.aiAnalysisSummary}

${analystNotes ? `### Custom Desk Notes\n${analystNotes}\n` : ''}

---

## 3. Catalyst & Driver Breakdown
${prediction.drivers.map(d => `* **[${d.impact.toUpperCase()}]** ${d.title} (Weight: ${d.weight}/5)  
  ${d.explanation}`).join('\n\n')}

---

## 4. Macroeconomic Sensitivities
* **US Dollar (DXY) Sensitivity:** ${prediction.macroSensitivities.dxyImpact}
* **Geopolitical Risk Premium:** ${prediction.macroSensitivities.geopoliticalRiskScore} / 10
* **Supply Chain Stress Level:** ${prediction.macroSensitivities.supplyChainRisk}
* **Inventory Outlook:** ${prediction.macroSensitivities.inventoryOutlook}

---
*Generated by CommodiCast AI Quantitative Terminal - Synced with Google Drive*
`;
  };

  const handleExport = async () => {
    if (!accessToken) {
      onLogin();
      return;
    }

    setIsExporting(true);
    setExportError(null);
    setSuccessLink(null);

    try {
      const mimeMap: Record<ExportFormat, string> = {
        markdown: 'text/markdown',
        html: 'text/html',
        json: 'application/json',
      };
      const extMap: Record<ExportFormat, string> = {
        markdown: '.md',
        html: '.html',
        json: '.json',
      };

      const finalFileName = reportTitle.endsWith(extMap[format])
        ? reportTitle
        : `${reportTitle}${extMap[format]}`;

      const content = generateReportContent();
      const result = await saveForecastReportToDrive(accessToken, {
        fileName: finalFileName,
        content,
        mimeType: mimeMap[format],
        description: `CommodiCast real-time prediction dossier for ${commodity.name} (${prediction.horizon})`,
      });

      setSuccessLink(result.webViewLink || 'https://drive.google.com');
      onExportSuccess();
    } catch (err: any) {
      console.error('Google Drive export error:', err);
      setExportError(err.message || 'Failed to save to Google Drive');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-[#111622] border border-blue-500/40 rounded-2xl shadow-2xl p-6 text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Export Forecast Dossier to Google Drive
              </h3>
              <p className="text-xs text-slate-400">
                Direct cloud synchronization for {commodity.name} ({prediction.horizon})
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

        {/* Success State Banner */}
        {successLink ? (
          <div className="my-6 p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/50 text-center space-y-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h4 className="text-sm font-bold text-white">Successfully Saved to Google Drive!</h4>
            <p className="text-xs text-slate-300">
              Your research dossier is securely stored in your Google Drive and ready for collaboration.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <a
                href={successLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors"
              >
                <span>Open in Google Drive</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {/* Format Selection */}
            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1.5">
                Select Export Format:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setFormat('markdown')}
                  className={`flex items-center justify-center gap-1.5 p-2.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                    format === 'markdown'
                      ? 'bg-blue-600/20 text-blue-300 border-blue-500/60 shadow-xs'
                      : 'bg-[#0c1017] text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Markdown (.md)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('html')}
                  className={`flex items-center justify-center gap-1.5 p-2.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                    format === 'html'
                      ? 'bg-blue-600/20 text-blue-300 border-blue-500/60 shadow-xs'
                      : 'bg-[#0c1017] text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Report (.html)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('json')}
                  className={`flex items-center justify-center gap-1.5 p-2.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                    format === 'json'
                      ? 'bg-blue-600/20 text-blue-300 border-blue-500/60 shadow-xs'
                      : 'bg-[#0c1017] text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Dataset (.json)</span>
                </button>
              </div>
            </div>

            {/* File Name */}
            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1.5">
                Document File Name:
              </label>
              <input
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                className="w-full bg-[#0c1017] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-hidden focus:border-blue-500"
              />
            </div>

            {/* Optional Desk Notes */}
            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1.5">
                Add Analyst Notes or Trading Directive (Optional):
              </label>
              <textarea
                value={analystNotes}
                onChange={(e) => setAnalystNotes(e.target.value)}
                placeholder="e.g. Initiating tactical hedge on prompt delivery spread; monitor weekly API inventory prints..."
                rows={3}
                className="w-full bg-[#0c1017] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            {/* Error banner */}
            {exportError && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{exportError}</span>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>

              {!accessToken ? (
                <button
                  type="button"
                  onClick={onLogin}
                  className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 rounded-lg text-xs font-semibold shadow-md transition-all cursor-pointer"
                >
                  <HardDrive className="w-4 h-4 text-blue-600" />
                  <span>Connect Google Drive to Save</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={isExporting}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-blue-950/40 cursor-pointer disabled:opacity-50"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving to Drive...</span>
                    </>
                  ) : (
                    <>
                      <HardDrive className="w-4 h-4" />
                      <span>Save Dossier to Drive</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
