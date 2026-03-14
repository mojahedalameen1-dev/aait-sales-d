import React, { useEffect, useState } from 'react';
import { Brain, Sparkles, CheckCircle2 } from 'lucide-react';

export default function AnalysisLoader({ progress, message }) {
  const [displayProgress, setDisplayProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);

  // Smooth CountUp for progress
  useEffect(() => {
    const timer = setInterval(() => {
      setDisplayProgress(prev => {
        if (prev < progress) return Math.min(progress, prev + 1);
        if (prev > progress) return progress;
        return prev;
      });
    }, 30);
    return () => clearInterval(timer);
  }, [progress]);

  useEffect(() => {
    if (progress === 100) {
      setTimeout(() => setIsDone(true), 500);
    }
  }, [progress]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm rtl" style={{ direction: 'rtl' }}>
      <div 
        className={`max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-2xl border border-white/10 transition-all duration-700 transform ${isDone ? 'bg-emerald-50 dark:bg-emerald-950/30 scale-105' : 'scale-100'}`}
      >
        {/* Animated Icon and Particles */}
        <div className="relative flex justify-center mb-10">
          {/* Rotating dots (Particles) */}
          {!isDone && [0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                background: `hsl(${i * 60}, 70%, 60%)`,
                top: '50%',
                left: '50%',
                transform: `rotate(${i * 60}deg) translate(55px)`,
                animation: `rotate-particle-${i} ${2 + i * 0.5}s linear infinite`
              }}
            />
          ))}

          {/* Central Icon */}
          <div className={`w-24 h-24 rounded-3xl flex items-center justify-center transition-all duration-500 transform ${isDone ? 'bg-emerald-500 scale-0' : 'bg-gradient-to-br from-blue-500 to-indigo-600 animate-pulse'}`}>
            <Brain size={48} className="text-white animate-spin-slow" />
          </div>

          <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 transform ${isDone ? 'scale-110 opacity-100' : 'scale-0 opacity-0'}`}>
            <CheckCircle2 size={96} className="text-emerald-500" />
          </div>
        </div>

        {/* Dynamic Text */}
        <div className="text-center mb-8">
          <h3 className={`text-2xl font-black mb-2 transition-all duration-500 ${isDone ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-white'}`}>
            {isDone ? 'اكتمل التحليل بنجاح ✅' : 'جاري التحليل الذكي'}
          </h3>
          <div className="h-6 relative overflow-hidden">
            <p key={message} className="text-slate-500 dark:text-slate-400 font-medium animate-fade-in-out">
              {message}
            </p>
          </div>
        </div>

        {/* Progress Display */}
        <div className="flex items-center justify-center mb-6">
          <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
            {displayProgress}%
          </span>
        </div>

        {/* Main Progress Bar */}
        <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
          <div 
            className="h-full rounded-full transition-all duration-500 ease-out shimmer-progress" 
            style={{ 
              width: `${displayProgress}%`,
              background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #3b82f6 100%)',
              backgroundSize: '200% auto'
            }}
          />
        </div>

        {/* Footer Messages Sidebar (Timeline) */}
        {!isDone && (
          <div className="mt-8 flex flex-col gap-2 items-center opacity-60">
             <div className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-2">System Status</div>
             <div className="text-xs font-bold text-blue-500 animate-pulse">DeepSeek Node Active</div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% center }
          100% { background-position: 200% center }
        }
        .shimmer-progress {
          animation: shimmer 2s linear infinite;
        }
        .animate-spin-slow {
          animation: spin 6s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-fade-in-out {
          animation: fadeInOut 0.5s ease;
        }
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        ${[0,1,2,3,4,5].map(i => `
          @keyframes rotate-particle-${i} {
            from { transform: rotate(${i * 60}deg) translate(55px) rotate(-${i * 60}deg); }
            to { transform: rotate(${i * 60 + 360}deg) translate(55px) rotate(-${i * 60 + 360}deg); }
          }
        `).join('\n')}
      `}</style>
    </div>
  );
}
