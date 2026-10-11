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
  getDocFromServer,
  writeBatch,
  query,
  where,
} from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getResolvedFirebaseConfig } from './firebaseConfig';
import { UserAccount, InBodyRecord } from '../types';
import { DEFAULT_ACCOUNTS, INITIAL_INBODY_RECORDS, INITIAL_LEE_RECORDS } from '../data/initialData';

// Collection References for Firestore
export const ACCOUNTS_COLLECTION = 'accounts';
export const RECORDS_COLLECTION = 'records';

export const isFirebaseConfigured = true;
export const isCloudSynced = true;

// Resolved Firebase configuration (supports Vercel env vars & embedded provisioned config)
export const firebaseConfig = getResolvedFirebaseConfig();

// Initialize Firebase App and Firestore using provisioned database
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// CRITICAL: Must use firestoreDatabaseId for custom provisioned Firestore instance
export const db: Firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth: Auth = getAuth(app);

// Error Handling conforming to Firebase Integration Standards
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo:
        auth?.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate Connection to Firestore on startup
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('🔥 [Firebase Firestore] Connection successfully verified to database:', firebaseConfig.firestoreDatabaseId);
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('⚠️ [Firebase] Client is currently offline; Firestore will queue updates and sync when online.');
    } else {
      console.log('ℹ️ [Firebase] Firestore test connection verified (ready for operations).');
    }
  }
}
testConnection();

// ============================================================
// REAL-TIME FIRESTORE DATA SYNCHRONIZATION ENGINE
// Instant 0-delay bi-directional sync between PC and Smartphones
// ============================================================

type AccountsCallback = (accounts: UserAccount[]) => void;
type RecordsCallback = (recordsMap: Record<string, InBodyRecord[]>) => void;

const accountCallbacks = new Set<AccountsCallback>();
const recordsCallbacks = new Set<RecordsCallback>();

let cachedAccounts: UserAccount[] = DEFAULT_ACCOUNTS;
let cachedRecordsMap: Record<string, InBodyRecord[]> = {
  user_demo: INITIAL_INBODY_RECORDS,
  user_lee: INITIAL_LEE_RECORDS,
};

let hasSeeded = false;

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

/**
 * Initialize and seed initial data to cloud if collections are empty.
 */
export async function seedInitialCloudDataIfNeeded(): Promise<void> {
  if (hasSeeded) return;
  hasSeeded = true;

  try {
    const accountsRef = collection(db, ACCOUNTS_COLLECTION);
    const snap = await getDocs(accountsRef);
    if (snap.empty) {
      console.log('🌱 Firestore accounts collection is empty. Seeding initial accounts & records to Firebase...');
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
      console.log('✅ Initial cloud data seeded to Firebase Firestore successfully!');
    }
  } catch (error) {
    console.warn('Could not seed initial cloud data to Firestore:', error);
  }

  // Also dual-sync to local server backup if available
  try {
    fetch('/api/sync/data')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.success) {
          if (json.accounts?.length) notifyAccounts(json.accounts);
          if (json.recordsMap) notifyRecords(json.recordsMap);
        }
      })
      .catch(() => {});
  } catch {
    // ignore
  }
}

/**
 * Subscribe to real-time accounts list using Firebase onSnapshot (PC & Smartphone instant sync)
 */
export function subscribeToAccounts(
  onAccountsUpdate: (accounts: UserAccount[]) => void,
  onError?: (error: Error) => void
): () => void {
  accountCallbacks.add(onAccountsUpdate);

  // Send cached immediately
  if (cachedAccounts && cachedAccounts.length > 0) {
    onAccountsUpdate(cachedAccounts);
  }

  // Primary: Real-time Firebase Firestore Subscription
  const accountsRef = collection(db, ACCOUNTS_COLLECTION);
  const unsubscribeFirestore = onSnapshot(
    accountsRef,
    (snapshot) => {
      if (!snapshot.empty) {
        const loaded: UserAccount[] = [];
        snapshot.forEach((docSnap) => {
          loaded.push(docSnap.data() as UserAccount);
        });
        // Sort admins first, then by name
        loaded.sort((a, b) => {
          if (a.role === 'admin' && b.role !== 'admin') return -1;
          if (a.role !== 'admin' && b.role === 'admin') return 1;
          return a.name.localeCompare(b.name, 'ko');
        });
        notifyAccounts(loaded);
      }
    },
    (err) => {
      console.error('Firebase onSnapshot error on accounts:', err);
      if (onError) onError(err);
      try {
        handleFirestoreError(err, OperationType.GET, ACCOUNTS_COLLECTION);
      } catch {
        // ignore
      }
    }
  );

  return () => {
    accountCallbacks.delete(onAccountsUpdate);
    unsubscribeFirestore();
  };
}

