import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface InventoryItem {
  id?: number;
  medicine_name: string;
  category: string;
  brand: string;
  batch_no: string;
  expiry_date: string;
  total_qty: number;
  unit_price: number;
  mrp: number;
  gst_percent: number;
  supplier_id?: number;
  created_at: string;
  updated_at: string;
  expiry_notified?: boolean;
  in_order_list?: boolean;
}

export interface Supplier {
  id?: number;
  name: string;
  category: string;
  contact_person: string;
  phone: string;
  last_order: string;
  rating: number;
  pending_payments: number;
}

export interface BillingItem {
  item_id: number;
  medicine_name: string;
  batch_no: string;
  qty: number;
  price: number;
  gst: number;
  discount: number;
  total: number;
}

export interface Bill {
  bill_id: string;
  bill_date: string;
  customer_name: string;
  customer_phone: string;
  subtotal: number;
  tax_total: number;
  discount_total: number;
  total_amount: number;
  payment_status: string;
  items: BillingItem[];
}

export interface StockLog {
  log_id?: number;
  medicine_id: number;
  medicine_name: string;
  batch_no: string;
  change_type: 'added' | 'removed' | 'sale' | 'expired' | 'correction';
  qty_change: number;
  updated_total: number;
  timestamp: string;
  supplier_id?: number;
  invoice_amount?: number;
  payment_status?: 'paid' | 'pending';
}

export interface Settings {
  id: number;
  global_low_stock_threshold: number;
  expiry_alert_lead_time: number;
  gst_default: number;
  currency: string;
  invoice_prefix: string;
  ui_mode: 'light' | 'dark';
  accent_color: string;
}

export interface User {
  email: string;
  passwordHash: string;
  name: string;
  created_at: string;
}

export interface UserProfile {
  id: number;
  full_name: string;
  phone_number: string;
  shop_name: string;
  address: string;
  license_number: string;
  email_notifications: boolean;
  sms_notifications: boolean;
  push_alerts: boolean;
  ui_mode: 'light' | 'dark';
}

export interface Notification {
  id?: number;
  title: string;
  message: string;
  timestamp: string;
  type: 'bill' | 'low_stock' | 'expiry';
  read: boolean;
}

interface MdiCareDB extends DBSchema {
  inventory: {
    key: number;
    value: InventoryItem;
    indexes: { 'by-name': string; 'by-expiry': string };
  };
  suppliers: {
    key: number;
    value: Supplier;
  };
  billing: {
    key: string;
    value: Bill;
    indexes: { 'by-date': string };
  };
  stock_logs: {
    key: number;
    value: StockLog;
    indexes: { 'by-medicine': number; 'by-date': string };
  };
  settings: {
    key: number;
    value: Settings;
  };
  users: {
    key: string;
    value: User;
  };
  user_profile: {
    key: number;
    value: UserProfile;
  };
  notifications: {
    key: number;
    value: Notification;
    indexes: { 'by-timestamp': string; 'by-read': number };
  };
  billing_metadata: {
    key: string;
    value: { id: string; last_bill_id: number };
  };
}

let dbPromise: Promise<IDBPDatabase<MdiCareDB>>;

