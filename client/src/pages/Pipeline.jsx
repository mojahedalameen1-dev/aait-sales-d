import React, { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../components/ToastProvider';
import { API_URL } from '../utils/apiConfig';
import { formatSAR } from '../utils/formatSAR';
import { daysDiff } from '../utils/formatDate';
import SkeletonLoader from '../components/SkeletonLoader';
import { Phone, MessageCircle, XCircle, PlusCircle, Target, Trophy, X, AlertCircle, ExternalLink, Hash } from 'lucide-react';

const STAGES = [
  { id: 'تفاوض', label: 'التقفيل (Closing)', color: '#4F8EF7', icon: Target },
  { id: 'فاز', label: 'تم الفوز (Won)', color: '#10B981', icon: Trophy }
];

export default function Pipeline() {
  const { isDark } = useTheme();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState({});
  const [isAdding, setIsAdding] = useState(false);
  const [isDraggingOverall, setIsDraggingOverall] = useState(false);

  // Quick Add State & Modal
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
  const [quickForm, setQuickForm] = useState({ client_name: '', phone: '', expected_value: '' });
  const [quickSaving, setQuickSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
        const newColumns = { 'تفاوض': [], 'فاز': [] };

        data.forEach(client => {
          const stage = client.stage || 'تفاوض';
          // Map any stage other than Won/Lost into "تفاوض" (Closing)
          if (stage === 'فاز') {
            newColumns['فاز'].push(client);
          } else if (stage !== 'خسر') {
            newColumns['تفاوض'].push(client);
          }
        });

        setColumns(newColumns);
      }
    } catch (e) {
      addToast('خطأ في تحميل الصفقات', 'error');
    } finally {
      setLoading(false);
    }
  }

  const handleQuickAdd = async () => {
    if (!quickForm.client_name.trim() || !quickForm.phone.trim()) {
      addToast('اسم العميل ورقم الجوال متطلبان أساسيان', 'error');
      return;
    }
    setQuickSaving(true);
    try {
      const res = await fetch(API_URL('/api/clients'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: quickForm.client_name,
          phone: quickForm.phone,
          expected_value: quickForm.expected_value || 0,
          stage: 'تفاوض'
        })
      });
      if (!res.ok) throw new Error('فشل الحفظ');

      const newClient = await res.json();
      setColumns(prev => ({
        ...prev,
        'تفاوض': [newClient, ...prev['تفاوض']]
      }));
      setQuickForm({ client_name: '', phone: '', expected_value: '' });
      setIsQuickAddModalOpen(false);
      addToast('بطل! تمت إضافة الصفقة بنجاح 🚀', 'success');
    } catch (e) {
      addToast('خطأ أثناء إضافة الصفقة', 'error');
    } finally {
      setQuickSaving(false);
    }
  };

  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const sourceColId = source.droppableId;
    const destColId = destination.droppableId;

    const newCols = { ...columns };
    const sourceItems = [...(newCols[sourceColId] || [])];
    const [movedItem] = sourceItems.splice(source.index, 1);

    // If droppableId is 'خسر' (Lost Dropzone)
    if (destColId === 'خسر') {
      newCols[sourceColId] = sourceItems;
      setColumns(newCols); // Card visually disappears into the lost zone
    } else {
      const destItems = [...(newCols[destColId] || [])];
      movedItem.stage = destColId;
      destItems.splice(destination.index, 0, movedItem);
      newCols[sourceColId] = sourceItems;
      newCols[destColId] = destItems;
      setColumns(newCols);
    }

    try {
      const res = await fetch(API_URL(`/api/clients/${draggableId}/stage`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: destColId })
      });
      if (!res.ok) throw new Error('فشل التحديث');
      if (destColId === 'خسر') {
        addToast('تم نقل الصفقة للمحفوظات (خسارة) 🗑️', 'success');
      } else if (destColId === 'فاز') {
        addToast('كفو! تم إغلاق الصفقة بنجاح 🎉', 'success');
      }
    } catch (e) {
      addToast('خطأ في حفظ المرحلة الجديدة', 'error');
      fetchClients();
    } finally {
      setIsDraggingOverall(false);
    }
  };

  const onDragStart = () => {
    setIsDraggingOverall(true);
  };

  if (loading) return <SkeletonLoader type="dashboard" />;

  const renderCard = (client, index, provided, snapshot, stage) => {
    const isHot = (client.total_score || 0) >= 80;
    const isStale = client.last_contact_date ? daysDiff(client.last_contact_date) > 5 : true;

    // Glowing effect if stale
    const boxShadow = snapshot.isDragging
      ? `0 12px 24px ${stage.color}40`
      : (isStale ? `0 0 15px rgba(239,68,68,0.3)` : '0 4px 12px rgba(0,0,0,0.05)');

    return (
      <div
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        style={{
          userSelect: 'none',
          padding: '16px',
          margin: '0 0 16px 0',
          background: isDark ? '#19243E' : '#FFFFFF',
          borderRadius: '16px',
          border: `1px solid ${snapshot.isDragging ? stage.color : (isStale ? 'rgba(239,68,68,0.5)' : border)}`,
          borderRight: `6px solid ${isHot ? '#EF4444' : '#94A3B8'}`,
          boxShadow,
          position: 'relative',
          ...provided.draggableProps.style,
        }}
      >
        {isStale && (
          <div style={{ position: 'absolute', top: -8, left: -8, display: 'flex', alignItems: 'center', gap: '4px', background: '#EF4444', color: '#fff', borderRadius: '12px', padding: '4px 8px', fontSize: '11px', fontWeight: 700 }} title="تأخر التواصل مع العميل لأكثر من 5 أيام!">
            <AlertCircle size={12} /> <span style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}> ⏰ متأخر {daysDiff(client.last_contact_date || client.created_at)} أيام</span>
          </div>
        )}

        {/* Ticket and Slack Header */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
          {client.ticket_link && (
            <a 
              href={client.ticket_link} 
              target="_blank" rel="noreferrer"
              style={{ 
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '8px', borderRadius: '10px', background: 'rgba(124, 58, 237, 0.1)', 
                color: '#7C3AED', fontSize: '12px', fontWeight: 700, textDecoration: 'none', border: '1px solid rgba(124, 58, 237, 0.2)'
              }}
            >
              <ExternalLink size={14} /> رابط التكت
            </a>
          )}
          {client.slack_code && (
            <div 
              style={{ 
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '8px', borderRadius: '10px', background: 'rgba(79, 142, 247, 0.1)', 
                color: '#4F8EF7', fontSize: '12px', fontWeight: 700, border: '1px solid rgba(79, 142, 247, 0.2)'
              }}
            >
              <Hash size={14} /> {client.slack_code}
            </div>
          )}
        </div>

        {/* Row 1: Client Name highly visible */}
        <div
          onClick={() => navigate(`/clients/${client.id}`)}
          style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '18px', fontWeight: 800, color: textPrimary, marginBottom: '12px', cursor: 'pointer' }}
        >
          {client.client_name}
        </div>

        {/* Row 2: Phone with Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ fontFamily: 'monospace', fontSize: '15px', color: textSecondary, fontWeight: 600, direction: 'ltr' }}>
            {client.phone || 'لا يوجد رقم'}
          </div>
          {client.phone && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <a
                href={`https://api.whatsapp.com/send?phone=966${client.phone.replace(/^0+/, '')}`}
                target="_blank" rel="noreferrer"
                className="w-10 h-10 md:w-8 md:h-8 flex justify-center items-center rounded-full transition-all"
                style={{ background: '#25D36620', color: '#25D366' }}
                onMouseOver={e => Object.assign(e.currentTarget.style, { background: '#25D366', color: '#fff', transform: 'scale(1.1)' })}
                onMouseOut={e => Object.assign(e.currentTarget.style, { background: '#25D36620', color: '#25D366', transform: 'scale(1)' })}
                title="مراسلة واتساب"
              >
                <MessageCircle size={16} />
              </a>
              <a
                href={`tel:${client.phone}`}
                className="w-10 h-10 md:w-8 md:h-8 flex justify-center items-center rounded-full transition-all"
                style={{ background: '#4F8EF720', color: '#4F8EF7' }}
                onMouseOver={e => Object.assign(e.currentTarget.style, { background: '#4F8EF7', color: '#fff', transform: 'scale(1.1)' })}
                onMouseOut={e => Object.assign(e.currentTarget.style, { background: '#4F8EF720', color: '#4F8EF7', transform: 'scale(1)' })}
                title="اتصال هاتفي"
              >
                <Phone size={16} />
              </a>
            </div>
          )}
        </div>

        {/* Row 3: Expected Value */}
        <div style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '15px', fontWeight: 800, color: stage.color }}>
          {formatSAR(client.expected_value)}
        </div>
      </div>
    );
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <header style={{ marginBottom: '24px', flexShrink: 0 }}>
        <h1 style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '32px', fontWeight: 900, color: textPrimary, letterSpacing: '-1px' }}>
          بورد التقفيل 🎯
        </h1>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', marginTop: '12px' }}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: isDark ? 'rgba(79, 142, 247, 0.1)' : '#E0E7FF', color: '#4F8EF7', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 700 }}>
              ⚡ إضافة سريعة للصفقات
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: isDark ? 'rgba(16, 185, 129, 0.1)' : '#D1FAE5', color: '#10B981', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 700 }}>
              📞 تواصل فوري (واتساب واتصال)
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEE2E2', color: '#EF4444', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 700 }}>
              🔥 تنبيه للصفقات المتأخرة
            </span>
          </div>
          <button
            onClick={() => setIsQuickAddModalOpen(true)}
            className="btn-primary"
            style={{
              background: 'linear-gradient(135deg, #7C3AED, #4F8EF7)',
              padding: '12px 24px',
              fontSize: '16px',
              boxShadow: '0 8px 24px rgba(124, 58, 237, 0.3)',
              borderRadius: '50px'
            }}
          >
            <PlusCircle size={20} /> ➕ إضافة صفقة سريعة
          </button>
        </div>
      </header>

      <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0 pb-24 overflow-y-auto md:overflow-hidden">
          {STAGES.map((stage) => {
            const Icon = stage.icon;
            let items = columns[stage.id] || [];

            // Apply search filtering for the "Closing" column
            if (stage.id === 'تفاوض' && searchQuery.trim()) {
              items = items.filter(c =>
                c.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.phone?.includes(searchQuery)
              );
            }

            const columnTotal = items.reduce((s, c) => s + (parseFloat(c.expected_value) || 0), 0);

            return (
              <div key={stage.id} className="flex-1 w-full md:w-[calc(50%-12px)] flex flex-col overflow-hidden min-h-[400px] md:min-h-0 shrink-0" style={{
                background: isDark ? 'rgba(30, 45, 74, 0.2)' : 'rgba(248, 250, 255, 0.8)',
                borderRadius: '24px',
                border: `1px solid ${border}`,
              }}>

                {/* Column Header */}
                <div style={{
                  padding: '20px 24px',
                  borderBottom: `1px solid ${border}`,
                  background: isDark ? 'rgba(30, 45, 74, 0.4)' : '#fff',
                  display: 'flex', flexDirection: 'column', gap: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Icon size={24} color={stage.color} />
                      <span style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '20px', fontWeight: 900, color: textPrimary }}>
                        {stage.label}
                      </span>
                    </div>
                    <span style={{ background: `${stage.color}20`, color: stage.color, padding: '4px 12px', borderRadius: '20px', fontSize: '15px', fontWeight: 800 }}>
                      {items.length} صفقات
                    </span>
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '28px', fontWeight: 900, color: stage.id === 'فاز' ? '#10B981' : textPrimary }}>
                    {formatSAR(columnTotal)}
                  </div>
                </div>

                {/* Quick Search inside التقفيل Column */}
                {stage.id === 'تفاوض' && (
                  <div style={{ padding: '16px 20px', borderBottom: `1px solid ${border}` }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="🔍 بحث سريع في صفقات التقفيل..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      style={{ fontSize: '14px', padding: '10px 16px', background: isDark ? 'rgba(255,255,255,0.02)' : '#F9FBFF' }}
                    />
                  </div>
                )}

                {/* Droppable Area */}
                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="custom-scrollbar"
                      style={{
                        flex: 1,
                        padding: '16px 20px',
                        overflowY: 'auto',
                        background: snapshot.isDraggingOver ? (isDark ? 'rgba(79,142,247,0.05)' : 'rgba(79,142,247,0.08)') : 'transparent',
                        transition: 'background 0.2s',
                        minHeight: '150px'
                      }}
                    >
                      {items.length === 0 && stage.id === 'فاز' && (
                        <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                          <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.8 }}>🏆</div>
                          <p style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '18px', fontWeight: 800, color: textPrimary, marginBottom: '8px' }}>
                            انتظر أولى انتصاراتك!
                          </p>
                          <p style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '14px', color: textSecondary }}>
                            اسحب بطاقات العملاء المغلقين إلى هنا.
                          </p>
                        </div>
                      )}

                      {items.map((client, index) => (
                        <Draggable key={client.id.toString()} draggableId={client.id.toString()} index={index}>
                          {(provided, snapshot) => renderCard(client, index, provided, snapshot, stage)}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>

        {/* Global Lost Dropzone exactly at bottom - Always rendered but visually hidden when not dragging */}
        <AnimatePresence>
          <motion.div
            initial={false}
            animate={{ 
              opacity: isDraggingOverall ? 1 : 0, 
              y: isDraggingOverall ? 0 : 50,
              pointerEvents: isDraggingOverall ? 'auto' : 'none'
            }}
            style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 50 }}
          >
            <Droppable droppableId="خسر">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="w-[90vw] md:w-[600px] text-base md:text-xl shadow-lg"
                  style={{
                    height: '80px', borderRadius: '20px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                    background: snapshot.isDraggingOver ? '#EF4444' : (isDark ? 'rgba(30, 45, 74, 0.95)' : '#FFFFFF'),
                    border: `2px dashed ${snapshot.isDraggingOver ? '#fff' : '#EF4444'}`,
                    color: snapshot.isDraggingOver ? '#fff' : '#EF4444',
                    fontFamily: "'IBM Plex Sans Arabic', sans-serif",
                    fontWeight: 800,
                    transition: 'all 0.3s'
                  }}
                >
                  <XCircle size={28} />
                  {snapshot.isDraggingOver ? 'أفلت البطاقة هنا لتسجيل الخسارة' : 'منطقة الاستبعاد (اسحب الصفقات الخاسرة إلى هنا)'}
                  <div style={{ display: 'none' }}>{provided.placeholder}</div>
                </div>
              )}
            </Droppable>
          </motion.div>
        </AnimatePresence>
      </DragDropContext>

      {/* Quick Add Modal */}
      <AnimatePresence>
        {isQuickAddModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)'
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="glass-card w-[90%] md:w-full max-w-[420px] p-6 md:p-8"
              style={{
                background: isDark ? '#19243E' : '#FFFFFF',
                borderRadius: '24px', boxShadow: '0 25px 50px rgba(0,0,0,0.2)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '20px', fontWeight: 800, color: textPrimary }}>
                  إضافة صفقة سريعة
                </h3>
                <button onClick={() => setIsQuickAddModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: textSecondary }}>
                  <X size={24} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: textSecondary }}>اسم العميل *</label>
                  <input className="form-input" placeholder="أدخل اسم العميل" value={quickForm.client_name} onChange={e => setQuickForm({ ...quickForm, client_name: e.target.value })} autoFocus />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: textSecondary }}>رقم الجوال *</label>
                  <input className="form-input" placeholder="05XXXXXXXX" type="tel" value={quickForm.phone} onChange={e => setQuickForm({ ...quickForm, phone: e.target.value })} style={{ direction: 'ltr', textAlign: 'right' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: textSecondary }}>المبلغ المتوقع (ر.س)</label>
                  <input className="form-input" placeholder="10000" type="number" value={quickForm.expected_value} onChange={e => setQuickForm({ ...quickForm, expected_value: e.target.value })} />
                </div>

                <button
                  onClick={handleQuickAdd}
                  disabled={quickSaving || !quickForm.client_name || !quickForm.phone}
                  className="btn-primary"
                  style={{ width: '100%', padding: '14px', marginTop: '12px', fontSize: '16px', fontWeight: 700 }}
                >
                  {quickSaving ? 'جاري الإضافة...' : 'أضف الصفقة الآن 🚀'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
