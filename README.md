# CommodiCast — Real-Time Commodity Price Predictor & Market Analytics

An institutional-grade commodity price prediction terminal that pairs real-time market data analysis, econometric forecasting (P10/P50/P90 Monte Carlo cones), and Google Search–grounded AI intelligence with Google Drive workspace synchronization.

![CommodiCast Terminal](https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80)

---

## Key Features

- **Multi-Commodity Market Ticker & Live Feed**:
  - **Energy**: WTI Crude Oil, Brent Crude, Natural Gas
  - **Precious Metals**: Gold, Silver
  - **Industrial Metals**: Copper Grade A, Lithium Carbonate
  - **Agriculture & Softs**: Chicago Wheat, Corn, Arabica Coffee, Cocoa
  - Live tick volatility, RSI-14 indicators, 24h ranges, and exchange specifications.

- **Interactive Financial Charting**:
  - Candlestick & Area Line chart views with volume bars.
  - Multi-timeframe selection (1D, 1W, 1M, 3M, 1Y).
  * **Forecast Cone Projection**: Overlays future multi-horizon price paths with shaded P10 (bearish) to P90 (bullish) 90% confidence bands.
  - Technical overlays (EMA 20, SMA 50).

- **Predictive Analytics & Intelligence**:
  - Forecast horizons: 24 Hours, 7 Days, 30 Days, 90 Days.
  - Directional signals (`STRONG BUY`, `BUY`, `HOLD`, `SELL`, `STRONG_SELL`) with Conviction Scores (0–100%).
  - Dynamic Stop-Loss and Take-Profit risk targets.
  - Fundamental driver breakdown (Supply, Demand, Geopolitics, Macro, Climate).
  - Grounded real-time news catalysts via Google Search.

- **Macroeconomic "What-If" Stress Tester**:
  - Interactive sliders to simulate macro shocks (DXY index, geopolitical tension, supply outages, GDP growth, weather events).
  - One-click crisis presets (*Strait of Hormuz Blockade*, *Aggressive Fed Cuts*, *China Stimulus*, *Global Drought*).

- **Google Drive Workspace Integration**:
  - Official Google Sign-In with client-side token caching.
  - One-click export of research dossiers in Markdown (`.md`), HTML (`.html`), or Model Dataset (`.json`).
  - Google Drive Dossier Manager to browse, preview, and manage cloud files.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons
- **AI & Analytics**: `@google/genai` (Gemini 3.8 Flash with Google Search Grounding), Quantitative Econometric Engine
- **Cloud & Workspace**: Firebase Auth, Google Drive REST API v3
- **Server**: Express / Vite middleware proxy

---

## Quick Start (Local Development)

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Create a `.env` file in the root directory:
```bash
cp .env.example .env
```
Fill in your `GEMINI_API_KEY`:
```env
GEMINI_API_KEY="your-gemini-api-key"
```

### 4. Start the development server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

### 5. Build for production
```bash
npm run build
npm start
```

---

## License

Apache-2.0
