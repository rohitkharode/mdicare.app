import React, { useState, useEffect } from 'react';
import { Store, Calculator, Package, Bell, Palette, Database, Download, RotateCcw, AlertTriangle } from 'lucide-react';
import { getSettings, saveSettings, Settings as SettingsType, exportData, importData, getUserProfile, saveUserProfile, UserProfile } from '../lib/db';
import { useSettings } from '../context/SettingsContext';

export default function Settings() {
  const { refreshSettings } = useSettings();
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const settingsData = await getSettings();
    setSettings(settingsData);
    const profileData = await getUserProfile();
    setProfile(profileData);
  };

  const handleSave = async () => {
    if (settings && profile) {
      await saveSettings(settings);
      await saveUserProfile(profile);
      await refreshSettings();
      alert('Settings saved successfully!');
    }
  };

  const handleExport = async () => {
    const data = await exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mdicare_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          await importData(event.target?.result as string);
          alert('Data imported successfully! Reloading...');
          window.location.reload();
        } catch (err) {
          alert('Error importing data. Invalid format.');
        }
      };
      reader.readAsText(file);
    }
  };

  if (!settings || !profile) return null;

  return (
    <div className="max-w-4xl space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <button onClick={handleSave} className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors">
          Save Changes
        </button>
      </div>

      {/* Shop Profile */}
      <section>
        <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <Store className="w-5 h-5 text-blue-500" /> Shop Profile
        </h2>
        <div className="bg-[#1e293b] border border-slate-800 rounded-xl p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Shop Name</label>
              <input type="text" value={profile.shop_name} onChange={e => setProfile({...profile, shop_name: e.target.value})} className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">License Number</label>
              <input type="text" value={profile.license_number} onChange={e => setProfile({...profile, license_number: e.target.value})} className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">Contact Number</label>
            <input type="text" value={profile.phone_number} onChange={e => setProfile({...profile, phone_number: e.target.value})} className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">Full Address</label>
            <textarea value={profile.address} onChange={e => setProfile({...profile, address: e.target.value})} className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 h-24 resize-none"></textarea>
          </div>
        </div>
      </section>

      {/* Billing & Tax */}
      <section>
        <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-blue-500" /> Billing & Tax Configuration
        </h2>
        <div className="bg-[#1e293b] border border-slate-800 rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between pb-6 border-b border-slate-800">
            <div>
              <p className="text-white font-medium">Enable GST Billing</p>
              <p className="text-sm text-slate-400">Apply goods and services tax to all invoices</p>
            </div>
            <div className="w-12 h-6 bg-blue-500 rounded-full relative cursor-pointer">
              <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Default GST (%)</label>
              <input type="number" value={settings.gst_default} onChange={e => setSettings({...settings, gst_default: parseInt(e.target.value) || 0})} className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Currency</label>
              <select value={settings.currency} onChange={e => setSettings({...settings, currency: e.target.value})} className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 appearance-none">
                <option>USD ($)</option>
                <option>EUR (€)</option>
                <option>INR (₹)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Invoice Prefix</label>
              <input type="text" value={settings.invoice_prefix} onChange={e => setSettings({...settings, invoice_prefix: e.target.value})} className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" />
            </div>
          </div>
        </div>
      </section>

      {/* Inventory Management */}
      <section>
        <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-500" /> Inventory Management
        </h2>
        <div className="bg-[#1e293b] border border-slate-800 rounded-xl p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Global Low-Stock Threshold</label>
              <input type="number" value={settings.global_low_stock_threshold} onChange={e => setSettings({...settings, global_low_stock_threshold: parseInt(e.target.value) || 0})} className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" />
              <p className="text-xs text-slate-500 mt-2">Alert me when any stock falls below this quantity</p>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Expiry Alert Lead Time</label>
              <select value={settings.expiry_alert_lead_time} onChange={e => setSettings({...settings, expiry_alert_lead_time: parseInt(e.target.value) || 0})} className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 appearance-none">
                <option value="30">30 Days before</option>
                <option value="60">60 Days before</option>
                <option value="90">90 Days before</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-[#0f172a] border border-slate-700 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-white font-medium text-sm">Auto-remove Expired Stock</p>
                <p className="text-xs text-slate-400">Automatically delist items from sale once expiry date passes</p>
              </div>
            </div>
            <div className="w-10 h-5 bg-slate-700 rounded-full relative cursor-pointer">
              <div className="absolute left-1 top-1 w-3 h-3 bg-slate-400 rounded-full"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Data & Backups */}
      <section>
        <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-500" /> Data & Backups
        </h2>
        <div className="bg-[#1e293b] border border-slate-800 rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between pb-6 border-b border-slate-800">
            <div>
              <p className="text-white font-medium">Automated Backup Frequency</p>
              <p className="text-sm text-slate-400">Your data is securely backed up locally</p>
            </div>
            <select className="bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 appearance-none">
              <option>Daily</option>
              <option>Weekly</option>
              <option>Manual Only</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={handleExport} className="w-full py-3 bg-[#0f172a] border border-slate-700 hover:bg-slate-800 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors">
              <Download className="w-4 h-4" /> Download All Data (JSON)
            </button>
            <div className="relative">
              <input type="file" accept=".json" onChange={handleImport} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <button className="w-full py-3 bg-[#0f172a] border border-red-500/30 hover:bg-red-500/10 text-red-500 font-medium rounded-lg flex items-center justify-center gap-2 transition-colors">
                <RotateCcw className="w-4 h-4" /> Import Data / Restore
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="flex justify-end gap-4 pt-4 border-t border-slate-800">
        <button className="px-6 py-2 bg-transparent border border-slate-700 hover:bg-slate-800 text-white font-medium rounded-lg transition-colors">
          Discard Changes
        </button>
        <button onClick={handleSave} className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors">
          Save Changes
        </button>
      </div>
    </div>
  );
}
