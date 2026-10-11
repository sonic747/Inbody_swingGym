export interface FirebaseConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId: string;
  storageBucket: string;
  messagingSenderId: string;
  measurementId?: string;
  oAuthClientId?: string;
  recaptchaSiteKey?: string;
}

// Built-in provisioned Firebase configuration for production deployments (Vercel, Cloud Run, etc.)
export const defaultFirebaseConfig: FirebaseConfig = {
  projectId: "inbodytest-506901",
  appId: "1:133397927854:web:9d293ea6bc3747f28a9a3f",
  apiKey: "AIzaSyCOk-pmVD_j2QlqOqgp0t91S_P8NxgCSY8",
  authDomain: "inbodytest-506901.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-inbodyanalytics-d9c7cae5-b75b-48a7-a449-ff5299b5f93e",
  storageBucket: "inbodytest-506901.firebasestorage.app",
  messagingSenderId: "133397927854",
  measurementId: "",
  oAuthClientId: "133397927854-t8lq2q75ercuentedj16glhi06iajuuk.apps.googleusercontent.com",
  recaptchaSiteKey: "",
};

/**
 * Resolves Firebase configuration safely across environments.
 * 1. Checks VITE_FIREBASE_* environment variables (set in Vercel or .env)
 * 2. Falls back to default provisioned configuration
 * This guarantees builds succeed in Vercel without relying on uncommitted json files.
 */
export function getResolvedFirebaseConfig(): FirebaseConfig {
  const envApiKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_API_KEY) || '';
  const envProjectId = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_PROJECT_ID) || '';
  const envAppId = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_APP_ID) || '';
  const envDatabaseId = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_DATABASE_ID) || '';

  if (envApiKey && envProjectId) {
    return {
      apiKey: envApiKey,
      projectId: envProjectId,
      appId: envAppId || defaultFirebaseConfig.appId,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${envProjectId}.firebaseapp.com`,
      firestoreDatabaseId: envDatabaseId || defaultFirebaseConfig.firestoreDatabaseId,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${envProjectId}.firebasestorage.app`,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultFirebaseConfig.messagingSenderId,
      measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
    };
  }

  return defaultFirebaseConfig;
}
