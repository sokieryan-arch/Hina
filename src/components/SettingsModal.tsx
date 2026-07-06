import { useEffect, useRef, useState } from "react";
import { User, updateProfile } from "firebase/auth";
import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { AnimatePresence, motion } from "motion/react";
import {
  Bell,
  CheckCircle2,
  Clock,
  Coffee,
  Crown,
  Image as ImageIcon,
  Settings,
  Sparkles,
  Trash2,
  Upload,
  User as UserIcon,
  X,
  Zap,
} from "lucide-react";
import { nanoid } from "nanoid";
import { db, saveUserProfile, storage } from "../firebase";
import type { BillingSummary, ProactiveSettings, UserProfile } from "../types";
import { avatarExtension, validateAvatarFile } from "./avatarValidation";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  profile: UserProfile | null;
  billing: BillingSummary | null;
  onProfileChange: (profile: UserProfile) => void;
  onBillingChange: (billing: BillingSummary) => void;
  onClearHistory: () => void;
  proactiveSettings: ProactiveSettings;
  onProactiveSettingsChange: (settings: ProactiveSettings) => void;
}

function formatUsage(billing: BillingSummary | null) {
  if (!billing) return "Loading usage...";
  if (billing.isPro) return "Unlimited chats unlocked";
  return `${billing.usedToday}/${billing.dailyLimit ?? 30} chats used today`;
}

function usagePercent(billing: BillingSummary | null) {
  if (!billing) return 0;
  if (billing.isPro) return 100;
  const limit = billing.dailyLimit ?? 30;
  return Math.min(100, Math.round((billing.usedToday / limit) * 100));
}

function displayNameFrom(user: User | null, profile: UserProfile | null) {
  return profile?.displayName || user?.displayName || "Hina Friend";
}

function photoUrlFrom(user: User | null, profile: UserProfile | null) {
  return profile?.photoURL || user?.photoURL || null;
}

