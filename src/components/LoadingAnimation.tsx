import React from 'react';
import { motion } from 'motion/react';

interface LoadingAnimationProps {
  text?: string;
}

export default function LoadingAnimation({ text = 'Thinking...' }: LoadingAnimationProps) {
  // Translate default text gently to matching locale terms if fallback is used
  const displayLabel = text === 'Processing...' || text === 'Thinking...' ? 'Gemini 正在思考' : text;

  return (
    <div className="flex flex-col items-center justify-center py-4 px-2 space-y-4 select-none">
      {/* Neural Expressive Glowing Blob Orb */}
      <div className="relative w-16 h-16 flex items-center justify-center">
        {/* Glow background */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#1a56ff] via-[#76a7ff] to-[#fecaca] rounded-full blur-xl opacity-40 dark:opacity-60 animate-pulse duration-3000" />
        
        {/* Swirling Layer 1 - Violet Fluid */}
        <motion.div
          className="absolute w-12 h-12 rounded-[40%] bg-gradient-to-tr from-indigo-500/80 to-purple-500/80 mix-blend-multiply dark:mix-blend-screen"
          animate={{
            rotate: 360,
            borderRadius: ["40%", "50%", "35%", "40%"],
            scale: [1, 1.15, 0.9, 1],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Swirling Layer 2 - Blue Cyber Fluid */}
        <motion.div
          className="absolute w-10 h-10 rounded-[45%] bg-gradient-to-bl from-cyan-400/80 to-blue-500/80 mix-blend-multiply dark:mix-blend-screen"
          animate={{
            rotate: -360,
            borderRadius: ["45%", "35%", "50%", "45%"],
            scale: [0.9, 1.1, 0.95, 0.9],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Swirling Layer 3 - Sunset Peach Fluid */}
        <motion.div
          className="absolute w-11 h-11 rounded-[38%] bg-gradient-to-tr from-pink-400/80 to-[#fecaca]/80 mix-blend-multiply dark:mix-blend-screen"
          animate={{
            rotate: 180,
            borderRadius: ["38%", "48%", "40%", "38%"],
            scale: [1.1, 0.85, 1.05, 1.1],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Center Sparkle Element */}
        <motion.div 
          className="relative z-10"
          animate={{
            scale: [1, 1.25, 1],
            rotate: [0, 90, 180, 270, 360]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-white filter drop-shadow-[0_1px_3px_rgba(255,255,255,0.8)] dark:text-zinc-100">
            <path fill="currentColor" d="M12,2c0,5.52-4.48,10-10,10c5.52,0,10,4.48,10,10c0-5.52,4.48-10,10-10C16.52,12,12,7.52,12,2z" />
          </svg>
        </motion.div>
      </div>

      {/* Floating Sparkle Waves */}
      <div className="flex gap-1 justify-center items-center h-2">
        {[0, 1, 2, 3].map((val) => (
          <motion.div
            key={val}
            className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-purple-400 dark:to-cyan-400"
            animate={{
              scale: [0.4, 1.1, 0.4],
              opacity: [0.3, 0.9, 0.3],
            }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
              delay: val * 0.2,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      {/* Thinking Status Text */}
      {displayLabel && (
        <motion.div
          className="flex items-center gap-1.5"
          animate={{ opacity: [0.65, 1, 0.65] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="text-xs font-semibold tracking-wider bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent font-sans uppercase">
            {displayLabel}
          </span>
        </motion.div>
      )}
    </div>
  );
}

