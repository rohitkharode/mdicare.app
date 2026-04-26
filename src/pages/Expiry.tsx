import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, AlertTriangle, Clock, CalendarX, Download, Trash2, RotateCcw, CheckSquare, Square } from 'lucide-react';
import { getInventory, InventoryItem, updateInventory, deleteInventoryItem, bulkReturnToSupplier, getSuppliers, Supplier } from '../lib/db';
import { format, differenceInDays } from 'date-fns';
import { cn } from '../lib/utils';
import { useSettings } from '../context/SettingsContext';

export default function Expiry() {
  const { settings } = useSettings();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stats, setStats] = useState({ critical: 0, warning: 0, upcoming: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // We use settings?.expiry_alert_lead_time to inform warnings
  const expiryLeadTime = settings?.expiry_alert_lead_time || 60;
  // Calculate reasonable thresholds based on lead time
  const criticalThreshold = Math.max(1, Math.floor(expiryLeadTime / 2));
  const upcomingThreshold = Math.floor(expiryLeadTime * 1.5);

  useEffect(() => {
    if (settings) {
      loadData();
    }
  }, [settings]);

  const loadData = async () => {
    setIsLoading(true);
    const [inventory, allSuppliers] = await Promise.all([
      getInventory(),
      getSuppliers()
    ]);
    
    setSuppliers(allSuppliers);
    const now = new Date();
    
    let critical = 0;
    let warning = 0;
    let upcoming = 0;

    const expiryItems = inventory.map(item => {
      const expDate = new Date(item.expiry_date);
      const daysLeft = differenceInDays(expDate, now);
      
      let status = 'SAFE';
      if (daysLeft <= criticalThreshold) {
        status = 'CRITICAL';
        critical++;
      } else if (daysLeft <= expiryLeadTime) {
        status = 'WARNING';
        warning++;
      } else if (daysLeft <= upcomingThreshold) {
        status = 'UPCOMING';
        upcoming++;
      }

      return { ...item, daysLeft, status };
    }).filter(item => item.daysLeft <= 365 && item.total_qty > 0).sort((a, b) => a.daysLeft - b.daysLeft);

    setItems(expiryItems);
    setStats({ critical, warning, upcoming });
    setIsLoading(false);
  };

  const categories = useMemo(() => {
    const cats = new Set(items.map(item => item.category));
    return ['All Categories', ...Array.from(cats)];
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = 
        item.medicine_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.batch_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.brand.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'All Categories' || item.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [items, searchTerm, selectedCategory]);

  const handleMarkRemoved = async (item: InventoryItem) => {
    try {
      setIsLoading(true);
      await deleteInventoryItem(item.id!);
      await loadData();
    } catch (error) {
      console.error('Error removing item:', error);
      alert('Failed to remove item. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkReturn = async () => {
    if (selectedIds.length === 0) return;

    try {
      setIsLoading(true);
      await bulkReturnToSupplier(selectedIds, undefined);
      setSelectedIds([]);
      await loadData();
    } catch (error) {
      console.error('Error in bulk return:', error);
      alert('Failed to process bulk return. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (filteredItems.length === 0) {
      alert('No data to export.');
      return;
    }

    const headers = ['Medicine Name', 'Category', 'Brand', 'Batch No', 'Expiry Date', 'Quantity', 'Supplier'];
    const csvContent = [
      headers.join(','),
      ...filteredItems.map(item => {
        const supplier = suppliers.find(s => s.id === item.supplier_id)?.name || 'N/A';
        return [
          `"${item.medicine_name}"`,
          `"${item.category}"`,
          `"${item.brand}"`,
          `"${item.batch_no}"`,
          item.expiry_date,
          item.total_qty,
          `"${supplier}"`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `expiry_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map(item => item.id!));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Expiry Management</h1>
        <div className="flex gap-3">
          <button 
            onClick={handleExportCSV}
            className="px-4 py-2 bg-[#1e293b] border border-slate-700 hover:bg-slate-800 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#1e293b] rounded-xl p-6 border border-slate-800 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <CalendarX className="w-16 h-16 text-red-500" />
          </div>
          <div className="flex justify-between items-start mb-4">
            <CalendarX className="w-6 h-6 text-red-500" />
            <span className="text-xs font-bold text-red-500 tracking-wider">CRITICAL</span>
          </div>
          <p className="text-slate-400 text-sm mb-1">Expiring in {criticalThreshold} Days</p>
          <div className="flex items-end gap-3">
            <h2 className="text-4xl font-bold text-white">{stats.critical}</h2>
          </div>
        </div>
        
        <div className="bg-[#1e293b] rounded-xl p-6 border border-slate-800 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <AlertTriangle className="w-16 h-16 text-amber-500" />
          </div>
          <div className="flex justify-between items-start mb-4">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            <span className="text-xs font-bold text-amber-500 tracking-wider">WARNING</span>
          </div>
          <p className="text-slate-400 text-sm mb-1">Expiring in {expiryLeadTime} Days</p>
          <div className="flex items-end gap-3">
            <h2 className="text-4xl font-bold text-white">{stats.warning}</h2>
          </div>
        </div>

        <div className="bg-[#1e293b] rounded-xl p-6 border border-slate-800 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Clock className="w-16 h-16 text-blue-500" />
          </div>
          <div className="flex justify-between items-start mb-4">
            <Clock className="w-6 h-6 text-blue-500" />
            <span className="text-xs font-bold text-blue-500 tracking-wider">UPCOMING</span>
          </div>
          <p className="text-slate-400 text-sm mb-1">Expiring in {upcomingThreshold} Days</p>
          <div className="flex items-end gap-3">
            <h2 className="text-4xl font-bold text-white">{stats.upcoming}</h2>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search medicine, batch no., or brand..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#1e293b] border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <select 
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-[#1e293b] border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 appearance-none min-w-[180px]"
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <button 
          onClick={loadData}
          className="px-6 py-3 bg-[#1e293b] border border-slate-700 hover:bg-slate-800 text-white font-medium rounded-xl flex items-center gap-2 transition-colors"
        >
          <RotateCcw className="w-5 h-5" /> Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-[#1e293b] rounded-xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 uppercase border-b border-slate-800 bg-[#0f172a]/50">
              <tr>
                <th className="px-6 py-4 w-10">
                  <button onClick={toggleSelectAll} className="text-slate-500 hover:text-blue-500 transition-colors">
                    {selectedIds.length === filteredItems.length && filteredItems.length > 0 ? (
                      <CheckSquare className="w-5 h-5 text-blue-500" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-4 font-medium">Medicine Name</th>
                <th className="px-6 py-4 font-medium">Batch No.</th>
                <th className="px-6 py-4 font-medium">Expiry Date</th>
                <th className="px-6 py-4 font-medium">Days Left</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                      <p>Loading expiry data...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">No items found matching your criteria.</td>
                </tr>
              ) : (
                filteredItems.map((item: any) => (
                  <tr key={item.id} className={cn(
                    "hover:bg-slate-800/20 transition-colors",
                    selectedIds.includes(item.id) ? "bg-blue-500/5" : ""
                  )}>
                    <td className="px-6 py-4">
                      <button onClick={() => toggleSelect(item.id)} className="text-slate-500 hover:text-blue-500 transition-colors">
                        {selectedIds.includes(item.id) ? (
                          <CheckSquare className="w-5 h-5 text-blue-500" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-white font-medium">{item.medicine_name}</p>
                      <p className="text-xs text-slate-500">{item.category} • {item.brand}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-300 font-mono">#{item.batch_no}</td>
                    <td className="px-6 py-4 text-slate-300">
                      {format(new Date(item.expiry_date), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "font-medium",
                        item.daysLeft <= criticalThreshold ? "text-red-500" : 
                        item.daysLeft <= expiryLeadTime ? "text-amber-500" : "text-emerald-500"
                      )}>
                        {item.daysLeft} Days
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold border tracking-wider",
                        item.status === 'CRITICAL' ? "bg-red-500/10 text-red-500 border-red-500/20" : 
                        item.status === 'WARNING' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : 
                        "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                      )}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleMarkRemoved(item)}
                        disabled={isLoading}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Mark as Removed"
                      >
                        <Trash2 className="w-4 h-4" />
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
      <div className="bg-[#1e293b] border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row justify-between items-center gap-4 shadow-lg">
        <div className="flex items-center gap-4 text-slate-300">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm">
              <span className="text-white font-bold">{stats.critical}</span> items are in <span className="text-red-500 font-bold uppercase">Critical</span> state.
            </p>
            <p className="text-xs text-slate-500">Immediate action recommended for expired or near-expiry stock.</p>
          </div>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          {selectedIds.length > 0 && (
            <button 
              onClick={handleBulkReturn}
              disabled={isLoading}
              className="flex-1 md:flex-none px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <RotateCcw className="w-5 h-5" />
              )}
              Bulk Return ({selectedIds.length})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
