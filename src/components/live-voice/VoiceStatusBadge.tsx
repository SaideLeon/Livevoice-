'use client';

import React from 'react';
import { SessionStatus } from '../../hooks/useLiveVoiceSession';

interface VoiceStatusBadgeProps {
  status: SessionStatus;
}

export function VoiceStatusBadge({ status }: VoiceStatusBadgeProps) {
  const label = {
    idle: 'Pronto para iniciar',
    connecting: 'Conectando...',
    active: 'Em conversa',
    error: 'Erro na conexão',
  }[status];

  const dotColor = {
    idle: 'bg-stone-300',
    connecting: 'bg-amber-500 animate-pulse',
    active: 'bg-emerald-500 animate-pulse',
    error: 'bg-red-500',
  }[status];

  return (
    <div className="absolute top-8 flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${dotColor}`} />
      <span className="text-[10px] font-mono uppercase tracking-widest text-stone-400">
        {label}
      </span>
    </div>
  );
}
