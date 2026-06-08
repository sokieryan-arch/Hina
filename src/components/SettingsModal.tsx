import React, { useState } from "react";
import { User, updateProfile } from "firebase/auth";
import { X, Settings, Image as ImageIcon, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onClearHistory: () => void;
}

export function SettingsModal({ isOpen, onClose, user, onClearHistory }: SettingsModalProps) {
  const [photoUrl, setPhotoUrl] = useState(user?.photoURL || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await updateProfile(user, { photoURL: photoUrl });
      // updateProfile doesn't trigger onAuthStateChanged with just photo change sometimes in local state, 
      // but it will reflect across the app if we reload or pass it properly.
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
        deleteDoc(doc(db, `users/${user.uid}/messages`, messageDoc.id))
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
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-white dark:bg-[#1c1224] rounded-3xl shadow-xl z-50 overflow-hidden border border-[#E8E2D6] dark:border-[#3a2347]"
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
                  
                  <div className="border-t border-[#E8E2D6] dark:border-[#3a2347] pt-6">
                     <h3 className="text-sm font-bold text-red-500 mb-3 flex items-center gap-2"> Danger Zone </h3>
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
