export type CurrencyCode =
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'JPY'
  | 'INR'
  | 'CNY'
  | 'CAD'
  | 'AUD'
  | 'CHF'
  | 'SGD';

export interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  name: string;
  rateAgainstUSD: number; // e.g. 1 USD = 0.92 EUR, 1 USD = 152.4 JPY, 1 USD = 83.95 INR
  change24h: number; // percentage change against USD in last 24h
  flag: string; // emoji flag
  decimalPlaces: number;
}

export const SUPPORTED_CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    rateAgainstUSD: 1.0,
    change24h: 0.0,
    flag: '🇺🇸',
    decimalPlaces: 2,
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    rateAgainstUSD: 0.924,
    change24h: -0.18,
    flag: '🇪🇺',
    decimalPlaces: 2,
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    rateAgainstUSD: 0.772,
    change24h: +0.22,
    flag: '🇬🇧',
    decimalPlaces: 2,
  },
  JPY: {
    code: 'JPY',
    symbol: '¥',
    name: 'Japanese Yen',
    rateAgainstUSD: 152.85,
    change24h: -0.45,
    flag: '🇯🇵',
    decimalPlaces: 0,
  },
  INR: {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    rateAgainstUSD: 84.12,
    change24h: +0.08,
    flag: '🇮🇳',
    decimalPlaces: 2,
  },
  CNY: {
    code: 'CNY',
    symbol: '¥',
    name: 'Chinese Yuan',
    rateAgainstUSD: 7.14,
    change24h: -0.12,
    flag: '🇨🇳',
    decimalPlaces: 2,
  },
  CAD: {
    code: 'CAD',
    symbol: 'C$',
    name: 'Canadian Dollar',
    rateAgainstUSD: 1.382,
    change24h: +0.15,
    flag: '🇨🇦',
    decimalPlaces: 2,
  },
  AUD: {
    code: 'AUD',
    symbol: 'A$',
    name: 'Australian Dollar',
    rateAgainstUSD: 1.516,
    change24h: +0.31,
    flag: '🇦🇺',
    decimalPlaces: 2,
  },
  CHF: {
    code: 'CHF',
    symbol: 'CHF ',
    name: 'Swiss Franc',
    rateAgainstUSD: 0.868,
    change24h: -0.05,
    flag: '🇨🇭',
    decimalPlaces: 2,
  },
  SGD: {
    code: 'SGD',
    symbol: 'S$',
    name: 'Singapore Dollar',
    rateAgainstUSD: 1.321,
    change24h: +0.04,
    flag: '🇸🇬',
    decimalPlaces: 2,
  },
};

/**
 * Converts a USD price to the target currency.
 */
export function convertUSD(
  usdPrice: number,
  currencyCode: CurrencyCode,
  customRates?: Record<CurrencyCode, number>
): number {
  const rate = customRates?.[currencyCode] ?? SUPPORTED_CURRENCIES[currencyCode]?.rateAgainstUSD ?? 1.0;
  return usdPrice * rate;
}

/**
 * Formats a converted amount with appropriate symbol and decimals.
 */
export function formatCurrencyAmount(
  amount: number,
  currencyCode: CurrencyCode,
  options?: { showSymbol?: boolean; showCode?: boolean }
): string {
  const info = SUPPORTED_CURRENCIES[currencyCode] || SUPPORTED_CURRENCIES.USD;
  const decimals = info.decimalPlaces;
  const formatted = amount.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const prefix = options?.showSymbol !== false ? info.symbol : '';
  const suffix = options?.showCode ? ` ${info.code}` : '';

  return `${prefix}${formatted}${suffix}`;
}

/**
 * Converts a commodity unit label (e.g. 'USD/bbl' -> 'EUR/bbl' or 'USD/oz' -> 'INR/oz')
 */
export function convertUnitLabel(unit: string, currencyCode: CurrencyCode): string {
  if (unit.startsWith('USD/')) {
    return unit.replace('USD/', `${currencyCode}/`);
  }
  return `${unit} (${currencyCode})`;
}
