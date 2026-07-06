export type BillingPlan = "free" | "pro";

export interface BillingSummary {
  plan: BillingPlan;
  isPro: boolean;
  dailyLimit: number | null;
  usedToday: number;
  remainingToday: number | null;
  resetAt: string;
}

export interface BillingLimits {
  freeDailyLimit: number;
  proDailyLimit: number | null;
}

export interface BillingStore {
  getBillingSummary(subjectId: string, now?: Date): Promise<BillingSummary>;
  incrementChatUsage(subjectId: string, now?: Date): Promise<BillingSummary>;
  setPlan?(subjectId: string, plan: BillingPlan, dailyLimit?: number | null): Promise<BillingSummary>;
}

interface BuildBillingSummaryInput {
  plan: BillingPlan;
  usedToday: number;
  now: Date;
  limits: BillingLimits;
  dailyLimitOverride?: number | null;
}

function parseLimit(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseProLimit(value: string | undefined): number | null {
  if (value === undefined || value === "" || value === "0") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function readBillingLimits(env: Record<string, string | undefined> = process.env): BillingLimits {
  return {
    freeDailyLimit: parseLimit(env.FREE_DAILY_CHAT_LIMIT, 30),
    proDailyLimit: parseProLimit(env.PRO_DAILY_CHAT_LIMIT),
  };
}

export function getUsageDate(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function getResetAt(now: Date): string {
  return new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  )).toISOString();
}

export function buildBillingSummary(input: BuildBillingSummaryInput): BillingSummary {
  const isPro = input.plan === "pro";
  const dailyLimit = isPro
    ? input.dailyLimitOverride ?? input.limits.proDailyLimit
    : input.dailyLimitOverride ?? input.limits.freeDailyLimit;
  const usedToday = Math.max(0, Math.floor(input.usedToday));

  return {
    plan: input.plan,
    isPro,
    dailyLimit,
    usedToday,
    remainingToday: dailyLimit === null ? null : Math.max(0, dailyLimit - usedToday),
    resetAt: getResetAt(input.now),
  };
}

export function canUseChat(summary: BillingSummary): boolean {
  return summary.remainingToday === null || summary.remainingToday > 0;
}

export function createMemoryBillingStore(limits: BillingLimits = readBillingLimits()): BillingStore {
  const plans = new Map<string, { plan: BillingPlan; dailyLimitOverride?: number | null }>();
  const usage = new Map<string, number>();

  function usageKey(subjectId: string, now: Date) {
    return `${subjectId}:${getUsageDate(now)}`;
  }

  function getPlan(subjectId: string) {
    return plans.get(subjectId) ?? { plan: "free" as BillingPlan, dailyLimitOverride: undefined };
  }

  return {
    async getBillingSummary(subjectId, now = new Date()) {
      const plan = getPlan(subjectId);
      return buildBillingSummary({
        plan: plan.plan,
        dailyLimitOverride: plan.dailyLimitOverride,
        usedToday: usage.get(usageKey(subjectId, now)) ?? 0,
        now,
        limits,
      });
    },

    async incrementChatUsage(subjectId, now = new Date()) {
      const key = usageKey(subjectId, now);
      usage.set(key, (usage.get(key) ?? 0) + 1);
      return this.getBillingSummary(subjectId, now);
    },

    async setPlan(subjectId, plan, dailyLimitOverride = undefined) {
      plans.set(subjectId, { plan, dailyLimitOverride });
      return this.getBillingSummary(subjectId);
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

function billingDocId(subjectId: string) {
  return encodeURIComponent(subjectId);
}

function serviceAccountFromEnv(env: Record<string, string | undefined>) {
  if (env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON);
  }
  if (env.FIREBASE_ADMIN_CLIENT_EMAIL && env.FIREBASE_ADMIN_PRIVATE_KEY) {
    return {
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
  }
  return null;
}

export function createFirebaseAdminBillingStore(
  limits: BillingLimits = readBillingLimits(),
  env: Record<string, string | undefined> = process.env,
): BillingStore {
  let firestorePromise: Promise<{ db: any; FieldValue: any }> | null = null;

  async function getFirestore() {
    if (!firestorePromise) {
      firestorePromise = (async () => {
        const appAdmin = await import("firebase-admin/app");
        const firestoreAdmin = await import("firebase-admin/firestore");
        const appName = "hina-billing";
        const existing = appAdmin.getApps().find((app) => app.name === appName);
        const serviceAccount = serviceAccountFromEnv(env);
        const credential = serviceAccount
          ? appAdmin.cert(serviceAccount)
          : appAdmin.applicationDefault();
        const app = existing ?? appAdmin.initializeApp({
          credential,
          projectId: env.FIREBASE_PROJECT_ID,
          storageBucket: env.FIREBASE_STORAGE_BUCKET,
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

  async function readPlan(subjectRef: any): Promise<{ plan: BillingPlan; dailyLimitOverride?: number | null }> {
    const snapshot = await subjectRef.get();
    const data = snapshot.exists ? snapshot.data() : {};
    const plan: BillingPlan = data?.plan === "pro" ? "pro" : "free";
    const override = typeof data?.dailyLimitOverride === "number" || data?.dailyLimitOverride === null
      ? data.dailyLimitOverride
      : undefined;
    return { plan, dailyLimitOverride: override };
  }

  return {
    async getBillingSummary(subjectId, now = new Date()) {
      const { db } = await getFirestore();
      const subjectRef = db.collection("billingSubjects").doc(billingDocId(subjectId));
      const usageRef = subjectRef.collection("usage").doc(getUsageDate(now));
      const [plan, usageSnapshot] = await Promise.all([
        readPlan(subjectRef),
        usageRef.get(),
      ]);
      const usedToday = usageSnapshot.exists && typeof usageSnapshot.data()?.count === "number"
        ? usageSnapshot.data().count
        : 0;
      return buildBillingSummary({ ...plan, usedToday, now, limits });
    },

    async incrementChatUsage(subjectId, now = new Date()) {
      const { db, FieldValue } = await getFirestore();
      const subjectRef = db.collection("billingSubjects").doc(billingDocId(subjectId));
      const usageRef = subjectRef.collection("usage").doc(getUsageDate(now));

      await db.runTransaction(async (transaction: any) => {
        const usageSnapshot = await transaction.get(usageRef);
        const count = usageSnapshot.exists && typeof usageSnapshot.data()?.count === "number"
          ? usageSnapshot.data().count
          : 0;
        transaction.set(subjectRef, {
          subjectId,
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        transaction.set(usageRef, {
          date: getUsageDate(now),
          count: count + 1,
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      });

      return this.getBillingSummary(subjectId, now);
    },

    async setPlan(subjectId, plan, dailyLimitOverride = undefined) {
      const { db, FieldValue } = await getFirestore();
      await db.collection("billingSubjects").doc(billingDocId(subjectId)).set({
        subjectId,
        plan,
        dailyLimitOverride,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      return this.getBillingSummary(subjectId);
    },
  };
}

export function createBillingStoreFromEnv(env: Record<string, string | undefined> = process.env): BillingStore {
  const limits = readBillingLimits(env);
  return hasFirebaseAdminConfig(env)
    ? createFirebaseAdminBillingStore(limits, env)
    : createMemoryBillingStore(limits);
}
