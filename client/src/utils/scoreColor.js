export function getScoreLabel(score) {
  if (score >= 80) return { label: 'جاد جداً', emoji: '🔴', class: 'score-hot', textColor: '#EF4444' };
  if (score >= 50) return { label: 'متوسط', emoji: '🟡', class: 'score-medium', textColor: '#F59E0B' };
  return { label: 'ضعيف', emoji: '⚪', class: 'score-weak', textColor: '#94A3B8' };
}

export function getScoreRingColor(score) {
  if (score >= 80) return '#EF4444';
  if (score >= 50) return '#F59E0B';
  return '#94A3B8';
}

export function getStageClass(stage) {
  const map = {
    'جديد': 'stage-new',
    'تحت المتابعة': 'stage-follow',
    'عرض مُرسل': 'stage-offer',
    'تفاوض': 'stage-negotiate',
    'فاز': 'stage-won',
    'خسر': 'stage-lost',
  };
  return map[stage] || 'stage-new';
}

export function getSectorColor(sector) {
  const colors = {
    'تجارة': '#4F8EF7',
    'مطاعم وضيافة': '#F59E0B',
    'خدمات': '#10B981',
    'تعليم': '#7C3AED',
    'صحي': '#EF4444',
    'عقارات': '#06B6D4',
    'صناعي': '#8B5CF6',
    'حكومي': '#64748B',
    'أخرى': '#94A3B8',
  };
  return colors[sector] || '#94A3B8';
}

export function getAvatarColor(name) {
  const colors = [
    'linear-gradient(135deg, #4F8EF7, #7C3AED)',
    'linear-gradient(135deg, #EF4444, #F59E0B)',
    'linear-gradient(135deg, #10B981, #4F8EF7)',
    'linear-gradient(135deg, #7C3AED, #EF4444)',
    'linear-gradient(135deg, #F59E0B, #10B981)',
    'linear-gradient(135deg, #06B6D4, #7C3AED)',
  ];
  if (!name) return colors[0];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}
