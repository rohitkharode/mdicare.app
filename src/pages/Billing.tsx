import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Search, Plus, Trash2, Printer, PauseCircle, ShoppingCart, Clock, X, CheckCircle2 } from 'lucide-react';
import { getInventory, createBill, InventoryItem, BillingItem, Bill } from '../lib/db';
import { useSettings } from '../context/SettingsContext';

export default function Billing() {
  const { settings, currencySymbol } = useSettings();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<InventoryItem[]>([]);
  
  const [billItems, setBillItems] = useState<BillingItem[]>([]);
  const [customerName, setCustomerName] = useState('John Doe');
  const [customerPhone, setCustomerPhone] = useState('+1 (555) 000-1234');
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [modalQty, setModalQty] = useState('1');
  const [modalDiscount, setModalDiscount] = useState('0');

  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Pending'>('Paid');

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    const data = await getInventory();
    setInventory(data);
  };

  useEffect(() => {
    if (searchTerm.length > 1) {
      const results = inventory.filter(item => 
        item.medicine_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.batch_no.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setSearchResults(results.slice(0, 5));
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, inventory]);

  const handleItemClick = (item: InventoryItem) => {
    setSelectedItem(item);
    setModalQty('1');
    setModalDiscount('0');
    setSearchTerm('');
    setSearchResults([]);
  };

  const confirmAddItem = () => {
    if (!selectedItem) return;
    
    const qty = parseInt(modalQty) || 0;
    const discountPercent = parseFloat(modalDiscount) || 0;

    if (qty <= 0) {
      alert('Quantity must be greater than 0');
      return;
    }
    if (qty > selectedItem.total_qty) {
      alert(`Only ${selectedItem.total_qty} units available in stock`);
      return;
    }

    const price = selectedItem.unit_price;
    const gst = selectedItem.gst_percent;
    
    // Calculate item total: (price * qty) - discount
    const baseTotal = price * qty;
    const discountAmount = baseTotal * (discountPercent / 100);
    const afterDiscount = baseTotal - discountAmount;
    const total = afterDiscount * (1 + gst / 100);
    
    const existingItemIndex = billItems.findIndex(b => b.item_id === selectedItem.id);
    
    if (existingItemIndex >= 0) {
      const newItems = [...billItems];
      const existing = newItems[existingItemIndex];
      const newQty = existing.qty + qty;
      
      if (newQty > selectedItem.total_qty) {
        alert(`Cannot add more. Only ${selectedItem.total_qty} units available in stock`);
        return;
      }

      const newBaseTotal = price * newQty;
      const newDiscountAmount = newBaseTotal * (discountPercent / 100);
      const newAfterDiscount = newBaseTotal - newDiscountAmount;
      const newTotal = newAfterDiscount * (1 + gst / 100);

      newItems[existingItemIndex] = {
        ...existing,
        qty: newQty,
        discount: discountPercent,
        total: newTotal
      };
      setBillItems(newItems);
    } else {
      setBillItems([...billItems, {
        item_id: selectedItem.id!,
        medicine_name: selectedItem.medicine_name,
        batch_no: selectedItem.batch_no,
        qty,
        price,
        gst,
        discount: discountPercent,
        total
      }]);
    }
    
    setSelectedItem(null);
  };

  const removeItem = (itemId: number) => {
    setBillItems(billItems.filter(b => b.item_id !== itemId));
  };

  const subtotal = billItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const discountTotal = billItems.reduce((sum, item) => sum + (item.price * item.qty * (item.discount / 100)), 0);
  const afterDiscountTotal = subtotal - discountTotal;
  const taxTotal = billItems.reduce((sum, item) => {
    const itemAfterDiscount = (item.price * item.qty) * (1 - item.discount / 100);
    return sum + (itemAfterDiscount * (item.gst / 100));
  }, 0);
  const totalAmount = afterDiscountTotal + taxTotal;

  const handleFinalize = async () => {
    if (billItems.length === 0) return;
    
    const newBill: Omit<Bill, 'bill_id'> = {
      bill_date: new Date().toISOString(),
      customer_name: customerName,
      customer_phone: customerPhone,
      subtotal,
      tax_total: taxTotal,
      discount_total: discountTotal,
      total_amount: totalAmount,
      payment_status: paymentStatus,
      items: billItems
    };

    const billId = await createBill(newBill);
    alert(`Bill ${billId} saved successfully!`);
    setBillItems([]);
    setCustomerName('John Doe');
    setCustomerPhone('+1 (555) 000-1234');
    setPaymentStatus('Paid');
    loadInventory(); // Reload to get updated stock
  };

  return (
    <div className="flex h-full gap-6 relative overflow-hidden">
      {/* Left Pane: Search and Add */}
      <div className="w-1/3 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">New Sale Entry</h2>
          <p className="text-slate-400 text-sm">Scan barcode or search inventory manually.</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500" />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Scan barcode or search medicine..." 
            className="w-full bg-[#1e293b] border border-blue-500/50 rounded-xl pl-10 pr-12 py-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 rounded bg-slate-800 text-xs text-slate-400">
            <span>⌘</span><span>K</span>
          </div>
          
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#1e293b] border border-slate-700 rounded-xl shadow-xl z-10 overflow-hidden">
              {searchResults.map(item => (
                <div 
                  key={item.id} 
                  onClick={() => handleItemClick(item)}
                  className="p-3 hover:bg-slate-800 cursor-pointer border-b border-slate-700/50 last:border-0 flex justify-between items-center"
                >
                  <div>
                    <p className="text-white font-medium">{item.medicine_name}</p>
                    <p className="text-xs text-slate-400">Batch: {item.batch_no} • Stock: {item.total_qty}</p>
                  </div>
                  <p className="text-blue-400 font-medium">{currencySymbol}{item.unit_price.toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Commonly Dispensed</p>
          <div className="flex flex-wrap gap-2">
            {inventory.slice(0, 4).map(med => (
              <button 
                key={med.id} 
                onClick={() => handleItemClick(med)}
                className="px-4 py-2 rounded-lg bg-[#1e293b] border border-slate-700 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
              >
                {med.medicine_name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-2">Prescribing Doctor</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🩺</span>
            <input type="text" placeholder="Dr. Name (Optional)" className="w-full bg-[#1e293b] border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500" />
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-2">Notes / Instructions</label>
          <textarea placeholder="Dosage instructions..." className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 h-24 resize-none"></textarea>
        </div>
      </div>

      {/* Right Pane: Current Bill */}
      <div className="flex-1 bg-[#1e293b] border border-slate-800 rounded-xl flex flex-col overflow-hidden h-full">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-[#0f172a]/50">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">Current Bill</h2>
            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-medium rounded">New Order</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Clock className="w-4 h-4" />
            {format(new Date(), 'MMM dd, yyyy • hh:mm a')}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 uppercase border-b border-slate-800">
              <tr>
                <th className="pb-3 font-medium">Item Name</th>
                <th className="pb-3 font-medium">Batch</th>
                <th className="pb-3 font-medium text-center">Qty</th>
                <th className="pb-3 font-medium text-right">Price</th>
                <th className="pb-3 font-medium text-right">Disc.</th>
                <th className="pb-3 font-medium text-right">GST</th>
                <th className="pb-3 font-medium text-right">Total</th>
                <th className="pb-3"></th>
              </tr>
            </thead>
            <tbody>
              {billItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">No items added to bill yet.</td>
                </tr>
              ) : (
                billItems.map((item) => (
                  <tr key={item.item_id} className="border-b border-slate-800/50 last:border-0">
                    <td className="py-4">
                      <p className="text-white font-medium">{item.medicine_name}</p>
                      <p className="text-xs text-slate-500">Medicine</p>
                    </td>
                    <td className="py-4 text-slate-300">{item.batch_no}</td>
                    <td className="py-4 text-center">
                      <span className="inline-block px-2 py-1 bg-[#0f172a] border border-slate-700 rounded text-white">{item.qty}</span>
                    </td>
                    <td className="py-4 text-right text-slate-300">{currencySymbol}{item.price.toFixed(2)}</td>
                    <td className="py-4 text-right text-amber-400">{item.discount}%</td>
                    <td className="py-4 text-right text-slate-300">{item.gst}%</td>
                    <td className="py-4 text-right text-white font-bold">{currencySymbol}{item.total.toFixed(2)}</td>
                    <td className="py-4 text-right">
                      <button onClick={() => removeItem(item.item_id)} className="text-slate-500 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-6 bg-[#0f172a]/50 border-t border-slate-800">
          <div className="flex justify-between items-end mb-6">
            <div className="w-1/3">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-medium text-white">Customer Details</p>
                <button 
                  onClick={() => setIsEditingCustomer(!isEditingCustomer)}
                  className="text-xs text-blue-500 hover:text-blue-400"
                >
                  {isEditingCustomer ? 'Done' : 'Edit'}
                </button>
              </div>
              <div className="flex items-center gap-3 bg-[#1e293b] border border-slate-700 rounded-lg p-3">
                <div className="w-10 h-10 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-400 font-medium flex-shrink-0">
                  {customerName.substring(0, 2).toUpperCase() || 'C'}
                </div>
                <div className="flex-1">
                  {isEditingCustomer ? (
                    <div className="space-y-2">
                      <input 
                        type="text" 
                        value={customerName} 
                        onChange={e => setCustomerName(e.target.value)}
                        className="w-full bg-[#0f172a] border border-slate-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                        placeholder="Customer Name"
                      />
                      <input 
                        type="text" 
                        value={customerPhone} 
                        onChange={e => setCustomerPhone(e.target.value)}
                        className="w-full bg-[#0f172a] border border-slate-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                        placeholder="Phone Number"
                      />
                    </div>
                  ) : (
                    <>
                      <p className="text-white font-medium text-sm">{customerName || 'Walk-in Customer'}</p>
                      <p className="text-xs text-slate-400">{customerPhone || 'No phone provided'}</p>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex gap-6">
              <div>
                <p className="text-sm text-slate-400 mb-1">Subtotal</p>
                <p className="text-lg text-white">{currencySymbol}{subtotal.toFixed(2)}</p>
              </div>
              {discountTotal > 0 && (
                <div>
                  <p className="text-sm text-slate-400 mb-1">Discount</p>
                  <p className="text-lg text-amber-400">-{currencySymbol}{discountTotal.toFixed(2)}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-slate-400 mb-1">Tax (GST)</p>
                <p className="text-lg text-white">{currencySymbol}{taxTotal.toFixed(2)}</p>
              </div>
              <div className="text-right ml-4">
                <p className="text-sm text-slate-400 mb-1 uppercase tracking-wider font-semibold">Total Amount</p>
                <p className="text-3xl font-bold text-white">{currencySymbol}{totalAmount.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex bg-[#1e293b] border border-slate-700 rounded-lg overflow-hidden">
              <button 
                onClick={() => setPaymentStatus('Paid')}
                className={`px-6 py-3 flex items-center gap-2 font-medium transition-colors ${paymentStatus === 'Paid' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:bg-slate-800'}`}
              >
                <CheckCircle2 className="w-4 h-4" /> Paid
              </button>
              <div className="w-px bg-slate-700"></div>
              <button 
                onClick={() => setPaymentStatus('Pending')}
                className={`px-6 py-3 flex items-center gap-2 font-medium transition-colors ${paymentStatus === 'Pending' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:bg-slate-800'}`}
              >
                <Clock className="w-4 h-4" /> Pending
              </button>
            </div>
            <button 
              onClick={handleFinalize}
              disabled={billItems.length === 0}
              className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors text-lg"
            >
              <Printer className="w-5 h-5" /> Print & Finalize
            </button>
          </div>
        </div>
      </div>

      {/* Add Item Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-[#0f172a]/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#1e293b] border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-[#0f172a]/50">
              <h3 className="text-lg font-bold text-white">Add Item to Bill</h3>
              <button onClick={() => setSelectedItem(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-white font-medium text-lg">{selectedItem.medicine_name}</p>
                <p className="text-sm text-slate-400">Batch: {selectedItem.batch_no} • Price: {currencySymbol}{selectedItem.unit_price.toFixed(2)}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Quantity (Max: {selectedItem.total_qty})</label>
                  <input 
                    type="number" 
                    min="1" 
                    max={selectedItem.total_qty} 
                    value={modalQty} 
                    onChange={e => setModalQty(e.target.value)} 
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Discount (%)</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="100" 
                    value={modalDiscount} 
                    onChange={e => setModalDiscount(e.target.value)} 
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" 
                  />
                </div>
              </div>

              <div className="bg-[#0f172a] p-4 rounded-lg mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Base Total:</span>
                  <span className="text-white">{currencySymbol}{(selectedItem.unit_price * (parseInt(modalQty) || 0)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Discount:</span>
                  <span className="text-amber-400">-{currencySymbol}{((selectedItem.unit_price * (parseInt(modalQty) || 0)) * ((parseFloat(modalDiscount) || 0) / 100)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">GST ({selectedItem.gst_percent}%):</span>
                  <span className="text-white">{currencySymbol}{(((selectedItem.unit_price * (parseInt(modalQty) || 0)) * (1 - (parseFloat(modalDiscount) || 0) / 100)) * (selectedItem.gst_percent / 100)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-bold border-t border-slate-700 pt-2 mt-2">
                  <span className="text-white">Final Total:</span>
                  <span className="text-blue-400">
                    {currencySymbol}{((selectedItem.unit_price * (parseInt(modalQty) || 0)) * (1 - (parseFloat(modalDiscount) || 0) / 100) * (1 + selectedItem.gst_percent / 100)).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-700 bg-[#0f172a]/50 flex justify-end gap-3">
              <button 
                onClick={() => setSelectedItem(null)} 
                className="px-4 py-2 text-slate-300 hover:text-white font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmAddItem} 
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg flex items-center gap-2 transition-colors"
              >
                <ShoppingCart className="w-4 h-4" /> Add to Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
