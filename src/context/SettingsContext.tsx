import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSettings, saveSettings as dbUpdateSettings } from '../lib/db';

interface Settings {
  id?: number;
  global_low_stock_threshold: number;
  expiry_alert_lead_time: number;
  gst_default: number;
  currency: string;
  invoice_prefix: string;
  ui_mode: string;
  accent_color: string;
}

interface SettingsContextType {
  settings: Settings | null;
  currencySymbol: string;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const extractCurrencySymbol = (currencyString: string) => {
  const match = currencyString.match(/\((.*?)\)/);
  if (match && match[1]) {
    return match[1];
  }
  if (currencyString.includes('USD')) return '$';
  if (currencyString.includes('INR')) return '₹';
  if (currencyString.includes('EUR')) return '€';
  if (currencyString.includes('GBP')) return '£';
  return '$';
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [currencySymbol, setCurrencySymbol] = useState('$');

  const loadSettings = async () => {
    try {
      const data = await getSettings();
      setSettings(data);
      if (data && data.currency) {
        setCurrencySymbol(extractCurrencySymbol(data.currency));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, currencySymbol, refreshSettings: loadSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
