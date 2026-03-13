import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, Plus, ChevronDown, MoreVertical, Eye, Edit2, Trash2,
  ArrowUpDown, ExternalLink, SlidersHorizontal, Users as UsersIcon
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../components/ToastProvider';
import { API_URL } from '../utils/apiConfig';
import ConfirmDialog from '../components/ConfirmDialog';
import { formatSAR } from '../utils/formatSAR';
import { formatDate } from '../utils/formatDate';
import { getScoreLabel, getStageClass } from '../utils/scoreColor';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 }
};

export default function ClientsList({ filter }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const filterType = filter || searchParams.get('filter'); // hot, followup, all

  const { isDark } = useTheme();
  const { addToast } = useToast();

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [showConfirm, setShowConfirm] = useState(null);

  const textPrimary = isDark ? '#F0F4FF' : '#0A0F1E';
  const textSecondary = isDark ? '#8B9CC8' : '#4A5570';
  const border = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(79, 142, 247, 0.1)';

  useEffect(() => {
    fetchClients();
  }, []);

  async function fetchClients() {
    try {
      const res = await fetch(API_URL('/api/clients'));
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setClients(data);
        } else {
          console.error('Clients API returned non-array:', data);
          setClients([]);
          addToast(data.error || 'خطأ في استلام بيانات العملاء', 'error');
        }
      } else {
        throw new Error('Failed to fetch clients');
      }
    } catch (e) {
      addToast('فشل تحميل قائمة العملاء', 'error');
    } finally {
      setLoading(false);
    }
  }

  const filteredClients = clients.filter(c => {
    const matchesSearch = c.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.sector.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterType === 'hot') return matchesSearch && (c.total_score >= 80);
    if (filterType === 'followup') return matchesSearch && c.next_followup_date;

    if (activeTab === 'hot') return matchesSearch && (c.total_score >= 80);
    if (activeTab === 'followup') return matchesSearch && c.next_followup_date;
    return matchesSearch;
  }).sort((a, b) => {
    if (sortBy === 'score') return (b.total_score || 0) - (a.total_score || 0);
    if (sortBy === 'value') return (parseFloat(b.expected_value) || 0) - (parseFloat(a.expected_value) || 0);
    return new Date(b.created_at) - new Date(a.created_at);
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ direction: 'rtl' }}>
      {/* Header Area */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '30px', fontWeight: 800, color: textPrimary, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <UsersIcon size={28} color="#4F8EF7" /> قاعدة العملاء
          </h1>
          <p style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '15px', color: textSecondary, marginTop: '4px' }}>إدارة ومتابعة جميع الفرص البيعية في مكان واحد</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="btn-primary"
          onClick={() => navigate('/clients/new')}
          style={{ padding: '12px 24px', fontSize: '15px', fontWeight: 700 }}
        >
          <Plus size={18} /> إضافة عميل جديد
        </motion.button>
      </div>

      {/* Toolbar */}
      <div className="glass-card" style={{ padding: '20px', marginBottom: '24px', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
          <Search size={18} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: textSecondary }} />
          <input
            className="form-input"
            placeholder="ابحث عن عميل، قطاع، أو مدينة..."
            style={{ paddingRight: '48px', height: '48px', background: isDark ? 'rgba(0,0,0,0.2)' : '#fff' }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: isDark ? 'rgba(255,255,255,0.03)' : '#F0F4FF', padding: '4px', borderRadius: '12px', border: `1px solid ${border}` }}>
          {[
            { id: 'all', label: 'الكل' },
            { id: 'hot', label: 'الجادين 🔥' },
            { id: 'followup', label: 'المتابعة ⏰' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer',
                background: activeTab === tab.id ? (isDark ? '#4F8EF7' : '#fff') : 'transparent',
                color: activeTab === tab.id ? (isDark ? '#fff' : '#4F8EF7') : textSecondary,
                boxShadow: activeTab === tab.id ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s',
                fontFamily: "'IBM Plex Sans Arabic', sans-serif"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px', color: textSecondary, fontWeight: 500 }}><SlidersHorizontal size={14} /> ترتيب حسب:</span>
          <select
            className="form-input"
            style={{ width: '140px', height: '44px', fontSize: '13px', padding: '0 12px' }}
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
          >
            <option value="date">الأحدث</option>
            <option value="score">الأعلى تقييماً</option>
            <option value="value">القيمة المالية</option>
          </select>
        </div>
      </div>

      {/* Table Area */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
          <thead style={{ background: isDark ? 'rgba(255,255,255,0.02)' : '#F8FAFF', borderBottom: `1px solid ${border}` }}>
            <tr>
              <th style={{ padding: '18px 24px', fontSize: '13px', fontWeight: 700, color: textSecondary }}>العميل</th>
              <th style={{ padding: '18px 24px', fontSize: '13px', fontWeight: 700, color: textSecondary }}>القطاع</th>
              <th style={{ padding: '18px 24px', fontSize: '13px', fontWeight: 700, color: textSecondary }}>التقييم</th>
              <th style={{ padding: '18px 24px', fontSize: '13px', fontWeight: 700, color: textSecondary }}>المرحلة</th>
              <th style={{ padding: '18px 24px', fontSize: '13px', fontWeight: 700, color: textSecondary }}>القيمة</th>
              <th style={{ padding: '18px 24px', fontSize: '13px', fontWeight: 700, color: textSecondary, textAlign: 'left' }}>الإجراءات</th>
            </tr>
          </thead>
          <motion.tbody variants={container} initial="hidden" animate="show">
            {filteredClients.map(client => (
              <motion.tr
                key={client.id}
                variants={item}
                whileHover={{ background: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(79, 142, 247, 0.02)' }}
                style={{ borderBottom: `1px solid ${border}`, transition: 'background 0.2s' }}
              >
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: textPrimary }}>{client.client_name}</div>
                  <div style={{ fontSize: '12px', color: textSecondary, marginTop: '2px' }}>{client.city} • {formatDate(client.created_at)}</div>
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <span style={{ fontSize: '14px', color: textSecondary }}>{client.sector}</span>
                </td>
                <td style={{ padding: '16px 24px' }}>
                  {(() => {
                    const score = client.total_score || 0;
                    const { label, textColor } = getScoreLabel(score);
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: `${textColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: textColor }}>{score}</div>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: textSecondary }}>{label}</span>
                      </div>
                    );
                  })()}
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <span className={`badge ${getStageClass(client.stage)}`} style={{ fontSize: '12px', fontWeight: 700 }}>{client.stage}</span>
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: textPrimary }}>{formatSAR(client.expected_value)}</span>
                </td>
                <td style={{ padding: '16px 24px', textAlign: 'left' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button className="btn-secondary" style={{ padding: '8px' }} onClick={() => navigate(`/clients/${client.id}`)} title="عرض"><Eye size={16} /></button>
                    <button className="btn-secondary" style={{ padding: '8px' }} onClick={() => navigate(`/clients/${client.id}/edit`)} title="تعديل"><Edit2 size={16} /></button>
                    <button className="btn-secondary" style={{ padding: '8px', color: '#EF4444' }} onClick={() => setShowConfirm(client.id)} title="حذف"><Trash2 size={16} /></button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </motion.tbody>
        </table>

        {filteredClients.length === 0 && !loading && (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', filter: 'grayscale(1)', opacity: 0.2, marginBottom: '16px' }}>📂</div>
            <p style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '16px', color: textSecondary }}>لم يتم العثور على نتائج تطابق بحثك</p>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!showConfirm}
        onClose={() => setShowConfirm(null)}
        onConfirm={async () => {
          try {
            await fetch(API_URL(`/api/clients/${showConfirm}`), { method: 'DELETE' });
            setClients(prev => prev.filter(c => c.id !== showConfirm));
            setShowConfirm(null);
            addToast('تم حذف العميل بنجاح', 'info');
          } catch (error) {
            addToast('فشل حذف العميل', 'error');
          }
        }}
        title="حذف البيانات؟"
        message="سيقوم هذا الإجراء بحذف العميل وكافة سجلاته نهائياً."
      />
    </motion.div>
  );
}
