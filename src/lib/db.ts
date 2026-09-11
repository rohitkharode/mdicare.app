import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  runTransaction,
  writeBatch
} from 'firebase/firestore';
import { db as firestoreDb, auth } from './firebase';

export interface InventoryItem {
  id?: number | string;
  medicine_name: string;
  category: string;
  brand: string;
  batch_no: string;
  expiry_date: string;
  total_qty: number;
  unit_price: number;
  mrp: number;
  gst_percent: number;
  supplier_id?: number | string;
  created_at: string;
  updated_at: string;
  expiry_notified?: boolean;
  in_order_list?: boolean;
  min_threshold?: number;
  purchase_price?: number;
}

export interface Supplier {
  id?: number | string;
  name: string;
  category: string;
  contact_person: string;
  phone: string;
  last_order: string;
  rating: number;
  pending_payments: number;
}

export interface BillingItem {
  item_id: number | string;
  medicine_id?: number | string;
  medicine_name: string;
  name?: string;
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
  discount_amount?: number;
  total_amount: number;
  payment_status: string;
  items: BillingItem[];
}

export interface StockLog {
  log_id?: number | string;
  medicine_id: number | string;
  medicine_name: string;
  batch_no: string;
  change_type: 'added' | 'removed' | 'sale' | 'expired' | 'correction';
  qty_change: number;
  updated_total: number;
  timestamp: string;
  supplier_id?: number | string;
  invoice_amount?: number;
  payment_status?: 'paid' | 'pending';
}

export interface Settings {
  id?: number | string;
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
  id?: number | string;
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
  id?: number | string;
  title: string;
  message: string;
  timestamp: string;
  type: 'bill' | 'low_stock' | 'expiry';
  read: boolean;
}

interface MdiCareDB extends DBSchema {
  inventory: { key: number; value: InventoryItem; indexes: { 'by-name': string; 'by-expiry': string } };
  suppliers: { key: number; value: Supplier };
  billing: { key: string; value: Bill; indexes: { 'by-date': string } };
  stock_logs: { key: number; value: StockLog; indexes: { 'by-medicine': number; 'by-date': string } };
  settings: { key: number; value: Settings };
  users: { key: string; value: User };
  user_profile: { key: number; value: UserProfile };
  notifications: { key: number; value: Notification; indexes: { 'by-timestamp': string; 'by-read': number } };
  billing_metadata: { key: string; value: { id: string; last_bill_id: number } };
}

let legacyDbPromise: Promise<IDBPDatabase<MdiCareDB>> | null = null;
export const initDB = () => {
  if (!legacyDbPromise) {
    legacyDbPromise = openDB<MdiCareDB>('mdicareDB', 4, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('inventory')) db.createObjectStore('inventory', { keyPath: 'id', autoIncrement: true });
        if (!db.objectStoreNames.contains('suppliers')) db.createObjectStore('suppliers', { keyPath: 'id', autoIncrement: true });
        if (!db.objectStoreNames.contains('billing')) db.createObjectStore('billing', { keyPath: 'bill_id' });
        if (!db.objectStoreNames.contains('stock_logs')) db.createObjectStore('stock_logs', { keyPath: 'log_id', autoIncrement: true });
        if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('users')) db.createObjectStore('users', { keyPath: 'email' });
        if (!db.objectStoreNames.contains('user_profile')) db.createObjectStore('user_profile', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('notifications')) db.createObjectStore('notifications', { keyPath: 'id', autoIncrement: true });
        if (!db.objectStoreNames.contains('billing_metadata')) db.createObjectStore('billing_metadata', { keyPath: 'id' });
      },
    });
  }
  return legacyDbPromise;
};

const getPharmacyId = (): string => {
  const user = auth.currentUser;
  return user ? `pharmacy_${user.uid}` : 'pharmacy_default';
};

// Prevent duplicate writes caused by repeated clicks while a Firestore request is still pending.
const inFlightOperations = new Map<string, Promise<unknown>>();

const runDeduped = <T>(key: string, operation: () => Promise<T>): Promise<T> => {
  const existing = inFlightOperations.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const promise = operation().finally(() => {
    if (inFlightOperations.get(key) === promise) inFlightOperations.delete(key);
  });
  inFlightOperations.set(key, promise);
  return promise;
};

