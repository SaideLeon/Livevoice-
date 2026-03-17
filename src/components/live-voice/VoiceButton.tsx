'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Mic, MicOff } from 'lucide-react';

interface VoiceButtonProps {
  isActive: boolean;
  onClick: () => void;
}

export function VoiceButton({ isActive, onClick }: VoiceButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 shadow-lg ${
        isActive ? 'bg-stone-900 text-white' : 'bg-emerald-600 text-white'
      }`}
    >
      {isActive ? <MicOff className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
    </motion.button>
  );
}
