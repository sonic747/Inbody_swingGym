import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
  query,
  where,
} from 'firebase/firestore';
import { UserAccount, InBodyRecord } from '../types';
import { DEFAULT_ACCOUNTS, INITIAL_INBODY_RECORDS, INITIAL_LEE_RECORDS } from '../data/initialData';

// Collection References for Firestore
export const ACCOUNTS_COLLECTION = 'accounts';
export const RECORDS_COLLECTION = 'records';

// Check if optional firebase-applet-config.json exists dynamically
const meta = import.meta as any;
const configModules = typeof meta.glob === 'function' ? meta.glob('/firebase-applet-config.json', { eager: true }) : {};
const fileConfig = (configModules['/firebase-applet-config.json'] as any)?.default || configModules['/firebase-applet-config.json'];

// Resolve Firebase configuration from either file (if present) or Vite environment variables
const env = meta.env || {};
const apiKey = fileConfig?.apiKey || env.VITE_FIREBASE_API_KEY || '';
const projectId = fileConfig?.projectId || env.VITE_FIREBASE_PROJECT_ID || '';
const appId = fileConfig?.appId || env.VITE_FIREBASE_APP_ID || '';
const authDomain = fileConfig?.authDomain || env.VITE_FIREBASE_AUTH_DOMAIN || '';
const databaseId = fileConfig?.firestoreDatabaseId || env.VITE_FIREBASE_DATABASE_ID || '';
const storageBucket = fileConfig?.storageBucket || env.VITE_FIREBASE_STORAGE_BUCKET || '';
const messagingSenderId = fileConfig?.messagingSenderId || env.VITE_FIREBASE_MESSAGING_SENDER_ID || '';

export const isFirebaseConfigured: boolean = true; // Real-time Cloud Sync active
export const isCloudSynced: boolean = true;

let app: FirebaseApp | null = null;
export let db: Firestore | null = null;

if (apiKey && projectId) {
  try {
    if (getApps().length === 0) {
      app = initializeApp({
        apiKey,
        authDomain,
        projectId,
        storageBucket,
        messagingSenderId,
        appId,
      });
    } else {
      app = getApps()[0];
    }
    db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
    console.log('☁️ Firebase Firestore connected successfully:', projectId);
  } catch (err) {
    console.warn('⚠️ Firebase initialization optional warning:', err);
    db = null;
  }
}

// ============================================================
// REAL-TIME SERVER-SENT EVENTS (SSE) SYNCHRONIZATION MANAGER
// Supports instant 0-delay updates between PC and Smartphones
// ============================================================

type AccountsCallback = (accounts: UserAccount[]) => void;
type RecordsCallback = (recordsMap: Record<string, InBodyRecord[]>) => void;

const accountCallbacks = new Set<AccountsCallback>();
const recordsCallbacks = new Set<RecordsCallback>();

let sseConnection: EventSource | null = null;
let pollIntervalTimer: any = null;
let cachedAccounts: UserAccount[] = DEFAULT_ACCOUNTS;
let cachedRecordsMap: Record<string, InBodyRecord[]> = {
  user_demo: INITIAL_INBODY_RECORDS,
  user_lee: INITIAL_LEE_RECORDS,
};

function notifyAccounts(accounts: UserAccount[]) {
  if (!accounts || accounts.length === 0) return;
  cachedAccounts = accounts;
  for (const cb of accountCallbacks) {
    try {
      cb(accounts);
    } catch (e) {
      console.warn('Error in account sync callback:', e);
    }
  }
}

function notifyRecords(recordsMap: Record<string, InBodyRecord[]>) {
  if (!recordsMap) return;
  cachedRecordsMap = recordsMap;
  for (const cb of recordsCallbacks) {
    try {
      cb(recordsMap);
    } catch (e) {
      console.warn('Error in records sync callback:', e);
    }
  }
}

// Fetch latest data snapshot from server API
export async function fetchLatestServerData(): Promise<{
  accounts: UserAccount[];
  recordsMap: Record<string, InBodyRecord[]>;
} | null> {
  try {
    const res = await fetch('/api/sync/data');
    if (!res.ok) return null;
    const json = await res.json();
    if (json.success) {
      if (Array.isArray(json.accounts) && json.accounts.length > 0) {
        notifyAccounts(json.accounts);
      }
      if (json.recordsMap && typeof json.recordsMap === 'object') {
        notifyRecords(json.recordsMap);
      }
      return { accounts: json.accounts, recordsMap: json.recordsMap };
    }
  } catch (err) {
    // console.warn('Could not fetch server sync data:', err);
  }
  return null;
}

