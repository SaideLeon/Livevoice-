'use client';

import { useRef, useCallback } from 'react';

export const OUTPUT_SAMPLE_RATE = 48000;
export const GEMINI_OUTPUT_SAMPLE_RATE = 24000;
const SCHEDULE_AHEAD_TIME = 0.15;
const SCHEDULER_INTERVAL_MS = 25;

export function useAudioOutput() {
  const playbackContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<Int16Array[]>([]);
  const nextStartTimeRef = useRef<number>(0);
  const schedulerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runScheduler = useCallback(() => {
    const ctx = playbackContextRef.current;
    if (!ctx) return;

    while (
      audioQueueRef.current.length > 0 &&
      nextStartTimeRef.current < ctx.currentTime + SCHEDULE_AHEAD_TIME
    ) {
      const pcmData = audioQueueRef.current.shift()!;

      const audioBuffer = ctx.createBuffer(1, pcmData.length, GEMINI_OUTPUT_SAMPLE_RATE);
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < pcmData.length; i++) {
        channelData[i] = pcmData[i] / 0x8000;
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      if (nextStartTimeRef.current < ctx.currentTime) {
        nextStartTimeRef.current = ctx.currentTime + 0.02;
      }

      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += audioBuffer.duration;
    }
  }, []);

  const startOutput = useCallback(() => {
    playbackContextRef.current = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
    nextStartTimeRef.current = 0;
    schedulerIntervalRef.current = setInterval(runScheduler, SCHEDULER_INTERVAL_MS);
  }, [runScheduler]);

  const stopOutput = useCallback(() => {
    if (schedulerIntervalRef.current) {
      clearInterval(schedulerIntervalRef.current);
      schedulerIntervalRef.current = null;
    }
    audioQueueRef.current = [];
    nextStartTimeRef.current = 0;
    if (playbackContextRef.current) {
      playbackContextRef.current.close();
      playbackContextRef.current = null;
    }
  }, []);

  const enqueueAudio = useCallback((base64Data: string) => {
    const binaryString = atob(base64Data);
    const buffer = new ArrayBuffer(binaryString.length);
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const aligned = buffer.slice(0, buffer.byteLength - (buffer.byteLength % 2));
    audioQueueRef.current.push(new Int16Array(aligned));
  }, []);

  const clearQueue = useCallback(() => {
    audioQueueRef.current = [];
    nextStartTimeRef.current = 0;
  }, []);

  return {
    startOutput,
    stopOutput,
    enqueueAudio,
    clearQueue,
  };
}
