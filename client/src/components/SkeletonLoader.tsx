import React from 'react';
import { useTheme } from '../context/ThemeContext';

interface SkeletonBlockProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  style?: React.CSSProperties;
}

function SkeletonBlock({ width = '100%', height = '20px', borderRadius = '8px', style = {} }: SkeletonBlockProps) {
  const { isDark } = useTheme();
  return (
    <div
      className="shimmer"
      style={{
        width,
        height,
        borderRadius,
        background: isDark
          ? 'linear-gradient(90deg, #1A2540 0%, #2E4170 50%, #1A2540 100%)'
          : 'linear-gradient(90deg, #E2E8F0 0%, #F0F4FF 50%, #E2E8F0 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
        ...style,
      }}
    />
  );
}

interface SkeletonLoaderProps {
  type?: 'dashboard' | 'list' | 'client_detail' | 'ai_analysis';
  count?: number;
}

export default function SkeletonLoader({ type = 'dashboard', count = 3 }: SkeletonLoaderProps) {
  const { isDark } = useTheme();

  if (type === 'list') {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-900/40 p-6 rounded-2xl border border-slate-100 dark:border-white/5 flex flex-col gap-2">
            <SkeletonBlock width="40%" height="16px" />
            <SkeletonBlock width="80%" height="12px" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'client_detail') {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="flex items-center gap-6">
          <SkeletonBlock width="80px" height="80px" borderRadius="24px" />
          <div className="flex-1 space-y-3">
            <SkeletonBlock width="250px" height="32px" />
            <SkeletonBlock width="150px" height="18px" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <SkeletonBlock key={i} height="120px" borderRadius="32px" />
          ))}
        </div>
        <SkeletonBlock height="400px" borderRadius="32px" />
      </div>
    );
  }

  if (type === 'ai_analysis') {
    return (
      <div className="space-y-4 p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-dashed border-slate-300 dark:border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" />
          <SkeletonBlock width="120px" height="14px" />
        </div>
        <SkeletonBlock width="95%" height="12px" />
        <SkeletonBlock width="90%" height="12px" />
        <SkeletonBlock width="85%" height="12px" />
      </div>
    );
  }

  // Default 'dashboard'
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white dark:bg-slate-900/40 p-8 rounded-[32px] border border-slate-200 dark:border-white/5 flex flex-col gap-3">
            <SkeletonBlock width="40px" height="40px" borderRadius="12px" />
            <SkeletonBlock width="60%" height="32px" />
            <SkeletonBlock width="40%" height="14px" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
            <SkeletonBlock height="400px" borderRadius="32px" />
        </div>
        <div>
            <SkeletonBlock height="400px" borderRadius="32px" />
        </div>
      </div>
    </div>
  );
}