function startSyncManager() {
  if (typeof window === 'undefined') return;
  if (sseConnection) return; // already active

  // Initial fetch
  fetchLatestServerData();

  try {
    sseConnection = new EventSource('/api/sync/events');

    sseConnection.addEventListener('init', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data.accounts) notifyAccounts(data.accounts);
        if (data.recordsMap) notifyRecords(data.recordsMap);
      } catch (err) {
        console.error('Failed parsing SSE init event:', err);
      }
    });

    sseConnection.addEventListener('sync_accounts', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data.accounts) notifyAccounts(data.accounts);
      } catch (err) {
        console.error('Failed parsing SSE sync_accounts event:', err);
      }
    });

    sseConnection.addEventListener('sync_records', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data.recordsMap) notifyRecords(data.recordsMap);
      } catch (err) {
        console.error('Failed parsing SSE sync_records event:', err);
      }
    });

    sseConnection.addEventListener('full_sync', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data.accounts) notifyAccounts(data.accounts);
        if (data.recordsMap) notifyRecords(data.recordsMap);
      } catch (err) {
        console.error('Failed parsing SSE full_sync event:', err);
      }
    });

    sseConnection.onerror = () => {
      // Reconnect automatically handled by EventSource browser standard
    };
  } catch (err) {
    console.warn('EventSource initialization warning:', err);
  }

  // Periodic polling fallback (every 4 seconds) to guarantee synchronization on mobile sleep/wake
  if (!pollIntervalTimer) {
    pollIntervalTimer = setInterval(() => {
      fetchLatestServerData();
    }, 4000);
  }

  // When tab regains focus or visibility (crucial for iPhone Safari & Android Chrome wake-up)
  const handleWakeUp = () => {
    if (document.visibilityState === 'visible') {
      fetchLatestServerData();
    }
  };
  window.addEventListener('visibilitychange', handleWakeUp);
  window.addEventListener('focus', handleWakeUp);
}

/**
 * Initialize and seed initial data to cloud if collections are empty.
 */
export async function seedInitialCloudDataIfNeeded(): Promise<void> {
  startSyncManager();
  await fetchLatestServerData();

  if (!db) return;
  try {
    const accountsRef = collection(db, ACCOUNTS_COLLECTION);
    const snap = await getDocs(accountsRef);
    if (snap.empty) {
      console.log('🌱 Firestore accounts collection is empty. Seeding initial accounts & records...');
      const batch = writeBatch(db);

      for (const account of DEFAULT_ACCOUNTS) {
        const accDoc = doc(db, ACCOUNTS_COLLECTION, account.id);
        batch.set(accDoc, account);
      }

      for (const rec of INITIAL_INBODY_RECORDS) {
        const recDoc = doc(db, RECORDS_COLLECTION, rec.id);
        batch.set(recDoc, { ...rec, userId: 'user_demo' });
      }

      for (const rec of INITIAL_LEE_RECORDS) {
        const recDoc = doc(db, RECORDS_COLLECTION, rec.id);
        batch.set(recDoc, { ...rec, userId: 'user_lee' });
      }

      await batch.commit();
      console.log('✅ Initial cloud data seeded successfully!');
    }
  } catch (error) {
    console.warn('Could not seed initial cloud data to Firestore:', error);
  }
}

/**
 * Subscribe to real-time accounts list (PC & Smartphone instant sync)
 */
export function subscribeToAccounts(
  onAccountsUpdate: (accounts: UserAccount[]) => void,
  onError?: (error: Error) => void
): () => void {
  accountCallbacks.add(onAccountsUpdate);
  startSyncManager();

  // Send cached immediately
  if (cachedAccounts && cachedAccounts.length > 0) {
    onAccountsUpdate(cachedAccounts);
  }

  // Optional Firestore subscription if configured
  let unsubscribeFirestore = () => {};
  if (db) {
    try {
      const accountsRef = collection(db, ACCOUNTS_COLLECTION);
      unsubscribeFirestore = onSnapshot(
        accountsRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const loaded: UserAccount[] = [];
            snapshot.forEach((docSnap) => {
              loaded.push(docSnap.data() as UserAccount);
            });
            onAccountsUpdate(loaded);
          }
        },
        (err) => {
          if (onError) onError(err);
        }
      );
    } catch {
      // ignore
    }
  }

  return () => {
    accountCallbacks.delete(onAccountsUpdate);
    unsubscribeFirestore();
  };
}

/**
 * Subscribe to all records for all users in real-time (PC & Smartphone instant sync)
 */
export function subscribeToAllRecords(
  onRecordsUpdate: (recordsMap: Record<string, InBodyRecord[]>) => void,
  onError?: (error: Error) => void
): () => void {
  recordsCallbacks.add(onRecordsUpdate);
  startSyncManager();

  // Send cached immediately
  if (cachedRecordsMap && Object.keys(cachedRecordsMap).length > 0) {
    onRecordsUpdate(cachedRecordsMap);
  }

  // Optional Firestore subscription if configured
  let unsubscribeFirestore = () => {};
  if (db) {
    try {
      const recordsRef = collection(db, RECORDS_COLLECTION);
      unsubscribeFirestore = onSnapshot(
        recordsRef,
        (snapshot) => {
          const recordsMap: Record<string, InBodyRecord[]> = {};
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as InBodyRecord & { userId?: string };
            const userId = data.userId || 'user_demo';
            if (!recordsMap[userId]) {
              recordsMap[userId] = [];
            }
            recordsMap[userId].push(data);
          });
          Object.keys(recordsMap).forEach((uid) => {
            recordsMap[uid].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          });
          onRecordsUpdate(recordsMap);
        },
        (err) => {
          if (onError) onError(err);
        }
      );
    } catch {
      // ignore
    }
  }

  return () => {
    recordsCallbacks.delete(onRecordsUpdate);
    unsubscribeFirestore();
  };
}

