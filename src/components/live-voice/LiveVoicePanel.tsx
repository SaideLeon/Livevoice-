'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, VolumeX } from 'lucide-react';
import { useLiveVoiceSession } from '../../hooks/useLiveVoiceSession';
import { VoiceButton } from './VoiceButton';
import { VolumeVisualizer } from './VolumeVisualizer';
import { TranscriptionBubble } from './TranscriptionBubble';
import { VoiceStatusBadge } from './VoiceStatusBadge';

interface LiveVoicePanelProps {
  knowledgeBase: { name: string; content: string }[];
  isStrict: boolean;
}

export function LiveVoicePanel({ knowledgeBase, isStrict }: LiveVoicePanelProps) {
  const {
    isActive,
    status,
    transcription,
    volume,
    isMuted,
    toggleMute,
    toggleSession,
  } = useLiveVoiceSession({ knowledgeBase, isStrict });

  return (
    <div className="relative flex flex-col items-center justify-center bg-white rounded-3xl p-12 shadow-xl border border-stone-200 aspect-square overflow-hidden">
      
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-emerald-500 rounded-full blur-3xl"
          />
        )}
      </AnimatePresence>

      <VoiceStatusBadge status={status} />

      <div className="relative z-10 flex flex-col items-center gap-8">
        <VoiceButton isActive={isActive} onClick={toggleSession} />
        <VolumeVisualizer isActive={isActive} volume={volume} />
      </div>

      <TranscriptionBubble isActive={isActive} transcription={transcription} />

      {isActive && (
        <div className="absolute bottom-8 flex gap-4">
          <button
            onClick={toggleMute}
            className="p-3 rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>
      )}
    </div>
  );
}
