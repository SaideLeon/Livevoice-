'use client';

import React, { useState, useRef } from 'react';
import { BookOpen, Calculator, PieChart, MessageSquare, FileText, Upload, X } from 'lucide-react';
import { LiveVoicePanel } from '@/src/components/live-voice/LiveVoicePanel';

export default function AccountingVoiceApp() {
  const [knowledgeBase, setKnowledgeBase] = useState<{ name: string; content: string }[]>([]);
  const [isStrict, setIsStrict] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

        {/* Left Column */}
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
            <FeatureCard icon={<Calculator className="w-5 h-5" />} title="Cálculos"  desc="Tire dúvidas sobre lançamentos." />
            <FeatureCard icon={<PieChart    className="w-5 h-5" />} title="Análise"   desc="Entenda índices financeiros." />
            <FeatureCard icon={<BookOpen    className="w-5 h-5" />} title="Teoria"    desc="Conceitos fundamentais." />
            <FeatureCard icon={<MessageSquare className="w-5 h-5" />} title="Live"   desc="Conversa em tempo real." />
          </div>

          {/* Knowledge Base */}
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

            <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
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

        {/* Right Column: Interaction */}
        <LiveVoicePanel knowledgeBase={knowledgeBase} isStrict={isStrict} />
      </div>

      <div className="mt-12 text-center">
        <p className="text-[11px] font-mono text-stone-400 uppercase tracking-[0.2em]">
          Powered by Gemini 2.5 Live API • Accounting Expert System
        </p>
      </div>
    </main>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="p-4 bg-white border border-stone-200 rounded-2xl space-y-2 hover:border-emerald-200 transition-colors group">
      <div className="text-stone-400 group-hover:text-emerald-500 transition-colors">{icon}</div>
      <h3 className="text-sm font-bold text-stone-800">{title}</h3>
      <p className="text-xs text-stone-500 leading-tight">{desc}</p>
    </div>
  );
}
