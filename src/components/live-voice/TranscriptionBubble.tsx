'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface TranscriptionBubbleProps {
  isActive: boolean;
  transcription: { user?: string; model?: string };
}

export function TranscriptionBubble({ isActive, transcription }: TranscriptionBubbleProps) {
  return (
    <AnimatePresence>
      {isActive && (transcription.user || transcription.model) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="absolute inset-x-0 bottom-24 px-8 z-20"
        >
          <div className="bg-white/80 backdrop-blur-md border border-stone-200 rounded-2xl p-4 shadow-lg space-y-2">
            {transcription.user && (
              <div className="flex gap-2">
                <span className="text-[10px] font-bold text-stone-400 uppercase mt-1">Você</span>
                <p className="text-sm text-stone-600 italic">{transcription.user}</p>
              </div>
            )}
            {transcription.model && (
              <div className="flex gap-2">
                <span className="text-[10px] font-bold text-emerald-500 uppercase mt-1">IA</span>
                <p className="text-sm text-stone-800 font-medium">{transcription.model}</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