export const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<MdiCareDB>('mdicareDB', 4, {
      upgrade(db, oldVersion, newVersion, transaction) {
        if (!db.objectStoreNames.contains('inventory')) {
          const store = db.createObjectStore('inventory', { keyPath: 'id', autoIncrement: true });
          store.createIndex('by-name', 'medicine_name');
          store.createIndex('by-expiry', 'expiry_date');
        }
        if (!db.objectStoreNames.contains('suppliers')) {
          db.createObjectStore('suppliers', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('billing')) {
          const store = db.createObjectStore('billing', { keyPath: 'bill_id' });
          store.createIndex('by-date', 'bill_date');
        }
        if (!db.objectStoreNames.contains('stock_logs')) {
          const store = db.createObjectStore('stock_logs', { keyPath: 'log_id', autoIncrement: true });
          store.createIndex('by-medicine', 'medicine_id');
          store.createIndex('by-date', 'timestamp');
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('users')) {
          db.createObjectStore('users', { keyPath: 'email' });
        }
        if (!db.objectStoreNames.contains('user_profile')) {
          db.createObjectStore('user_profile', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('notifications')) {
          const store = db.createObjectStore('notifications', { keyPath: 'id', autoIncrement: true });
          store.createIndex('by-timestamp', 'timestamp');
          store.createIndex('by-read', 'read');
        }
        if (!db.objectStoreNames.contains('billing_metadata')) {
          db.createObjectStore('billing_metadata', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
};

// --- Helper Functions ---

export const getInventory = async () => {
  const db = await initDB();
  return db.getAll('inventory');
};

export const addInventory = async (item: Omit<InventoryItem, 'id'>, paymentDetails?: { status: 'paid' | 'pending', amount: number }) => {
  const db = await initDB();
  const id = await db.add('inventory', item as InventoryItem);
  
  // Add log
  await db.add('stock_logs', {
    medicine_id: id,
    medicine_name: item.medicine_name,
    batch_no: item.batch_no,
    change_type: 'added',
    qty_change: item.total_qty,
    updated_total: item.total_qty,
    timestamp: new Date().toISOString(),
    supplier_id: item.supplier_id,
    invoice_amount: paymentDetails?.amount,
    payment_status: paymentDetails?.status
  });
  
  return id;
};

export const updateInventory = async (item: InventoryItem) => {
  const db = await initDB();
  const tx = db.transaction(['inventory', 'settings', 'notifications'], 'readwrite');
  
  const oldItem = await tx.objectStore('inventory').get(item.id!);
  await tx.objectStore('inventory').put(item);

  if (oldItem) {
    const settings = await tx.objectStore('settings').get(1);
    const threshold = settings?.global_low_stock_threshold || 50;

    if (oldItem.total_qty > threshold && item.total_qty <= threshold) {
      await tx.objectStore('notifications').add({
        title: 'Low Stock Alert',
        message: `${item.medicine_name} has dropped to ${item.total_qty} units.`,
        timestamp: new Date().toISOString(),
        type: 'low_stock',
        read: false
      });
    }
  }

  await tx.done;
};

export const getSuppliers = async () => {
  const db = await initDB();
  return db.getAll('suppliers');
};

export const addSupplier = async (supplier: Omit<Supplier, 'id'>) => {
  const db = await initDB();
  return db.add('suppliers', supplier as Supplier);
};

export const getSettings = async () => {
  const db = await initDB();
  let settings = await db.get('settings', 1);
  if (!settings) {
    settings = {
      id: 1,
      global_low_stock_threshold: 50,
      expiry_alert_lead_time: 60,
      gst_default: 18,
      currency: 'USD ($)',
      invoice_prefix: 'INV-',
      ui_mode: 'dark',
      accent_color: 'blue'
    };
    await db.put('settings', settings);
  }
  return settings;
};

export const saveSettings = async (settings: Settings) => {
  const db = await initDB();
  await db.put('settings', settings);
};

export const createBill = async (bill: Omit<Bill, 'bill_id'>) => {
  const db = await initDB();
  const tx = db.transaction(['billing', 'inventory', 'stock_logs', 'notifications', 'settings', 'billing_metadata'], 'readwrite');
  
  // Get next bill ID
  let metadata = await tx.objectStore('billing_metadata').get('metadata');
  if (!metadata) {
    metadata = { id: 'metadata', last_bill_id: 0 };
  }
  metadata.last_bill_id += 1;
  await tx.objectStore('billing_metadata').put(metadata);

  const settings = await tx.objectStore('settings').get(1);
  const prefix = settings?.invoice_prefix || 'INV-';
  const newBillId = `${prefix}${metadata.last_bill_id.toString().padStart(4, '0')}`;

  const finalBill: Bill = {
    ...bill,
    bill_id: newBillId
  };

  // Save bill
  await tx.objectStore('billing').add(finalBill);
  
  // Add bill notification
  await tx.objectStore('notifications').add({
    title: 'New Bill Created',
    message: `Bill #${finalBill.bill_id} for $${finalBill.total_amount.toFixed(2)}`,
    timestamp: new Date().toISOString(),
    type: 'bill',
    read: false
  });

  const threshold = settings?.global_low_stock_threshold || 50;

  // Update inventory & add logs
  for (const item of finalBill.items) {
    const invItem = await tx.objectStore('inventory').get(item.item_id);
    if (invItem) {
      const oldQty = invItem.total_qty;
      invItem.total_qty -= item.qty;
      invItem.updated_at = new Date().toISOString();
      await tx.objectStore('inventory').put(invItem);
      
      await tx.objectStore('stock_logs').add({
        medicine_id: invItem.id!,
        medicine_name: invItem.medicine_name,
        batch_no: invItem.batch_no,
        change_type: 'sale',
        qty_change: -item.qty,
        updated_total: invItem.total_qty,
        timestamp: new Date().toISOString()
      });

      // Check low stock
      if (oldQty > threshold && invItem.total_qty <= threshold) {
        await tx.objectStore('notifications').add({
          title: 'Low Stock Alert',
          message: `${invItem.medicine_name} has dropped to ${invItem.total_qty} units.`,
          timestamp: new Date().toISOString(),
          type: 'low_stock',
          read: false
        });
      }
    }
  }
  
  await tx.done;
  return newBillId;
};

export const getBills = async () => {
  const db = await initDB();
  return db.getAll('billing');
};

export const getLogs = async () => {
  const db = await initDB();
  return db.getAll('stock_logs');
};

export const updateLog = async (log: StockLog) => {
  const db = await initDB();
  await db.put('stock_logs', log);
};

export const exportData = async () => {
  const db = await initDB();
  const data = {
    inventory: await db.getAll('inventory'),
    suppliers: await db.getAll('suppliers'),
    billing: await db.getAll('billing'),
    stock_logs: await db.getAll('stock_logs'),
    settings: await db.getAll('settings'),
  };
  return JSON.stringify(data, null, 2);
};

export const importData = async (jsonData: string) => {
  const data = JSON.parse(jsonData);
  const db = await initDB();
  const tx = db.transaction(['inventory', 'suppliers', 'billing', 'stock_logs', 'settings', 'users'], 'readwrite');
  
  for (const storeName of ['inventory', 'suppliers', 'billing', 'stock_logs', 'settings', 'users'] as const) {
    if (db.objectStoreNames.contains(storeName)) {
      await tx.objectStore(storeName).clear();
      if (data[storeName]) {
        for (const item of data[storeName]) {
          await tx.objectStore(storeName).add(item);
        }
      }
    }
  }
  await tx.done;
};

export const deleteInventoryItem = async (id: number) => {
  const db = await initDB();
  await db.delete('inventory', Number(id));
};

export const bulkReturnToSupplier = async (itemIds: number[], supplierId: number | undefined) => {
  const db = await initDB();
  const tx = db.transaction(['inventory', 'stock_logs'], 'readwrite');
  
  for (const id of itemIds) {
    const numericId = Number(id);
    const item = await tx.objectStore('inventory').get(numericId);
    if (item) {
      const removedQty = item.total_qty;
      
      // Log the return
      await tx.objectStore('stock_logs').add({
        medicine_id: numericId,
        medicine_name: item.medicine_name,
        batch_no: item.batch_no,
        change_type: 'removed',
        qty_change: -removedQty,
        updated_total: 0,
        timestamp: new Date().toISOString()
      });

      // Delete the item as its quantity is now 0
      await tx.objectStore('inventory').delete(numericId);
    }
  }
  
  await tx.done;
};

export const getUserByEmail = async (email: string) => {
  const db = await initDB();
  return db.get('users', email);
};

export const createUser = async (user: User) => {
  const db = await initDB();
  await db.add('users', user);
};

export const getUserProfile = async () => {
  const db = await initDB();
  let profile = await db.get('user_profile', 1);
  if (!profile) {
    profile = {
      id: 1,
      full_name: 'Demo Pharmacist',
      phone_number: '+1 234 567 8900',
      shop_name: 'MdiCare Pharmacy',
      address: '123 Health Ave, Medical District',
      license_number: 'PHARM-2024-9982',
      email_notifications: true,
      sms_notifications: false,
      push_alerts: true,
      ui_mode: 'dark'
    };
    await db.put('user_profile', profile);
  }
  return profile;
};

export const saveUserProfile = async (profile: UserProfile) => {
  const db = await initDB();
  await db.put('user_profile', profile);
};

export const getNotifications = async () => {
  const db = await initDB();
  const tx = db.transaction('notifications', 'readonly');
  const index = tx.store.index('by-timestamp');
  const notifications = await index.getAll();
  return notifications.reverse(); // Latest first
};

export const addNotification = async (notification: Omit<Notification, 'id'>) => {
  const db = await initDB();
  await db.add('notifications', notification as Notification);
};

export const markNotificationRead = async (id: number) => {
  const db = await initDB();
  const notification = await db.get('notifications', id);
  if (notification) {
    notification.read = true;
    await db.put('notifications', notification);
  }
};

export const markAllNotificationsRead = async () => {
  const db = await initDB();
  const tx = db.transaction('notifications', 'readwrite');
  const notifications = await tx.store.getAll();
  for (const notif of notifications) {
    if (!notif.read) {
      notif.read = true;
      await tx.store.put(notif);
    }
  }
  await tx.done;
};

export const checkExpiryNotifications = async () => {
  const db = await initDB();
  const tx = db.transaction(['inventory', 'settings', 'notifications'], 'readwrite');
  
  const settings = await tx.objectStore('settings').get(1);
  const leadTime = settings?.expiry_alert_lead_time || 60;
  
  const inventory = await tx.objectStore('inventory').getAll();
  const now = new Date();
  const threshold = new Date();
  threshold.setDate(now.getDate() + leadTime);

  for (const item of inventory) {
    if (!item.expiry_notified) {
      const expDate = new Date(item.expiry_date);
      if (expDate <= threshold && expDate >= now) {
        // Create notification
        await tx.objectStore('notifications').add({
          title: 'Expiry Alert',
          message: `${item.medicine_name} (Batch: ${item.batch_no}) is expiring on ${item.expiry_date}.`,
          timestamp: new Date().toISOString(),
          type: 'expiry',
          read: false
        });
        
        // Mark as notified
        item.expiry_notified = true;
        await tx.objectStore('inventory').put(item);
      }
    }
  }
  
  await tx.done;
};
