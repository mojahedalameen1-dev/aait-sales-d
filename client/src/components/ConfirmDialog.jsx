import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel }) {
  const { isDark } = useTheme();
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onCancel}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: isDark ? '#131D35' : '#ffffff',
          border: `1px solid ${isDark ? '#1E2D4A' : '#E2E8F0'}`,
          borderRadius: '20px',
          padding: '32px',
          maxWidth: '420px',
          width: '100%',
          boxShadow: isDark ? '0 25px 60px rgba(0,0,0,0.5)' : '0 25px 60px rgba(79,142,247,0.15)',
          animation: 'scaleIn 0.2s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ background: 'rgba(239,68,68,0.15)', borderRadius: '12px', padding: '10px', display: 'flex' }}>
            <AlertTriangle size={22} color="#EF4444" />
          </div>
          <h3 style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '18px', fontWeight: 700, color: isDark ? '#F0F4FF' : '#0A0F1E' }}>
            {title || 'تأكيد الحذف'}
          </h3>
        </div>
        <p style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '15px', color: isDark ? '#8B9CC8' : '#4A5570', marginBottom: '28px', lineHeight: '1.6' }}>
          {message || 'هل أنت متأكد من هذا الإجراء؟ لا يمكن التراجع عنه.'}
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={onCancel} style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            style={{
              background: 'linear-gradient(135deg, #EF4444, #DC2626)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 24px',
              fontFamily: "'IBM Plex Sans Arabic', sans-serif",
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.3s',
            }}
          >
            تأكيد الحذف
          </button>
        </div>
      </div>
    </div>
  );
}
