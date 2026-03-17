'use client';

import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { Mic, MicOff, Volume2, VolumeX, BookOpen, Calculator, PieChart, MessageSquare, FileText, Upload, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Audio constants
const SAMPLE_RATE = 16000;

export default function AccountingVoiceApp() {
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'active' | 'error'>('idle');
  const [transcription, setTranscription] = useState<{ user?: string; model?: string }>({});
  const [volume, setVolume] = useState(0);
  const [knowledgeBase, setKnowledgeBase] = useState<{ name: string; content: string }[]>([]);
  const [isStrict, setIsStrict] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sessionRef = useRef<any>(null);
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);
  const nextStartTimeRef = useRef<number>(0);

  const toggleSession = async () => {
    if (isActive) {
      stopSession();
    } else {
      startSession();
    }
  };

  const startSession = async () => {
    try {
      setStatus('connecting');
      
      // Initialize Audio
      audioContextRef.current = new AudioContext({ sampleRate: SAMPLE_RATE });
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
      processorRef.current = audioContextRef.current.createScriptProcessor(2048, 1, 1);

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
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        callbacks: {
          onopen: () => {
            setStatus('active');
            setIsActive(true);
            
            processorRef.current!.onaudioprocess = (e) => {
              if (isMuted) return;
              
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmData = new Int16Array(inputData.length);
              let sum = 0;
              
              for (let i = 0; i < inputData.length; i++) {
                const s = Math.max(-1, Math.min(1, inputData[i]));
                pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                sum += Math.abs(s);
              }
              
              setVolume(sum / inputData.length);
              
              const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
              session.sendRealtimeInput({
                media: { data: base64Data, mimeType: `audio/pcm;rate=${SAMPLE_RATE}` }
              });
            };
            
            source.connect(processorRef.current!);
            processorRef.current!.connect(audioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.modelTurn?.parts) {
              const audioPart = message.serverContent.modelTurn.parts.find(p => p.inlineData);
              if (audioPart?.inlineData?.data) {
                const binaryString = atob(audioPart.inlineData.data);
                const buffer = new ArrayBuffer(binaryString.length);
                const bytes = new Uint8Array(buffer);
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }
                // Ensure even length for Int16
                const pcmData = new Int16Array(buffer.slice(0, buffer.byteLength - (buffer.byteLength % 2)));
                audioQueueRef.current.push(pcmData);
                if (!isPlayingRef.current) {
                  playNextInQueue();
                }
              }
            }

            // User Transcription
            if (message.serverContent?.inputTranscription) {
              setTranscription(prev => ({ ...prev, user: message.serverContent?.inputTranscription?.text }));
            }

            // Model Transcription
            if (message.serverContent?.outputTranscription) {
              setTranscription(prev => ({ ...prev, model: message.serverContent?.outputTranscription?.text }));
            }

            if (message.serverContent?.interrupted) {
              audioQueueRef.current = [];
              isPlayingRef.current = false;
              nextStartTimeRef.current = 0;
              setTranscription({});
            }
          },
          onclose: () => stopSession(),
          onerror: (e) => {
            console.error(e);
            setStatus('error');
            stopSession();
          }
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
  };

  const playNextInQueue = async () => {
    if (audioQueueRef.current.length === 0 || !audioContextRef.current) {
      isPlayingRef.current = false;
      return;
    }

    isPlayingRef.current = true;
    const pcmData = audioQueueRef.current.shift()!;
    
    const audioBuffer = audioContextRef.current.createBuffer(1, pcmData.length, SAMPLE_RATE);
    const channelData = audioBuffer.getChannelData(0);
    
    for (let i = 0; i < pcmData.length; i++) {
      channelData[i] = pcmData[i] / 0x8000;
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    
    const currentTime = audioContextRef.current.currentTime;
    
    // If we're behind or just starting, schedule a bit in the future
    if (nextStartTimeRef.current < currentTime) {
      nextStartTimeRef.current = currentTime + 0.05; // 50ms buffer
    }
    
    source.start(nextStartTimeRef.current);
    nextStartTimeRef.current += audioBuffer.duration;
    
    source.onended = () => {
      if (audioQueueRef.current.length > 0) {
        playNextInQueue();
      } else {
        isPlayingRef.current = false;
      }
    };
  };

  const stopSession = () => {
    setIsActive(false);
    setStatus('idle');
    setVolume(0);
    
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    nextStartTimeRef.current = 0;
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setKnowledgeBase(prev => [...prev, { name: file.name, content }]);
      };
      reader.readAsText(file);
    });
  };

  const removeFile = (index: number) => {
    setKnowledgeBase(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 md:p-12">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        
        {/* Left Column: Info & Branding */}
        <div className="space-y-8">
          <div className="space-y-2">
            <h1 className="text-5xl font-display font-bold tracking-tight text-stone-900 leading-none">
              Contabilidade<br />
              <span className="text-emerald-600 italic">Voz</span>
            </h1>
            <p className="text-stone-500 font-sans max-w-xs">
              Seu tutor inteligente para dominar balanços, DREs e fluxos de caixa através da voz.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FeatureCard 
              icon={<Calculator className="w-5 h-5" />} 
              title="Cálculos" 
              desc="Tire dúvidas sobre lançamentos."
            />
            <FeatureCard 
              icon={<PieChart className="w-5 h-5" />} 
              title="Análise" 
              desc="Entenda índices financeiros."
            />
            <FeatureCard 
              icon={<BookOpen className="w-5 h-5" />} 
              title="Teoria" 
              desc="Conceitos fundamentais."
            />
            <FeatureCard 
              icon={<MessageSquare className="w-5 h-5" />} 
              title="Live" 
              desc="Conversa em tempo real."
            />
          </div>

          {/* Knowledge Base Section */}
          <div className="bg-white border border-stone-200 rounded-3xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <h2 className="font-bold text-stone-800">Base de Conhecimento</h2>
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-full hover:bg-stone-100 text-stone-500 transition-colors"
                title="Adicionar arquivo (.txt, .md)"
              >
                <Upload className="w-4 h-4" />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
                multiple
                accept=".txt,.md"
              />
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
              {knowledgeBase.length === 0 ? (
                <p className="text-xs text-stone-400 italic">Nenhum arquivo carregado. Use arquivos .txt ou .md para contexto estrito.</p>
              ) : (
                knowledgeBase.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-stone-50 p-2 rounded-lg border border-stone-100">
                    <span className="text-xs font-medium text-stone-600 truncate max-w-[150px]">{file.name}</span>
                    <button onClick={() => removeFile(idx)} className="text-stone-400 hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {knowledgeBase.length > 0 && (
              <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                <input 
                  type="checkbox" 
                  id="strict-mode" 
                  checked={isStrict} 
                  onChange={(e) => setIsStrict(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600"
                />
                <label htmlFor="strict-mode" className="text-xs text-stone-600 cursor-pointer">
                  Modo Estrito (Apenas conteúdo dos arquivos)
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Interaction Area */}
        <div className="relative flex flex-col items-center justify-center bg-white rounded-3xl p-12 shadow-xl border border-stone-200 aspect-square overflow-hidden">
          
          {/* Background Pulse Animation */}
          <AnimatePresence>
            {isActive && (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.1, 0.2, 0.1]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 bg-emerald-500 rounded-full blur-3xl"
              />
            )}
          </AnimatePresence>

          {/* Status Indicator */}
          <div className="absolute top-8 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-emerald-500 animate-pulse' : status === 'connecting' ? 'bg-amber-500 animate-pulse' : 'bg-stone-300'}`} />
            <span className="text-[10px] font-mono uppercase tracking-widest text-stone-400">
              {status === 'idle' ? 'Pronto para iniciar' : status === 'connecting' ? 'Conectando...' : status === 'active' ? 'Em conversa' : 'Erro na conexão'}
            </span>
          </div>

          {/* Central Visualizer / Mic Button */}
          <div className="relative z-10 flex flex-col items-center gap-8">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleSession}
              className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 shadow-lg ${
                isActive ? 'bg-stone-900 text-white' : 'bg-emerald-600 text-white'
              }`}
            >
              {isActive ? <MicOff className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
            </motion.button>

            {/* Volume Visualizer */}
            <div className="flex items-end gap-1 h-12">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ 
                    height: isActive ? Math.max(4, volume * 100 * (0.5 + (i % 5) * 0.1)) : 4 
                  }}
                  className="w-1.5 bg-emerald-500 rounded-full"
                />
              ))}
            </div>
          </div>

          {/* Transcription Overlay */}
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

          {/* Controls */}
          {isActive && (
            <div className="absolute bottom-8 flex gap-4">
              <button 
                onClick={() => setIsMuted(!isMuted)}
                className="p-3 rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-12 text-center">
        <p className="text-[11px] font-mono text-stone-400 uppercase tracking-[0.2em]">
          Powered by Gemini 2.5 Live API • Accounting Expert System
        </p>
      </div>
    </main>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="p-4 bg-white border border-stone-200 rounded-2xl space-y-2 hover:border-emerald-200 transition-colors group">
      <div className="text-stone-400 group-hover:text-emerald-500 transition-colors">
        {icon}
      </div>
      <h3 className="text-sm font-bold text-stone-800">{title}</h3>
      <p className="text-xs text-stone-500 leading-tight">{desc}</p>
    </div>
  );
}
