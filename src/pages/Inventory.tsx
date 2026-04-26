import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Filter, ChevronLeft, ChevronRight, Pill, Syringe, Activity, Package, Truck, Clock, AlertTriangle, X, History, Save, Download } from 'lucide-react';
import { getInventory, addInventory, InventoryItem, getSuppliers, getLogs, Supplier, StockLog } from '../lib/db';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

export default function Inventory() {
  const { user } = useAuth();
  const { settings, currencySymbol } = useSettings();
  
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [logs, setLogs] = useState<StockLog[]>([]);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedStockStatus, setSelectedStockStatus] = useState('All Stock Status');
  
  // Form state
  const [formData, setFormData] = useState({
    medicine_name: '',
    category: 'Tablet',
    brand: '',
    batch_no: '',
    expiry_date: '',
    total_qty: 0,
    unit_price: 0,
    mrp: 0,
    gst_percent: settings?.gst_default || 0,
    supplier_id: 0,
    payment_status: 'paid' as 'paid' | 'pending'
  });

  // Bulk add state
  const [bulkItems, setBulkItems] = useState<any[]>([{
    id: Date.now(),
    medicine_name: '',
    category: 'Tablet',
    brand: '',
    batch_no: '',
    expiry_date: '',
    total_qty: 0,
    unit_price: 0,
    mrp: 0,
    gst_percent: settings?.gst_default || 0,
    supplier_id: 0,
    payment_status: 'paid'
  }]);

  useEffect(() => {
    // Whenever settings change and form is essentially empty, apply default GST
    setFormData(prev => ({ ...prev, gst_percent: prev.gst_percent === 0 ? (settings?.gst_default || 0) : prev.gst_percent }));
    setBulkItems(prev => prev.map(item => ({ ...item, gst_percent: item.gst_percent === 0 ? (settings?.gst_default || 0) : item.gst_percent })));
  }, [settings]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [invData, supData, logsData] = await Promise.all([
      getInventory(),
      getSuppliers(),
      getLogs()
    ]);
    setInventory(invData);
    setSuppliers(supData);
    setLogs(logsData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const invoice_amount = formData.total_qty * formData.unit_price;
    await addInventory({
      medicine_name: formData.medicine_name,
      category: formData.category,
      brand: formData.brand,
      batch_no: formData.batch_no,
      expiry_date: formData.expiry_date,
      total_qty: formData.total_qty,
      unit_price: formData.unit_price,
      mrp: formData.mrp,
      gst_percent: formData.gst_percent,
      supplier_id: formData.supplier_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, {
      status: formData.payment_status,
      amount: invoice_amount
    });
    setShowAddModal(false);
    loadData();
    // Reset form
    setFormData({
      medicine_name: '', category: 'Tablet', brand: '', batch_no: '', expiry_date: '',
      total_qty: 0, unit_price: 0, mrp: 0, gst_percent: settings?.gst_default || 0, supplier_id: suppliers[0]?.id || 0, payment_status: 'paid'
    });
  };

  const handleBulkAdd = async () => {
    // Basic validation
    const validItems = bulkItems.filter(item => item.medicine_name && item.batch_no && item.expiry_date);
    if (validItems.length === 0) {
      alert("Please fill in at least one valid row.");
      return;
    }

    for (const item of validItems) {
      const { id, payment_status, ...itemData } = item;
      const invoice_amount = itemData.total_qty * itemData.unit_price;
      await addInventory({
        ...itemData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        status: payment_status,
        amount: invoice_amount
      });
    }
    
    setShowBulkAddModal(false);
    loadData();
    setBulkItems([{
      id: Date.now(), medicine_name: '', category: 'Tablet', brand: '', batch_no: '',
      expiry_date: '', total_qty: 0, unit_price: 0, mrp: 0, gst_percent: settings?.gst_default || 0, supplier_id: suppliers[0]?.id || 0, payment_status: 'paid'
    }]);
  };

  const addBulkRow = () => {
    setBulkItems([...bulkItems, {
      id: Date.now(), medicine_name: '', category: 'Tablet', brand: '', batch_no: '',
      expiry_date: '', total_qty: 0, unit_price: 0, mrp: 0, gst_percent: settings?.gst_default || 0, supplier_id: suppliers[0]?.id || 0, payment_status: 'paid'
    }]);
  };

  const updateBulkRow = (id: number, field: string, value: any) => {
    setBulkItems(bulkItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeBulkRow = (id: number) => {
    if (bulkItems.length > 1) {
      setBulkItems(bulkItems.filter(item => item.id !== id));
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'tablet': return <Pill className="w-4 h-4" />;
      case 'syrup': return <Activity className="w-4 h-4" />;
      case 'injection': return <Syringe className="w-4 h-4" />;
      default: return <Pill className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'tablet': return 'bg-blue-500/20 text-blue-400';
      case 'syrup': return 'bg-purple-500/20 text-purple-400';
      case 'ointment': return 'bg-emerald-500/20 text-emerald-400';
      case 'injection': return 'bg-indigo-500/20 text-indigo-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  // Computed Values
  const uniqueCategories = useMemo(() => {
    const cats = new Set(inventory.map(i => i.category));
    return ['All Categories', ...Array.from(cats)];
  }, [inventory]);

  const lowStockThreshold = settings?.global_low_stock_threshold || 50;
  const expiryLeadTime = settings?.expiry_alert_lead_time || 60;

  const lowStockCount = useMemo(() => inventory.filter(i => i.total_qty < lowStockThreshold).length, [inventory, lowStockThreshold]);
  
  const expiringSoonCount = useMemo(() => {
    const now = new Date().getTime();
    return inventory.filter(i => {
      const days = (new Date(i.expiry_date).getTime() - now) / (1000 * 3600 * 24);
      return days > 0 && days <= expiryLeadTime;
    }).length;
  }, [inventory, expiryLeadTime]);

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const supplierName = suppliers.find(s => s.id === item.supplier_id)?.name || '';
      const matchesSearch = 
        item.medicine_name.toLowerCase().includes(searchLower) ||
        item.batch_no.toLowerCase().includes(searchLower) ||
        item.brand.toLowerCase().includes(searchLower) ||
        item.category.toLowerCase().includes(searchLower) ||
        supplierName.toLowerCase().includes(searchLower);

      // Category filter
      const matchesCategory = selectedCategory === 'All Categories' || item.category === selectedCategory;

      // Status filter
      let matchesStatus = true;
      if (selectedStockStatus === 'In Stock') matchesStatus = item.total_qty >= lowStockThreshold;
      if (selectedStockStatus === 'Low Stock') matchesStatus = item.total_qty > 0 && item.total_qty < lowStockThreshold;
      if (selectedStockStatus === 'Out of Stock') matchesStatus = item.total_qty === 0;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [inventory, searchTerm, selectedCategory, selectedStockStatus, suppliers, lowStockThreshold]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Medicine Inventory</h1>
          <p className="text-slate-400">Manage stock levels, expiry dates, and medicine details.</p>
        </div>
      </div>

      {/* Top Filters */}
      <div className="flex gap-4 flex-col md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input 
            type="text" 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by medicine name, batch number, brand, or supplier..." 
            className="w-full bg-[#1e293b] border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <select 
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          className="bg-[#1e293b] border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 appearance-none min-w-[160px]"
        >
          {uniqueCategories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <select 
          value={selectedStockStatus}
          onChange={e => setSelectedStockStatus(e.target.value)}
          className="bg-[#1e293b] border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 appearance-none min-w-[160px]"
        >
          <option>All Stock Status</option>
          <option>In Stock</option>
          <option>Low Stock</option>
          <option>Out of Stock</option>
        </select>
        <button 
          onClick={() => {
            const header = ['ID', 'Name', 'Brand', 'Category', 'Batch No', 'Expiry', 'Total Qty', 'Min Threshold', 'Purchase Price', 'Sell Price'];
            const csv = [header, ...filteredInventory.map(item => [
              item.id,
              `"${item.medicine_name}"`,
              `"${item.brand}"`,
              item.category,
              item.batch_no,
              item.expiry_date,
              item.total_qty,
              item.min_threshold,
              item.purchase_price,
              item.mrp
            ])].map(e => e.join(",")).join("\n");
            
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `inventory_report_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
          }}
          className="px-4 py-3 bg-[#1e293b] border border-slate-700 hover:bg-slate-800 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
        >
          <Download className="w-5 h-5" /> Export DB
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[#1e293b] rounded-xl p-6 border-l-4 border-blue-500 shadow-lg flex justify-between items-center">
          <div>
            <p className="text-slate-400 text-sm mb-1">Total Medicines</p>
            <h2 className="text-3xl font-bold text-white">{inventory.length}</h2>
          </div>
          <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
            <Package className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-[#1e293b] rounded-xl p-6 border-l-4 border-amber-500 shadow-lg flex justify-between items-center">
          <div>
            <p className="text-slate-400 text-sm mb-1">Low Stock</p>
            <h2 className="text-3xl font-bold text-white">{lowStockCount}</h2>
          </div>
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-[#1e293b] rounded-xl p-6 border-l-4 border-red-500 shadow-lg flex justify-between items-center">
          <div>
            <p className="text-slate-400 text-sm mb-1">Expiring Soon</p>
            <h2 className="text-3xl font-bold text-white">{expiringSoonCount}</h2>
          </div>
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
            <Clock className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-[#1e293b] rounded-xl p-6 border-l-4 border-emerald-500 shadow-lg flex justify-between items-center">
          <div>
            <p className="text-slate-400 text-sm mb-1">Active Suppliers</p>
            <h2 className="text-3xl font-bold text-white">{suppliers.length}</h2>
          </div>
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <Truck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-[#1e293b] rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 uppercase border-b border-slate-800 bg-[#0f172a]/50">
              <tr>
                <th className="px-6 py-4 font-medium">Medicine Name</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">Batch No.</th>
                <th className="px-6 py-4 font-medium">Expiry Date</th>
                <th className="px-6 py-4 font-medium">Stock</th>
                <th className="px-6 py-4 font-medium">Supplier</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">No medicines found.</td>
                </tr>
              ) : (
                filteredInventory.map((item) => (
                  <tr key={item.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", getCategoryColor(item.category))}>
                          {getCategoryIcon(item.category)}
                        </div>
                        <div>
                          <p className="text-white font-medium">{item.medicine_name}</p>
                          <p className="text-xs text-slate-500">{item.brand}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("px-3 py-1 rounded-full text-xs font-medium", getCategoryColor(item.category))}>
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-300">#{item.batch_no}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-slate-300",
                        new Date(item.expiry_date) < new Date() ? "text-red-500 font-medium" : ""
                      )}>
                        {format(new Date(item.expiry_date), 'MMM dd, yyyy')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "font-medium",
                        item.total_qty < lowStockThreshold ? "text-red-500" : "text-emerald-500"
                      )}>
                        {item.total_qty} units
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {suppliers.find(s => s.id === item.supplier_id)?.name || 'Unknown'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-800 flex justify-between items-center bg-[#0f172a]/50">
          <p className="text-sm text-slate-400">Showing <span className="text-white">{filteredInventory.length > 0 ? 1 : 0}</span> to <span className="text-white">{filteredInventory.length}</span> of <span className="text-white">{filteredInventory.length}</span> results</p>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-[#1e293b] border border-slate-700 rounded-lg text-sm text-slate-300 hover:bg-slate-800 transition-colors">Previous</button>
            <button className="px-4 py-2 bg-[#1e293b] border border-slate-700 rounded-lg text-sm text-slate-300 hover:bg-slate-800 transition-colors">Next</button>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <button 
          onClick={() => setShowLogsModal(true)}
          className="px-6 py-3 bg-[#1e293b] border border-slate-700 hover:bg-slate-800 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          <History className="w-5 h-5" /> Updates history
        </button>
        <div className="flex gap-4 flex-col sm:flex-row">
          <button 
            onClick={() => setShowBulkAddModal(true)} 
            className="px-6 py-3 bg-[#1e293b] border border-blue-500/50 hover:bg-slate-800 text-blue-400 font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <Package className="w-5 h-5" /> Add Multiple Medicines
          </button>
          <button 
            onClick={() => setShowAddModal(true)} 
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" /> Add New Stock
          </button>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-2xl my-8 overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-[#0f172a] z-10">
              <h2 className="text-xl font-bold text-white">Add New Medicine</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleAdd} className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="bg-[#1e293b] p-6 rounded-xl border border-slate-800">
                <h3 className="text-sm font-medium text-blue-400 mb-4 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-xs">i</span>
                  Basic Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Medicine Name</label>
                    <input required type="text" value={formData.medicine_name} onChange={e => setFormData({...formData, medicine_name: e.target.value})} className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" placeholder="e.g. Amoxicillin 500mg" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Category</label>
                      <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 appearance-none">
                        <option>Tablet</option>
                        <option>Syrup</option>
                        <option>Ointment</option>
                        <option>Injection</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Brand / Manufacturer</label>
                      <input required type="text" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" placeholder="e.g. Pfizer Inc." />
                    </div>
                  </div>
                </div>
              </div>

              {/* Stock & Pricing */}
              <div className="bg-[#1e293b] p-6 rounded-xl border border-slate-800">
                <h3 className="text-sm font-medium text-blue-400 mb-4 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-xs">{currencySymbol}</span>
                  Stock & Pricing
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Total Quantity</label>
                    <input required type="number" value={formData.total_qty} onChange={e => setFormData({...formData, total_qty: parseInt(e.target.value) || 0})} className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Unit Price</label>
                    <input required type="number" step="0.01" value={formData.unit_price} onChange={e => setFormData({...formData, unit_price: parseFloat(e.target.value) || 0})} className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">MRP</label>
                    <input required type="number" step="0.01" value={formData.mrp} onChange={e => setFormData({...formData, mrp: parseFloat(e.target.value) || 0})} className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">GST %</label>
                    <select value={formData.gst_percent} onChange={e => setFormData({...formData, gst_percent: parseFloat(e.target.value) || 0})} className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 appearance-none">
                      <option value="0">0%</option>
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Batch & Supply */}
              <div className="bg-[#1e293b] p-6 rounded-xl border border-slate-800">
                <h3 className="text-sm font-medium text-blue-400 mb-4 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-xs">#</span>
                  Batch & Supply
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Batch Number</label>
                    <input required type="text" value={formData.batch_no} onChange={e => setFormData({...formData, batch_no: e.target.value})} className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" placeholder="e.g. BTH-99201" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Expiry Date</label>
                    <input required type="date" value={formData.expiry_date} onChange={e => setFormData({...formData, expiry_date: e.target.value})} className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Supplier</label>
                    <select 
                      required
                      value={formData.supplier_id} 
                      onChange={e => setFormData({...formData, supplier_id: parseInt(e.target.value)})} 
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 appearance-none"
                    >
                      <option value="0" disabled>Select supplier</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Payment Status</label>
                    <select 
                      value={formData.payment_status} 
                      onChange={e => setFormData({...formData, payment_status: e.target.value as 'paid' | 'pending'})} 
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 appearance-none"
                    >
                      <option value="paid">Paid</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4 sticky bottom-0 bg-[#0f172a] py-4 border-t border-slate-800">
                <button type="submit" className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 rounded-lg transition-colors">
                  Save Medicine
                </button>
                <button type="button" onClick={() => setShowAddModal(false)} className="px-8 bg-[#1e293b] border border-slate-700 hover:bg-slate-800 text-white font-medium py-3 rounded-lg transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Updates History Modal */}
      {showLogsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-blue-500" /> Inventory Logs
              </h2>
              <button onClick={() => setShowLogsModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-6">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-400 uppercase border-b border-slate-800 bg-[#1e293b]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date & Time</th>
                    <th className="px-4 py-3 font-medium">Medicine Name</th>
                    <th className="px-4 py-3 font-medium">Batch No.</th>
                    <th className="px-4 py-3 font-medium">Change Type</th>
                    <th className="px-4 py-3 font-medium text-right">Qty Change</th>
                    <th className="px-4 py-3 font-medium text-right">Updated Total</th>
                    <th className="px-4 py-3 font-medium">Performed By</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">No inventory logs found.</td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.log_id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                        <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                          {format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm')}
                        </td>
                        <td className="px-4 py-3 text-white font-medium">{log.medicine_name}</td>
                        <td className="px-4 py-3 text-slate-400">{log.batch_no}</td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "px-2 py-1 rounded text-xs font-medium capitalize",
                            log.change_type === 'added' ? 'bg-emerald-500/10 text-emerald-400' :
                            log.change_type === 'sale' ? 'bg-blue-500/10 text-blue-400' :
                            log.change_type === 'removed' ? 'bg-red-500/10 text-red-400' :
                            'bg-slate-500/10 text-slate-400'
                          )}>
                            {log.change_type}
                          </span>
                        </td>
                        <td className={cn(
                          "px-4 py-3 text-right font-medium",
                          log.qty_change > 0 ? "text-emerald-400" : "text-red-400"
                        )}>
                          {log.qty_change > 0 ? '+' : ''}{log.qty_change}
                        </td>
                        <td className="px-4 py-3 text-right text-white font-medium">{log.updated_total}</td>
                        <td className="px-4 py-3 text-slate-400">{user?.name || user?.email || 'System'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Add Modal */}
      {showBulkAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-[95vw] max-h-[95vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-500" /> Add Multiple Medicines
              </h2>
              <button onClick={() => setShowBulkAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-6">
              <div className="min-w-max">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-400 uppercase border-b border-slate-800 bg-[#1e293b]">
                    <tr>
                      <th className="px-2 py-3 font-medium w-48">Medicine Name</th>
                      <th className="px-2 py-3 font-medium w-32">Category</th>
                      <th className="px-2 py-3 font-medium w-32">Brand</th>
                      <th className="px-2 py-3 font-medium w-24">Qty</th>
                      <th className="px-2 py-3 font-medium w-24">Price</th>
                      <th className="px-2 py-3 font-medium w-24">MRP</th>
                      <th className="px-2 py-3 font-medium w-20">GST %</th>
                      <th className="px-2 py-3 font-medium w-32">Batch No.</th>
                      <th className="px-2 py-3 font-medium w-36">Expiry Date</th>
                      <th className="px-2 py-3 font-medium w-40">Supplier</th>
                      <th className="px-2 py-3 font-medium w-32">Payment</th>
                      <th className="px-2 py-3 font-medium w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkItems.map((item, index) => (
                      <tr key={item.id} className="border-b border-slate-800/50">
                        <td className="px-2 py-2">
                          <input type="text" value={item.medicine_name} onChange={e => updateBulkRow(item.id, 'medicine_name', e.target.value)} className="w-full bg-[#1e293b] border border-slate-700 rounded px-2 py-1.5 text-white focus:outline-none focus:border-blue-500" placeholder="Name" />
                        </td>
                        <td className="px-2 py-2">
                          <select value={item.category} onChange={e => updateBulkRow(item.id, 'category', e.target.value)} className="w-full bg-[#1e293b] border border-slate-700 rounded px-2 py-1.5 text-white focus:outline-none focus:border-blue-500">
                            <option>Tablet</option>
                            <option>Syrup</option>
                            <option>Ointment</option>
                            <option>Injection</option>
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <input type="text" value={item.brand} onChange={e => updateBulkRow(item.id, 'brand', e.target.value)} className="w-full bg-[#1e293b] border border-slate-700 rounded px-2 py-1.5 text-white focus:outline-none focus:border-blue-500" placeholder="Brand" />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" value={item.total_qty || ''} onChange={e => updateBulkRow(item.id, 'total_qty', parseInt(e.target.value) || 0)} className="w-full bg-[#1e293b] border border-slate-700 rounded px-2 py-1.5 text-white focus:outline-none focus:border-blue-500" placeholder="Qty" />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" step="0.01" value={item.unit_price || ''} onChange={e => updateBulkRow(item.id, 'unit_price', parseFloat(e.target.value) || 0)} className="w-full bg-[#1e293b] border border-slate-700 rounded px-2 py-1.5 text-white focus:outline-none focus:border-blue-500" placeholder="Price" />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" step="0.01" value={item.mrp || ''} onChange={e => updateBulkRow(item.id, 'mrp', parseFloat(e.target.value) || 0)} className="w-full bg-[#1e293b] border border-slate-700 rounded px-2 py-1.5 text-white focus:outline-none focus:border-blue-500" placeholder="MRP" />
                        </td>
                        <td className="px-2 py-2">
                          <select value={item.gst_percent} onChange={e => updateBulkRow(item.id, 'gst_percent', parseFloat(e.target.value) || 0)} className="w-full bg-[#1e293b] border border-slate-700 rounded px-2 py-1.5 text-white focus:outline-none focus:border-blue-500">
                            <option value="0">0%</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <input type="text" value={item.batch_no} onChange={e => updateBulkRow(item.id, 'batch_no', e.target.value)} className="w-full bg-[#1e293b] border border-slate-700 rounded px-2 py-1.5 text-white focus:outline-none focus:border-blue-500" placeholder="Batch" />
                        </td>
                        <td className="px-2 py-2">
                          <input type="date" value={item.expiry_date} onChange={e => updateBulkRow(item.id, 'expiry_date', e.target.value)} className="w-full bg-[#1e293b] border border-slate-700 rounded px-2 py-1.5 text-white focus:outline-none focus:border-blue-500" />
                        </td>
                        <td className="px-2 py-2">
                          <select value={item.supplier_id} onChange={e => updateBulkRow(item.id, 'supplier_id', parseInt(e.target.value))} className="w-full bg-[#1e293b] border border-slate-700 rounded px-2 py-1.5 text-white focus:outline-none focus:border-blue-500">
                            <option value="0" disabled>Supplier</option>
                            {suppliers.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <select value={item.payment_status} onChange={e => updateBulkRow(item.id, 'payment_status', e.target.value)} className="w-full bg-[#1e293b] border border-slate-700 rounded px-2 py-1.5 text-white focus:outline-none focus:border-blue-500">
                            <option value="paid">Paid</option>
                            <option value="pending">Pending</option>
                          </select>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button onClick={() => removeBulkRow(item.id)} className="text-slate-500 hover:text-red-400 p-1">
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button 
                onClick={addBulkRow}
                className="mt-4 px-4 py-2 bg-[#1e293b] border border-slate-700 hover:bg-slate-800 text-blue-400 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Row
              </button>
            </div>
            
            <div className="p-6 border-t border-slate-800 flex justify-end gap-4 bg-[#0f172a]">
              <button 
                onClick={() => setShowBulkAddModal(false)} 
                className="px-6 py-2.5 bg-[#1e293b] border border-slate-700 hover:bg-slate-800 text-white font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleBulkAdd}
                className="px-8 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg flex items-center gap-2 transition-colors"
              >
                <Save className="w-5 h-5" /> Save All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
