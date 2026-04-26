import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, subDays, startOfDay } from 'date-fns';
import { ShoppingCart, PackagePlus, DollarSign, FileText, AlertTriangle, CalendarX, TrendingUp, CreditCard, PackageSearch, Layers } from 'lucide-react';
import { getInventory, getBills, getLogs, checkExpiryNotifications } from '../lib/db';
import { cn } from '../lib/utils';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useSettings } from '../context/SettingsContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const { settings, currencySymbol } = useSettings();
  const [stats, setStats] = useState({
    salesToday: 0,
    activeOrders: 0,
    pendingPayments: 0,
    totalMedicines: 0,
    categoryCount: 0,
    expiringSoon: 0,
    weeklyTotal: 0
  });
  const [recentBills, setRecentBills] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [bestSellers, setBestSellers] = useState<any[]>([]);

  useEffect(() => {
    if (!settings) return;
    const init = async () => {
      await checkExpiryNotifications();
      await loadDashboardData();
    };
    init();
  }, [settings]);

  const loadDashboardData = async () => {
    if (!settings) return;
    const inventory = await getInventory();
    const bills = await getBills();
    const logs = await getLogs();

    const todayStr = new Date().toISOString().split('T')[0];
    const todayBills = bills.filter(b => b.bill_date.startsWith(todayStr));
    
    const salesToday = todayBills.reduce((sum, b) => sum + b.total_amount, 0);
    
    const now = new Date();
    const expiryThreshold = new Date();
    expiryThreshold.setDate(now.getDate() + settings.expiry_alert_lead_time);
    
    const expiringCount = inventory.filter(i => {
      const expDate = new Date(i.expiry_date);
      return expDate <= expiryThreshold && expDate >= now;
    }).length;

    const activeOrders = inventory.filter(i => i.in_order_list).length;
    const pendingPayments = logs.filter(l => l.payment_status === 'pending').reduce((sum, l) => sum + (l.invoice_amount || 0), 0);
    const totalMedicines = inventory.length;
    const categoryCount = new Set(inventory.filter(i => i.category).map(i => i.category)).size;

    // Recent 10 bills
    setRecentBills(bills.sort((a, b) => new Date(b.bill_date).getTime() - new Date(a.bill_date).getTime()).slice(0, 10));

    // Weekly Sales Chart Data
    const weeklyData = [];
    let weeklyTotal = 0;
    for (let i = 6; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const dateStr = d.toISOString().split('T')[0];
      const dayBills = bills.filter(b => b.bill_date.startsWith(dateStr));
      const daySales = dayBills.reduce((sum, b) => sum + b.total_amount, 0);
      weeklyTotal += daySales;
      weeklyData.push({
        name: format(d, 'EEE'), // Mon, Tue, etc.
        sales: daySales
      });
    }
    setChartData(weeklyData);

    // Best Sellers
    const itemCounts: Record<string, { name: string, count: number, revenue: number }> = {};
    bills.forEach(bill => {
      bill.items.forEach(item => {
        if (!itemCounts[item.medicine_name]) {
          itemCounts[item.medicine_name] = { name: item.medicine_name, count: 0, revenue: 0 };
        }
        itemCounts[item.medicine_name].count += item.qty;
        itemCounts[item.medicine_name].revenue += item.total;
      });
    });
    
    const sortedBestSellers = Object.values(itemCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    setBestSellers(sortedBestSellers);

    setStats({
      salesToday,
      activeOrders,
      pendingPayments,
      totalMedicines,
      categoryCount,
      expiringSoon: expiringCount,
      weeklyTotal
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome back, Pharmacist</h1>
          <p className="text-slate-400">Here's what's happening in your pharmacy today.</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-400">Date</p>
          <p className="text-lg font-medium text-white">{format(new Date(), 'MMM dd, yyyy')}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="bg-[#1e293b] rounded-xl p-6 border border-slate-800 relative overflow-hidden">
          <DollarSign className="absolute right-4 top-4 w-12 h-12 text-slate-700/30" />
          <p className="text-slate-400 text-xs mb-2">Today's Sales</p>
          <h2 className="text-2xl font-bold text-white mb-2 truncate">{currencySymbol}{stats.salesToday.toFixed(2)}</h2>
        </div>
        
        <div className="bg-[#1e293b] rounded-xl p-6 border border-slate-800 relative overflow-hidden">
          <ShoppingCart className="absolute right-4 top-4 w-12 h-12 text-slate-700/30" />
          <p className="text-slate-400 text-xs mb-2">Active Orders</p>
          <h2 className="text-2xl font-bold text-white mb-2">{stats.activeOrders}</h2>
        </div>

        <div className="bg-[#1e293b] rounded-xl p-6 border border-slate-800 relative overflow-hidden">
          <CreditCard className="absolute right-4 top-4 w-12 h-12 text-slate-700/30" />
          <p className="text-slate-400 text-xs mb-2">Pending Payments</p>
          <h2 className="text-2xl font-bold text-amber-500 mb-2 truncate">{currencySymbol}{stats.pendingPayments.toFixed(2)}</h2>
        </div>

        <div className="bg-[#1e293b] rounded-xl p-6 border border-slate-800 relative overflow-hidden">
          <PackageSearch className="absolute right-4 top-4 w-12 h-12 text-slate-700/30" />
          <p className="text-slate-400 text-xs mb-2">Total Medicines</p>
          <h2 className="text-2xl font-bold text-white mb-2">{stats.totalMedicines}</h2>
        </div>

        <div className="bg-[#1e293b] rounded-xl p-6 border border-slate-800 relative overflow-hidden">
          <Layers className="absolute right-4 top-4 w-12 h-12 text-slate-700/30" />
          <p className="text-slate-400 text-xs mb-2">Category Count</p>
          <h2 className="text-2xl font-bold text-white mb-2">{stats.categoryCount}</h2>
        </div>

        <div className="bg-[#1e293b] rounded-xl p-6 border border-slate-800 relative overflow-hidden">
          <CalendarX className="absolute right-4 top-4 w-12 h-12 text-slate-700/30" />
          <p className="text-slate-400 text-xs mb-2">Expiring Soon</p>
          <h2 className="text-2xl font-bold text-red-400 mb-2">{stats.expiringSoon}</h2>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <span className="text-blue-500">⚡</span> Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button 
            onClick={() => navigate('/billing')}
            className="bg-blue-500 hover:bg-blue-600 transition-colors rounded-xl p-6 flex items-center justify-center gap-4 group"
          >
            <ShoppingCart className="w-8 h-8 text-white group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <h4 className="text-xl font-bold text-white">Create New Bill</h4>
              <p className="text-blue-100 text-sm">Process a customer sale</p>
            </div>
          </button>
          
          <button 
            onClick={() => navigate('/inventory')}
            className="bg-[#1e293b] hover:bg-slate-800 border border-slate-700 transition-colors rounded-xl p-6 flex items-center justify-center gap-4 group"
          >
            <PackagePlus className="w-8 h-8 text-blue-500 group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <h4 className="text-xl font-bold text-white">Add New Stock</h4>
              <p className="text-slate-400 text-sm">Update inventory records</p>
            </div>
          </button>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <div className="lg:col-span-2 bg-[#1e293b] rounded-xl border border-slate-800 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-white">Recent Transactions</h3>
            <button onClick={() => navigate('/reports')} className="text-blue-500 text-sm hover:text-blue-400">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 uppercase border-b border-slate-800">
                <tr>
                  <th className="pb-3 font-medium">Bill ID</th>
                  <th className="pb-3 font-medium">Customer</th>
                  <th className="pb-3 font-medium">Items</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentBills.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">No recent transactions</td>
                  </tr>
                ) : (
                  recentBills.map((bill) => (
                    <tr key={bill.bill_id} className="border-b border-slate-800/50 last:border-0">
                      <td className="py-4 text-white font-medium">{settings?.invoice_prefix}{bill.bill_id}</td>
                      <td className="py-4 text-slate-300">{bill.customer_name || 'Walk-in'}</td>
                      <td className="py-4 text-slate-300">{bill.items.length}</td>
                      <td className="py-4 text-white font-medium">{currencySymbol}{bill.total_amount.toFixed(2)}</td>
                      <td className="py-4">
                        <span className={cn(
                          "px-2 py-1 rounded text-xs font-medium",
                          bill.payment_status === 'Paid' ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                        )}>
                          {bill.payment_status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          {/* Weekly Chart */}
          <div className="bg-[#1e293b] rounded-xl border border-slate-800 p-6">
            <h3 className="text-lg font-medium text-white mb-1">Weekly Sales Trend</h3>
            <p className="text-sm text-slate-400 mb-6">Last 7 days</p>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <Tooltip 
                    cursor={{fill: '#334155'}}
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                    formatter={(value: number) => [`${currencySymbol}${value.toFixed(2)}`, 'Sales']}
                  />
                  <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex justify-between items-end">
              <p className="text-sm text-slate-400">Total this week</p>
              <p className="text-xl font-bold text-white">{currencySymbol}{stats.weeklyTotal.toFixed(2)}</p>
            </div>
          </div>

          {/* Best Sellers */}
          <div className="bg-[#1e293b] rounded-xl border border-slate-800 p-6">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Best Sellers
            </h3>
            <div className="space-y-4">
              {bestSellers.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">No sales data yet</p>
              ) : (
                bestSellers.map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div>
                      <p className="text-white font-medium text-sm">{item.name}</p>
                      <p className="text-slate-400 text-xs">{item.count} units sold</p>
                    </div>
                    <p className="text-emerald-400 font-medium text-sm">{currencySymbol}{item.revenue.toFixed(2)}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