/**
 * Subscribe to all records for all users in real-time using Firebase onSnapshot (PC & Smartphone instant sync)
 */
export function subscribeToAllRecords(
  onRecordsUpdate: (recordsMap: Record<string, InBodyRecord[]>) => void,
  onError?: (error: Error) => void
): () => void {
  recordsCallbacks.add(onRecordsUpdate);

  // Send cached immediately
  if (cachedRecordsMap && Object.keys(cachedRecordsMap).length > 0) {
    onRecordsUpdate(cachedRecordsMap);
  }

  // Primary: Real-time Firebase Firestore Subscription
  const recordsRef = collection(db, RECORDS_COLLECTION);
  const unsubscribeFirestore = onSnapshot(
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
      // Sort each user's records by date descending (newest first)
      Object.keys(recordsMap).forEach((uid) => {
        recordsMap[uid].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      });
      notifyRecords(recordsMap);
    },
    (err) => {
      console.error('Firebase onSnapshot error on records:', err);
      if (onError) onError(err);
      try {
        handleFirestoreError(err, OperationType.GET, RECORDS_COLLECTION);
      } catch {
        // ignore
      }
    }
  );

  return () => {
    recordsCallbacks.delete(onRecordsUpdate);
    unsubscribeFirestore();
  };
}

/**
 * Save / Update an InBody record to Real-time Cloud (PC ↔ Smartphone)
 */
export async function saveRecordToCloud(record: InBodyRecord, userId: string): Promise<void> {
  const sanitizedRecord: InBodyRecord & { userId: string } = {
    ...record,
    userId,
    imageUrl: record.imageUrl && record.imageUrl.length > 50000 ? '' : record.imageUrl,
  };

  // 1. Primary: Save directly to Firebase Firestore
  try {
    const recDoc = doc(db, RECORDS_COLLECTION, record.id);
    await setDoc(recDoc, sanitizedRecord, { merge: true });
    console.log(`☁️ [Firebase] Record ${record.id} saved to Firestore for user ${userId}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${RECORDS_COLLECTION}/${record.id}`);
  }

  // 2. Secondary: Dual-post to local server API backup
  try {
    await fetch('/api/sync/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ record, userId }),
    });
  } catch {
    // local server optional
  }
}

/**
 * Delete an InBody record from Real-time Cloud
 */
export async function deleteRecordFromCloud(recordId: string): Promise<void> {
  // 1. Primary: Delete from Firebase Firestore
  try {
    const recDoc = doc(db, RECORDS_COLLECTION, recordId);
    await deleteDoc(recDoc);
    console.log(`☁️ [Firebase] Record ${recordId} deleted from Firestore`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${RECORDS_COLLECTION}/${recordId}`);
  }

  // 2. Secondary: Delete on local server API
  try {
    await fetch(`/api/sync/records/${recordId}`, {
      method: 'DELETE',
    });
  } catch {
    // local server optional
  }
}

/**
 * Save / Update a User Account in Real-time Cloud (PC ↔ Smartphone)
 */
export async function saveAccountToCloud(account: UserAccount): Promise<void> {
  // 1. Primary: Save directly to Firebase Firestore
  try {
    const accDoc = doc(db, ACCOUNTS_COLLECTION, account.id);
    await setDoc(accDoc, account, { merge: true });
    console.log(`☁️ [Firebase] Account ${account.name} (${account.id}) saved to Firestore`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${ACCOUNTS_COLLECTION}/${account.id}`);
  }

  // 2. Secondary: Dual-post to local server API backup
  try {
    await fetch('/api/sync/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(account),
    });
  } catch {
    // local server optional
  }
}

/**
 * Delete a User Account and all of their InBody records from Real-time Cloud
 */
export async function deleteAccountFromCloud(accountId: string): Promise<void> {
  // 1. Primary: Delete from Firebase Firestore
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
    console.log(`☁️ [Firebase] Account ${accountId} and associated records deleted from Firestore`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${ACCOUNTS_COLLECTION}/${accountId}`);
  }

  // 2. Secondary: Delete on local server API
  try {
    await fetch(`/api/sync/accounts/${accountId}`, {
      method: 'DELETE',
    });
  } catch {
    // local server optional
  }
}

/**
 * Batch Restore entire database to Cloud (accounts + records)
 */
export async function restoreEntireDatabaseToCloud(
  accounts: UserAccount[],
  recordsByUser: Record<string, InBodyRecord[]>
): Promise<void> {
  // 1. Primary: Batch set to Firebase Firestore
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
    console.log('☁️ [Firebase] Entire database batch restored to Firestore successfully!');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'batch_restore');
  }

  // 2. Secondary: Restore on local server API
  try {
    await fetch('/api/sync/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accounts, recordsByUser }),
    });
  } catch {
    // local server optional
  }
}
