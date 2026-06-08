import React, { useState } from "react";
import { Message } from "../types";
import { cn } from "../lib/utils";
import { Sparkles, Lightbulb, Bot, Volume2, Sun } from "lucide-react";
import { motion } from "motion/react";

interface ChatMessageProps {
  key?: string | number;
  message: Message;
  isSpeaking?: boolean;
  onPlayAudio?: () => void;
  userPhotoUrl?: string | null;
}

export function ChatMessage({ message, isSpeaking, onPlayAudio, userPhotoUrl }: ChatMessageProps) {
  const isUser = message.role === "user";
  
  if (message.isTyping) {
    return (
      <div className="flex w-full mt-6 gap-4 max-w-[80%]">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm border border-transparent dark:border-[#3a2347] transition-colors duration-300 overflow-hidden bg-[#FFD166] text-white">
            <Sun size={24} strokeWidth={2.5} />
          </div>
        </div>
        <div>
          <div className="bg-white dark:bg-[#291a33] p-4 rounded-2xl rounded-tl-none shadow-sm border border-[#F0EADF] dark:border-[#3a2347] inline-block transition-colors duration-300">
            <div className="flex space-x-1.5 h-6 items-center px-1">
              <motion.div 
                className="w-1.5 h-1.5 bg-[#B5A48B] dark:bg-[#a58ebd] rounded-full transition-colors duration-300"
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
              />
              <motion.div 
                className="w-1.5 h-1.5 bg-[#B5A48B] dark:bg-[#a58ebd] rounded-full transition-colors duration-300"
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
              />
              <motion.div 
                className="w-1.5 h-1.5 bg-[#B5A48B] dark:bg-[#a58ebd] rounded-full transition-colors duration-300"
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  let bgClass = "bg-[#5A5A40] dark:bg-[#48285c] text-white p-4 rounded-2xl rounded-tr-none shadow-md border border-transparent dark:border-[#5c3773]";
  let borderClass = "";
  
  if (!isUser) {
    if (message.type === "correction") {
      bgClass = "bg-[#FDF2E9] dark:bg-[#3d1928] text-[#93522C] dark:text-[#ffb0ca] p-4 rounded-2xl shadow-sm border border-[#FBD7BB] dark:border-[#6b2542]";
    } else if (message.type === "insight") {
      bgClass = "bg-[#EAF4F2] dark:bg-[#182a45] text-[#2F5D54] dark:text-[#9fc7ff] p-3 rounded-2xl shadow-sm border border-[#C5E1DB] dark:border-[#24426e]";
    } else {
      bgClass = "bg-white dark:bg-[#291a33] text-[#4A4A4A] dark:text-[#e5dceb] p-4 rounded-2xl rounded-tl-none shadow-sm border border-[#F0EADF] dark:border-[#3a2347]";
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn(
        "flex w-full mt-6 gap-4 max-w-[80%]",
        isUser ? "ml-auto flex-row-reverse" : ""
      )}
    >
      <div className="flex-shrink-0">
        {isUser ? (
           <div className="w-10 h-10 rounded-full bg-[#5A5A40] dark:bg-[#48285c] border border-transparent dark:border-[#5c3773] flex items-center justify-center text-white text-xl shadow-sm transition-colors duration-300 overflow-hidden">
             {userPhotoUrl ? (
               <img src={userPhotoUrl} alt="User" className="w-full h-full object-cover" />
             ) : (
               "👤"
             )}
           </div>
        ) : (
           <motion.div 
             animate={isSpeaking ? { scale: [1, 1.15, 1], rotate: [-2, 2, -2] } : {}}
             transition={isSpeaking ? { duration: 0.6, repeat: Infinity } : {}}
             className={cn(
               "relative w-10 h-10 rounded-full border border-transparent dark:border-[#3a2347] flex items-center justify-center shadow-sm transition-colors duration-300 overflow-hidden",
               message.type !== 'response' ? "bg-[#FFD166] dark:bg-[#660874] text-xl text-black dark:text-white" : "bg-[#FFD166] text-white"
             )}
           >
             {message.type === 'correction' ? '✨' : (message.type === 'insight' ? '💡' : <Sun size={24} strokeWidth={2.5} />)}
           </motion.div>
        )}
      </div>
      
      <div className={cn("space-y-2", isUser ? "text-left" : "")}>
        <div className={cn(
          "relative text-[15px] leading-relaxed font-sans transition-colors duration-300 group",
          bgClass, borderClass
        )}>
          {message.type === "correction" && (
            <p className="text-sm font-medium mb-1 italic">Just a tiny tip... ✨</p>
          )}
          {message.type === "insight" && (
            <p className="text-xs font-bold uppercase tracking-widest mb-1 opacity-80">💡 Quick Insight</p>
          )}
          <div className="whitespace-pre-wrap">{message.text}</div>
          
          {/* Play Audio Button */}
          {!isUser && onPlayAudio && (
            <button 
              onClick={onPlayAudio}
              className={cn(
                "absolute -right-8 bottom-0 p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100",
                isSpeaking && "text-[#FF9F1C] dark:text-[#a58ebd] opacity-100"
              )}
              title="Play AI Voice"
            >
              <Volume2 size={16} />
            </button>
          )}
        </div>
        {!isUser && message.type === "response" && (
          <p className="text-[10px] text-[#B5A48B] dark:text-[#89739c] font-bold uppercase tracking-wider ml-1 transition-colors duration-300">
             {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </p>
        )}
      </div>
    </motion.div>
  );
}
