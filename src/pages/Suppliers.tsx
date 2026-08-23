import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Plus, Download, Users, ShoppingCart, CreditCard, X, Check } from 'lucide-react';
import { getSuppliers, addSupplier, Supplier, getInventory, getLogs, updateLog, StockLog } from '../lib/db';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { useSettings } from '../context/SettingsContext';

export default function Suppliers() {
  const { currencySymbol } = useSettings();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  
  const [activeOrders, setActiveOrders] = useState(0);
  const [pendingPaymentsTotal, setPendingPaymentsTotal] = useState(0);
  const [pendingLogs, setPendingLogs] = useState<StockLog[]>([]);
  const [allLogs, setAllLogs] = useState<StockLog[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    category: 'Pharma',
    contact_person: '',
    phone: '',
    last_order: new Date().toISOString().split('T')[0],
    rating: 5.0,
    pending_payments: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [supData, invData, logsData] = await Promise.all([
      getSuppliers(),
      getInventory(),
      getLogs()
    ]);
    setSuppliers(supData);
    setAllLogs(logsData);
    
    // Active Orders -> count items in order list
    const active = invData.filter(i => i.in_order_list).length;
    setActiveOrders(active);

    // Pending Payments -> sum of unpaid supplier invoices
    const pending = logsData.filter(l => l.payment_status === 'pending');
    setPendingLogs(pending);
    const totalPending = pending.reduce((sum, l) => sum + (l.invoice_amount || 0), 0);
    setPendingPaymentsTotal(totalPending);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await addSupplier(formData);
    setShowAddModal(false);
    loadData();
  };

  const handleMarkPaid = async (supplierId: number) => {
    const logsToUpdate = pendingLogs.filter(l => l.supplier_id === supplierId);
    for (const log of logsToUpdate) {
      await updateLog({ ...log, payment_status: 'paid' });
    }
    loadData();
  };

  const pendingBySupplier = suppliers.map(s => {
    const sLogs = pendingLogs.filter(l => l.supplier_id === s.id);
    return {
      supplier: s,
      totalAmount: sLogs.reduce((sum, l) => sum + (l.invoice_amount || 0), 0),
      invoiceCount: sLogs.length,
      lastDate: sLogs.length > 0 ? Math.max(...sLogs.map(l => new Date(l.timestamp).getTime())) : null
    };
  }).filter(s => s.invoiceCount > 0);

  const categories = useMemo(() => {
    const cats = new Set(suppliers.map(s => s.category));
    return ['All Categories', ...Array.from(cats)];
  }, [suppliers]);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            s.id?.toString().includes(searchTerm);
      const matchesCategory = selectedCategory === 'All Categories' || s.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [suppliers, searchTerm, selectedCategory]);

  const handleExport = () => {
    if (filteredSuppliers.length === 0) {
      alert("No suppliers to export.");
      return;
    }

    const csvContent = [
      ['Supplier Name', 'Contact', 'Total Purchases', 'Pending Payments', 'Last Supply Date'],
      ...filteredSuppliers.map(s => {
        const sLogs = allLogs.filter(l => l.supplier_id === s.id);
        const totalPurchases = sLogs.reduce((sum, l) => sum + (l.invoice_amount || 0), 0);
        const pending = sLogs.filter(l => l.payment_status === 'pending').reduce((sum, l) => sum + (l.invoice_amount || 0), 0);
        const lastSupply = sLogs.length > 0 ? format(new Date(Math.max(...sLogs.map(l => new Date(l.timestamp).getTime()))), 'yyyy-MM-dd') : 'N/A';
        
        return [
          `"${s.name}"`,
          `"${s.phone}"`,
          totalPurchases.toFixed(2),
          pending.toFixed(2),
          lastSupply
        ];
      })
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `suppliers_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Supplier Management</h1>
          <p className="text-slate-400">Manage your pharmacy logistics and procurement</p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => setShowPendingModal(true)} className="px-6 py-3 bg-[#1e293b] border border-red-500/50 hover:bg-slate-800 text-red-400 font-medium rounded-lg flex items-center gap-2 transition-colors">
            <CreditCard className="w-5 h-5" /> View Pending Payments
          </button>
          <button onClick={() => setShowAddModal(true)} className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg flex items-center gap-2 transition-colors">
            <Plus className="w-5 h-5" /> Add New Supplier
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#1e293b] rounded-xl p-6 border border-slate-800 flex justify-between items-center">
          <div>
            <p className="text-slate-400 text-sm mb-1">Total Suppliers</p>
            <h2 className="text-3xl font-bold text-white mb-2">{suppliers.length}</h2>
            <span className="text-xs text-emerald-500 font-medium">Active</span>
          </div>
          <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
            <Users className="w-6 h-6" />
          </div>
        </div>
        
        <div className="bg-[#1e293b] rounded-xl p-6 border border-slate-800 flex justify-between items-center">
          <div>
            <p className="text-slate-400 text-sm mb-1">Active Orders</p>
            <h2 className="text-3xl font-bold text-white mb-2">{activeOrders}</h2>
            <span className="text-xs text-blue-500 font-medium">Items in order list</span>
          </div>
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
            <ShoppingCart className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#1e293b] rounded-xl p-6 border border-slate-800 flex justify-between items-center">
          <div>
            <p className="text-slate-400 text-sm mb-1">Pending Payments</p>
            <h2 className="text-3xl font-bold text-white mb-2">{currencySymbol}{pendingPaymentsTotal.toFixed(2)}</h2>
            <span className="text-xs text-red-500 font-medium">{pendingLogs.length} pending invoices</span>
          </div>
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search suppliers by name or ID..." 
            className="w-full bg-[#1e293b] border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="relative">
          <button 
            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
            className="px-6 py-3 bg-[#1e293b] border border-slate-700 hover:bg-slate-800 text-white font-medium rounded-xl flex items-center gap-2 transition-colors"
          >
            <Filter className="w-5 h-5" /> Category: {selectedCategory}
          </button>
          
          {showCategoryDropdown && (
            <div className="absolute top-full mt-2 w-48 bg-[#1e293b] border border-slate-700 rounded-xl shadow-xl z-10 overflow-hidden">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => {
                    setSelectedCategory(category);
                    setShowCategoryDropdown(false);
                  }}
                  className="w-full text-left px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  {category}
                </button>
              ))}
            </div>
          )}
        </div>
        <button className="px-6 py-3 bg-[#1e293b] border border-slate-700 hover:bg-slate-800 text-white font-medium rounded-xl flex items-center gap-2 transition-colors">
          <span className="text-amber-500">★</span> Rating: 4+
        </button>
        <button onClick={handleExport} className="px-4 py-3 bg-[#1e293b] border border-slate-700 hover:bg-slate-800 text-white font-medium rounded-xl flex items-center justify-center transition-colors">
          <Download className="w-5 h-5" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-[#1e293b] rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 uppercase border-b border-slate-800 bg-[#0f172a]/50">
              <tr>
                <th className="px-6 py-4 font-medium">Supplier Name</th>
                <th className="px-6 py-4 font-medium">Contact</th>
                <th className="px-6 py-4 font-medium">Total Purchased</th>
                <th className="px-6 py-4 font-medium">Pending Payments</th>
                <th className="px-6 py-4 font-medium">Last Supply</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">No suppliers found.</td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier) => {
                  const sLogs = allLogs.filter(l => l.supplier_id === supplier.id && l.change_type === 'added');
                  const totalPurchased = sLogs.reduce((sum, l) => sum + (l.invoice_amount || 0), 0);
                  const pending = sLogs.filter(l => l.payment_status === 'pending').reduce((sum, l) => sum + (l.invoice_amount || 0), 0);
                  const lastSupply = sLogs.length > 0 ? format(new Date(Math.max(...sLogs.map(l => new Date(l.timestamp).getTime()))), 'MMM dd, yyyy') : 'No History';

                  return (
                  <tr key={supplier.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-blue-900/50 flex items-center justify-center text-blue-400 font-bold">
                          {supplier.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white font-medium">{supplier.name}</p>
                          <p className="text-xs text-slate-500">ID: SUP-{1000 + supplier.id!}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      <p className="text-white font-medium">{supplier.contact_person}</p>
                      <p className="text-xs text-slate-400">{supplier.phone}</p>
                    </td>
                    <td className="px-6 py-4 font-medium text-white">
                      {currencySymbol}{totalPurchased.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "font-medium", pending > 0 ? "text-amber-500" : "text-emerald-500"
                      )}>
                        {currencySymbol}{pending.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {lastSupply}
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-800 flex justify-between items-center bg-[#0f172a]/50">
          <p className="text-sm text-slate-400">Showing <span className="text-white">{filteredSuppliers.length > 0 ? 1 : 0}</span> to <span className="text-white">{filteredSuppliers.length}</span> of <span className="text-white">{filteredSuppliers.length}</span> suppliers</p>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-[#1e293b] border border-slate-700 rounded-lg text-sm text-slate-300 hover:bg-slate-800 transition-colors">Previous</button>
            <button className="px-4 py-2 bg-[#1e293b] border border-slate-700 rounded-lg text-sm text-slate-300 hover:bg-slate-800 transition-colors">Next</button>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Add New Supplier</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Supplier Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Category</label>
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 appearance-none">
                  <option>Pharma</option>
                  <option>Surgical</option>
                  <option>FMCG</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Contact Person</label>
                <input required type="text" value={formData.contact_person} onChange={e => setFormData({...formData, contact_person: e.target.value})} className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Phone Number</label>
                <input required type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="submit" className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 rounded-lg transition-colors">
                  Save Supplier
                </button>
                <button type="button" onClick={() => setShowAddModal(false)} className="px-8 bg-[#1e293b] border border-slate-700 hover:bg-slate-800 text-white font-medium py-3 rounded-lg transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pending Payments Modal */}
      {showPendingModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-red-500" /> Pending Payments
              </h2>
              <button onClick={() => setShowPendingModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-6">
              <div className="space-y-4">
                {pendingBySupplier.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-4">
                      <Check className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">All Caught Up!</h3>
                    <p className="text-slate-400">There are no pending payments to suppliers.</p>
                  </div>
                ) : (
                  pendingBySupplier.map(({ supplier, totalAmount, invoiceCount, lastDate }) => (
                    <div key={supplier.id} className="bg-[#1e293b] border border-slate-800 rounded-xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-white mb-1">{supplier.name}</h3>
                        <p className="text-sm text-slate-400">
                          {invoiceCount} pending invoice{invoiceCount !== 1 ? 's' : ''} 
                          {lastDate && ` • Last added ${format(new Date(lastDate), 'MMM dd, yyyy')}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="text-right">
                          <p className="text-sm text-slate-400 mb-1">Total Due</p>
                          <p className="text-2xl font-bold text-red-400">{currencySymbol}{totalAmount.toFixed(2)}</p>
                        </div>
                        <button 
                          onClick={() => handleMarkPaid(supplier.id!)}
                          className="px-6 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 font-medium rounded-lg flex items-center gap-2 transition-colors"
                        >
                          <Check className="w-5 h-5" /> Mark Paid
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
