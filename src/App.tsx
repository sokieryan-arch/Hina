/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { nanoid } from "nanoid";
import { Message, Role } from "./types";
import { ChatMessage } from "./components/ChatMessage";
import { SettingsModal } from "./components/SettingsModal";
import { Send, Menu, Moon, Sun, LogIn, LogOut, Settings } from "lucide-react";
import { auth, db, handleFirestoreError } from "./firebase";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from "firebase/auth";
import { collection, query, orderBy, onSnapshot, setDoc, doc, serverTimestamp, getDocs } from "firebase/firestore";
import { motion } from "motion/react";

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [preparingAudioId, setPreparingAudioId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProactiveEnabled, setIsProactiveEnabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Auth setup
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Use useEffect to update theme class
  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [theme]);

  // Sync messages from Firebase
  useEffect(() => {
    if (!isAuthReady) return;
    
    if (user) {
      const q = query(
        collection(db, `users/${user.uid}/messages`),
        orderBy("timestamp", "asc")
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedMessages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Message[];
        
        if (fetchedMessages.length > 0) {
          setMessages(fetchedMessages);
        } else {
          // If no history, add greeting
          const greeting: Message = {
            id: nanoid(),
            role: "model",
            text: "Hey there! I just saw the craziest guy on the subway holding a tiny lizard! 🦎 What are you up to today?",
            type: "response",
            timestamp: Date.now()
          };
          setMessages([greeting]);
        }
      }, (error) => {
        handleFirestoreError(error, "list" as any, `users/${user.uid}/messages`);
      });
      return () => unsubscribe();
    } else {
      // Not logged in
      const greeting: Message = {
        id: nanoid(),
        role: "model",
        text: "Hey there! Please login to save our chat history! 😊",
        type: "response",
        timestamp: Date.now()
      };
      setMessages([greeting]);
    }
  }, [user, isAuthReady]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Proactive Interruption Logic
  useEffect(() => {
    if (!isProactiveEnabled || isTyping || !isAuthReady || messages.length === 0) return;

    // Check last message
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role === "model" && (lastMsg.type === "correction" || lastMsg.type === "insight")) {
      return; 
    }

    const timeSinceLastMsg = Date.now() - lastMsg.timestamp;
    const proactiveThreshold = 45000; // 45 seconds strictly for demo (typically 5 mins)

    if (timeSinceLastMsg >= proactiveThreshold) {
      handleProactiveTrigger();
    } else {
      const timeout = setTimeout(() => {
        handleProactiveTrigger();
      }, proactiveThreshold - timeSinceLastMsg + 1000); // Trigger just after threshold
      return () => clearTimeout(timeout);
    }
  }, [messages, isProactiveEnabled, isTyping, isAuthReady]);

  const handleProactiveTrigger = async () => {
    if (isTyping) return;
    setIsTyping(true);
    
    // Optimistically show typing, then fetch proactive message
    try {
      const chatHistory = messages.map(m => ({
        role: m.role,
        text: m.text
      }));
      chatHistory.push({ role: "user", text: "System Notification: The user has been idle for some time. Please ask a casual, localized English learning question or start an interesting natural conversation proactively." });
      const recentMessages = chatHistory.slice(-10);

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: recentMessages }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429 || response.status === 503 || response.status === 500) {
           console.warn("Proactive message skipped due to server load/rate limit.", errorData.error || response.statusText);
           setIsTyping(false);
           return;
        }
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setIsTyping(false); 
      
      const botResponse: Message = {
        id: nanoid(),
        role: "model",
        text: data.response,
        type: "response",
        timestamp: Date.now()
      };
      
      if (!user) setMessages(prev => [...prev, botResponse]);
      await saveMessageToFirebase(botResponse);
    } catch (err: any) {
      console.warn("Proactive fetch failed, skipping till next interval:", err.message);
      setIsTyping(false);
    }
  };

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

  const saveMessageToFirebase = async (msg: Message) => {
    if (!user) return;
    try {
      await setDoc(doc(db, `users/${user.uid}/messages`, msg.id), {
        role: msg.role,
        text: msg.text,
        type: msg.type || "response",
        timestamp: msg.timestamp,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, "create" as any, `users/${user.uid}/messages/${msg.id}`);
    }
  };

  const playAudio = async (text: string, messageId: string) => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setSpeakingMessageId(null);
      setPreparingAudioId(messageId);
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      
      let data;
      let rawText = "";
      try {
        const clonedRes = res.clone();
        rawText = await clonedRes.text();
        data = await res.json();
      } catch (jsonError) {
         setPreparingAudioId(null);
         throw new Error(`TTS failed with status: ${res.status}. Output was not JSON. Raw body: ${rawText.substring(0, 500)}`);
      }

      if (!res.ok) {
        if (res.status === 429) {
          console.warn("TTS Rate limited. Please wait.");
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
    } catch(err: any) {
      if (err.message && err.message.includes("breather")) {
        console.warn("TTS rate limited - playing fallback or ignoring.", err.message);
      } else {
        console.error(err);
      }
      setPreparingAudioId(null);
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isTyping) return;

    const userText = inputValue.trim();
    setInputValue("");
    
    const userMsg: Message = {
      id: nanoid(),
      role: "user",
      text: userText,
      timestamp: Date.now()
    };

    // Optimistic update
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);
    
    // Save to firebase
    if (user) {
       await saveMessageToFirebase(userMsg);
    }

    try {
      // Pass recent context connecting standard setMessages with chat context
      const chatHistory = messages.map(m => ({
        role: m.role,
        text: m.text
      }));
      chatHistory.push({ role: "user", text: userText });
      const recentMessages = chatHistory.slice(-10);

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: recentMessages }),
      });

      if (!response.ok) {
        // Try to read custom error text from backend
        let errMsg = "servers are super busy";
        try {
           const errBody = await response.json();
           if (errBody && errBody.error) errMsg = errBody.error;
        } catch(e) {}
        throw new Error(errMsg);
      }

      let data;
      let rawText = "";
      try {
        const clonedRes = response.clone();
        rawText = await clonedRes.text();
        data = await response.json();
      } catch (jsonErr) {
        throw new Error(`Chat response was not valid JSON. Status: ${response.status}. Raw body: ${rawText.substring(0, 500)}`);
      }
      
      setIsTyping(false); 
      
      const botResponse: Message = {
        id: nanoid(),
        role: "model",
        text: data.response,
        type: "response",
        timestamp: Date.now()
      };
      
      if (!user) setMessages(prev => [...prev, botResponse]);
      await saveMessageToFirebase(botResponse);

      if (data.correction) {
        setIsTyping(true);
        setTimeout(async () => {
          setIsTyping(false);
          const correctionMsg: Message = {
            id: nanoid(),
            role: "model",
            text: data.correction,
            type: "correction",
            timestamp: Date.now()
          };
          if (!user) setMessages(prev => [...prev, correctionMsg]);
          await saveMessageToFirebase(correctionMsg);
        }, 3000);
      }

      if (data.insight) {
        const baseDelay = data.correction ? 6000 : 3000;
        setTimeout(() => setIsTyping(true), baseDelay - 1000);

        setTimeout(async () => {
          setIsTyping(false);
          const insightMsg: Message = {
            id: nanoid(),
            role: "model",
            text: data.insight,
            type: "insight",
            timestamp: Date.now()
          };
          if (!user) setMessages(prev => [...prev, insightMsg]);
          await saveMessageToFirebase(insightMsg);
        }, baseDelay + 2000); 
      }

    } catch (err: any) {
      if (err.message && err.message.includes("out of breath")) {
         console.warn("Generation rate limited (out of breath) - displaying to user gracefully.", err.message);
      } else {
         console.error(err);
      }
      setIsTyping(false);
      
      const errorText = err.message && err.message.length > 5 && !err.message.includes("fetch") && !err.message.includes("JSON") ? err.message : "Uh oh, I'm feeling a little dizzy right now (servers are super busy)! Can we try again in a few minutes? 😅";

      const errorResponse: Message = {
        id: nanoid(),
        role: "model",
        text: errorText,
        type: "response",
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, errorResponse]);
      if (user) {
        await saveMessageToFirebase(errorResponse);
      }
    }
  };

  return (
    <div className={`flex flex-col h-screen font-sans transition-colors duration-300 ${theme} bg-[#FDFBF7] dark:bg-[#1c1224] text-[#4A4A4A] dark:text-[#e5dceb] selection:bg-[#FFD166]/30 dark:selection:bg-[#660874]/50`}>
      
      {/* Header */}
      <header className="flex-none border-b border-[#E8E2D6] dark:border-[#3a2347] px-4 py-3 sm:px-8 flex items-center justify-between bg-white/50 dark:bg-[#1c1224]/80 backdrop-blur-sm z-10 sticky top-0 shadow-[0_1px_2px_-1px_rgba(0,0,0,0.05)] dark:shadow-none transition-colors duration-300">
        <div className="flex items-center gap-3">
          <motion.div 
            animate={speakingMessageId ? { scale: [1, 1.15, 1], rotate: [-2, 2, -2] } : {}}
            transition={speakingMessageId ? { duration: 0.6, repeat: Infinity } : {}}
            className="w-12 h-12 rounded-full border-2 border-white dark:border-[#1c1224] shadow-sm flex items-center justify-center overflow-hidden transition-colors duration-300 bg-[#FFD166] dark:bg-[#342042] text-white dark:text-[#a58ebd]"
          >
             {theme === 'dark' ? <Moon size={28} strokeWidth={2.5} /> : <Sun size={28} strokeWidth={2.5} />}
          </motion.div>
          <div>
            <h1 className="font-bold text-lg text-[#2D2D2D] dark:text-white leading-tight tracking-tight">Hina</h1>
            <p className="text-xs text-[#8A817C] dark:text-[#a58ebd] font-medium flex items-center mt-0.5">
              <span className={`w-2 h-2 rounded-full inline-block mr-1.5 ${isTyping ? 'bg-[#06D6A0]' : preparingAudioId ? 'bg-[#4EA8DE]' : speakingMessageId ? 'bg-[#FF9F1C]' : 'bg-gray-300 dark:bg-[#4b305e]'}`}></span>
              {isTyping ? "Hina is thinking..." : preparingAudioId ? "Hina is preparing..." : speakingMessageId ? "Hina is speaking..." : "Online"}
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
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="p-2 text-[#8A817C] dark:text-[#a58ebd] hover:bg-[#F7F2E9] dark:hover:bg-[#342042] rounded-full transition-colors"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-[#8A817C] dark:text-[#a58ebd] hover:bg-[#F7F2E9] dark:hover:bg-[#342042] rounded-full transition-colors"
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* Chat Area */}
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
                  theme={theme}
                />
              ))}
              {isTyping && (
                <ChatMessage 
                  message={{ 
                    id: 'typing', 
                    role: 'model', 
                    text: '', 
                    timestamp: Date.now(), 
                    isTyping: true 
                  }} 
                  theme={theme}
                />
              )}
              <div ref={messagesEndRef} className="h-1 py-1" />
          </div>
        </div>
      </div>

      {/* Input Area */}
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
        isProactiveEnabled={isProactiveEnabled}
        setIsProactiveEnabled={setIsProactiveEnabled}
      />
    </div>
  );
}

