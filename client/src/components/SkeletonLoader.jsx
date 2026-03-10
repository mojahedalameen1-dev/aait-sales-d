import React from 'react';
import { useTheme } from '../context/ThemeContext';

function SkeletonBlock({ width = '100%', height = '20px', borderRadius = '8px', style = {} }) {
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

export default function SkeletonLoader() {
  const { isDark } = useTheme();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px 0' }}>
      {/* Header skeleton */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <SkeletonBlock width="56px" height="56px" borderRadius="14px" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <SkeletonBlock width="60%" height="18px" />
          <SkeletonBlock width="40%" height="14px" />
        </div>
      </div>
      {/* Content skeleton cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            style={{
              background: isDark ? '#1A2540' : '#F0F4FF',
              borderRadius: '16px',
              padding: '20px',
              display: 'flex', flexDirection: 'column', gap: '10px',
            }}
          >
            <SkeletonBlock width="50%" height="12px" />
            <SkeletonBlock width="90%" height="16px" />
            <SkeletonBlock width="75%" height="14px" />
          </div>
        ))}
      </div>
      {/* Accordion skeleton */}
      {[1, 2, 3].map(i => (
        <div
          key={i}
          style={{
            background: isDark ? '#1A2540' : '#F0F4FF',
            borderRadius: '12px',
            padding: '18px',
            display: 'flex', flexDirection: 'column', gap: '10px',
          }}
        >
          <SkeletonBlock width="40%" height="16px" />
          <SkeletonBlock width="85%" height="12px" />
          <SkeletonBlock width="70%" height="12px" />
          <SkeletonBlock width="55%" height="12px" />
        </div>
      ))}
    </div>
  );
}
