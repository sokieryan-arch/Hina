/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { BillingSummary, Message, ProactiveSettings, UserProfile } from "./types";
import { ChatMessage } from "./components/ChatMessage";
import { SettingsModal } from "./components/SettingsModal";
import { AuthPanel } from "./components/AuthPanel";
import { EmailVerificationPanel } from "./components/EmailVerificationPanel";
import { getPublicPage, PublicPage } from "./publicPages";
import { Send, Moon, Sun, LogOut, Settings } from "lucide-react";
import {
  auth,
  db,
  handleFirestoreError,
  loadRemoteProactiveSettings,
  loadUserProfile,
  saveUserProfile,
  saveRemoteProactiveSettings,
} from "./firebase";
import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  User,
} from "firebase/auth";
import { collection, query, orderBy, onSnapshot, setDoc, doc, serverTimestamp } from "firebase/firestore";
import { motion } from "motion/react";
import { formatAuthErrorMessage, isPopupFallbackError } from "./authErrorMessage";

const DEFAULT_PROACTIVE_SETTINGS: ProactiveSettings = {
  enabled: false,
  minHoursBetweenNudges: 20,
  quietHoursStart: "22:00",
  quietHoursEnd: "08:00",
  favoriteTopics: [],
};

const PROACTIVE_SETTINGS_KEY = "hina.proactive.settings";
const PROACTIVE_LAST_CHECK_KEY = "hina.proactive.lastCheck";
const THEME_STORAGE_KEY = "hina.theme";

function storageKey(base: string, userId?: string) {
  return userId ? `${base}.${userId}` : base;
}

function loadTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
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

function greeting(loggedIn: boolean): Message {
  return {
    id: nanoid(),
    role: "model",
    text: loggedIn
      ? "Hey there! I just saw the craziest guy on the subway holding a tiny lizard! 🦎 What are you up to today?"
      : "Hey there! Please login to save our chat history! 😊",
    type: "response",
    timestamp: Date.now(),
  };
}

function profileFromFirebaseUser(user: User): UserProfile {
  return {
    displayName: user.displayName || user.email?.split("@")[0] || "Hina Friend",
    photoURL: user.photoURL || null,
  };
}

function requiresEmailVerification(user: User) {
  return !user.emailVerified && user.providerData.some((provider) => provider.providerId === "password");
}

function renderChatErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message === "quota_exceeded") {
    return "Today's free chats are used up. Pro is coming soon.";
  }
  if (message === "billing_failed") {
    return "I couldn't check today's chat quota. Try me again in a moment?";
  }
  return message && message.length > 5 && !message.includes("fetch") && !message.includes("JSON")
    ? message
    : "Uh oh, I'm feeling a little dizzy right now (servers are super busy)! Can we try again in a few minutes? 😅";
}

