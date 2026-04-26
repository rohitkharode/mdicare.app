import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, FileBadge, Bell, Moon, Sun, Smartphone } from 'lucide-react';
import { getUserProfile, saveUserProfile, UserProfile as UserProfileType } from '../lib/db';

export default function Profile() {
  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const data = await getUserProfile();
    setProfile(data);
  };

  const handleSave = async () => {
    if (profile) {
      await saveUserProfile(profile);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  if (!profile) return <div className="text-white">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">User Profile</h1>
          <p className="text-slate-400">Manage your personal information and preferences.</p>
        </div>
        <button 
          onClick={handleSave}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Personal Info */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-[#1e293b] rounded-xl border border-slate-800 p-6">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-500" />
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    value={profile.full_name}
                    onChange={e => setProfile({...profile, full_name: e.target.value})}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-blue-500" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    value={profile.phone_number}
                    onChange={e => setProfile({...profile, phone_number: e.target.value})}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-blue-500" 
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#1e293b] rounded-xl border border-slate-800 p-6">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-500" />
              Business Details
            </h3>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Shop Name</label>
                  <input 
                    type="text" 
                    value={profile.shop_name}
                    onChange={e => setProfile({...profile, shop_name: e.target.value})}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">License Number</label>
                  <div className="relative">
                    <FileBadge className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input 
                      type="text" 
                      value={profile.license_number}
                      onChange={e => setProfile({...profile, license_number: e.target.value})}
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-blue-500" 
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Shop Address</label>
                <textarea 
                  value={profile.address}
                  onChange={e => setProfile({...profile, address: e.target.value})}
                  className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 h-24 resize-none" 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="space-y-6">
          <div className="bg-[#1e293b] rounded-xl border border-slate-800 p-6">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-500" />
              Notifications
            </h3>
            <div className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#0f172a] rounded-lg text-slate-400 group-hover:text-blue-500 transition-colors">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Email Alerts</p>
                    <p className="text-xs text-slate-500">Daily summaries</p>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={profile.email_notifications}
                  onChange={e => setProfile({...profile, email_notifications: e.target.checked})}
                  className="w-4 h-4 rounded border-slate-700 bg-[#0f172a] text-blue-500 focus:ring-blue-500 focus:ring-offset-[#1e293b]" 
                />
              </label>
              
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#0f172a] rounded-lg text-slate-400 group-hover:text-blue-500 transition-colors">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">SMS Alerts</p>
                    <p className="text-xs text-slate-500">Critical low stock</p>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={profile.sms_notifications}
                  onChange={e => setProfile({...profile, sms_notifications: e.target.checked})}
                  className="w-4 h-4 rounded border-slate-700 bg-[#0f172a] text-blue-500 focus:ring-blue-500 focus:ring-offset-[#1e293b]" 
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#0f172a] rounded-lg text-slate-400 group-hover:text-blue-500 transition-colors">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Push Notifications</p>
                    <p className="text-xs text-slate-500">In-app alerts</p>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={profile.push_alerts}
                  onChange={e => setProfile({...profile, push_alerts: e.target.checked})}
                  className="w-4 h-4 rounded border-slate-700 bg-[#0f172a] text-blue-500 focus:ring-blue-500 focus:ring-offset-[#1e293b]" 
                />
              </label>
            </div>
          </div>

          <div className="bg-[#1e293b] rounded-xl border border-slate-800 p-6">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <Sun className="w-5 h-5 text-blue-500" />
              Appearance
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setProfile({...profile, ui_mode: 'light'})}
                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-colors ${profile.ui_mode === 'light' ? 'border-blue-500 bg-blue-500/10 text-blue-500' : 'border-slate-700 bg-[#0f172a] text-slate-400 hover:border-slate-600'}`}
              >
                <Sun className="w-6 h-6" />
                <span className="text-sm font-medium">Light</span>
              </button>
              <button 
                onClick={() => setProfile({...profile, ui_mode: 'dark'})}
                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-colors ${profile.ui_mode === 'dark' ? 'border-blue-500 bg-blue-500/10 text-blue-500' : 'border-slate-700 bg-[#0f172a] text-slate-400 hover:border-slate-600'}`}
              >
                <Moon className="w-6 h-6" />
                <span className="text-sm font-medium">Dark</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-6 right-6 bg-emerald-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in">
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
            ✓
          </div>
          <p className="font-medium">Profile updated successfully!</p>
        </div>
      )}
    </div>
  );
}
