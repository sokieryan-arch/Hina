import { useEffect, useRef, useState } from "react";
import { User, updateProfile } from "firebase/auth";
import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { AnimatePresence, motion } from "motion/react";
import {
  Bell,
  Camera,
  CheckCircle2,
  Clock,
  Coffee,
  Crown,
  Eye,
  LogOut,
  Moon,
  Plus,
  Settings,
  Sparkles,
  Sun,
  Trash2,
  User as UserIcon,
  X,
  Zap,
} from "lucide-react";
import { nanoid } from "nanoid";
import { db, saveUserProfile, storage } from "../firebase";
import { openHinaProCheckout } from "../paddleCheckout";
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
  theme: "light" | "dark";
  onThemeChange: (theme: "light" | "dark") => void;
  onLogout: () => Promise<void> | void;
}

const FAVORITE_TOPIC_OPTIONS = [
  "Daily life",
  "Films & TV",
  "Music",
  "Food",
  "Travel",
  "Campus",
  "Books",
  "Art",
  "Tech",
  "IELTS",
  "TOEFL",
  "Work",
] as const;

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
  theme,
  onThemeChange,
  onLogout,
}: SettingsModalProps) {
  const [displayName, setDisplayName] = useState(displayNameFrom(user, profile));
  const [avatarActionsOpen, setAvatarActionsOpen] = useState(false);
  const [avatarViewerOpen, setAvatarViewerOpen] = useState(false);
  const [customTopicOpen, setCustomTopicOpen] = useState(false);
  const [customTopic, setCustomTopic] = useState("");
  const [topicMessage, setTopicMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [billingMessage, setBillingMessage] = useState<string | null>(null);
  const [billingBusy, setBillingBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setDisplayName(displayNameFrom(user, profile));
    setAvatarActionsOpen(false);
    setAvatarViewerOpen(false);
    setCustomTopicOpen(false);
    setCustomTopic("");
    setTopicMessage(null);
    setProfileMessage(null);
    setBillingMessage(null);
  }, [isOpen, proactiveSettings.favoriteTopics, profile, user]);

  const chooseAvatar = async (file: File | undefined) => {
    if (!file) return;
    const validation = validateAvatarFile(file);
    if (validation) {
      setProfileMessage(validation.message);
      return;
    }
    if (!user) return;
    setBusy(true);
    setProfileMessage(null);
    try {
      const extension = avatarExtension(file.type);
      const uploadRef = storageRef(storage, `avatars/${user.uid}/${nanoid()}.${extension}`);
      await uploadBytes(uploadRef, file, {
        contentType: file.type,
        customMetadata: { owner: user.uid },
      });
      const nextPhotoUrl = await getDownloadURL(uploadRef);

      await updateProfile(user, {
        displayName: displayName.trim() || displayNameFrom(user, profile),
        photoURL: nextPhotoUrl,
      });
      const nextProfile = await saveUserProfile(user.uid, {
        displayName: displayName.trim() || displayNameFrom(user, profile),
        photoURL: nextPhotoUrl,
      });
      onProfileChange(nextProfile);
      setAvatarActionsOpen(false);
      setProfileMessage("Avatar updated.");
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : "Avatar update failed.");
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const saveDisplayName = async () => {
    if (!user) return;
    const nextDisplayName = displayName.trim();
    const currentDisplayName = displayNameFrom(user, profile);
    if (!nextDisplayName) {
      setDisplayName(currentDisplayName);
      return;
    }
    if (nextDisplayName === currentDisplayName) return;

    setBusy(true);
    setProfileMessage(null);
    try {
      await updateProfile(user, {
        displayName: nextDisplayName,
        photoURL: photoUrlFrom(user, profile),
      });
      const nextProfile = await saveUserProfile(user.uid, {
        displayName: nextDisplayName,
        photoURL: photoUrlFrom(user, profile),
      });
      setDisplayName(nextProfile.displayName);
      onProfileChange(nextProfile);
      setProfileMessage("Name updated.");
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

  const toggleTopic = (topic: string) => {
    const selected = proactiveSettings.favoriteTopics.includes(topic);
    if (!selected && proactiveSettings.favoriteTopics.length >= 5) {
      setTopicMessage("Remove one topic before adding another.");
      return;
    }
    setTopicMessage(null);
    updateProactiveSettings({
      favoriteTopics: selected
        ? proactiveSettings.favoriteTopics.filter((item) => item !== topic)
        : [...proactiveSettings.favoriteTopics, topic],
    });
  };

  const addCustomTopic = () => {
    const trimmed = customTopic.trim().replace(/\s+/g, " ");
    if (!trimmed) return;

    if (proactiveSettings.favoriteTopics.length >= 5) {
      setTopicMessage("Remove one topic before adding another.");
      return;
    }

    const canonical = FAVORITE_TOPIC_OPTIONS.find((topic) => topic.toLowerCase() === trimmed.toLowerCase()) ?? trimmed;
    if (proactiveSettings.favoriteTopics.some((topic) => topic.toLowerCase() === canonical.toLowerCase())) {
      setTopicMessage("That topic is already selected.");
      return;
    }

    updateProactiveSettings({
      favoriteTopics: [...proactiveSettings.favoriteTopics, canonical],
    });
    setCustomTopic("");
    setCustomTopicOpen(false);
    setTopicMessage(null);
  };

  const startUpgrade = async () => {
    if (!user) return;
    setBillingBusy(true);
    setBillingMessage(null);
    try {
      await openHinaProCheckout(user, () => {
        setBillingMessage("Payment received. Hina Pro will unlock as soon as Paddle confirms it.");
      });
      setBillingMessage("Paddle checkout opened. Finish payment there to unlock Hina Pro.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setBillingMessage(message.includes("VITE_PADDLE_CLIENT_TOKEN")
        ? "Paddle checkout is not configured yet. Add the client-side token in Vercel first."
        : "Upgrade could not start right now. Please try again later.");
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
  const currentPhotoUrl = photoUrlFrom(user, profile);

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
                      <button
                        type="button"
                        onClick={() => setAvatarActionsOpen((open) => !open)}
                        aria-label="Avatar actions"
                        aria-expanded={avatarActionsOpen}
                        className="group relative w-20 h-20 shrink-0 rounded-[24px] bg-[#F7F2E9] dark:bg-[#291a33] border border-[#E8E2D6] dark:border-[#3a2347] overflow-hidden shadow-sm flex items-center justify-center text-[#B5A48B] outline-none transition-all hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#FF9F1C] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#1c1224]"
                      >
                        {currentPhotoUrl ? (
                          <img src={currentPhotoUrl} alt="Your avatar" className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />
                        ) : (
                          <UserIcon size={30} />
                        )}
                        <span className="absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-white/70 bg-black/55 text-white shadow-sm backdrop-blur-sm transition-transform group-hover:scale-105">
                          <Camera size={12} />
                        </span>
                      </button>
                      <div className="flex-1 min-w-0 space-y-3">
                        <label className="text-sm font-bold text-[#4A4A4A] dark:text-[#e5dceb] flex items-center gap-2">
                          <UserIcon size={16} />
                          Display Name
                        </label>
                        <input
                          value={displayName}
                          onChange={(event) => setDisplayName(event.target.value)}
                          onBlur={() => void saveDisplayName()}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") event.currentTarget.blur();
                            if (event.key === "Escape") {
                              setDisplayName(displayNameFrom(user, profile));
                              event.currentTarget.blur();
                            }
                          }}
                          disabled={busy}
                          aria-label="Display name"
                          className="w-full bg-[#F7F2E9] dark:bg-[#291a33] text-[#4A4A4A] dark:text-[#e5dceb] rounded-2xl px-4 py-2.5 outline-none border border-[#E8E2D6] dark:border-[#3a2347] focus:ring-2 focus:ring-[#FF9F1C] text-sm"
                        />
                      </div>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="sr-only"
                      onChange={(event) => void chooseAvatar(event.target.files?.[0])}
                    />
                    <AnimatePresence initial={false}>
                      {avatarActionsOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          className="grid grid-cols-2 gap-2 rounded-[22px] border border-[#E8E2D6] bg-[#F9F6F0] p-2 dark:border-[#3a2347] dark:bg-[#291a33]"
                        >
                          <button
                            type="button"
                            onClick={() => setAvatarViewerOpen(true)}
                            disabled={!currentPhotoUrl}
                            className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-2xl bg-white px-2 py-2.5 text-xs font-semibold text-[#4A4A4A] shadow-sm transition-transform hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-40 dark:bg-[#1c1224] dark:text-[#e5dceb]"
                          >
                            <Eye size={16} />
                            View avatar
                          </button>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={busy}
                            className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-2xl bg-[#5A5A40] px-2 py-2.5 text-xs font-semibold text-white shadow-sm transition-transform hover:-translate-y-px disabled:opacity-50 dark:bg-[#48285c]"
                          >
                            <Camera size={16} />
                            {busy ? "Updating..." : "Change avatar"}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {profileMessage && (
                      <p className="text-xs font-medium text-[#7B5E3C] dark:text-[#d9c1ef] bg-[#FFF7E6] dark:bg-[#2b1b38] border border-[#F4D6A3] dark:border-[#4b305e] rounded-2xl px-3 py-2">
                        {profileMessage}
                      </p>
                    )}
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

                  <section className="border-t border-[#E8E2D6] dark:border-[#3a2347] pt-6 space-y-3">
                    <div>
                      <h3 className="text-sm font-bold text-[#4A4A4A] dark:text-[#e5dceb]">Appearance</h3>
                      <p className="mt-1 text-xs text-[#8A817C] dark:text-[#a58ebd]">Hina wears the sun by day and the moon at night.</p>
                    </div>
                    <div className="grid grid-cols-2 rounded-2xl bg-[#F0ECE3] dark:bg-[#2b1c35] p-1">
                      <button
                        type="button"
                        onClick={() => onThemeChange("light")}
                        aria-pressed={theme === "light"}
                        className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold ${theme === "light" ? "bg-white text-[#6D5520] shadow-sm" : "text-[#8A817C] dark:text-[#a58ebd]"}`}
                      >
                        <Sun size={17} />
                        Light
                      </button>
                      <button
                        type="button"
                        onClick={() => onThemeChange("dark")}
                        aria-pressed={theme === "dark"}
                        className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold ${theme === "dark" ? "bg-[#48285c] text-white shadow-sm" : "text-[#8A817C]"}`}
                      >
                        <Moon size={17} />
                        Dark
                      </button>
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
                            Hina Pro is US$4.99/month. Taxes may apply and will be calculated at checkout. Paddle processes checkout as merchant of record.
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

                    <div className="block space-y-3 text-sm font-bold text-[#4A4A4A] dark:text-[#e5dceb]">
                      <span className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2">
                          <Sparkles size={16} />
                          Favorite topics
                        </span>
                        <span className="text-xs font-medium text-[#8A817C] dark:text-[#a58ebd]">{proactiveSettings.favoriteTopics.length}/5</span>
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {[...FAVORITE_TOPIC_OPTIONS, ...proactiveSettings.favoriteTopics.filter((topic) => !FAVORITE_TOPIC_OPTIONS.includes(topic as typeof FAVORITE_TOPIC_OPTIONS[number]))].map((topic) => {
                          const selected = proactiveSettings.favoriteTopics.includes(topic);
                          return (
                            <button
                              key={topic}
                              type="button"
                              onClick={() => toggleTopic(topic)}
                              aria-pressed={selected}
                              disabled={!selected && proactiveSettings.favoriteTopics.length >= 5}
                              className={`rounded-full border px-3 py-2 text-xs font-bold transition-colors ${selected
                                ? "border-[#5A5A40] bg-[#5A5A40] text-white dark:border-[#8b66a3] dark:bg-[#48285c]"
                                : "border-[#DED8CC] bg-[#F9F6F0] text-[#746B66] dark:border-[#483651] dark:bg-[#291a33] dark:text-[#bda9ca]"} disabled:cursor-not-allowed disabled:opacity-40`}
                            >
                              {topic}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => {
                            if (proactiveSettings.favoriteTopics.length >= 5) {
                              setTopicMessage("Remove one topic before adding another.");
                              return;
                            }
                            setCustomTopicOpen((open) => !open);
                            if (customTopicOpen) setCustomTopic("");
                            setTopicMessage(null);
                          }}
                          aria-label={customTopicOpen ? "Close custom topic" : "Add custom topic"}
                          aria-expanded={customTopicOpen}
                          className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-full border border-dashed border-[#A79D91] bg-white px-2.5 text-[#5A5A40] transition-colors hover:border-[#5A5A40] hover:bg-[#F2EEE7] dark:border-[#806991] dark:bg-[#1c1224] dark:text-[#d8cadf] dark:hover:bg-[#342042]"
                        >
                          <Plus size={16} className={`transition-transform ${customTopicOpen ? "rotate-45" : ""}`} />
                        </button>
                      </div>
                      <AnimatePresence initial={false}>
                        {customTopicOpen && (
                          <motion.form
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            onSubmit={(event) => {
                              event.preventDefault();
                              addCustomTopic();
                            }}
                            className="flex items-center gap-2 rounded-[20px] border border-[#DED8CC] bg-[#F9F6F0] p-1.5 dark:border-[#483651] dark:bg-[#291a33]"
                          >
                            <input
                              autoFocus
                              value={customTopic}
                              onChange={(event) => setCustomTopic(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Escape") {
                                  setCustomTopic("");
                                  setCustomTopicOpen(false);
                                  setTopicMessage(null);
                                }
                              }}
                              maxLength={40}
                              placeholder="New topic"
                              aria-label="Custom favorite topic"
                              className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm font-medium text-[#4A4A4A] outline-none placeholder:text-[#A49B94] dark:text-[#e5dceb] dark:placeholder:text-[#806f8d]"
                            />
                            <button
                              type="submit"
                              disabled={!customTopic.trim()}
                              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#5A5A40] text-white transition-transform hover:scale-[1.03] disabled:opacity-35 dark:bg-[#48285c]"
                              aria-label="Save custom topic"
                            >
                              <Plus size={16} />
                            </button>
                          </motion.form>
                        )}
                      </AnimatePresence>
                      {topicMessage && (
                        <p className="text-xs font-medium text-[#8A6A43] dark:text-[#d8bddc]">{topicMessage}</p>
                      )}
                    </div>
                  </section>

                  <section className="border-t border-[#E8E2D6] dark:border-[#3a2347] pt-6 space-y-3">
                    <div>
                      <h3 className="text-sm font-bold text-[#4A4A4A] dark:text-[#e5dceb]">Account</h3>
                      <p className="mt-1 text-xs text-[#8A817C] dark:text-[#a58ebd]">{user.email || user.phoneNumber || "Hina friend"}</p>
                    </div>
                    <button
                      onClick={clearHistory}
                      disabled={busy}
                      className="w-full flex items-center justify-center gap-2 text-sm text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 p-3 rounded-2xl font-medium border border-red-100 dark:border-red-900/30 disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                      Clear Cloud History
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await onLogout();
                        onClose();
                      }}
                      className="w-full flex items-center justify-center gap-2 text-sm text-[#5E5753] dark:text-[#d8cadf] hover:bg-[#F2EEE7] dark:hover:bg-[#342042] p-3 rounded-2xl font-medium border border-[#DED8CC] dark:border-[#483651]"
                    >
                      <LogOut size={16} />
                      Log out
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
          {avatarViewerOpen && currentPhotoUrl && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-5 backdrop-blur-md"
              onClick={() => setAvatarViewerOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.92, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.92, y: 10 }}
                className="relative max-h-[82vh] max-w-[min(88vw,560px)] overflow-hidden rounded-[30px] border border-white/20 bg-[#1c1224] shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <img
                  src={currentPhotoUrl}
                  alt="Your avatar"
                  className="max-h-[82vh] w-auto object-contain"
                />
                <button
                  type="button"
                  onClick={() => setAvatarViewerOpen(false)}
                  className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/75"
                  aria-label="Close avatar preview"
                >
                  <X size={20} />
                </button>
              </motion.div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
