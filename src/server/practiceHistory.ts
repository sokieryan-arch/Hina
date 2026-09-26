import type { PracticeHistoryRecord, PracticeSkill } from "../types.js";

export const MAX_CLOUD_PRACTICE_RECORDS = 100;
const SKILLS = new Set<PracticeSkill>(["listening", "reading", "writing", "speaking"]);

export interface PracticeHistoryStore {
  list(uid: string): Promise<PracticeHistoryRecord[]>;
  upsert(uid: string, record: PracticeHistoryRecord): Promise<void>;
  remove(uid: string, skill?: PracticeSkill): Promise<void>;
}

function plainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function readPracticeHistoryRecord(value: unknown): PracticeHistoryRecord {
  if (!plainObject(value) || !plainObject(value.attempt)) throw new Error("Invalid practice history record.");
  const { id, skill, createdAt, attempt } = value;
  if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,160}$/.test(id)) throw new Error("Invalid practice attempt ID.");
  if (typeof skill !== "string" || !SKILLS.has(skill as PracticeSkill)) throw new Error("Invalid practice skill.");
  if (typeof createdAt !== "number" || !Number.isFinite(createdAt) || createdAt <= 0) throw new Error("Invalid practice timestamp.");
  if (attempt.id !== id || attempt.createdAt !== createdAt) throw new Error("Practice record metadata does not match its attempt.");
  if (typeof attempt.estimatedBand !== "number" || !Number.isFinite(attempt.estimatedBand) || attempt.estimatedBand < 0 || attempt.estimatedBand > 9) {
    throw new Error("Invalid practice band score.");
  }
  if ((skill === "reading" || skill === "listening") && attempt.skill !== skill) throw new Error("Objective practice skill does not match.");
  if (JSON.stringify(value).length > 250_000) throw new Error("Practice record is too large.");
  return value as unknown as PracticeHistoryRecord;
}

export function readPracticeSkill(value: unknown): PracticeSkill | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || !SKILLS.has(value as PracticeSkill)) throw new Error("Invalid practice skill.");
  return value as PracticeSkill;
}

export function createMemoryPracticeHistoryStore(): PracticeHistoryStore {
  const records = new Map<string, Map<string, PracticeHistoryRecord>>();
  return {
    async list(uid) {
      return Array.from(records.get(uid)?.values() || []).sort((left, right) => right.createdAt - left.createdAt).slice(0, MAX_CLOUD_PRACTICE_RECORDS);
    },
    async upsert(uid, record) {
      const userRecords = records.get(uid) || new Map<string, PracticeHistoryRecord>();
      userRecords.set(`${record.skill}:${record.id}`, structuredClone(record));
      records.set(uid, userRecords);
    },
    async remove(uid, skill) {
      if (!skill) {
        records.delete(uid);
        return;
      }
      const userRecords = records.get(uid);
      if (!userRecords) return;
      for (const [key, record] of userRecords) if (record.skill === skill) userRecords.delete(key);
    },
  };
}

function hasFirebaseAdminConfig(env: Record<string, string | undefined>) {
  return Boolean(
    env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON
    || (env.FIREBASE_ADMIN_CLIENT_EMAIL && env.FIREBASE_ADMIN_PRIVATE_KEY)
    || env.GOOGLE_APPLICATION_CREDENTIALS,
  );
}

function serviceAccountFromEnv(env: Record<string, string | undefined>) {
  if (env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON) return JSON.parse(env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON);
  if (env.FIREBASE_ADMIN_CLIENT_EMAIL && env.FIREBASE_ADMIN_PRIVATE_KEY) {
    return {
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
  }
  return null;
}

export function createFirebaseAdminPracticeHistoryStore(env: Record<string, string | undefined> = process.env): PracticeHistoryStore {
  let firestorePromise: Promise<{ db: any; FieldValue: any }> | null = null;
  async function getFirestore() {
    if (!firestorePromise) {
      firestorePromise = (async () => {
        const appAdmin = await import("firebase-admin/app");
        const firestoreAdmin = await import("firebase-admin/firestore");
        const appName = "hina-practice-history";
        const existing = appAdmin.getApps().find((app) => app.name === appName);
        const serviceAccount = serviceAccountFromEnv(env);
        const app = existing ?? appAdmin.initializeApp({
          credential: serviceAccount ? appAdmin.cert(serviceAccount) : appAdmin.applicationDefault(),
          projectId: env.FIREBASE_PROJECT_ID,
        }, appName);
        const databaseId = env.FIREBASE_FIRESTORE_DATABASE_ID || env.FIRESTORE_DATABASE_ID;
        return {
          db: databaseId ? firestoreAdmin.getFirestore(app, databaseId) : firestoreAdmin.getFirestore(app),
          FieldValue: firestoreAdmin.FieldValue,
        };
      })();
    }
    return firestorePromise;
  }

  function collection(db: any, uid: string) {
    return db.collection("users").doc(encodeURIComponent(uid)).collection("practiceAttempts");
  }

  return {
    async list(uid) {
      const { db } = await getFirestore();
      const snapshot = await collection(db, uid).orderBy("createdAt", "desc").limit(MAX_CLOUD_PRACTICE_RECORDS).get();
      return snapshot.docs.flatMap((doc: any) => {
        try { return [readPracticeHistoryRecord(doc.data())]; } catch { return []; }
      });
    },
    async upsert(uid, record) {
      const { db, FieldValue } = await getFirestore();
      await collection(db, uid).doc(encodeURIComponent(`${record.skill}:${record.id}`)).set({
        ...record,
        updatedAt: FieldValue.serverTimestamp(),
      });
    },
    async remove(uid, skill) {
      const { db } = await getFirestore();
      const base = collection(db, uid);
      const snapshot = await (skill ? base.where("skill", "==", skill) : base).get();
      const batches: any[][] = [];
      for (let index = 0; index < snapshot.docs.length; index += 400) batches.push(snapshot.docs.slice(index, index + 400));
      for (const docs of batches) {
        const batch = db.batch();
        docs.forEach((doc: any) => batch.delete(doc.ref));
        await batch.commit();
      }
    },
  };
}

export function createPracticeHistoryStoreFromEnv(env: Record<string, string | undefined> = process.env) {
  return hasFirebaseAdminConfig(env) ? createFirebaseAdminPracticeHistoryStore(env) : createMemoryPracticeHistoryStore();
}
