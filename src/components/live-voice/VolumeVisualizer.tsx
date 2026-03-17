'use client';

import React from 'react';
import { motion } from 'motion/react';

interface VolumeVisualizerProps {
  isActive: boolean;
  volume: number;
}

export function VolumeVisualizer({ isActive, volume }: VolumeVisualizerProps) {
  return (
    <div className="flex items-end gap-1 h-12">
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          animate={{ height: isActive ? Math.max(4, volume * 100 * (0.5 + (i % 5) * 0.1)) : 4 }}
          className="w-1.5 bg-emerald-500 rounded-full"
        />
      ))}
    </div>
  );
}
