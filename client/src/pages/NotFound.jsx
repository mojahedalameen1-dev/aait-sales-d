import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function NotFound() {
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const textPrimary = isDark ? '#F0F4FF' : '#0A0F1E';
  const textSecondary = isDark ? '#8B9CC8' : '#4A5570';

  return (
    <div 
      className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6" 
      style={{ direction: 'rtl' }}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center"
      >
        <div 
          className="w-24 h-24 rounded-3xl flex items-center justify-center mb-8"
          style={{ 
            background: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2',
            color: '#EF4444'
          }}
        >
          <AlertCircle size={48} />
        </div>

        <h1 
          className="text-6xl font-black mb-4" 
          style={{ color: textPrimary, fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
        >
          404
        </h1>
        
        <h2 
          className="text-2xl font-bold mb-4" 
          style={{ color: textPrimary }}
        >
          الصفحة غير موجودة
        </h2>
        
        <p 
          className="text-lg mb-10 max-w-md mx-auto" 
          style={{ color: textSecondary }}
        >
          عذراً، الرابط الذي تحاول الوصول إليه غير موجود أو ربما تم نقله.
        </p>

        <button 
          onClick={() => navigate('/')}
          className="btn-primary flex items-center gap-3 px-8 py-4 text-lg font-bold"
        >
          العودة للرئيسية <ArrowRight size={20} />
        </button>
      </motion.div>
    </div>
  );
}
