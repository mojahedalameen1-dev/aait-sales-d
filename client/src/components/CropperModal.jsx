import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, ZoomOut, Check, Maximize2 } from 'lucide-react';
import getCroppedImg from '../utils/cropImage';

const CropperModal = ({ image, onCropComplete, onCancel }) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const onCropChange = (crop) => {
        setCrop(crop);
    };

    const onZoomChange = (zoom) => {
        setZoom(zoom);
    };

    const onCropAreaComplete = useCallback((_croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleConfirm = async () => {
        try {
            const croppedImageBlob = await getCroppedImg(image, croppedAreaPixels);
            onCropComplete(croppedImageBlob);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl border border-slate-200 dark:border-white/10"
                >
                    {/* Header */}
                    <div className="p-6 flex items-center justify-between border-b border-slate-100 dark:border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-600">
                                <Maximize2 size={20} />
                            </div>
                            <div>
                                <h3 className="font-black text-slate-900 dark:text-white">تعديل الصورة</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">قص وتعديل حجم صورة الملف الشخصي</p>
                            </div>
                        </div>
                        <button 
                            onClick={onCancel}
                            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Cropper Area */}
                    <div className="relative h-80 bg-slate-100 dark:bg-slate-950">
                        <Cropper
                            image={image}
                            crop={crop}
                            zoom={zoom}
                            aspect={1 / 1}
                            onCropChange={onCropChange}
                            onCropComplete={onCropAreaComplete}
                            onZoomChange={onZoomChange}
                            cropShape="round"
                            showGrid={false}
                        />
                    </div>

                    {/* Controls */}
                    <div className="p-8 space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-xs font-black text-slate-400 uppercase tracking-widest px-1">
                                <span id="Zoom">تكبير / تصغير</span>
                                <span className="text-blue-500">{Math.round(zoom * 100)}%</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={() => setZoom(Math.max(1, zoom - 0.1))}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-white/5 text-slate-500 hover:text-blue-600 transition-colors"
                                >
                                    <ZoomOut size={18} />
                                </button>
                                <input
                                    id="zoom_range"
                                    name="zoom_range"
                                    type="range"
                                    value={zoom}
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    aria-labelledby="Zoom"
                                    onChange={(e) => onZoomChange(Number(e.target.value))}
                                    className="flex-1 h-1.5 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                />
                                <button 
                                    onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-white/5 text-slate-500 hover:text-blue-600 transition-colors"
                                >
                                    <ZoomIn size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={onCancel}
                                className="flex-1 h-14 rounded-2xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 font-black hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleConfirm}
                                className="flex-[2] h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                            >
                                <Check size={20} />
                                تأكيد الصورة
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default CropperModal;
