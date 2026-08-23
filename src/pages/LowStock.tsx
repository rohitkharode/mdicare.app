import React, { useState, useEffect } from 'react';
import { AlertTriangle, Download, ClipboardList, Plus, Check } from 'lucide-react';
import { getInventory, InventoryItem, updateInventory, getSuppliers, Supplier } from '../lib/db';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { useSettings } from '../context/SettingsContext';

export default function LowStock() {
  const { settings } = useSettings();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stats, setStats] = useState({ critical: 0, warning: 0, addedToRefill: 0 });
  const [threshold, setThreshold] = useState(50);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (settings) {
      loadData();
    }
  }, [settings]);

  const loadData = async () => {
    if (!settings) return;
    setIsLoading(true);
    const inventory = await getInventory();
    const allSuppliers = await getSuppliers();
    
    setSuppliers(allSuppliers);
    const currentThreshold = settings.global_low_stock_threshold;
    setThreshold(currentThreshold);
    
    let critical = 0;
    let warning = 0;
    let addedToRefill = 0;
    let dbUpdated = false;

    // Real-time update: Remove items from order list if they return above threshold
    for (const item of inventory) {
      if (item.total_qty >= currentThreshold && item.in_order_list) {
        item.in_order_list = false;
        await updateInventory(item);
        dbUpdated = true;
      }
    }

    // Filter items below threshold
    const lowStockItems = inventory.filter(item => item.total_qty < currentThreshold);
    
    lowStockItems.forEach(item => {
      if (item.total_qty < 5) critical++;
      else warning++;
      
      if (item.in_order_list) addedToRefill++;
    });

    setItems(lowStockItems.sort((a, b) => a.total_qty - b.total_qty));
    setStats({ critical, warning, addedToRefill });
    setIsLoading(false);
  };

  const handleAddToRefill = async (item: InventoryItem) => {
    if (item.in_order_list) return;
    try {
      setIsLoading(true);
      item.in_order_list = true;
      await updateInventory(item);
      await loadData();
    } catch (error) {
      console.error('Error adding to refill list:', error);
      alert('Failed to add to refill list. Please try again.');
      setIsLoading(false);
    }
  };

  const handleGenerateCompleteOrderList = async () => {
    try {
      setIsLoading(true);
      let updated = false;
      for (const item of items) {
        if (!item.in_order_list) {
          item.in_order_list = true;
          await updateInventory(item);
          updated = true;
        }
      }
      if (updated) {
        await loadData();
        alert('Order list generated successfully.');
      } else {
        alert('All low stock items are already in the order list.');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error generating order list:', error);
      alert('Failed to generate order list. Please try again.');
      setIsLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (items.length === 0) {
      alert('No low stock items to export.');
      return;
    }

    const headers = ['Medicine Name', 'Brand', 'Quantity Available', 'Supplier', 'Threshold Value'];
    const csvContent = [
      headers.join(','),
      ...items.map(item => {
        const supplier = suppliers.find(s => s.id === item.supplier_id)?.name || 'N/A';
        return [
          `"${item.medicine_name}"`,
          `"${item.brand || ''}"`,
          item.total_qty,
          `"${supplier}"`,
          threshold
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `low_stock_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            Low Stock Alerts 
            <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-sm font-medium rounded-full">
              {items.length} Items
            </span>
          </h1>
          <p className="text-slate-400">Automated inventory monitor: {items.length} medicines require urgent attention.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={handleExportCSV}
            disabled={isLoading}
            className="px-4 py-2 bg-[#1e293b] border border-slate-700 hover:bg-slate-800 text-white font-medium rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" /> Export
          </button>
          <button 
            onClick={handleGenerateCompleteOrderList}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ClipboardList className="w-4 h-4" /> Generate Order List
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#1e293b] rounded-xl p-6 border border-slate-800 flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-bold tracking-wider uppercase mb-1">Critical ( &lt; 5 units )</p>
            <h2 className="text-3xl font-bold text-white">{stats.critical} Items</h2>
          </div>
        </div>
        
        <div className="bg-[#1e293b] rounded-xl p-6 border border-slate-800 flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-bold tracking-wider uppercase mb-1">Warning Level</p>
            <h2 className="text-3xl font-bold text-white">{stats.warning} Items</h2>
          </div>
        </div>

        <div className="bg-[#1e293b] rounded-xl p-6 border border-slate-800 flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
            <ClipboardList className="w-8 h-8" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-bold tracking-wider uppercase mb-1">Added to Refill</p>
            <h2 className="text-3xl font-bold text-white">{stats.addedToRefill} Items</h2>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#1e293b] rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 uppercase border-b border-slate-800 bg-[#0f172a]/50">
              <tr>
                <th className="px-6 py-4 font-medium">Medicine Name</th>
                <th className="px-6 py-4 font-medium text-center">Current Stock</th>
                <th className="px-6 py-4 font-medium text-center">Threshold</th>
                <th className="px-6 py-4 font-medium text-center">Suggested Order</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                      <p>Loading low stock data...</p>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">All stock levels are healthy.</td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                          <span className="font-serif italic">Rx</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">{item.medicine_name}</p>
                          <p className="text-xs text-slate-500">{item.category} • {item.brand}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-medium border",
                        item.total_qty < 5 ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                      )}>
                        {item.total_qty} units
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-300">
                      {threshold} units
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-blue-400 font-medium">
                        {threshold - item.total_qty} units
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleAddToRefill(item)}
                        disabled={item.in_order_list || isLoading}
                        className={cn(
                          "px-4 py-2 text-xs font-medium rounded transition-colors inline-flex items-center gap-1 disabled:opacity-50",
                          item.in_order_list 
                            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 cursor-not-allowed"
                            : "bg-[#0f172a] border border-slate-700 hover:bg-slate-800 text-blue-400"
                        )}
                      >
                        {item.in_order_list ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                        {item.in_order_list ? 'Added to Refill' : 'Add to Refill List'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-[#1e293b] border border-slate-800 rounded-xl p-4 flex justify-between items-center">
        <div className="flex items-center gap-3 text-slate-300">
          <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
            <span className="font-serif italic">i</span>
          </div>
          <div>
            <p className="text-white font-medium text-sm">Automatic Smart Ordering</p>
            <p className="text-xs text-slate-400">Based on your sales velocity, we recommend restocking the above quantities to last 30 days.</p>
          </div>
        </div>
        <button 
          onClick={handleGenerateCompleteOrderList}
          disabled={isLoading}
          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Generate Complete Order List
        </button>
      </div>
    </div>
  );
}
