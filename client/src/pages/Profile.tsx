import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import CropperModal from '../components/CropperModal';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../utils/apiConfig';
import { User, Lock, Camera, Save, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Profile() {
    const { user, apiFetch, updateUser } = useAuth();
    const [fullName, setFullName] = useState(user?.fullName || '');
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState(user?.id === 0 ? { type: 'error', text: 'حساب المشرف العام (System Admin) هو حساب نظام افتراضي وغير قابل للتعديل. يرجى استخدام حسابك الشخصي المنشأ في قاعدة البيانات لتعديل البيانات.' } : { type: '', text: '' });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previewUrl, setPreviewUrl] = useState(user?.profileImageUrl ? (user.profileImageUrl.startsWith('http') ? user.profileImageUrl : API_URL(user.profileImageUrl)) : null);
    
    // Cropper State
    const [tempImage, setTempImage] = useState<string | null>(null);
    const [showCropper, setShowCropper] = useState(false);
    const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);

    const showMsg = (type, text) => {
        setMsg({ type, text });
        setTimeout(() => setMsg({ type: '', text: '' }), 5000);
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) return showMsg('error', 'حجم الصورة يجب أن لا يتجاوز 10 ميجابايت');
            const reader = new FileReader();
            reader.onload = () => {
                setTempImage(reader.result as string);
                setShowCropper(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCropComplete = (blob: Blob) => {
        setCroppedBlob(blob);
        setPreviewUrl(URL.createObjectURL(blob));
        setShowCropper(false);
        setTempImage(null);
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('fullName', fullName);
            if (croppedBlob) {
                formData.append('profileImage', croppedBlob, 'profile.jpg');
            } else if (fileInputRef.current?.files?.[0]) {
                formData.append('profileImage', fileInputRef.current.files[0]);
            }

            const res = await apiFetch(API_URL('/api/auth/profile'), {
                method: 'PUT',
                body: formData // apiFetch will handle Authorization header, but FormData shouldn't have Content-Type set manually
            });

            const data = await res.json();
            if (res.ok) {
                updateUser(data.user);
                showMsg('success', 'تم تحديث البيانات الشخصية بنجاح');
            } else {
                showMsg('error', data.error || 'فشل تحديث البيانات');
            }
        } catch (err) {
            showMsg('error', 'حدث خطأ في الاتصال');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) return showMsg('error', 'كلمات المرور الجديدة غير متطابقة');
        if (newPassword.length < 6) return showMsg('error', 'كلمة المرور يجب أن تكون 6 خانات على الأقل');

        setLoading(true);
        try {
            const res = await apiFetch(API_URL('/api/auth/change-password'), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldPassword, newPassword })
            });

            const data = await res.json();
            if (res.ok) {
                showMsg('success', 'تم تغيير كلمة المرور بنجاح');
                setOldPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                showMsg('error', data.error || 'فشل تغيير كلمة المرور');
            }
        } catch (err) {
            showMsg('error', 'حدث خطأ في الاتصال');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-8">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
            >
                {/* Header */}
                <div className="flex items-center gap-4 px-2">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-600/20">
                        <User size={24} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white">إعدادات الملف الشخصي</h1>
                        <p className="text-slate-500 dark:text-slate-400 font-bold text-sm mt-1">إدارة معلوماتك الشخصية وأمان حسابك</p>
                    </div>
                </div>

                {/* Notifications */}
                {msg.text && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`p-4 rounded-2xl flex items-center gap-3 font-bold text-sm ${
                            msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                        }`}
                    >
                        {msg.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                        {msg.text}
                    </motion.div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: General Info & Photo */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white dark:bg-slate-900/40 rounded-[32px] border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
                            <div className="p-8 border-b border-slate-100 dark:border-white/5">
                                <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <User size={18} className="text-blue-500" />
                                    المعلومات الأساسية
                                </h3>
                            </div>
                            
                            <form onSubmit={handleUpdateProfile} className="p-8 space-y-8">
                                {/* Profile Picture Upload */}
                                <div className="flex flex-col items-center sm:flex-row sm:items-center gap-8">
                                    <div className="relative group">
                                        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-100 dark:border-white/10 shadow-xl bg-slate-50 dark:bg-white/5 shrink-0 mx-auto sm:mx-0">
                                            {previewUrl ? (
                                                <img src={previewUrl} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-4xl font-black text-slate-300">
                                                    {(user?.fullName || user?.username || 'U').charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => fileInputRef.current.click()}
                                            className="absolute bottom-0 right-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer"
                                        >
                                            <Camera size={18} />
                                        </button>
                                        <input 
                                            type="file" 
                                            ref={fileInputRef} 
                                            onChange={handleImageChange} 
                                            className="hidden" 
                                            accept="image/*" 
                                        />
                                    </div>
                                    <div className="flex-1 text-center sm:text-right">
                                        <h4 className="font-black text-slate-900 dark:text-white mb-1">صورة الملف الشخصي</h4>
                                        <p className="text-xs text-slate-400 font-bold">تظهر صورتك في القائمة الجانبية والتقارير. يفضل أن تكون مربعة وبحجم أقل من 5 ميجابايت.</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">الاسم الكامل</label>
                                        <input 
                                            type="text" 
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            className="w-full h-14 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-6 font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            placeholder="أدخل اسمك الكامل..."
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2 opacity-50 cursor-not-allowed">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">اسم المستخدم (لا يمكن تغييره)</label>
                                        <div className="w-full h-14 bg-slate-50/50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl px-6 flex items-center font-bold text-slate-400">
                                            {user?.username}
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    type="submit" 
                                    disabled={loading || user?.id === 0}
                                    className="w-full h-14 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-2xl font-black shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <Save size={20} />
                                    حفظ البيانات الشخصية
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Right: Security Settings */}
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-slate-900/40 rounded-[32px] border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
                            <div className="p-8 border-b border-slate-100 dark:border-white/5">
                                <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <Lock size={18} className="text-amber-500" />
                                    تغيير كلمة المرور
                                </h3>
                            </div>
                            
                            <form onSubmit={handleChangePassword} className="p-8 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">كلمة المرور الحالية</label>
                                    <input 
                                        type="password" 
                                        value={oldPassword}
                                        onChange={(e) => setOldPassword(e.target.value)}
                                        className="w-full h-12 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">كلمة المرور الجديدة</label>
                                    <input 
                                        type="password" 
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full h-12 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">تأكيد كلمة المرور</label>
                                    <input 
                                        type="password" 
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full h-12 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        required
                                    />
                                </div>

                                <button 
                                    type="submit" 
                                    disabled={loading || user?.id === 0}
                                    className="w-full h-12 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl font-black hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                >
                                    تغيير كلمة المرور
                                </button>
                            </form>
                        </div>

                        {/* Security Tip */}
                        <div className="bg-amber-500/10 p-6 rounded-[24px] border border-amber-500/20">
                            <div className="flex gap-3">
                                <AlertCircle size={20} className="text-amber-500 shrink-0" />
                                <div>
                                    <p className="text-xs font-bold text-amber-700 dark:text-amber-400">نصيحة أمنية:</p>
                                    <p className="text-[10px] font-bold text-amber-600/80 dark:text-amber-500/70 mt-1 leading-relaxed">
                                        احرص على استخدام كلمة مرور قوية تحتوي على أحرف وأرقام ورموز لضمان حماية بياناتك الشخصية وحساب المبيعات الخاص بك.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Cropper Modal */}
                {showCropper && tempImage && (
                    <CropperModal 
                        image={tempImage} 
                        onCropComplete={handleCropComplete} 
                        onCancel={() => {
                            setShowCropper(false);
                            setTempImage(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                        }} 
                    />
                )}
            </motion.div>
        </div>
    );
}
