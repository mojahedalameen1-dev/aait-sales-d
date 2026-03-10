import React, { useEffect, useState } from 'react';
import { getScoreRingColor, getScoreLabel } from '../utils/scoreColor';

export default function ScoreRing({ score = 0, size = 100, strokeWidth = 8 }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (animatedScore / 100) * circumference;
  const offset = circumference - progress;
  const color = getScoreRingColor(animatedScore);
  const { label } = getScoreLabel(animatedScore);

  useEffect(() => {
    let start = 0;
    const target = score;
    const duration = 1000;
    const startTime = performance.now();

    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const fraction = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - fraction, 3); // ease-out cubic
      start = Math.round(target * eased);
      setAnimatedScore(start);
      if (fraction < 1) requestAnimationFrame(animate);
    }

    const raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.05s ease' }}
        />
      </svg>
      {/* Center text overlay */}
      <div
        style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: size * 0.22, fontWeight: 700, color, lineHeight: 1, fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
          {animatedScore}
        </span>
        {size >= 90 && (
          <span style={{ fontSize: size * 0.09, color: '#8B9CC8', fontFamily: "'IBM Plex Sans Arabic', sans-serif", marginTop: 2 }}>
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
