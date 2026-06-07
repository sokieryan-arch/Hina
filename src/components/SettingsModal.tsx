import React, { useEffect, useState } from "react";
import { User, updateProfile } from "firebase/auth";
import { Bell, Clock, Image as ImageIcon, Settings, Sparkles, Trash2, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { ProactiveSettings } from "../types";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onClearHistory: () => void;
  proactiveSettings: ProactiveSettings;
  onProactiveSettingsChange: (settings: ProactiveSettings) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  user,
  onClearHistory,
  proactiveSettings,
  onProactiveSettingsChange,
}: SettingsModalProps) {
  const [photoUrl, setPhotoUrl] = useState(user?.photoURL || "");
  const [topicText, setTopicText] = useState(proactiveSettings.favoriteTopics.join(", "));
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setPhotoUrl(user?.photoURL || "");
    setTopicText(proactiveSettings.favoriteTopics.join(", "));
  }, [isOpen, proactiveSettings.favoriteTopics, user?.photoURL]);

  const updateProactiveSettings = (patch: Partial<ProactiveSettings>) => {
    onProactiveSettingsChange({
      ...proactiveSettings,
      ...patch,
    });
  };

  const commitTopics = () => {
    updateProactiveSettings({
      favoriteTopics: topicText
        .split(",")
        .map((topic) => topic.trim())
        .filter(Boolean)
        .slice(0, 3),
    });
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await updateProfile(user, { photoURL: photoUrl });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const clearHistory = async () => {
    if (!user) return;
    if (!confirm("Are you sure you want to delete all chat history? This cannot be undone.")) return;

    setIsClearing(true);
    try {
      const messagesRef = collection(db, `users/${user.uid}/messages`);
      const snapshot = await getDocs(messagesRef);
      const deletePromises = snapshot.docs.map(messageDoc =>
        deleteDoc(doc(db, `users/${user.uid}/messages`, messageDoc.id)),
      );
      await Promise.all(deletePromises);
      onClearHistory();
    } catch (err) {
      console.error(err);
    } finally {
      setIsClearing(false);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-40 transition-colors"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md max-h-[88vh] bg-white dark:bg-[#1c1224] rounded-3xl shadow-xl z-50 overflow-y-auto border border-[#E8E2D6] dark:border-[#3a2347]"
          >
            <div className="flex items-center justify-between p-5 border-b border-[#E8E2D6] dark:border-[#3a2347] bg-[#FDFBF7] dark:bg-[#291a33]">
              <h2 className="text-lg font-bold text-[#2D2D2D] dark:text-white flex items-center gap-2">
                <Settings size={20} className="text-[#FF9F1C] dark:text-[#a58ebd]" />
                Settings
              </h2>
              <button onClick={onClose} className="p-1.5 text-[#8A817C] dark:text-[#89739c] hover:bg-[#E8E2D6] dark:hover:bg-[#3a2347] rounded-full transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {user ? (
                <>
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-[#4A4A4A] dark:text-[#e5dceb] flex items-center gap-2">
                      <ImageIcon size={16} />
                      Custom Avatar URL
                    </label>
                    <input
                      type="text"
                      value={photoUrl}
                      onChange={(e) => setPhotoUrl(e.target.value)}
                      placeholder="https://example.com/avatar.png"
                      className="w-full bg-[#F7F2E9] dark:bg-[#291a33] text-[#4A4A4A] dark:text-[#e5dceb] rounded-xl px-4 py-2.5 outline-none border border-[#E8E2D6] dark:border-[#3a2347] focus:ring-2 focus:ring-[#FF9F1C] dark:focus:ring-[#660874] transition-shadow text-sm"
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={handleSaveProfile}
                        disabled={isSaving || photoUrl === user.photoURL}
                        className="bg-[#2D2D2D] dark:bg-[#660874] text-white px-4 py-2 rounded-xl text-sm font-medium hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                      >
                        {isSaving ? "Saving..." : "Save Avatar"}
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-[#E8E2D6] dark:border-[#3a2347] pt-6 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <label className="text-sm font-bold text-[#4A4A4A] dark:text-[#e5dceb] flex items-center gap-2">
                        <Bell size={16} />
                        Proactive Nudges
                      </label>
                      <button
                        type="button"
                        onClick={() => updateProactiveSettings({ enabled: !proactiveSettings.enabled })}
                        className={`w-12 h-7 rounded-full p-1 transition-colors ${proactiveSettings.enabled ? "bg-[#FF9F1C] dark:bg-[#660874]" : "bg-[#E8E2D6] dark:bg-[#3a2347]"}`}
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
                      <span className="text-xs text-[#8A817C] dark:text-[#89739c]">{proactiveSettings.minHoursBetweenNudges} hours</span>
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
                        type="text"
                        value={topicText}
                        onChange={(event) => setTopicText(event.target.value)}
                        onBlur={commitTopics}
                        placeholder="films, food, IELTS"
                        className="w-full bg-[#F7F2E9] dark:bg-[#291a33] rounded-xl px-4 py-2.5 outline-none border border-[#E8E2D6] dark:border-[#3a2347] focus:ring-2 focus:ring-[#FF9F1C] dark:focus:ring-[#660874] transition-shadow text-sm"
                      />
                    </label>
                  </div>

                  <div className="border-t border-[#E8E2D6] dark:border-[#3a2347] pt-6">
                    <h3 className="text-sm font-bold text-red-500 mb-3 flex items-center gap-2">Danger Zone</h3>
                    <button
                      onClick={clearHistory}
                      disabled={isClearing}
                      className="w-full flex items-center justify-center gap-2 text-sm text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 p-3 rounded-xl transition-colors font-medium border border-red-100 dark:border-red-900/30"
                    >
                      <Trash2 size={16} />
                      {isClearing ? "Clearing Data..." : "Clear Cloud History"}
                    </button>
                  </div>
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