export function SettingsModal({
  isOpen,
  onClose,
  user,
  profile,
  billing,
  onProfileChange,
  onBillingChange,
  onClearHistory,
  proactiveSettings,
  onProactiveSettingsChange,
}: SettingsModalProps) {
  const [displayName, setDisplayName] = useState(displayNameFrom(user, profile));
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(photoUrlFrom(user, profile));
  const [topicText, setTopicText] = useState(proactiveSettings.favoriteTopics.join(", "));
  const [busy, setBusy] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [billingMessage, setBillingMessage] = useState<string | null>(null);
  const [billingBusy, setBillingBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setDisplayName(displayNameFrom(user, profile));
    setAvatarFile(null);
    setAvatarPreview(photoUrlFrom(user, profile));
    setTopicText(proactiveSettings.favoriteTopics.join(", "));
    setProfileMessage(null);
    setBillingMessage(null);
  }, [isOpen, proactiveSettings.favoriteTopics, profile, user]);

  useEffect(() => () => {
    if (avatarPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview);
    }
  }, [avatarPreview]);

  const chooseAvatar = (file: File | undefined) => {
    if (!file) return;
    const validation = validateAvatarFile(file);
    if (validation) {
      setAvatarFile(null);
      setProfileMessage(validation.message);
      return;
    }
    if (avatarPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview);
    }
    const preview = URL.createObjectURL(file);
    setAvatarFile(file);
    setAvatarPreview(preview);
    setProfileMessage("New avatar ready. Save profile to upload it.");
  };

  const saveProfile = async () => {
    if (!user) return;
    setBusy(true);
    setProfileMessage(null);
    try {
      let nextPhotoUrl = photoUrlFrom(user, profile);
      const nextDisplayName = displayName.trim() || displayNameFrom(user, profile);

      if (avatarFile) {
        const extension = avatarExtension(avatarFile.type);
        const uploadRef = storageRef(storage, `avatars/${user.uid}/${nanoid()}.${extension}`);
        await uploadBytes(uploadRef, avatarFile, {
          contentType: avatarFile.type,
          customMetadata: { owner: user.uid },
        });
        nextPhotoUrl = await getDownloadURL(uploadRef);
      }

      await updateProfile(user, {
        displayName: nextDisplayName,
        photoURL: nextPhotoUrl,
      });
      const nextProfile = await saveUserProfile(user.uid, {
        displayName: nextDisplayName,
        photoURL: nextPhotoUrl,
      });
      setAvatarFile(null);
      setAvatarPreview(nextProfile.photoURL);
      onProfileChange(nextProfile);
      setProfileMessage("Profile saved.");
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : "Profile update failed.");
    } finally {
      setBusy(false);
    }
  };

  const updateProactiveSettings = (patch: Partial<ProactiveSettings>) => {
    const next = { ...proactiveSettings, ...patch };
    onProactiveSettingsChange(next);
  };

  const startUpgrade = async () => {
    if (!user) return;
    setBillingBusy(true);
    setBillingMessage(null);
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
      });
      const data = await response.json().catch(() => ({}));
      if (data.billing) onBillingChange(data.billing);
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      if (!response.ok && data.error !== "billing_not_ready") {
        throw new Error(data.error || "billing_checkout_failed");
      }
      setBillingMessage("Upgrade is almost ready. Hina saved your spot on the tiny VIP list.");
    } catch {
      setBillingMessage("Upgrade could not start right now. Please try again later.");
    } finally {
      setBillingBusy(false);
    }
  };

  const clearHistory = async () => {
    if (!user) return;
    if (!confirm("Delete all Hina chat history?")) return;
    setBusy(true);
    try {
      const messagesRef = collection(db, `users/${user.uid}/messages`);
      const snapshot = await getDocs(messagesRef);
      await Promise.all(snapshot.docs.map((messageDoc) =>
        deleteDoc(doc(db, `users/${user.uid}/messages`, messageDoc.id)),
      ));
      onClearHistory();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const percent = usagePercent(billing);
  const isPro = billing?.isPro === true;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-lg max-h-[88vh] bg-white dark:bg-[#1c1224] rounded-3xl shadow-xl z-50 overflow-y-auto border border-[#E8E2D6] dark:border-[#3a2347]"
          >
            <div className="flex items-center justify-between p-5 border-b border-[#E8E2D6] dark:border-[#3a2347] bg-[#FDFBF7] dark:bg-[#291a33]">
              <h2 className="text-lg font-bold text-[#2D2D2D] dark:text-white flex items-center gap-2">
                <Settings size={20} className="text-[#FF9F1C]" />
                Settings
              </h2>
              <button onClick={onClose} className="p-1.5 text-[#8A817C] hover:bg-[#E8E2D6] dark:hover:bg-[#3a2347] rounded-full" title="Close settings">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {user ? (
                <>
                  <section className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-20 h-20 rounded-2xl bg-[#F7F2E9] dark:bg-[#291a33] border border-[#E8E2D6] dark:border-[#3a2347] overflow-hidden shadow-sm flex items-center justify-center text-[#B5A48B]">
                        {avatarPreview ? (
                          <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon size={30} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-3">
                        <label className="text-sm font-bold text-[#4A4A4A] dark:text-[#e5dceb] flex items-center gap-2">
                          <UserIcon size={16} />
                          Display Name
                        </label>
                        <input
                          value={displayName}
                          onChange={(event) => setDisplayName(event.target.value)}
                          className="w-full bg-[#F7F2E9] dark:bg-[#291a33] text-[#4A4A4A] dark:text-[#e5dceb] rounded-xl px-4 py-2.5 outline-none border border-[#E8E2D6] dark:border-[#3a2347] focus:ring-2 focus:ring-[#FF9F1C] text-sm"
                        />
                      </div>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="sr-only"
                      onChange={(event) => chooseAvatar(event.target.files?.[0])}
                    />
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#5A5A40] dark:bg-[#48285c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:translate-y-[-1px] transition-transform"
                      >
                        <Upload size={16} />
                        Upload Avatar
                      </button>
                      <span className="text-xs text-[#8A817C] dark:text-[#a58ebd] flex items-center gap-1.5">
                        <ImageIcon size={14} />
                        JPG, PNG, WebP, GIF under 10MB
                      </span>
                    </div>
                    {profileMessage && (
                      <p className="text-xs font-medium text-[#7B5E3C] dark:text-[#d9c1ef] bg-[#FFF7E6] dark:bg-[#2b1b38] border border-[#F4D6A3] dark:border-[#4b305e] rounded-xl px-3 py-2">
                        {profileMessage}
                      </p>
                    )}
                    <div className="flex justify-end">
                      <button
                        onClick={saveProfile}
                        disabled={busy}
                        className="bg-[#2D2D2D] dark:bg-[#660874] text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
                      >
                        {busy ? "Saving..." : "Save Profile"}
                      </button>
                    </div>
                  </section>

                  <section className="overflow-hidden rounded-2xl border border-[#D8E7DF] dark:border-[#27485a] bg-[#F3FAF7] dark:bg-[#102332]">
                    <div className="flex items-start justify-between gap-4 p-5">
                      <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/80 dark:bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#2F5D54] dark:text-[#9fc7ff]">
                          <Crown size={14} />
                          {isPro ? "Hina Pro" : "Free Plan"}
                        </div>
                        <h3 className="text-xl font-bold text-[#223832] dark:text-white">More room for Hina to yap</h3>
                        <p className="text-sm leading-relaxed text-[#47625b] dark:text-[#b6d5e8]">
                          {formatUsage(billing)}
                        </p>
                      </div>
                      <div className="h-14 w-14 rounded-2xl bg-[#FFD166] text-[#2D2D2D] flex items-center justify-center shadow-sm">
                        <Zap size={24} />
                      </div>
                    </div>
                    <div className="px-5 pb-5 space-y-4">
                      <div className="h-2 rounded-full bg-white/80 dark:bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#06D6A0] transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="grid gap-2 text-sm text-[#2F5D54] dark:text-[#c8e7ff]">
                        {["Unlimited daily chats", "More proactive Hina moments later", "Early access to tiny experimental features"].map((item) => (
                          <div key={item} className="flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-[#06A77D]" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={startUpgrade}
                        disabled={billingBusy || isPro}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#223832] px-4 py-3 text-sm font-bold text-white shadow-sm hover:translate-y-[-1px] transition-transform disabled:opacity-50 disabled:hover:translate-y-0"
                      >
                        <Crown size={16} />
                        {isPro ? "Pro Active" : billingBusy ? "Opening..." : "Upgrade"}
                      </button>
                      {billingMessage && (
                        <p className="text-xs font-medium text-[#47625b] dark:text-[#b6d5e8]">{billingMessage}</p>
                      )}
                    </div>
                  </section>

                  <section className="overflow-hidden rounded-2xl border border-[#F2D7B6] dark:border-[#5a3652] bg-[#FFF8EC] dark:bg-[#261829]">
                    <div className="p-5 space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="h-11 w-11 shrink-0 rounded-2xl bg-[#FFD166] text-[#2D2D2D] flex items-center justify-center shadow-sm">
                          <Coffee size={22} />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <p className="text-xs font-bold uppercase tracking-widest text-[#A26125] dark:text-[#f4bfda]">International support</p>
                          <h3 className="text-lg font-bold text-[#2D2D2D] dark:text-white">Support Hina</h3>
                          <p className="text-sm leading-relaxed text-[#7B5E3C] dark:text-[#e6cfe5]">
                            International payments are being prepared with Paddle. For now, review Hina Pro pricing and policies before checkout opens.
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        <a
                          href="/pricing"
                          className="inline-flex items-center justify-center rounded-2xl bg-[#2D2D2D] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 dark:bg-[#660874]"
                        >
                          View pricing
                        </a>
                        <a
                          href="/refunds"
                          className="inline-flex items-center justify-center rounded-2xl border border-[#E3C7A5] bg-white px-4 py-3 text-sm font-bold text-[#7B5E3C] shadow-sm transition hover:-translate-y-0.5 dark:border-[#553852] dark:bg-[#1c1224] dark:text-[#e6cfe5]"
                        >
                          Refund policy
                        </a>
                      </div>
                    </div>
                  </section>

                  <section className="border-t border-[#E8E2D6] dark:border-[#3a2347] pt-6 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <label className="text-sm font-bold text-[#4A4A4A] dark:text-[#e5dceb] flex items-center gap-2">
                        <Bell size={16} />
                        Proactive Nudges
                      </label>
                      <button
                        type="button"
                        onClick={() => updateProactiveSettings({ enabled: !proactiveSettings.enabled })}
                        className={`w-12 h-7 rounded-full p-1 transition-colors ${proactiveSettings.enabled ? "bg-[#FF9F1C]" : "bg-[#E8E2D6] dark:bg-[#3a2347]"}`}
                        aria-pressed={proactiveSettings.enabled}
                      >
                        <span className={`block w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${proactiveSettings.enabled ? "translate-x-5" : "translate-x-0"}`} />
                      </button>
                    </div>

                    <label className="block space-y-2 text-sm text-[#4A4A4A] dark:text-[#e5dceb]">
                      <span className="font-bold flex items-center gap-2">
                        <Clock size={16} />
                        Minimum gap
                      </span>
                      <input
                        type="range"
                        min={6}
                        max={72}
                        step={1}
                        value={proactiveSettings.minHoursBetweenNudges}
                        onChange={(event) => updateProactiveSettings({ minHoursBetweenNudges: Number(event.target.value) })}
                        className="w-full accent-[#FF9F1C]"
                      />
                      <span className="text-xs text-[#8A817C]">{proactiveSettings.minHoursBetweenNudges} hours</span>
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="space-y-2 text-sm font-bold text-[#4A4A4A] dark:text-[#e5dceb]">
                        Quiet from
                        <input
                          type="time"
                          value={proactiveSettings.quietHoursStart}
                          onChange={(event) => updateProactiveSettings({ quietHoursStart: event.target.value })}
                          className="w-full bg-[#F7F2E9] dark:bg-[#291a33] rounded-xl px-3 py-2 outline-none border border-[#E8E2D6] dark:border-[#3a2347] text-sm"
                        />
                      </label>
                      <label className="space-y-2 text-sm font-bold text-[#4A4A4A] dark:text-[#e5dceb]">
                        Quiet until
                        <input
                          type="time"
                          value={proactiveSettings.quietHoursEnd}
                          onChange={(event) => updateProactiveSettings({ quietHoursEnd: event.target.value })}
                          className="w-full bg-[#F7F2E9] dark:bg-[#291a33] rounded-xl px-3 py-2 outline-none border border-[#E8E2D6] dark:border-[#3a2347] text-sm"
                        />
                      </label>
                    </div>

                    <label className="block space-y-2 text-sm font-bold text-[#4A4A4A] dark:text-[#e5dceb]">
                      <span className="flex items-center gap-2">
                        <Sparkles size={16} />
                        Favorite topics
                      </span>
                      <input
                        value={topicText}
                        onChange={(event) => setTopicText(event.target.value)}
                        onBlur={() => updateProactiveSettings({
                          favoriteTopics: topicText.split(",").map((topic) => topic.trim()).filter(Boolean).slice(0, 3),
                        })}
                        placeholder="films, food, IELTS"
                        className="w-full bg-[#F7F2E9] dark:bg-[#291a33] rounded-xl px-4 py-2.5 outline-none border border-[#E8E2D6] dark:border-[#3a2347] focus:ring-2 focus:ring-[#FF9F1C] text-sm"
                      />
                    </label>
                  </section>

                  <section className="border-t border-[#E8E2D6] dark:border-[#3a2347] pt-6">
                    <button
                      onClick={clearHistory}
                      disabled={busy}
                      className="w-full flex items-center justify-center gap-2 text-sm text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 p-3 rounded-xl font-medium border border-red-100 dark:border-red-900/30 disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                      Clear Cloud History
                    </button>
                  </section>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-[#8A817C] dark:text-[#89739c] text-sm">Please log in to customize settings and save history.</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