async function parseJsonResponse(response: Response) {
  const rawText = await response.text();
  if (!rawText) return {};
  try {
    return JSON.parse(rawText);
  } catch {
    throw new Error(`Response was not valid JSON. Status: ${response.status}. Raw body: ${rawText.substring(0, 500)}`);
  }
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => loadTheme());
  const [user, setUser] = useState<User | null>(null);
  const [pendingVerificationUser, setPendingVerificationUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [preparingAudioId, setPreparingAudioId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [proactiveSettings, setProactiveSettings] = useState<ProactiveSettings>(() => loadProactiveSettings());
  const [authFeedback, setAuthFeedback] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const userId = user?.uid;

  const applyAuthenticatedUser = useCallback((currentUser: User | null) => {
    if (currentUser && requiresEmailVerification(currentUser)) {
      setPendingVerificationUser(currentUser);
      setUser(null);
      return;
    }

    setPendingVerificationUser(null);
    setUser(currentUser);
    if (currentUser) setAuthFeedback(null);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      applyAuthenticatedUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, [applyAuthenticatedUser]);

  useEffect(() => {
    let cancelled = false;
    getRedirectResult(auth)
      .then((result) => {
        if (cancelled) return;
        if (result?.user) {
          setAuthFeedback(null);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Redirect login failed:", error);
        setAuthFeedback(formatAuthErrorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const getJsonHeaders = useCallback(async () => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (user) {
      headers.Authorization = `Bearer ${await user.getIdToken()}`;
    }
    return headers;
  }, [user]);

  const refreshBilling = useCallback(async () => {
    if (!user) {
      setBilling(null);
      return;
    }
    try {
      const response = await fetch("/api/billing/me", {
        headers: await getJsonHeaders(),
      });
      const data = await parseJsonResponse(response);
      if (response.ok && data.billing) setBilling(data.billing);
    } catch (error) {
      console.error("Failed to load billing:", error);
    }
  }, [getJsonHeaders, user]);

  useEffect(() => {
    if (!isAuthReady) return;
    if (!user) {
      setUserProfile(null);
      setBilling(null);
      setProactiveSettings(loadProactiveSettings());
      return;
    }

    let cancelled = false;
    setUserProfile(profileFromFirebaseUser(user));
    setProactiveSettings(loadProactiveSettings(user.uid));

    Promise.all([
      loadUserProfile(user.uid),
      loadRemoteProactiveSettings(user.uid),
      refreshBilling(),
    ]).then(([remoteProfile, remoteSettings]) => {
      if (cancelled) return;
      if (remoteProfile) setUserProfile(remoteProfile);
      if (remoteSettings) {
        setProactiveSettings(remoteSettings);
        localStorage.setItem(storageKey(PROACTIVE_SETTINGS_KEY, user.uid), JSON.stringify(remoteSettings));
      }
    }).catch((error) => console.error("Failed to load user settings:", error));

    return () => {
      cancelled = true;
    };
  }, [isAuthReady, refreshBilling, user]);

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

        setMessages(fetchedMessages.length > 0 ? fetchedMessages : [greeting(true)]);
      }, (error) => {
        handleFirestoreError(error, "list" as any, `users/${user.uid}/messages`);
      });
      return () => unsubscribe();
    }

    setMessages([greeting(false)]);
  }, [user, isAuthReady]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const updateProactiveSettings = useCallback((settings: ProactiveSettings) => {
    setProactiveSettings(settings);
    localStorage.setItem(storageKey(PROACTIVE_SETTINGS_KEY, userId), JSON.stringify(settings));
    if (userId) {
      saveRemoteProactiveSettings(userId, settings)
        .then((remoteSettings) => {
          setProactiveSettings(remoteSettings);
          localStorage.setItem(storageKey(PROACTIVE_SETTINGS_KEY, userId), JSON.stringify(remoteSettings));
        })
        .catch((error) => console.error("Failed to save proactive settings:", error));
    }
  }, [userId]);

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
      if (msg.tipKind) payload.tipKind = msg.tipKind;
      await setDoc(doc(db, `users/${user.uid}/messages`, msg.id), payload);
    } catch (error) {
      handleFirestoreError(error, "create" as any, `users/${user.uid}/messages/${msg.id}`);
    }
  }, [user]);

  const handleProactiveTrigger = useCallback(async () => {
    if (isTyping || !proactiveSettings.enabled) return;
    setIsTyping(true);

    try {
      const chatHistory = messages.map((message) => ({
        role: message.role,
        text: message.text,
      }));
      chatHistory.push({
        role: "user",
        text: `System Notification: The user has been idle. Please ask a casual English learning question proactively. Favorite topics: ${proactiveSettings.favoriteTopics.join(", ") || "everyday life"}.`,
      });

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: await getJsonHeaders(),
        body: JSON.stringify({ messages: chatHistory.slice(-10) }),
      });
      const data = await parseJsonResponse(response);
      if (!response.ok) {
        if (response.status === 429 || response.status === 503 || response.status === 500 || response.status === 402) {
          console.warn("Proactive message skipped due to server load, quota, or rate limit.", data.error || response.statusText);
          setIsTyping(false);
          return;
        }
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      setIsTyping(false);
      if (data.billing) setBilling(data.billing);

      const proactiveMessage: Message = {
        id: nanoid(),
        role: "model",
        text: data.response,
        type: "proactive",
        timestamp: Date.now(),
      };

      if (!user) setMessages((prev) => [...prev, proactiveMessage]);
      await saveMessageToFirebase(proactiveMessage);
    } catch (err: any) {
      console.warn("Proactive fetch failed, skipping till next interval:", err.message);
      setIsTyping(false);
    }
  }, [getJsonHeaders, isTyping, messages, proactiveSettings, saveMessageToFirebase, user]);

  useEffect(() => {
    if (!proactiveSettings.enabled || isTyping || !isAuthReady || messages.length === 0) return;

    const lastMessage = messages.filter((message) => message.type !== "correction" && message.type !== "insight").at(-1);
    if (!lastMessage) return;

    const now = Date.now();
    const checkKey = storageKey(PROACTIVE_LAST_CHECK_KEY, user?.uid);
    const lastCheck = Number(localStorage.getItem(checkKey) || 0);
    if (now - lastCheck < 5 * 60 * 1000) return;

    const minGapMs = proactiveSettings.minHoursBetweenNudges * 60 * 60 * 1000;
    const idleMs = now - lastMessage.timestamp;
    if (idleMs < minGapMs) return;

    localStorage.setItem(checkKey, String(now));
    const timeout = window.setTimeout(() => {
      handleProactiveTrigger();
    }, 1000);
    return () => window.clearTimeout(timeout);
  }, [handleProactiveTrigger, isAuthReady, isTyping, messages, proactiveSettings, user?.uid]);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    setAuthFeedback(null);
    try {
      await signInWithPopup(auth, provider);
      setAuthFeedback(null);
    } catch (error) {
      console.error("Login failed:", error);
      if (isPopupFallbackError(error)) {
        setAuthFeedback("The sign-in popup was blocked. Redirecting to Google sign-in...");
        try {
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectError) {
          console.error("Redirect login failed:", redirectError);
          setAuthFeedback(formatAuthErrorMessage(redirectError));
        }
      } else {
        setAuthFeedback(formatAuthErrorMessage(error));
      }
    }
  };

  const handleEmailLogin = async ({ email, password }: { email: string; password: string }) => {
    setAuthFeedback(null);
    await signInWithEmailAndPassword(auth, email, password);
  };

  const handleEmailRegister = async ({ email, password, displayName }: { email: string; password: string; displayName: string }) => {
    setAuthFeedback(null);
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const profile = {
      displayName,
      photoURL: credential.user.photoURL || null,
    };
    await updateProfile(credential.user, profile);
    setUserProfile(profile);
    await saveUserProfile(credential.user.uid, profile);
    await sendEmailVerification(credential.user);
    setAuthFeedback("Verification email sent. Check your inbox, then come back here.");
  };

  const handlePasswordReset = async ({ email }: { email: string }) => {
    setAuthFeedback(null);
    await sendPasswordResetEmail(auth, email);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setPendingVerificationUser(null);
      setUserProfile(null);
      setBilling(null);
      setAuthFeedback(null);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleVerificationRefresh = async () => {
    if (!pendingVerificationUser) return;

    setAuthFeedback(null);
    try {
      await pendingVerificationUser.reload();
      const refreshedUser = auth.currentUser;
      if (!refreshedUser) {
        setPendingVerificationUser(null);
        return;
      }

      if (requiresEmailVerification(refreshedUser)) {
        setPendingVerificationUser(refreshedUser);
        setAuthFeedback("Still waiting for verification. Open the email link, then refresh again.");
        return;
      }

      applyAuthenticatedUser(refreshedUser);
    } catch (error) {
      console.error("Email verification refresh failed:", error);
      setAuthFeedback(formatAuthErrorMessage(error));
    }
  };

  const handleResendVerificationEmail = async () => {
    if (!pendingVerificationUser) return;

    setAuthFeedback(null);
    try {
      await sendEmailVerification(pendingVerificationUser);
      setAuthFeedback("Verification email sent again. Check your inbox and spam folder.");
    } catch (error) {
      console.error("Email verification resend failed:", error);
      setAuthFeedback(formatAuthErrorMessage(error));
    }
  };

  const playAudio = useCallback(async (text: string, messageId: string) => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setSpeakingMessageId(null);
      setPreparingAudioId(messageId);
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: await getJsonHeaders(),
        body: JSON.stringify({ text }),
      });

      const data = await parseJsonResponse(res);
      if (!res.ok) {
        if (res.status === 429) {
          console.warn("TTS rate limited. Please wait.");
        } else {
          console.error("TTS failed:", data.error);
        }
        setPreparingAudioId(null);
        return;
      }

      if (data.audio) {
        const mimeType = data.mimeType || "audio/wav";
        const audio = new Audio(`data:${mimeType};base64,${data.audio}`);
        audioRef.current = audio;
        audio.onended = () => setSpeakingMessageId(null);
        setPreparingAudioId(null);
        setSpeakingMessageId(messageId);
        await audio.play();
      } else {
        setPreparingAudioId(null);
      }
    } catch (err: any) {
      console.error(err);
      setPreparingAudioId(null);
    }
  }, [getJsonHeaders]);

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
      const data = await parseJsonResponse(response);

      if (!response.ok) {
        if (data.billing) setBilling(data.billing);
        throw new Error(data.error || "chat_failed");
      }

      setIsTyping(false);
      if (data.billing) setBilling(data.billing);

      const botResponse: Message = {
        id: nanoid(),
        role: "model",
        text: data.response,
        type: "response",
        timestamp: Date.now(),
      };

      if (!user) setMessages((prev) => [...prev, botResponse]);
      await saveMessageToFirebase(botResponse);

      if (data.correction) {
        setIsTyping(true);
        window.setTimeout(async () => {
          setIsTyping(false);
          const correctionMsg: Message = {
            id: nanoid(),
            role: "model",
            text: data.correction,
            type: "correction",
            timestamp: Date.now(),
          };
          if (!user) setMessages((prev) => [...prev, correctionMsg]);
          await saveMessageToFirebase(correctionMsg);
        }, 3000);
      }

      if (data.insight) {
        const baseDelay = data.correction ? 6000 : 3000;
        window.setTimeout(() => setIsTyping(true), baseDelay - 1000);

        window.setTimeout(async () => {
          setIsTyping(false);
          const insightMsg: Message = {
            id: nanoid(),
            role: "model",
            text: data.insight,
            type: "insight",
            timestamp: Date.now(),
          };
          if (!user) setMessages((prev) => [...prev, insightMsg]);
          await saveMessageToFirebase(insightMsg);
        }, baseDelay + 2000);
      }
    } catch (err: any) {
      console.error(err);
      setIsTyping(false);

      const errorResponse: Message = {
        id: nanoid(),
        role: "model",
        text: renderChatErrorMessage(err),
        type: "response",
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, errorResponse]);
      if (user) {
        await saveMessageToFirebase(errorResponse);
      }
    }
  };

  const HinaHeaderIcon = theme === "dark" ? Moon : Sun;
  const publicPage = typeof window !== "undefined" ? getPublicPage(window.location.pathname) : null;

  if (publicPage) {
    return <PublicPage page={publicPage} />;
  }

  if (!isAuthReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FDFBF7] px-6 text-[#4A4A4A]">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#FFD166] text-white shadow-sm">
            <Sun size={28} strokeWidth={2.5} />
          </div>
          <p className="text-sm font-bold text-[#8A817C]">Hina is preparing your session...</p>
        </div>
      </div>
    );
  }

  if (pendingVerificationUser) {
    return (
      <EmailVerificationPanel
        email={pendingVerificationUser.email}
        feedback={authFeedback}
        onRefresh={handleVerificationRefresh}
        onResend={handleResendVerificationEmail}
        onSignOut={handleLogout}
      />
    );
  }

  if (!user) {
    return (
      <AuthPanel
        onGoogleLogin={handleGoogleLogin}
        onEmailLogin={handleEmailLogin}
        onEmailRegister={handleEmailRegister}
        onPasswordReset={handlePasswordReset}
        feedback={authFeedback}
      />
    );
  }

  return (
    <div className={`flex flex-col h-screen font-sans transition-colors duration-300 ${theme} bg-[#FDFBF7] dark:bg-[#1c1224] text-[#4A4A4A] dark:text-[#e5dceb] selection:bg-[#FFD166]/30 dark:selection:bg-[#660874]/50`}>
      <header className="flex-none border-b border-[#E8E2D6] dark:border-[#3a2347] px-4 py-3 sm:px-8 flex items-center justify-between bg-white/50 dark:bg-[#1c1224]/80 backdrop-blur-sm z-10 sticky top-0 shadow-[0_1px_2px_-1px_rgba(0,0,0,0.05)] dark:shadow-none transition-colors duration-300">
        <div className="flex items-center gap-3">
          <motion.div
            animate={speakingMessageId ? { scale: [1, 1.15, 1], rotate: [-2, 2, -2] } : {}}
            transition={speakingMessageId ? { duration: 0.6, repeat: Infinity } : {}}
            className="w-12 h-12 rounded-full border-2 border-white dark:border-[#1c1224] shadow-sm flex items-center justify-center overflow-hidden transition-colors duration-300 bg-[#FFD166] text-white"
            data-hina-avatar={theme === "dark" ? "moon" : "sun"}
          >
            <HinaHeaderIcon size={28} strokeWidth={2.5} />
          </motion.div>
          <div>
            <h1 className="font-bold text-lg text-[#2D2D2D] dark:text-white leading-tight tracking-normal">Hina</h1>
            <p className="text-xs text-[#8A817C] dark:text-[#a58ebd] font-medium flex items-center mt-0.5">
              <span className={`w-2 h-2 rounded-full inline-block mr-1.5 ${isTyping ? "bg-[#06D6A0]" : preparingAudioId ? "bg-[#4EA8DE]" : speakingMessageId ? "bg-[#FF9F1C]" : "bg-gray-300 dark:bg-[#4b305e]"}`} />
              {isTyping ? "Hina is thinking..." : preparingAudioId ? "Hina is preparing..." : speakingMessageId ? "Hina is speaking..." : "Online"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleLogout}
            className="p-2 text-[#8A817C] dark:text-[#a58ebd] hover:bg-[#F7F2E9] dark:hover:bg-[#342042] rounded-full transition-colors flex items-center justify-center font-bold"
            title="Logout"
          >
            <LogOut size={20} />
          </button>
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
            <p className="text-[#8A817C] dark:text-[#89739c] text-xs mt-3 opacity-60 font-medium">Hina can make mistakes. Consider verifying important information.</p>
          </div>

          <div className="flex flex-col pb-4">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                isSpeaking={speakingMessageId === msg.id}
                onPlayAudio={() => playAudio(msg.text, msg.id)}
                userPhotoUrl={userProfile?.photoURL || user?.photoURL}
                theme={theme}
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
                theme={theme}
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
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={user}
        profile={userProfile}
        billing={billing}
        onProfileChange={setUserProfile}
        onBillingChange={setBilling}
        onClearHistory={() => setMessages([greeting(Boolean(user))])}
        proactiveSettings={proactiveSettings}
        onProactiveSettingsChange={updateProactiveSettings}
      />
    </div>
  );
}
