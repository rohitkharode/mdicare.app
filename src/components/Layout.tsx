import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { 
  LayoutDashboard, 
  Package, 
  Clock, 
  AlertTriangle, 
  BarChart3, 
  Users, 
  Settings,
  Bell,
  Search,
  ShoppingCart,
  CheckCircle2,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { getNotifications, markNotificationRead, markAllNotificationsRead, Notification, getUserProfile, UserProfile } from '../lib/db';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Billing', path: '/billing', icon: ShoppingCart },
  { name: 'Inventory', path: '/inventory', icon: Package },
  { name: 'Expiry', path: '/expiry', icon: Clock },
  { name: 'Low Stock', path: '/low-stock', icon: AlertTriangle },
  { name: 'Reports', path: '/reports', icon: BarChart3 },
  { name: 'Suppliers', path: '/suppliers', icon: Users },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadNotifications();
    loadProfile();
    const interval = setInterval(() => {
      loadNotifications();
      loadProfile();
    }, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    const notifs = await getNotifications();
    setNotifications(notifs);
  };

  const loadProfile = async () => {
    const data = await getUserProfile();
    setProfile(data);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNotificationClick = async (id: number) => {
    await markNotificationRead(id);
    loadNotifications();
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    loadNotifications();
    setShowNotifications(false);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="h-screen bg-[#0f172a] text-slate-200 flex font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-[#0f172a] border-r border-slate-800 flex flex-col z-30">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center text-amber-800 font-bold text-xl">
            Rx
          </div>
          <div>
            <h1 className="font-bold text-lg text-white leading-tight">Chemist Assistant</h1>
            <p className="text-xs text-slate-400">Management System</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-blue-500 text-white" 
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                )
              }
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={handleLogout}
            className="w-full py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Topbar */}
        <header className="h-20 border-b border-slate-800 flex items-center justify-between px-8 bg-[#0f172a] sticky top-0 z-20">
          <div className="flex-1 max-w-2xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search medicines, bills, patients..." 
                className="w-full bg-[#1e293b] border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-slate-200 placeholder:text-slate-500"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-6 ml-8">
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative text-slate-400 hover:text-white transition-colors"
              >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-[#0f172a] text-[9px] font-bold text-white flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-4 w-80 bg-[#1e293b] border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-[#0f172a]">
                    <h3 className="font-medium text-white">Notifications</h3>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} className="text-xs text-blue-500 hover:text-blue-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-[400px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-sm">
                        No notifications yet
                      </div>
                    ) : (
                      notifications.map(notif => (
                        <div 
                          key={notif.id} 
                          onClick={() => notif.id && handleNotificationClick(notif.id)}
                          className={cn(
                            "p-4 border-b border-slate-800/50 cursor-pointer transition-colors hover:bg-slate-800/50",
                            !notif.read ? "bg-blue-500/5" : ""
                          )}
                        >
                          <div className="flex gap-3">
                            <div className="mt-1">
                              {notif.type === 'bill' && <ShoppingCart className="w-4 h-4 text-emerald-500" />}
                              {notif.type === 'low_stock' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                              {notif.type === 'expiry' && <Clock className="w-4 h-4 text-red-500" />}
                            </div>
                            <div>
                              <p className={cn("text-sm font-medium", !notif.read ? "text-white" : "text-slate-300")}>
                                {notif.title}
                              </p>
                              <p className="text-xs text-slate-400 mt-1">{notif.message}</p>
                              <p className="text-[10px] text-slate-500 mt-2">
                                {formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true })}
                              </p>
                            </div>
                            {!notif.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full ml-auto mt-2 flex-shrink-0"></div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div 
              onClick={() => navigate('/profile')}
              className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium cursor-pointer hover:bg-blue-600 transition-colors"
              title="Profile Settings"
            >
              {profile?.full_name ? profile.full_name.substring(0, 2).toUpperCase() : (user?.name ? user.name.substring(0, 2).toUpperCase() : 'PH')}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-hidden bg-[#0f172a]">
          <div className="h-full overflow-auto p-8">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
