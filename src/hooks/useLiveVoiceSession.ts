'use client';

import { useState, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { useAudioInput, INPUT_SAMPLE_RATE } from './useAudioInput';
import { useAudioOutput } from './useAudioOutput';

export type SessionStatus = 'idle' | 'connecting' | 'active' | 'error';

interface UseLiveVoiceSessionProps {
  knowledgeBase: { name: string; content: string }[];
  isStrict: boolean;
}

export function useLiveVoiceSession({ knowledgeBase, isStrict }: UseLiveVoiceSessionProps) {
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [transcription, setTranscription] = useState<{ user?: string; model?: string }>({});
  const [isActive, setIsActive] = useState(false);

  const { startInput, stopInput, volume, isMuted, toggleMute } = useAudioInput();
  const { startOutput, stopOutput, enqueueAudio, clearQueue } = useAudioOutput();

  const sessionRef = useRef<any>(null);

  const stopSession = useCallback(() => {
    setIsActive(false);
    setStatus('idle');
    stopInput();
    stopOutput();
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
  }, [stopInput, stopOutput]);

  const startSession = useCallback(async () => {
    try {
      setStatus('connecting');

      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY! });

      const kbContext = knowledgeBase.length > 0
        ? `\n\nBASE DE CONHECIMENTO (ESTRITAMENTE BASEADO NISSO):\n${knowledgeBase.map(f => `--- ARQUIVO: ${f.name} ---\n${f.content}`).join('\n\n')}`
        : "";

      const systemInstruction = `Você é um tutor especialista em contabilidade. ${
        isStrict && knowledgeBase.length > 0
          ? "Sua resposta deve ser baseada ESTRITAMENTE no conteúdo fornecido na BASE DE CONHECIMENTO abaixo. Se o usuário perguntar algo fora desse contexto, informe gentilmente que você só pode discutir o material de estudo carregado."
          : "Ajude o usuário com conceitos de contabilidade geral, custos, auditoria e finanças. Seja didático, profissional e use termos técnicos quando apropriado."
      } Você está em uma conversa de voz em tempo real.${kbContext}`;

      const session = await ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-12-2025",
        callbacks: {
          onopen: () => {
            setStatus('active');
            setIsActive(true);
            startOutput();
            startInput((base64) => {
              session.sendRealtimeInput({
                media: { data: base64, mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}` }
              });
            });
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.modelTurn?.parts) {
              const audioPart = message.serverContent.modelTurn.parts.find(p => p.inlineData);
              if (audioPart?.inlineData?.data) {
                enqueueAudio(audioPart.inlineData.data);
              }
            }

            if (message.serverContent?.inputTranscription) {
              setTranscription(prev => ({ ...prev, user: message.serverContent?.inputTranscription?.text }));
            }
            if (message.serverContent?.outputTranscription) {
              setTranscription(prev => ({ ...prev, model: message.serverContent?.outputTranscription?.text }));
            }

            if (message.serverContent?.interrupted) {
              clearQueue();
              setTranscription({});
            }
          },
          onclose: () => stopSession(),
          onerror: (e: unknown) => {
            console.error(e);
            setStatus('error');
            stopSession();
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
      });

      sessionRef.current = session;
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  }, [knowledgeBase, isStrict, startInput, startOutput, enqueueAudio, clearQueue, stopSession]);

  const toggleSession = useCallback(() => {
    if (isActive) {
      stopSession();
    } else {
      startSession();
    }
  }, [isActive, startSession, stopSession]);

  return {
    isActive,
    status,
    transcription,
    volume,
    isMuted,
    toggleMute,
    toggleSession,
  };
}
