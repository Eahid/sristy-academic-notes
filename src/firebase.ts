import { initializeApp, deleteApp, FirebaseApp } from 'firebase/app';
import { getAuth, signOut, createUserWithEmailAndPassword, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// ─────────────────────────────────────────────────────────────
// FIREBASE PROJECT POOL
// PRIMARY  → sristy-notes-main (Blaze — no quota limits)
// BACKUP   → notes-backup-9fd41 (free tier backup)
//
// Auth      → always PRIMARY
// primaryDb → always PRIMARY Firestore (for user lookups)
// db        → PRIMARY normally, BACKUP when quota exceeded
// ─────────────────────────────────────────────────────────────

const PRIMARY_CONFIG = {
  projectId: "sristy-notes-main",
  appId: "1:153318755219:web:a685a32a57e4f929c8f666",
  apiKey: "AIzaSyCdjI-nSxdKF91lhD2WZSTY-SiyMVXlA8g",
  authDomain: "sristy-notes-main.firebaseapp.com",
  firestoreDatabaseId: "sristy-main-db",
  storageBucket: "sristy-notes-main.firebasestorage.app",
  messagingSenderId: "153318755219",
};

const BACKUP_CONFIG = {
  projectId: "notes-backup-9fd41",
  appId: "1:353121451807:web:fb4029cc30052c5947ba2a",
  apiKey: "AIzaSyDyvkZxrJVPtNjn4DQ-qXAawLKkvNB2_A0",
  authDomain: "notes-backup-9fd41.firebaseapp.com",
  firestoreDatabaseId: "default",
  storageBucket: "notes-backup-9fd41.firebasestorage.app",
  messagingSenderId: "353121451807",
};

const FAILOVER_KEY = 'sristy_db_failover_active';

function isFailoverActive(): boolean {
  try { return localStorage.getItem(FAILOVER_KEY) === 'true'; } catch { return false; }
}

function activateFailover() {
  try { localStorage.setItem(FAILOVER_KEY, 'true'); } catch {}
}

export function deactivateFailover() {
  try { localStorage.removeItem(FAILOVER_KEY); } catch {}
}

export function isUsingBackupDb(): boolean {
  return isFailoverActive();
}

const isBackup = isFailoverActive();

// ─── PRIMARY app — always initialized ────────────────────────
const primaryApp = initializeApp(PRIMARY_CONFIG, 'PRIMARY');
export const auth: Auth = getAuth(primaryApp);
export const storage = getStorage(primaryApp);

// primaryDb: ALWAYS primary Firestore — for auth/user lookups
export const primaryDb: Firestore = getFirestore(primaryApp, PRIMARY_CONFIG.firestoreDatabaseId);

// ─── ACTIVE Firestore — switches to backup under quota ───────
let dbApp: FirebaseApp;
if (isBackup) {
  dbApp = initializeApp(BACKUP_CONFIG, 'BACKUP_DB');
} else {
  dbApp = primaryApp;
}

const activeDbId = isBackup ? BACKUP_CONFIG.firestoreDatabaseId : PRIMARY_CONFIG.firestoreDatabaseId;
export const db: Firestore = activeDbId === 'default'
  ? getFirestore(dbApp)
  : getFirestore(dbApp, activeDbId);

// ─────────────────────────────────────────────────────────────
// QUOTA FAILOVER HANDLER
// ─────────────────────────────────────────────────────────────
export function handleQuotaFailover(error: unknown): boolean {
  const msg = String((error as any)?.message || error).toLowerCase();
  const isQuota =
    msg.includes('quota') ||
    msg.includes('resource-exhausted') ||
    msg.includes('quota_exceeded') ||
    msg.includes('free daily');

  if (isQuota && !isFailoverActive()) {
    console.warn('[Sristy Failover] Quota exceeded — switching to backup DB');
    activateFailover();
    setTimeout(() => window.location.reload(), 400);
    return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────
// Creates a Firebase Auth user without disrupting admin session
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
  if (handleQuotaFailover(error)) {
    throw new Error('Quota limit reached. Switching to backup database — please wait.');
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