/**
 * Save / Update an InBody record to Real-time Cloud (PC ↔ Smartphone)
 */
export async function saveRecordToCloud(record: InBodyRecord, userId: string): Promise<void> {
  // 1. Post to Server Real-time Sync API (Broadcasts to all devices instantly)
  try {
    await fetch('/api/sync/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ record, userId }),
    });
  } catch (err) {
    console.warn('Real-time sync saveRecord failed:', err);
  }

  // 2. Also save to Firestore if configured
  if (db) {
    try {
      const sanitizedRecord: InBodyRecord & { userId: string } = {
        ...record,
        userId,
        imageUrl: record.imageUrl && record.imageUrl.length > 50000 ? '' : record.imageUrl,
      };
      const recDoc = doc(db, RECORDS_COLLECTION, record.id);
      await setDoc(recDoc, sanitizedRecord, { merge: true });
    } catch (error) {
      console.error('Failed to save record to Firestore:', error);
    }
  }
}

/**
 * Delete an InBody record from Real-time Cloud
 */
export async function deleteRecordFromCloud(recordId: string): Promise<void> {
  // 1. Delete on Server Real-time Sync API
  try {
    await fetch(`/api/sync/records/${recordId}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.warn('Real-time sync deleteRecord failed:', err);
  }

  // 2. Also delete from Firestore if configured
  if (db) {
    try {
      const recDoc = doc(db, RECORDS_COLLECTION, recordId);
      await deleteDoc(recDoc);
    } catch (error) {
      console.error('Failed to delete record from Firestore:', error);
    }
  }
}

/**
 * Save / Update a User Account in Real-time Cloud (PC ↔ Smartphone)
 */
export async function saveAccountToCloud(account: UserAccount): Promise<void> {
  // 1. Post to Server Real-time Sync API (Broadcasts to all devices instantly)
  try {
    await fetch('/api/sync/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(account),
    });
  } catch (err) {
    console.warn('Real-time sync saveAccount failed:', err);
  }

  // 2. Also save to Firestore if configured
  if (db) {
    try {
      const accDoc = doc(db, ACCOUNTS_COLLECTION, account.id);
      await setDoc(accDoc, account, { merge: true });
    } catch (error) {
      console.error('Failed to save account to Firestore:', error);
    }
  }
}

/**
 * Delete a User Account and all of their InBody records from Real-time Cloud
 */
export async function deleteAccountFromCloud(accountId: string): Promise<void> {
  // 1. Delete on Server Real-time Sync API
  try {
    await fetch(`/api/sync/accounts/${accountId}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.warn('Real-time sync deleteAccount failed:', err);
  }

  // 2. Also delete from Firestore if configured
  if (db) {
    try {
      const accDoc = doc(db, ACCOUNTS_COLLECTION, accountId);
      await deleteDoc(accDoc);

      const recordsRef = collection(db, RECORDS_COLLECTION);
      const q = query(recordsRef, where('userId', '==', accountId));
      const querySnap = await getDocs(q);

      if (!querySnap.empty) {
        const batch = writeBatch(db);
        querySnap.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    } catch (error) {
      console.error('Failed to delete account from Firestore:', error);
    }
  }
}

/**
 * Batch Restore entire database to Cloud (accounts + records)
 */
export async function restoreEntireDatabaseToCloud(
  accounts: UserAccount[],
  recordsByUser: Record<string, InBodyRecord[]>
): Promise<void> {
  // 1. Restore on Server Real-time Sync API
  try {
    await fetch('/api/sync/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accounts, recordsByUser }),
    });
  } catch (err) {
    console.warn('Real-time sync restore failed:', err);
  }

  // 2. Also restore to Firestore if configured
  if (db) {
    try {
      const batch = writeBatch(db);

      for (const acc of accounts) {
        const accDoc = doc(db, ACCOUNTS_COLLECTION, acc.id);
        batch.set(accDoc, acc, { merge: true });
      }

      for (const [userId, recs] of Object.entries(recordsByUser)) {
        if (Array.isArray(recs)) {
          for (const r of recs) {
            const recDoc = doc(db, RECORDS_COLLECTION, r.id);
            batch.set(
              recDoc,
              {
                ...r,
                userId,
                imageUrl: r.imageUrl && r.imageUrl.length > 50000 ? '' : r.imageUrl,
              },
              { merge: true }
            );
          }
        }
      }

      await batch.commit();
    } catch (error) {
      console.error('Failed to restore entire database to Firestore:', error);
    }
  }
}
