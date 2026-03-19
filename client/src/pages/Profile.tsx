import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import CropperModal from '../components/CropperModal';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../utils/apiConfig';
import { User, Lock, Camera, Save, AlertCircle, CheckCircle2, X } from 'lucide-react';

export default function Profile() {
    const { user, apiFetch, updateUser } = useAuth();
    const [fullName, setFullName] = useState(user?.fullName || '');
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState(user?.id === 0 ? { type: 'error', text: 'حساب المشرف العام (System Admin) هو حساب نظام افتراضي وغير قابل للتعديل. يرجى استخدام حسابك الشخصي المنشأ في قاعدة البيانات لتعديل البيانات.' } : { type: '', text: '' });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previewUrl, setPreviewUrl] = useState(user?.profileImageUrl ? (user.profileImageUrl.startsWith('http') || user.profileImageUrl.startsWith('data:') ? user.profileImageUrl : API_URL(user.profileImageUrl)) : null);

    // Sync state when user changes (e.g. after login/logout)
    React.useEffect(() => {
        setFullName(user?.fullName || '');
        setPreviewUrl(user?.profileImageUrl ? (user.profileImageUrl.startsWith('http') || user.profileImageUrl.startsWith('data:') ? user.profileImageUrl : API_URL(user.profileImageUrl)) : null);
    }, [user]);
    
    // Cropper State
    const [tempImage, setTempImage] = useState<string | null>(null);
    const [showCropper, setShowCropper] = useState(false);
    const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
    const [removeImage, setRemoveImage] = useState(false);

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
        setRemoveImage(false); // Reset remove flag if a new image is cropped
    };

    const handleRemoveImage = () => {
        setPreviewUrl(null);
        setCroppedBlob(null);
        setRemoveImage(true);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('fullName', fullName);
            formData.append('removeImage', removeImage.toString());
            
            if (croppedBlob) {
                formData.append('profileImage', croppedBlob, 'profile.jpg');
            } else if (fileInputRef.current?.files?.[0] && !removeImage) {
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
                                <div className="flex flex-col items-center sm:flex-row sm:items-center gap-10">
                                    <div className="relative group">
                                        <div className="w-40 h-40 rounded-full p-1 bg-gradient-to-tr from-blue-500 via-cyan-400 to-blue-600 shadow-2xl">
                                            <div className="w-full h-full rounded-full overflow-hidden border-4 border-white dark:border-slate-900 bg-slate-50 dark:bg-slate-800 relative group">
                                                {previewUrl ? (
                                                    <img src={previewUrl} alt="Avatar" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-5xl font-black text-slate-300 dark:text-slate-700 bg-slate-100 dark:bg-slate-800/50">
                                                        {(user?.fullName || user?.username || 'U').charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                
                                                {/* Overlay on hover */}
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <button 
                                                        type="button"
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-all scale-90 group-hover:scale-100"
                                                    >
                                                        <Camera size={24} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="absolute -bottom-2 flex gap-2 w-full justify-center">
                                            <button 
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer border-2 border-white dark:border-slate-900"
                                                title="تغيير الصورة"
                                            >
                                                <Camera size={18} />
                                            </button>
                                            
                                            {previewUrl && (
                                                <button 
                                                    type="button"
                                                    onClick={handleRemoveImage}
                                                    className="w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer border-2 border-white dark:border-slate-900"
                                                    title="حذف الصورة"
                                                >
                                                    <X size={18} className="text-white" />
                                                </button>
                                            )}
                                        </div>

                                        <input 
                                            id="profileImage"
                                            name="profileImage"
                                            type="file" 
                                            ref={fileInputRef} 
                                            onChange={handleImageChange} 
                                            className="hidden" 
                                            accept="image/*" 
                                        />
                                    </div>
                                    <div className="flex-1 text-center sm:text-right space-y-2">
                                        <h4 className="font-black text-xl text-slate-900 dark:text-white mb-1">صورتك الشخصية</h4>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-xs">
                                            هذه الصورة هي هويتك في النظام، ستظهر لزملائك وفي التقارير الذكية.
                                        </p>
                                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                                            <span className="px-3 py-1 bg-slate-100 dark:bg-white/5 rounded-full text-[10px] font-bold text-slate-500 tracking-wider">JPG, PNG</span>
                                            <span className="px-3 py-1 bg-slate-100 dark:bg-white/5 rounded-full text-[10px] font-bold text-slate-500 tracking-wider">MAX 10MB</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label htmlFor="fullName" className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">الاسم الكامل</label>
                                        <input 
                                            id="fullName"
                                            name="fullName"
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
                                    <label htmlFor="oldPassword" className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">كلمة المرور الحالية</label>
                                    <input 
                                        id="oldPassword"
                                        name="oldPassword"
                                        type="password" 
                                        value={oldPassword}
                                        onChange={(e) => setOldPassword(e.target.value)}
                                        className="w-full h-12 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="newPassword" className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">كلمة المرور الجديدة</label>
                                    <input 
                                        id="newPassword"
                                        name="newPassword"
                                        type="password" 
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full h-12 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="confirmPassword" className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">تأكيد كلمة المرور</label>
                                    <input 
                                        id="confirmPassword"
                                        name="confirmPassword"
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