const stableKey = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableKey).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => `${JSON.stringify(key)}:${stableKey(val)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
};

export const getInventory = async (): Promise<InventoryItem[]> => {
  const pharmacyId = getPharmacyId();
  const snap = await getDocs(collection(firestoreDb, 'pharmacies', pharmacyId, 'medicines'));
  return snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as InventoryItem));
};

export const addInventory = async (
  item: Omit<InventoryItem, 'id'>,
  paymentDetails?: { status: 'paid' | 'pending', amount: number }
) => {
  const pharmacyId = getPharmacyId();
  const dedupeItem = { ...item };
  delete dedupeItem.created_at;
  delete dedupeItem.updated_at;
  const operationKey = `inventory:${pharmacyId}:${stableKey({ item: dedupeItem, paymentDetails })}`;

  return runDeduped(operationKey, async () => {
    const medicineRef = doc(collection(firestoreDb, 'pharmacies', pharmacyId, 'medicines'));
    const logRef = doc(collection(firestoreDb, 'pharmacies', pharmacyId, 'inventoryLogs'));
    const batch = writeBatch(firestoreDb);
    batch.set(medicineRef, item);
    batch.set(logRef, {
      medicine_id: medicineRef.id,
      medicine_name: item.medicine_name,
      batch_no: item.batch_no,
      change_type: 'added',
      qty_change: item.total_qty,
      updated_total: item.total_qty,
      timestamp: new Date().toISOString(),
      supplier_id: item.supplier_id || '',
      invoice_amount: paymentDetails?.amount || 0,
      payment_status: paymentDetails?.status || 'paid'
    });
    await batch.commit();
    return medicineRef.id;
  });
};

export const updateInventory = async (item: InventoryItem) => {
  if (!item.id) return;
  const pharmacyId = getPharmacyId();
  const docRef = doc(firestoreDb, 'pharmacies', pharmacyId, 'medicines', String(item.id));
  const oldSnap = await getDoc(docRef);
  const oldItem = oldSnap.exists() ? oldSnap.data() as InventoryItem : null;
  const { id, ...data } = item;
  await setDoc(docRef, data, { merge: true });
  if (oldItem) {
    const settings = await getSettings();
    const threshold = settings?.global_low_stock_threshold || 50;
    if (oldItem.total_qty > threshold && item.total_qty <= threshold) {
      await addDoc(collection(firestoreDb, 'pharmacies', pharmacyId, 'notifications'), {
        title: 'Low Stock Alert',
        message: `${item.medicine_name} has dropped to ${item.total_qty} units.`,
        timestamp: new Date().toISOString(), type: 'low_stock', read: false
      });
    }
  }
};

export const deleteInventoryItem = async (id: number | string) => {
  const pharmacyId = getPharmacyId();
  await deleteDoc(doc(firestoreDb, 'pharmacies', pharmacyId, 'medicines', String(id)));
};

export const bulkReturnToSupplier = async (itemIds: (number | string)[], supplierId?: number | string) => {
  const pharmacyId = getPharmacyId();
  for (const id of itemIds) {
    const docRef = doc(firestoreDb, 'pharmacies', pharmacyId, 'medicines', String(id));
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const item = snap.data() as InventoryItem;
      await addDoc(collection(firestoreDb, 'pharmacies', pharmacyId, 'inventoryLogs'), {
        medicine_id: String(id), medicine_name: item.medicine_name, batch_no: item.batch_no,
        change_type: 'removed', qty_change: -item.total_qty, updated_total: 0,
        timestamp: new Date().toISOString()
      });
      await deleteDoc(docRef);
    }
  }
};

export const getSuppliers = async (): Promise<Supplier[]> => {
  const pharmacyId = getPharmacyId();
  const snap = await getDocs(collection(firestoreDb, 'pharmacies', pharmacyId, 'suppliers'));
  return snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Supplier));
};

export const addSupplier = async (supplier: Omit<Supplier, 'id'>) => {
  const pharmacyId = getPharmacyId();
  const operationKey = `supplier:${pharmacyId}:${stableKey(supplier)}`;
  return runDeduped(operationKey, async () => {
    const docRef = await addDoc(collection(firestoreDb, 'pharmacies', pharmacyId, 'suppliers'), supplier);
    return docRef.id;
  });
};

export const getSettings = async (): Promise<Settings> => {
  const pharmacyId = getPharmacyId();
  const docRef = doc(firestoreDb, 'pharmacies', pharmacyId, 'settings', 'config');
  const snap = await getDoc(docRef);
  if (snap.exists()) return snap.data() as Settings;
  const defaultSettings: Settings = {
    global_low_stock_threshold: 50,
    expiry_alert_lead_time: 60,
    gst_default: 18,
    currency: 'USD ($)',
    invoice_prefix: 'INV-',
    ui_mode: 'dark',
    accent_color: 'blue'
  };
  await setDoc(docRef, defaultSettings);
  return defaultSettings;
};

export const saveSettings = async (settings: Settings) => {
  const pharmacyId = getPharmacyId();
  await setDoc(doc(firestoreDb, 'pharmacies', pharmacyId, 'settings', 'config'), settings, { merge: true });
};

export const createBill = async (bill: Omit<Bill, 'bill_id'>): Promise<string> => {
  const pharmacyId = getPharmacyId();
  const { bill_date, ...billWithoutDate } = bill;
  const operationKey = `bill:${pharmacyId}:${stableKey(billWithoutDate)}`;

  return runDeduped(operationKey, async () => {
    const settings = await getSettings();
    const prefix = settings?.invoice_prefix || 'INV-';
    const metaRef = doc(firestoreDb, 'pharmacies', pharmacyId, 'billing', 'metadata');
    let newBillId = `${prefix}0001`;

    await runTransaction(firestoreDb, async (transaction) => {
      const metaSnap = await transaction.get(metaRef);
      let lastId = metaSnap.exists() ? (metaSnap.data().last_bill_id || 0) : 0;
      lastId += 1;
      newBillId = `${prefix}${lastId.toString().padStart(4, '0')}`;

      const invItemsToUpdate: { ref: any; data: InventoryItem; item: BillingItem }[] = [];
      for (const item of bill.items) {
        const itemKey = String(item.medicine_id || item.item_id);
        const invRef = doc(firestoreDb, 'pharmacies', pharmacyId, 'medicines', itemKey);
        const invSnap = await transaction.get(invRef);
        if (invSnap.exists()) invItemsToUpdate.push({ ref: invRef, data: invSnap.data() as InventoryItem, item });
      }

      transaction.set(metaRef, { last_bill_id: lastId }, { merge: true });
      const billRef = doc(firestoreDb, 'pharmacies', pharmacyId, 'bills', newBillId);
      transaction.set(billRef, { ...bill, bill_id: newBillId });

      const notifRef = doc(collection(firestoreDb, 'pharmacies', pharmacyId, 'notifications'));
      transaction.set(notifRef, {
        title: 'New Bill Created',
        message: `Bill #${newBillId} for $${bill.total_amount.toFixed(2)}`,
        timestamp: new Date().toISOString(), type: 'bill', read: false
      });

      const threshold = settings?.global_low_stock_threshold || 50;
      for (const { ref, data: invData, item } of invItemsToUpdate) {
        const newQty = invData.total_qty - item.qty;
        transaction.update(ref, { total_qty: newQty, updated_at: new Date().toISOString() });
        const logRef = doc(collection(firestoreDb, 'pharmacies', pharmacyId, 'inventoryLogs'));
        transaction.set(logRef, {
          medicine_id: String(item.medicine_id || item.item_id),
          medicine_name: invData.medicine_name,
          batch_no: invData.batch_no,
          change_type: 'sale',
          qty_change: -item.qty,
          updated_total: newQty,
          timestamp: new Date().toISOString()
        });
        if (invData.total_qty > threshold && newQty <= threshold) {
          const lowNotifRef = doc(collection(firestoreDb, 'pharmacies', pharmacyId, 'notifications'));
          transaction.set(lowNotifRef, {
            title: 'Low Stock Alert',
            message: `${invData.medicine_name} has dropped to ${newQty} units.`,
            timestamp: new Date().toISOString(), type: 'low_stock', read: false
          });
        }
      }
    });
    return newBillId;
  });
};

