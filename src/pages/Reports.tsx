import React, { useState, useEffect, useMemo } from 'react';
import { Search, Download, FileText, DollarSign, Package, TrendingUp, Filter } from 'lucide-react';
import { getBills, Bill, getInventory, InventoryItem, getLogs, getSuppliers, StockLog, Supplier } from '../lib/db';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { useSettings } from '../context/SettingsContext';
import { BarChart as BarChart2 } from 'lucide-react';

export default function Reports() {
  const { settings, currencySymbol } = useSettings();
  const [bills, setBills] = useState<Bill[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [logs, setLogs] = useState<StockLog[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [billsData, invData, logsData, supData] = await Promise.all([
      getBills(),
      getInventory(),
      getLogs(),
      getSuppliers()
    ]);
    setBills(billsData);
    setInventory(invData);
    setLogs(logsData);
    setSuppliers(supData);
  };

  const categories = useMemo(() => {
    const cats = new Set(inventory.filter(i => i.category).map(i => i.category));
    return ['All Categories', ...Array.from(cats)];
  }, [inventory]);

  const filteredPurchases = useMemo(() => {
    return logs.filter(log => {
      if (log.change_type !== 'added') return false; // purely purchases

      const supName = suppliers.find(s => s.id === log.supplier_id)?.name || '';
      const matchSearch = log.medicine_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          log.batch_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          supName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const logDate = log.timestamp.split('T')[0];
      const matchDate = logDate >= fromDate && logDate <= toDate;

      if (!matchSearch || !matchDate) return false;

      // Ensure inventory category filtering applies if necessary
      if (selectedCategory !== 'All Categories') {
        const invItem = inventory.find(i => i.medicine_name === log.medicine_name);
        if (invItem?.category !== selectedCategory) return false;
      }
      return true;
    });
  }, [logs, suppliers, inventory, searchTerm, selectedCategory, fromDate, toDate]);

  const filteredBills = useMemo(() => {
    return bills.filter(b => {
      // Check customer or bill_id matching
      let matchSearch = b.bill_id?.toString().includes(searchTerm) || 
                          b.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());
                          
      // Check items matching (medicine name, batch no, category)
      if (!matchSearch && searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        matchSearch = b.items.some(item => {
          const invItem = inventory.find(i => i.id === item.medicine_id);
          return item.medicine_name?.toLowerCase().includes(term) ||
                 invItem?.batch_no?.toLowerCase().includes(term) ||
                 invItem?.category?.toLowerCase().includes(term);
        });
      }
      
      const billDate = b.bill_date.split('T')[0];
      const matchDate = billDate >= fromDate && billDate <= toDate;

      if (!matchSearch || !matchDate) return false;

      if (selectedCategory === 'All Categories') return true;
      
      // Check if any item in the bill belongs to the selected category
      return b.items.some(item => {
        const invItem = inventory.find(i => i.id === item.medicine_id);
        return invItem?.category === selectedCategory;
      });
    });
  }, [bills, inventory, searchTerm, selectedCategory, fromDate, toDate]);

  const stats = useMemo(() => {
    let totalSales = 0;
    let itemsSold = 0;
    let totalCost = 0;

    filteredBills.forEach(bill => {
      bill.items.forEach(item => {
        const invItem = inventory.find(i => i.id === item.medicine_id);
        if (selectedCategory !== 'All Categories' && invItem?.category !== selectedCategory) {
          return; // Skip if it doesn't match selected category
        }
        totalSales += item.total;
        itemsSold += item.qty;
        if (invItem) {
          totalCost += (invItem.purchase_price || 0) * item.qty;
        }
      });
    });

    const netProfit = totalSales - totalCost; 

    return {
      totalSales,
      billsGenerated: filteredBills.length,
      netProfit,
      itemsSold
    };
  }, [filteredBills, inventory, selectedCategory]);

  const chartData = useMemo(() => {
    const dailySales: Record<string, number> = {};
    
    filteredBills.forEach(bill => {
      const dateKey = bill.bill_date.split('T')[0];
      if (!dailySales[dateKey]) {
        dailySales[dateKey] = 0;
      }
      
      bill.items.forEach(item => {
        const invItem = inventory.find(i => i.id === item.medicine_id);
        if (selectedCategory !== 'All Categories' && invItem?.category !== selectedCategory) {
          return;
        }
        dailySales[dateKey] += item.total;
      });
    });
    
    return Object.entries(dailySales)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dateKey, sales]) => ({ time: dateKey, sales }));
  }, [filteredBills, inventory, selectedCategory]);

  const bestSellers = useMemo(() => {
    const itemStats: Record<number, { name: string, units: number, rev: number }> = {};
    
    filteredBills.forEach(bill => {
      bill.items.forEach(item => {
        const invItem = inventory.find(i => i.id === item.medicine_id);
        if (selectedCategory !== 'All Categories' && invItem?.category !== selectedCategory) {
          return;
        }

        if (!itemStats[item.medicine_id]) {
          itemStats[item.medicine_id] = { name: item.name, units: 0, rev: 0 };
        }
        itemStats[item.medicine_id].units += item.qty;
        itemStats[item.medicine_id].rev += item.total;
      });
    });
    
    return Object.values(itemStats)
      .sort((a, b) => b.units - a.units)
      .slice(0, 5);
  }, [filteredBills, inventory, selectedCategory]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <BarChart2 className="w-8 h-8 text-blue-500" /> Daily Summary & Reports
        </h1>
        <div className="flex gap-4">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search reports..." 
              className="w-full bg-[#1e293b] border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="relative">
            <button 
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              className="px-4 py-2 bg-[#1e293b] border border-slate-700 hover:bg-slate-800 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
            >
              <Filter className="w-4 h-4" /> {selectedCategory}
            </button>
            
            {showCategoryDropdown && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-[#1e293b] border border-slate-700 rounded-xl shadow-xl z-10 overflow-hidden">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => {
                      setSelectedCategory(category);
                      setShowCategoryDropdown(false);
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Snapshot for: 
            <input 
              type="date" 
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="bg-[#1e293b] border border-slate-700 rounded text-sm px-2 py-1 focus:outline-none" 
            />
            <span className="text-sm font-normal text-slate-400">to</span>
            <input 
              type="date" 
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="bg-[#1e293b] border border-slate-700 rounded text-sm px-2 py-1 focus:outline-none" 
            />
          </h2>
          <p className="text-sm text-slate-400 mt-1">Filtered from bills & sales matching criteria</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => {
              const header = ['Bill ID', 'Date', 'Customer', 'Items', 'Total Amount', 'Payment Status'];
              const csv = [header, ...filteredBills.map(b => [
                `${settings?.invoice_prefix || ''}${b.bill_id}`,
                format(new Date(b.bill_date), 'yyyy-MM-dd'),
                `"${b.customer_name || 'Walk-in'}"`,
                b.items.length.toString(),
                b.total_amount.toFixed(2),
                b.payment_status
              ])].map(e => e.join(",")).join("\n");
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `sales_report_${fromDate}_to_${toDate}.csv`;
              a.click();
            }}
            className="px-4 py-2 bg-[#1e293b] border border-slate-700 hover:bg-slate-800 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
          >
            <FileText className="w-4 h-4" /> Export Sales CSV
          </button>
          
          <button 
            onClick={() => {
              const header = ['Date', 'Supplier', 'Items Purchased', 'Batch No', 'Invoice Amount', 'Payment Status'];
              const csv = [header, ...filteredPurchases.map(log => [
                format(new Date(log.timestamp), 'yyyy-MM-dd'),
                `"${suppliers.find(s => s.id === log.supplier_id)?.name || 'Unknown Supplier'}"`,
                `${log.medicine_name} (+${log.qty_change})`,
                `"${log.batch_no}"`,
                log.invoice_amount?.toFixed(2) || '0.00',
                log.payment_status || '-'
              ])].map(e => e.join(",")).join("\n");
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `purchase_report_${fromDate}_to_${toDate}.csv`;
              a.click();
            }}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" /> Export Purchases CSV
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[#1e293b] rounded-xl p-6 border border-slate-800">
          <div className="flex justify-between items-start mb-4">
            <p className="text-slate-400 text-sm">Total Sales</p>
            <DollarSign className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="flex items-end gap-3">
            <h2 className="text-3xl font-bold text-white">{currencySymbol}{stats.totalSales.toFixed(2)}</h2>
            <span className="text-sm text-emerald-500 font-medium mb-1">↗ 12%</span>
          </div>
        </div>
        
        <div className="bg-[#1e293b] rounded-xl p-6 border border-slate-800">
          <div className="flex justify-between items-start mb-4">
            <p className="text-slate-400 text-sm">Bills Generated</p>
            <FileText className="w-5 h-5 text-blue-500" />
          </div>
          <div className="flex items-end gap-3">
            <h2 className="text-3xl font-bold text-white">{stats.billsGenerated}</h2>
            <span className="text-sm text-emerald-500 font-medium mb-1">↗ 5%</span>
          </div>
        </div>

        <div className="bg-[#1e293b] rounded-xl p-6 border border-slate-800">
          <div className="flex justify-between items-start mb-4">
            <p className="text-slate-400 text-sm">Net Profit</p>
            <TrendingUp className="w-5 h-5 text-purple-500" />
          </div>
          <div className="flex items-end gap-3">
            <h2 className="text-3xl font-bold text-white">{currencySymbol}{stats.netProfit.toFixed(2)}</h2>
            <span className="text-sm text-emerald-500 font-medium mb-1">↗ 8%</span>
          </div>
        </div>

        <div className="bg-[#1e293b] rounded-xl p-6 border border-slate-800">
          <div className="flex justify-between items-start mb-4">
            <p className="text-slate-400 text-sm">Items Sold</p>
            <Package className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex items-end gap-3">
            <h2 className="text-3xl font-bold text-white">{stats.itemsSold}</h2>
            <span className="text-sm text-red-500 font-medium mb-1">↘ 2%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-[#1e293b] rounded-xl border border-slate-800 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-medium text-white">Sales Trend</h3>
              <p className="text-sm text-slate-400">Hourly revenue vs. Yesterday</p>
            </div>
            <select className="bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none">
              <option>Last 24 Hours</option>
            </select>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                  formatter={(value: number) => [`${currencySymbol}${value.toFixed(2)}`, 'Sales']}
                />
                <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={3} dot={false} />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Best Sellers */}
        <div className="bg-[#1e293b] rounded-xl border border-slate-800 p-6 flex flex-col">
          <h3 className="text-lg font-medium text-white mb-6">Best Sellers</h3>
          <div className="flex-1 space-y-4">
            {bestSellers.length === 0 ? (
              <p className="text-slate-500 text-center py-4">No sales data available</p>
            ) : (
              bestSellers.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-900/30 flex items-center justify-center text-blue-400">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-slate-400">{item.units} units sold</p>
                    </div>
                  </div>
                  <p className="text-white font-medium text-sm">{currencySymbol}{item.rev.toFixed(2)}</p>
                </div>
              ))
            )}
          </div>
          <button className="w-full mt-6 py-2 border border-slate-700 rounded-lg text-sm text-blue-400 hover:bg-slate-800 transition-colors">
            View All Products
          </button>
        </div>
      </div>

      {/* Sales Report Table */}
      <div className="bg-[#1e293b] rounded-xl border border-slate-800 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-white">Sales Report Details</h3>
          <span className="text-blue-500 text-sm">{filteredBills.length} records found</span>
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 uppercase border-b border-slate-800 sticky top-0 bg-[#1e293b]">
              <tr>
                <th className="pb-3 font-medium">Order ID</th>
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Customer</th>
                <th className="pb-3 font-medium">Items Sold</th>
                <th className="pb-3 font-medium">Discount</th>
                <th className="pb-3 font-medium">Total Amount</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">No sales transactions found for these filters.</td>
                </tr>
              ) : (
                filteredBills.map((bill) => (
                  <tr key={bill.bill_id} className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/20">
                    <td className="py-4 text-slate-300 font-medium">{settings?.invoice_prefix}{bill.bill_id}</td>
                    <td className="py-4 text-slate-400">{format(new Date(bill.bill_date), 'yyyy-MM-dd')}</td>
                    <td className="py-4">
                      <p className="text-white font-medium">{bill.customer_name || 'Walk-in Customer'}</p>
                    </td>
                    <td className="py-4 text-slate-300">
                      {bill.items.reduce((sum, item) => sum + item.qty, 0)} items
                    </td>
                    <td className="py-4 text-slate-300">{currencySymbol}{bill.discount_amount?.toFixed(2) || '0.00'}</td>
                    <td className="py-4 text-white font-bold">{currencySymbol}{bill.total_amount.toFixed(2)}</td>
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${bill.payment_status === 'Paid' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
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

      {/* Purchase Report Table */}
      <div className="bg-[#1e293b] rounded-xl border border-slate-800 p-6 mt-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-white">Purchase Report Details</h3>
          <span className="text-blue-500 text-sm">{filteredPurchases.length} records found</span>
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 uppercase border-b border-slate-800 sticky top-0 bg-[#1e293b]">
              <tr>
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Supplier</th>
                <th className="pb-3 font-medium">Items Purchased</th>
                <th className="pb-3 font-medium">Batch No</th>
                <th className="pb-3 font-medium">Invoice Amount</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">No purchase history found for these filters.</td>
                </tr>
              ) : (
                filteredPurchases.map((log) => (
                  <tr key={log.log_id} className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/20">
                    <td className="py-4 text-slate-400">{format(new Date(log.timestamp), 'yyyy-MM-dd')}</td>
                    <td className="py-4">
                      <p className="text-white font-medium">{suppliers.find(s => s.id === log.supplier_id)?.name || 'Unknown Supplier'}</p>
                    </td>
                    <td className="py-4 text-slate-300">
                      {log.medicine_name} <span className="text-emerald-500">(+{log.qty_change})</span>
                    </td>
                    <td className="py-4 text-slate-400">{log.batch_no}</td>
                    <td className="py-4 text-white font-bold">{currencySymbol}{log.invoice_amount?.toFixed(2) || '0.00'}</td>
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${log.payment_status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                        {log.payment_status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
