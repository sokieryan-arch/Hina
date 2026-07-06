import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import firebaseConfig from "../firebase-applet-config.json";
import type { ProactiveSettings, UserProfile } from "./types";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();
export const storage = getStorage(app);

enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

interface FirestoreErrorInfo {
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
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function cleanProfile(profile: Partial<UserProfile>): UserProfile {
  return {
    displayName: typeof profile.displayName === "string" && profile.displayName.trim()
      ? profile.displayName.trim().slice(0, 100)
      : "Hina Friend",
    photoURL: typeof profile.photoURL === "string" && profile.photoURL.trim()
      ? profile.photoURL.trim().slice(0, 1000)
      : null,
  };
}

export async function loadUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const snapshot = await getDoc(doc(db, `users/${userId}/public/profile`));
    return snapshot.exists() ? cleanProfile(snapshot.data() as Partial<UserProfile>) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${userId}/public/profile`);
    return null;
  }
}

export async function saveUserProfile(userId: string, profile: UserProfile): Promise<UserProfile> {
  const cleaned = cleanProfile(profile);
  const profileRef = doc(db, `users/${userId}/public/profile`);
  try {
    const snapshot = await getDoc(profileRef);
    if (snapshot.exists()) {
      await setDoc(profileRef, {
        ...cleaned,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } else {
      await setDoc(profileRef, {
        ...cleaned,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    return cleaned;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/public/profile`);
    return cleaned;
  }
}

function normalizeProactiveSettings(input: Partial<ProactiveSettings> | null | undefined): ProactiveSettings | null {
  if (!input) return null;
  return {
    enabled: input.enabled === true,
    minHoursBetweenNudges: typeof input.minHoursBetweenNudges === "number"
      ? Math.min(72, Math.max(6, Math.floor(input.minHoursBetweenNudges)))
      : 20,
    quietHoursStart: typeof input.quietHoursStart === "string" ? input.quietHoursStart : "22:00",
    quietHoursEnd: typeof input.quietHoursEnd === "string" ? input.quietHoursEnd : "08:00",
    favoriteTopics: Array.isArray(input.favoriteTopics)
      ? input.favoriteTopics.filter((topic): topic is string => typeof topic === "string").slice(0, 3)
      : [],
  };
}

export async function loadRemoteProactiveSettings(userId: string): Promise<ProactiveSettings | null> {
  try {
    const snapshot = await getDoc(doc(db, `users/${userId}/settings/proactive`));
    return snapshot.exists() ? normalizeProactiveSettings(snapshot.data() as Partial<ProactiveSettings>) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${userId}/settings/proactive`);
    return null;
  }
}

export async function saveRemoteProactiveSettings(userId: string, settings: ProactiveSettings): Promise<ProactiveSettings> {
  const normalized = normalizeProactiveSettings(settings) ?? settings;
  try {
    await setDoc(doc(db, `users/${userId}/settings/proactive`), {
      ...normalized,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return normalized;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}/settings/proactive`);
    return normalized;
  }
}

export async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