export const getBills = async (): Promise<Bill[]> => {
  const pharmacyId = getPharmacyId();
  const snap = await getDocs(collection(firestoreDb, 'pharmacies', pharmacyId, 'bills'));
  return snap.docs.map(docSnap => docSnap.data() as Bill);
};

export const getLogs = async (): Promise<StockLog[]> => {
  const pharmacyId = getPharmacyId();
  const snap = await getDocs(collection(firestoreDb, 'pharmacies', pharmacyId, 'inventoryLogs'));
  return snap.docs.map(docSnap => ({ log_id: docSnap.id, ...docSnap.data() } as StockLog));
};

export const updateLog = async (log: StockLog) => {
  if (!log.log_id) return;
  const pharmacyId = getPharmacyId();
  const docRef = doc(firestoreDb, 'pharmacies', pharmacyId, 'inventoryLogs', String(log.log_id));
  const { log_id, ...data } = log;
  await setDoc(docRef, data, { merge: true });
};

export const getUserProfile = async (): Promise<UserProfile> => {
  const pharmacyId = getPharmacyId();
  const docRef = doc(firestoreDb, 'pharmacies', pharmacyId, 'user_profile', 'profile');
  const snap = await getDoc(docRef);
  if (snap.exists()) return snap.data() as UserProfile;
  const defaultProfile: UserProfile = {
    full_name: auth.currentUser?.displayName || 'Pharmacist',
    phone_number: '+1 234 567 8900',
    shop_name: 'MdiCare Pharmacy',
    address: '123 Health Ave, Medical District',
    license_number: 'PHARM-2024-9982',
    email_notifications: true,
    sms_notifications: false,
    push_alerts: true,
    ui_mode: 'dark'
  };
  await setDoc(docRef, defaultProfile);
  return defaultProfile;
};

