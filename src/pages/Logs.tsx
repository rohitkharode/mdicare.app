import React, { useState, useEffect, useMemo } from 'react';
import { Printer, Download, Search, RefreshCw, History, Filter } from 'lucide-react';
import { getLogs, StockLog, getInventory } from '../lib/db';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { useSettings } from '../context/SettingsContext';

export default function Logs() {
  const [allLogs, setAllLogs] = useState<StockLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    const data = await getLogs();
    setAllLogs(data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
  };

  const filteredLogs = useMemo(() => {
    return allLogs.filter(log => {
      const matchSearch = log.medicine_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          log.batch_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.change_type.toLowerCase().includes(searchTerm.toLowerCase());
      
      const logDate = log.timestamp.split('T')[0];
      const matchDate = logDate >= fromDate && logDate <= toDate;

      return matchSearch && matchDate;
    });
  }, [allLogs, searchTerm, fromDate, toDate]);

  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    let expired = 0;

    filteredLogs.forEach(log => {
      if (log.change_type === 'added') added += log.qty_change;
      if (log.change_type === 'sale' || log.change_type === 'removed') removed += Math.abs(log.qty_change);
      if (log.change_type === 'expired') expired += Math.abs(log.qty_change);
    });

    return { added, removed, expired };
  }, [filteredLogs]);

  const getChangeTypeStyle = (type: string) => {
    switch (type) {
      case 'added': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'removed': 
      case 'sale': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'expired': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'correction': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  const getChangeTypeLabel = (type: string) => {
    switch (type) {
      case 'added': return 'STOCK ADDED';
      case 'removed': return 'STOCK REMOVED';
      case 'sale': return 'SALE';
      case 'expired': return 'BATCH EXPIRED';
      case 'correction': return 'CORRECTION';
      default: return type.toUpperCase();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 text-blue-400 text-sm font-medium mb-2">
            <History className="w-4 h-4" /> INVENTORY LOGS
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Inventory Update History</h1>
          <p className="text-slate-400">Complete audit trail of all pharmaceutical stock movements, expiry removals, and manual corrections.</p>
        </div>
        <div className="flex gap-4">
          <button className="px-4 py-2 bg-[#1e293b] border border-slate-700 hover:bg-slate-800 text-white font-medium rounded-lg flex items-center gap-2 transition-colors">
            <Printer className="w-4 h-4" /> Print Logs
          </button>
          <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg flex items-center gap-2 transition-colors">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Date Range</label>
          <select className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 appearance-none">
            <option>Oct 1, 2023 — Oct 31, 2023</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Change Type</label>
          <select className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 appearance-none">
            <option>All Types</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Search Medicine</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search by name, batch, or type..." 
                className="w-full bg-[#1e293b] border border-slate-700 rounded-lg pl-9 pr-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            
            <div className="flex gap-2 items-center">
              <input 
                type="date" 
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="bg-[#1e293b] border border-slate-700 rounded-lg text-sm px-3 py-3 text-white focus:outline-none focus:border-blue-500 h-[46px]" 
              />
              <span className="text-slate-500">to</span>
              <input 
                type="date" 
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className="bg-[#1e293b] border border-slate-700 rounded-lg text-sm px-3 py-3 text-white focus:outline-none focus:border-blue-500 h-[46px]" 
              />
            </div>

            <button className="px-4 py-3 bg-[#1e293b] border border-slate-700 hover:bg-slate-800 text-white rounded-lg transition-colors h-[46px]">
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="flex gap-4">
        <div className="bg-[#1e293b] border border-slate-800 rounded-xl p-4 flex items-center gap-4 min-w-[200px]">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold text-xl">+</div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Stock Added</p>
            <p className="text-xl font-bold text-white">{stats.added} <span className="text-sm font-normal text-slate-400">items</span></p>
          </div>
        </div>
        <div className="bg-[#1e293b] border border-slate-800 rounded-xl p-4 flex items-center gap-4 min-w-[200px]">
          <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 font-bold text-xl">-</div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Stock Removed</p>
            <p className="text-xl font-bold text-white">{stats.removed} <span className="text-sm font-normal text-slate-400">items</span></p>
          </div>
        </div>
        <div className="bg-[#1e293b] border border-slate-800 rounded-xl p-4 flex items-center gap-4 min-w-[200px]">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
            <History className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Expired Removed</p>
            <p className="text-xl font-bold text-white">{stats.expired} <span className="text-sm font-normal text-slate-400">batches</span></p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#1e293b] rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 uppercase border-b border-slate-800 bg-[#0f172a]/50">
              <tr>
                <th className="px-6 py-4 font-medium">Date & Time</th>
                <th className="px-6 py-4 font-medium">Medicine Name</th>
                <th className="px-6 py-4 font-medium">Batch No</th>
                <th className="px-6 py-4 font-medium">Change Type</th>
                <th className="px-6 py-4 font-medium">Qty Change</th>
                <th className="px-6 py-4 font-medium">Updated Total</th>
                <th className="px-6 py-4 font-medium">Performed By</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">No logs found.</td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.log_id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-white font-medium">{format(new Date(log.timestamp), 'MMM dd, yyyy')}</p>
                      <p className="text-xs text-slate-500">{format(new Date(log.timestamp), 'hh:mm a')}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-white font-medium">{log.medicine_name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-xs">{log.batch_no}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("px-3 py-1 rounded-full text-xs font-medium border flex items-center w-max gap-1", getChangeTypeStyle(log.change_type))}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span> {getChangeTypeLabel(log.change_type)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("font-bold", log.qty_change > 0 ? "text-emerald-500" : "text-red-500")}>
                        {log.qty_change > 0 ? '+' : ''}{log.qty_change}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white font-medium">
                      {log.updated_total}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-white">
                          PH
                        </div>
                        <span className="text-slate-300">Pharmacist</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-800 flex justify-between items-center bg-[#0f172a]/50">
          <p className="text-sm text-slate-400">Showing <span className="text-white">{filteredLogs.length > 0 ? 1 : 0}</span> to <span className="text-white">{filteredLogs.length}</span> of <span className="text-white">{filteredLogs.length}</span> entries</p>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-[#1e293b] border border-slate-700 rounded-lg text-sm text-slate-300 hover:bg-slate-800 transition-colors">Previous</button>
            <button className="px-4 py-2 bg-[#1e293b] border border-slate-700 rounded-lg text-sm text-slate-300 hover:bg-slate-800 transition-colors">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
