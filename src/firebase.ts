import { initializeApp, getApps, deleteApp, FirebaseApp } from 'firebase/app';
import { getAuth, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// ─────────────────────────────────────────────────────────────
// FIREBASE PROJECT POOL
// PRIMARY  → gen-lang-client-0561669486  (your original DB)
// BACKUP   → notes-backup-9fd41          (your new backup DB)
// Auth lives on PRIMARY only. Firestore/quota switches to BACKUP.
// ─────────────────────────────────────────────────────────────

const PRIMARY_CONFIG = {
  projectId: "gen-lang-client-0561669486",
  appId: "1:597455778443:web:618c69bffab50d21d3da8e",
  apiKey: "AIzaSyBcfrZMJ0r6yLfY46ttck9CUancJH4jpP8",
  authDomain: "gen-lang-client-0561669486.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-ff73a67c-fae9-4980-8b17-d8dd1494a585",
  storageBucket: "gen-lang-client-0561669486.firebasestorage.app",
  messagingSenderId: "597455778443",
};

const BACKUP_CONFIG = {
  projectId: "notes-backup-9fd41",
  appId: "1:353121451807:web:fb4029cc30052c5947ba2a",
  apiKey: "AIzaSyDyvkZxrJVPtNjn4DQ-qXAawLKkvNB2_A0",
  authDomain: "notes-backup-9fd41.firebaseapp.com",
  firestoreDatabaseId: "default",   // backup uses default Firestore DB
  storageBucket: "notes-backup-9fd41.firebasestorage.app",
  messagingSenderId: "353121451807",
};

const FAILOVER_KEY = 'sristy_db_failover_active';

// ─────────────────────────────────────────────────────────────
// Determine which Firestore project is active right now.
// Auth ALWAYS uses the primary project (users are registered there).
// Firestore switches to backup when quota is exceeded.
// ─────────────────────────────────────────────────────────────
function isFailoverActive(): boolean {
  try { return localStorage.getItem(FAILOVER_KEY) === 'true'; } catch { return false; }
}

function activateFailover() {
  try { localStorage.setItem(FAILOVER_KEY, 'true'); } catch {}
}

export function deactivateFailover() {
  try { localStorage.removeItem(FAILOVER_KEY); } catch {}
}

const activeDbConfig = isFailoverActive() ? BACKUP_CONFIG : PRIMARY_CONFIG;
const isBackup = isFailoverActive();

// ─── Initialize PRIMARY app (always, for Auth) ───────────────
const primaryApp = initializeApp(PRIMARY_CONFIG, 'PRIMARY');
export const auth: Auth = getAuth(primaryApp);
export const storage = getStorage(primaryApp);

// ─── Initialize FIRESTORE on the active project ──────────────
let dbApp: FirebaseApp;
if (isBackup) {
  dbApp = initializeApp(BACKUP_CONFIG, 'BACKUP_DB');
} else {
  dbApp = primaryApp;
}

const dbId = activeDbConfig.firestoreDatabaseId;
export const db: Firestore = dbId === 'default'
  ? getFirestore(dbApp)
  : getFirestore(dbApp, dbId);

// ─────────────────────────────────────────────────────────────
// QUOTA FAILOVER HANDLER
// Call this whenever you catch a Firestore quota error.
// It sets the failover flag and reloads the page so the app
// re-initializes Firestore against the backup project.
// Auth stays on primary — users don't need to log in again.
// ─────────────────────────────────────────────────────────────
export function handleQuotaFailover(error: unknown): boolean {
  const msg = String((error as any)?.message || error).toLowerCase();
  const isQuota =
    msg.includes('quota') ||
    msg.includes('resource-exhausted') ||
    msg.includes('quota_exceeded') ||
    msg.includes('free daily');

  if (isQuota && !isFailoverActive()) {
    console.warn('[Sristy Failover] Quota exceeded on primary DB → switching to backup DB');
    activateFailover();
    // Short delay so any pending writes finish, then reload
    setTimeout(() => window.location.reload(), 400);
    return true;
  }
  return false;
}

export function isUsingBackupDb(): boolean {
  return isFailoverActive();
}

// ─────────────────────────────────────────────────────────────
// Creates a Firebase Auth user WITHOUT disrupting the admin session.
// Uses an isolated secondary app instance that is cleaned up after.
// ─────────────────────────────────────────────────────────────
export async function createSecondaryUser(email: string, pass: string): Promise<string> {
  const nonce = Math.random().toString(36).substring(2, 9);
  const secondaryAppName = `SecondaryApp_${Date.now()}_${nonce}`;
  const secondaryApp = initializeApp(PRIMARY_CONFIG, secondaryAppName);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, pass);
    const uid = credential.user.uid;
    await signOut(secondaryAuth);
    return uid;
  } catch (error) {
    console.error("Secondary Auth creation error:", error);
    throw error;
  } finally {
    await deleteApp(secondaryApp).catch(() => {});
  }
}

// ─────────────────────────────────────────────────────────────
// Shared enums / error helpers (unchanged from original)
// ─────────────────────────────────────────────────────────────
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
    providerInfo?: { providerId?: string | null; email?: string | null; }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  // First check if this is a quota error → trigger failover
  if (handleQuotaFailover(error)) {
    // Reload is in-flight; throw a friendly message while waiting
    throw new Error('Quota limit reached. Switching to backup database — please wait a moment.');
  }

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(p => ({
        providerId: p.providerId,
        email: p.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