export const saveUserProfile = async (profile: UserProfile) => {
  const pharmacyId = getPharmacyId();
  await setDoc(doc(firestoreDb, 'pharmacies', pharmacyId, 'user_profile', 'profile'), profile, { merge: true });
};

export const getNotifications = async (): Promise<Notification[]> => {
  const pharmacyId = getPharmacyId();
  const snap = await getDocs(collection(firestoreDb, 'pharmacies', pharmacyId, 'notifications'));
  const items = snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Notification));
  return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const addNotification = async (notification: Omit<Notification, 'id'>) => {
  const pharmacyId = getPharmacyId();
  await addDoc(collection(firestoreDb, 'pharmacies', pharmacyId, 'notifications'), notification);
};

export const markNotificationRead = async (id: number | string) => {
  const pharmacyId = getPharmacyId();
  await updateDoc(doc(firestoreDb, 'pharmacies', pharmacyId, 'notifications', String(id)), { read: true });
};

export const markAllNotificationsRead = async () => {
  const pharmacyId = getPharmacyId();
  const snap = await getDocs(collection(firestoreDb, 'pharmacies', pharmacyId, 'notifications'));
  for (const docSnap of snap.docs) if (!docSnap.data().read) await updateDoc(docSnap.ref, { read: true });
};

export const checkExpiryNotifications = async () => {
  const settings = await getSettings();
  const leadTime = settings?.expiry_alert_lead_time || 60;
  const medicines = await getInventory();
  const now = new Date();
  const threshold = new Date();
  threshold.setDate(now.getDate() + leadTime);

  for (const item of medicines) {
    if (!item.expiry_notified && item.expiry_date) {
      const expDate = new Date(item.expiry_date);
      if (expDate <= threshold && expDate >= now) {
        await addNotification({
          title: 'Expiry Alert',
          message: `${item.medicine_name} (Batch: ${item.batch_no}) is expiring on ${item.expiry_date}.`,
          timestamp: new Date().toISOString(), type: 'expiry', read: false
        });
        item.expiry_notified = true;
        await updateInventory(item);
      }
    }
  }
};

export const exportData = async () => {
  const data = {
    inventory: await getInventory(),
    suppliers: await getSuppliers(),
    billing: await getBills(),
    stock_logs: await getLogs(),
    settings: await getSettings(),
  };
  return JSON.stringify(data, null, 2);
};

export const importData = async (jsonData: string) => {
  const data = JSON.parse(jsonData);
  const pharmacyId = getPharmacyId();
  if (data.inventory && Array.isArray(data.inventory)) {
    for (const item of data.inventory) {
      const { id, ...itemData } = item;
      await addDoc(collection(firestoreDb, 'pharmacies', pharmacyId, 'medicines'), itemData);
    }
  }
  if (data.suppliers && Array.isArray(data.suppliers)) {
    for (const supplier of data.suppliers) {
      const { id, ...supplierData } = supplier;
      await addDoc(collection(firestoreDb, 'pharmacies', pharmacyId, 'suppliers'), supplierData);
    }
  }
  if (data.settings) await saveSettings(data.settings);
};

export const getUserByEmail = async (email: string) => null;
export const createUser = async (user: User) => { return; };
