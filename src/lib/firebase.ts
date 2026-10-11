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

// Collection References
export const ACCOUNTS_COLLECTION = 'accounts';
export const RECORDS_COLLECTION = 'records';

// Check if optional firebase-applet-config.json exists dynamically (without throwing compile errors if absent)
const meta = import.meta as any;
const configModules = (typeof meta.glob === 'function')
  ? meta.glob('/firebase-applet-config.json', { eager: true })
  : {};
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

export const isFirebaseConfigured: boolean = Boolean(apiKey && projectId);

let app: FirebaseApp | null = null;
export let db: Firestore | null = null;

if (isFirebaseConfigured) {
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
    console.warn('⚠️ Firebase initialization failed, falling back to local persistence:', err);
    db = null;
  }
} else {
  console.log('💾 Running in resilient Local Storage mode (Firebase credentials not configured or removed for GitHub security).');
}

/**
 * Initialize and seed initial data to cloud if collections are empty.
 */
export async function seedInitialCloudDataIfNeeded(): Promise<void> {
  if (!db) return;
  try {
    const accountsRef = collection(db, ACCOUNTS_COLLECTION);
    const snap = await getDocs(accountsRef);
    if (snap.empty) {
      console.log('🌱 Firestore accounts collection is empty. Seeding initial accounts & records...');
      const batch = writeBatch(db);

      // Seed Default Accounts
      for (const account of DEFAULT_ACCOUNTS) {
        const accDoc = doc(db, ACCOUNTS_COLLECTION, account.id);
        batch.set(accDoc, account);
      }

      // Seed Demo records
      for (const rec of INITIAL_INBODY_RECORDS) {
        const recDoc = doc(db, RECORDS_COLLECTION, rec.id);
        batch.set(recDoc, { ...rec, userId: 'user_demo' });
      }

      // Seed Lee records
      for (const rec of INITIAL_LEE_RECORDS) {
        const recDoc = doc(db, RECORDS_COLLECTION, rec.id);
        batch.set(recDoc, { ...rec, userId: 'user_lee' });
      }

      await batch.commit();
      console.log('✅ Initial cloud data seeded successfully!');
    }
  } catch (error) {
    console.warn('Could not seed initial cloud data (may be offline or restricted):', error);
  }
}

/**
 * Subscribe to real-time accounts list from Firestore
 */
export function subscribeToAccounts(
  onAccountsUpdate: (accounts: UserAccount[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (!db) {
    return () => {};
  }
  const accountsRef = collection(db, ACCOUNTS_COLLECTION);
  return onSnapshot(
    accountsRef,
    (snapshot) => {
      if (snapshot.empty) {
        seedInitialCloudDataIfNeeded().then(() => {
          onAccountsUpdate(DEFAULT_ACCOUNTS);
        });
        return;
      }
      const loaded: UserAccount[] = [];
      snapshot.forEach((docSnap) => {
        loaded.push(docSnap.data() as UserAccount);
      });
      if (!loaded.some((a) => a.username === 'admin')) {
        const adminAcc = DEFAULT_ACCOUNTS.find((a) => a.username === 'admin');
        if (adminAcc) loaded.unshift(adminAcc);
      }
      onAccountsUpdate(loaded);
    },
    (err) => {
      console.warn('Firestore accounts subscription error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribe to all records for all users or a specific user in real-time
 */
export function subscribeToAllRecords(
  onRecordsUpdate: (recordsMap: Record<string, InBodyRecord[]>) => void,
  onError?: (error: Error) => void
): () => void {
  if (!db) {
    return () => {};
  }
  const recordsRef = collection(db, RECORDS_COLLECTION);
  return onSnapshot(
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
      console.warn('Firestore records subscription error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Save / Update an InBody record to Firestore Cloud
 */
export async function saveRecordToCloud(record: InBodyRecord, userId: string): Promise<void> {
  if (!db) return;
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

/**
 * Delete an InBody record from Firestore Cloud
 */
export async function deleteRecordFromCloud(recordId: string): Promise<void> {
  if (!db) return;
  try {
    const recDoc = doc(db, RECORDS_COLLECTION, recordId);
    await deleteDoc(recDoc);
  } catch (error) {
    console.error('Failed to delete record from Firestore:', error);
  }
}

/**
 * Save / Update a User Account in Firestore Cloud
 */
export async function saveAccountToCloud(account: UserAccount): Promise<void> {
  if (!db) return;
  try {
    const accDoc = doc(db, ACCOUNTS_COLLECTION, account.id);
    await setDoc(accDoc, account, { merge: true });
  } catch (error) {
    console.error('Failed to save account to Firestore:', error);
  }
}

/**
 * Delete a User Account and all of their InBody records from Firestore Cloud
 */
export async function deleteAccountFromCloud(accountId: string): Promise<void> {
  if (!db) return;
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

/**
 * Batch Restore entire database to Cloud (accounts + records)
 */
export async function restoreEntireDatabaseToCloud(
  accounts: UserAccount[],
  recordsByUser: Record<string, InBodyRecord[]>
): Promise<void> {
  if (!db) return;
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
