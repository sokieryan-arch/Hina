/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { Message, ProactiveSettings } from "./types";
import { ChatMessage } from "./components/ChatMessage";
import { SettingsModal } from "./components/SettingsModal";
import { Send, Moon, Sun, LogIn, LogOut, Settings } from "lucide-react";
import { auth, db, handleFirestoreError } from "./firebase";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from "firebase/auth";
import { collection, query, orderBy, onSnapshot, setDoc, doc, serverTimestamp } from "firebase/firestore";
import { motion } from "motion/react";
import { LanguageTip, normalizeLanguageTips } from "./shared/languageTips";

const DEFAULT_PROACTIVE_SETTINGS: ProactiveSettings = {
  enabled: false,
  minHoursBetweenNudges: 20,
  quietHoursStart: "22:00",
  quietHoursEnd: "08:00",
  favoriteTopics: [],
};

const PROACTIVE_SETTINGS_KEY = "hina.proactive.settings";
const PROACTIVE_LAST_CHECK_KEY = "hina.proactive.lastCheck";

function storageKey(base: string, userId?: string) {
  return userId ? `${base}.${userId}` : base;
}

function loadProactiveSettings(userId?: string): ProactiveSettings {
  try {
    const raw = localStorage.getItem(storageKey(PROACTIVE_SETTINGS_KEY, userId));
    if (!raw) return DEFAULT_PROACTIVE_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<ProactiveSettings>;
    return {
      enabled: parsed.enabled === true,
      minHoursBetweenNudges: typeof parsed.minHoursBetweenNudges === "number"
        ? Math.min(72, Math.max(6, parsed.minHoursBetweenNudges))
        : DEFAULT_PROACTIVE_SETTINGS.minHoursBetweenNudges,
      quietHoursStart: parsed.quietHoursStart || DEFAULT_PROACTIVE_SETTINGS.quietHoursStart,
      quietHoursEnd: parsed.quietHoursEnd || DEFAULT_PROACTIVE_SETTINGS.quietHoursEnd,
      favoriteTopics: Array.isArray(parsed.favoriteTopics)
        ? parsed.favoriteTopics.filter((topic): topic is string => typeof topic === "string").slice(0, 3)
        : [],
    };
  } catch {
    return DEFAULT_PROACTIVE_SETTINGS;
  }
}

function renderTipText(tip: LanguageTip) {
  const parts = [`${tip.title}\n${tip.body}`];
  if (tip.original && tip.suggestion) {
    parts.push(`Try: "${tip.suggestion}"`);
  }
  if (tip.example) {
    parts.push(`Example: ${tip.example}`);
  }
  return parts.join("\n");
}

function renderChatErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message === "missing_gemini_api_key") {
    return "Hina's server is missing GEMINI_API_KEY. Add it in Vercel Environment Variables, then redeploy.";
  }
  if (message === "auth_required") {
    return "Please log in again before chatting with Hina.";
  }
  if (message === "auth_failed") {
    return "Hina could not verify your login token. Check FIREBASE_PROJECT_ID in Vercel.";
  }
  if (message === "unsupported_llm_provider") {
    return "Hina's server has an unsupported LLM_PROVIDER setting.";
  }
  return `I hit a snag on my side (${message || "chat_failed"}). Try me again in a moment?`;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [proactiveSettings, setProactiveSettings] = useState<ProactiveSettings>(() => loadProactiveSettings());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const userId = user?.uid;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setProactiveSettings(loadProactiveSettings(userId));
  }, [userId]);

  useEffect(() => {
    if (theme === "dark") {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }, [theme]);

  useEffect(() => {
    if (!isAuthReady) return;

    if (user) {
      const q = query(
        collection(db, `users/${user.uid}/messages`),
        orderBy("timestamp", "asc"),
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedMessages = snapshot.docs.map((messageDoc) => ({
          id: messageDoc.id,
          ...messageDoc.data(),
        })) as Message[];

        if (fetchedMessages.length > 0) {
          setMessages(fetchedMessages);
        } else {
          const greeting: Message = {
            id: nanoid(),
            role: "model",
            text: "Hey there! I just saw someone on the subway reading Plato while guarding a tiny lizard. What kind of side quest is your day giving you?",
            type: "response",
            timestamp: Date.now(),
          };
          setMessages([greeting]);
        }
      }, (error) => {
        handleFirestoreError(error, "list" as any, `users/${user.uid}/messages`);
      });
      return () => unsubscribe();
    }

    const greeting: Message = {
      id: nanoid(),
      role: "model",
      text: "Hey there! Log in when you want me to remember our chat history.",
      type: "response",
      timestamp: Date.now(),
    };
    setMessages([greeting]);
  }, [user, isAuthReady]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const updateProactiveSettings = useCallback((settings: ProactiveSettings) => {
    setProactiveSettings(settings);
    localStorage.setItem(storageKey(PROACTIVE_SETTINGS_KEY, userId), JSON.stringify(settings));
  }, [userId]);

  const getJsonHeaders = useCallback(async () => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (user) {
      headers.Authorization = `Bearer ${await user.getIdToken()}`;
    }
    return headers;
  }, [user]);

  const saveMessageToFirebase = useCallback(async (msg: Message) => {
    if (!user) return;
    try {
      const payload: Record<string, unknown> = {
        role: msg.role,
        text: msg.text,
        type: msg.type || "response",
        timestamp: msg.timestamp,
        createdAt: serverTimestamp(),
      };
      if (msg.tipKind) {
        payload.tipKind = msg.tipKind;
      }

      await setDoc(doc(db, `users/${user.uid}/messages`, msg.id), payload);
    } catch (error) {
      handleFirestoreError(error, "create" as any, `users/${user.uid}/messages/${msg.id}`);
    }
  }, [user]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const playAudio = useCallback(async (text: string, messageId: string) => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setSpeakingMessageId(messageId);
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: await getJsonHeaders(),
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.warn("TTS failed:", data.error);
        setSpeakingMessageId(null);
        return;
      }
      if (data.audio) {
        const mimeType = data.mimeType || "audio/wav";
        const audio = new Audio(`data:${mimeType};base64,${data.audio}`);
        audioRef.current = audio;
        audio.onended = () => setSpeakingMessageId(null);
        await audio.play();
      } else {
        setSpeakingMessageId(null);
      }
    } catch (err) {
      console.error(err);
      setSpeakingMessageId(null);
    }
  }, [getJsonHeaders]);

  const recentPlainMessages = useMemo(
    () => messages
      .filter((message) => !message.isTyping && message.text)
      .slice(-6)
      .map((message) => message.text),
    [messages],
  );

  useEffect(() => {
    if (!user || !isAuthReady || !proactiveSettings.enabled || isTyping || messages.length === 0) return;

    const now = Date.now();
    const checkKey = storageKey(PROACTIVE_LAST_CHECK_KEY, user.uid);
    const lastCheck = Number(localStorage.getItem(checkKey) || 0);
    if (now - lastCheck < 5 * 60 * 1000) return;
    localStorage.setItem(checkKey, String(now));

    const timer = window.setTimeout(async () => {
      try {
        const lastInteraction = messages
          .filter((message) => message.type !== "tip")
          .at(-1);
        const res = await fetch("/api/proactive/draft", {
          method: "POST",
          headers: await getJsonHeaders(),
          body: JSON.stringify({
            settings: proactiveSettings,
            localDate: new Date().toISOString().slice(0, 10),
            favoriteTopics: proactiveSettings.favoriteTopics,
            recentMessages: recentPlainMessages,
            lastInteractionAt: lastInteraction ? new Date(lastInteraction.timestamp).toISOString() : null,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.due || !data.response) return;

        const proactiveMessage: Message = {
          id: nanoid(),
          role: "model",
          text: data.response,
          type: "proactive",
          timestamp: Date.now(),
        };

        if (!user) setMessages((prev) => [...prev, proactiveMessage]);
        await saveMessageToFirebase(proactiveMessage);
        playAudio(proactiveMessage.text, proactiveMessage.id);
      } catch (error) {
        console.error("Failed to draft proactive opener:", error);
      }
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [
    getJsonHeaders,
    isAuthReady,
    isTyping,
    messages,
    playAudio,
    proactiveSettings,
    recentPlainMessages,
    saveMessageToFirebase,
    user,
  ]);

  const handleSend = async () => {
    if (!inputValue.trim() || isTyping) return;

    const userText = inputValue.trim();
    setInputValue("");

    const userMsg: Message = {
      id: nanoid(),
      role: "user",
      text: userText,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    if (user) {
      await saveMessageToFirebase(userMsg);
    }

    try {
      const chatHistory = messages.map((message) => ({
        role: message.role,
        text: message.text,
      }));
      chatHistory.push({ role: "user", text: userText });

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: await getJsonHeaders(),
        body: JSON.stringify({ messages: chatHistory.slice(-10) }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "chat_failed");
      }

      setIsTyping(false);

      const botResponse: Message = {
        id: nanoid(),
        role: "model",
        text: data.response,
        type: "response",
        timestamp: Date.now(),
      };

      if (!user) setMessages((prev) => [...prev, botResponse]);
      await saveMessageToFirebase(botResponse);
      playAudio(botResponse.text, botResponse.id);

      const tips = normalizeLanguageTips(data.tips);
      tips.forEach((tip, index) => {
        const typingDelay = 1400 + index * 1800;
        const messageDelay = typingDelay + 800;

        window.setTimeout(() => setIsTyping(true), typingDelay);
        window.setTimeout(async () => {
          setIsTyping(false);
          const tipMessage: Message = {
            id: nanoid(),
            role: "model",
            text: renderTipText(tip),
            type: "tip",
            tipKind: tip.type,
            timestamp: Date.now() + index,
          };
          if (!user) setMessages((prev) => [...prev, tipMessage]);
          await saveMessageToFirebase(tipMessage);
        }, messageDelay);
      });
    } catch (err) {
      console.error(err);
      setIsTyping(false);
      const errorMessage: Message = {
        id: nanoid(),
        role: "model",
        text: user ? renderChatErrorMessage(err) : "Please log in if this app is running with production auth enabled.",
        type: "response",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  return (
    <div className={`flex flex-col h-screen font-sans transition-colors duration-300 ${theme} bg-[#FDFBF7] dark:bg-[#1c1224] text-[#4A4A4A] dark:text-[#e5dceb] selection:bg-[#FFD166]/30 dark:selection:bg-[#660874]/50`}>
      <header className="flex-none border-b border-[#E8E2D6] dark:border-[#3a2347] px-4 py-3 sm:px-8 flex items-center justify-between bg-white/50 dark:bg-[#1c1224]/80 backdrop-blur-sm z-10 sticky top-0 shadow-[0_1px_2px_-1px_rgba(0,0,0,0.05)] dark:shadow-none transition-colors duration-300">
        <div className="flex items-center gap-3">
          <motion.div
            animate={speakingMessageId ? { scale: [1, 1.15, 1], rotate: [-2, 2, -2] } : {}}
            transition={speakingMessageId ? { duration: 0.6, repeat: Infinity } : {}}
            className="w-12 h-12 rounded-full border-2 border-white dark:border-[#1c1224] shadow-sm flex items-center justify-center overflow-hidden transition-colors duration-300 bg-[#FFD166] text-white"
          >
            <Sun size={28} strokeWidth={2.5} />
          </motion.div>
          <div>
            <h1 className="font-bold text-lg text-[#2D2D2D] dark:text-white leading-tight tracking-tight">Hina</h1>
            <p className="text-xs text-[#8A817C] dark:text-[#a58ebd] font-medium flex items-center mt-0.5">
              <span className={`w-2 h-2 rounded-full inline-block mr-1.5 ${isTyping ? "bg-[#06D6A0]" : speakingMessageId ? "bg-[#FF9F1C]" : "bg-gray-300 dark:bg-[#4b305e]"}`}></span>
              {isTyping ? "Hina is thinking..." : speakingMessageId ? "Hina is speaking..." : "Online"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <button
              onClick={handleLogout}
              className="p-2 text-[#8A817C] dark:text-[#a58ebd] hover:bg-[#F7F2E9] dark:hover:bg-[#342042] rounded-full transition-colors flex items-center justify-center font-bold"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          ) : (
            <button
              onClick={handleLogin}
              className="p-2 text-[#8A817C] dark:text-[#a58ebd] hover:bg-[#F7F2E9] dark:hover:bg-[#342042] rounded-full transition-colors flex items-center justify-center font-bold"
              title="Login with Google"
            >
              <LogIn size={20} />
            </button>
          )}
          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="p-2 text-[#8A817C] dark:text-[#a58ebd] hover:bg-[#F7F2E9] dark:hover:bg-[#342042] rounded-full transition-colors"
            title="Toggle theme"
          >
            {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-[#8A817C] dark:text-[#a58ebd] hover:bg-[#F7F2E9] dark:hover:bg-[#342042] rounded-full transition-colors"
            title="Settings"
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="max-w-3xl mx-auto flex flex-col justify-end min-h-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center space-x-2 bg-[#F7F2E9] dark:bg-[#342042] text-[#B5A48B] dark:text-[#d6bdec] border-[#E8E2D6] dark:border-[#4b305e] text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border transition-colors duration-300">
              <span>Your English Learning Partner</span>
            </div>
            <p className="text-[#8A817C] dark:text-[#89739c] text-xs mt-3 opacity-60 font-medium">Messages are end-to-end simulated</p>
          </div>

          <div className="flex flex-col pb-4">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                isSpeaking={speakingMessageId === msg.id}
                onPlayAudio={() => playAudio(msg.text, msg.id)}
                userPhotoUrl={user?.photoURL}
              />
            ))}
            {isTyping && (
              <ChatMessage
                message={{
                  id: "typing",
                  role: "model",
                  text: "",
                  timestamp: Date.now(),
                  isTyping: true,
                }}
              />
            )}
            <div ref={messagesEndRef} className="h-1 py-1" />
          </div>
        </div>
      </div>

      <div className="flex-none bg-white dark:bg-[#1c1224] p-4 sm:p-6 border-t border-[#E8E2D6] dark:border-[#3a2347] pb-safe transition-colors duration-300">
        <div className="max-w-3xl mx-auto relative flex items-center bg-[#F7F2E9] dark:bg-[#291a33] rounded-[32px] p-2 pr-2 ring-1 ring-[#E8E2D6] dark:ring-[#3a2347] shadow-inner focus-within:ring-2 focus-within:ring-[#B5A48B] dark:focus-within:ring-[#660874] transition-all duration-300">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Reply to Hina in English (or Chinese if you're tired!)"
            className="flex-1 max-h-32 min-h-[44px] bg-transparent border-0 resize-none py-3 px-4 focus:outline-none focus:ring-0 text-[15px] block leading-relaxed placeholder-[#B5A48B] dark:placeholder-[#89739c] text-[#4A4A4A] dark:text-[#e5dceb]"
            rows={1}
            disabled={isTyping}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isTyping}
            className="w-11 h-11 shrink-0 ml-2 bg-[#FF9F1C] dark:bg-[#660874] text-white hover:scale-105 transition-transform disabled:bg-[#E8E2D6] dark:disabled:bg-[#301f3b] disabled:text-[#B5A48B] dark:disabled:text-[#6a537a] disabled:hover:scale-100 rounded-full flex items-center justify-center shadow-md disabled:shadow-none transition-colors duration-300"
            title="Send"
          >
            <Send size={18} className="-ml-0.5" />
          </button>
        </div>
        <div className="text-center mt-2">
          <span className="text-[11px] text-[#8A817C] dark:text-[#89739c] opacity-80">Hina can make mistakes. Consider verifying important information.</span>
        </div>
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={user}
        onClearHistory={() => setMessages([])}
        proactiveSettings={proactiveSettings}
        onProactiveSettingsChange={updateProactiveSettings}
      />
    </div>
  );
}
