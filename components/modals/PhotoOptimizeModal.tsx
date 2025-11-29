
import React, { useState, useEffect, useRef } from 'react';
import { Icons } from '../Icons';
import { Plant, GardenLogItem } from '../../types';
import { editImageWithAI } from '../../services/geminiService';

interface PhotoOptimizeModalProps {
    isOpen: boolean;
    onClose: () => void;
    plants: Plant[];
    gardenLogs: GardenLogItem[];
    onUpdate: (id: string, newImage: string) => Promise<void>;
    lang: 'en' | 'nl';
    t: (key: string) => string;
    limitAI?: boolean;
}

interface OptImage {
    id: string;
    url: string;
    date: string;
}

export const PhotoOptimizeModal: React.FC<PhotoOptimizeModalProps> = ({ isOpen, onClose, plants, gardenLogs, onUpdate, lang, t, limitAI }) => {
    const [step, setStep] = useState<'select' | 'edit'>('select');
    const [images, setImages] = useState<OptImage[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
    
    // Editor State
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [grayscale, setGrayscale] = useState(0);
    const [sepia, setSepia] = useState(0);
    
    const [aiPrompt, setAiPrompt] = useState('');
    const [isAIProcessing, setIsAIProcessing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Load images
    useEffect(() => {
        if (isOpen) {
            const allImages: OptImage[] = [];
            plants.forEach(p => {
                if (p.imageUrl) allImages.push({ id: `p_${p.id}`, url: p.imageUrl, date: p.dateAdded });
                p.logs.forEach(l => {
                    if (l.imageUrl) allImages.push({ id: `pl_${l.id}`, url: l.imageUrl, date: l.date });
                });
            });
            gardenLogs.forEach(l => {
                if (l.imageUrl) allImages.push({ id: `gl_${l.id}`, url: l.imageUrl, date: l.date });
            });
            allImages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setImages(allImages);
            setStep('select');
            setSelectedId(null);
            setSelectedImageUrl(null);
            resetFilters();
            setIsSaving(false);
        }
    }, [isOpen, plants, gardenLogs]);

    const resetFilters = () => {
        setBrightness(100);
        setContrast(100);
        setGrayscale(0);
        setSepia(0);
        setAiPrompt('');
    };

    const handleSelect = (id: string, url: string) => {
        setSelectedId(id);
        setSelectedImageUrl(url);
        setStep('edit');
        resetFilters();
    };

    const applyFilters = () => {
        if (!canvasRef.current || !selectedImageUrl) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = selectedImageUrl;
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            
            ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) grayscale(${grayscale}%) sepia(${sepia}%)`;
            ctx.drawImage(img, 0, 0);
        };
    };

    useEffect(() => {
        if (step === 'edit') {
            applyFilters();
        }
    }, [brightness, contrast, grayscale, sepia, step, selectedImageUrl]);

    const handleSave = async () => {
        if (!selectedId || !canvasRef.current) return;
        setIsSaving(true);
        try {
            const newImage = canvasRef.current.toDataURL('image/jpeg', 0.9);
            await onUpdate(selectedId, newImage);
            onClose();
        } catch (e) {
            console.error(e);
            // App.tsx handles the error toast, but we keep modal open to show failure
        } finally {
            setIsSaving(false);
        }
    };

    const handleAIGenerate = async () => {
        if (!selectedImageUrl || !aiPrompt) return;
        setIsAIProcessing(true);
        try {
            const result = await editImageWithAI(selectedImageUrl, aiPrompt);
            if (result) {
                setSelectedImageUrl(result);
                resetFilters();
            } else {
                alert(lang === 'nl' ? "AI bewerken is nog in ontwikkeling." : "AI editing is currently under development.");
            }
        } catch (e) {
            console.error(e);
            alert("AI Error");
        } finally {
            setIsAIProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('photo_optimize')}</h3>
                    <button onClick={onClose}><Icons.X className="w-6 h-6 text-gray-500" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-gray-100 dark:bg-gray-900">
                    {step === 'select' ? (
                        images.length === 0 ? (
                            <div className="text-center text-gray-500 mt-20">{t('no_photos')}</div>
                        ) : (
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                                {images.map(img => (
                                    <div key={img.id} onClick={() => handleSelect(img.id, img.url)} className="aspect-square rounded-xl overflow-hidden cursor-pointer border-2 border-transparent hover:border-purple-500 relative group">
                                        <img src={img.url} className="w-full h-full object-cover" alt="Thumb" />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                        <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] p-1 text-center truncate opacity-0 group-hover:opacity-100 transition-opacity">
                                            {new Date(img.date).toLocaleDateString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        <div className="flex flex-col lg:flex-row h-full gap-4">
                            <div className="flex-1 bg-black/5 rounded-xl flex items-center justify-center overflow-hidden relative min-h-[300px]">
                                <canvas ref={canvasRef} className="max-w-full max-h-full object-contain" />
                            </div>
                            <div className="w-full lg:w-80 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm space-y-6 h-fit overflow-y-auto">
                                <div>
                                    <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">{t('brightness')}</label>
                                    <input type="range" min="0" max="200" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">{t('contrast')}</label>
                                    <input type="range" min="0" max="200" value={contrast} onChange={(e) => setContrast(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">{t('preset_bw')}</label>
                                    <input type="range" min="0" max="100" value={grayscale} onChange={(e) => setGrayscale(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600" />
                                </div>
                                
                                {!limitAI && (
                                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <h4 className="font-bold text-sm mb-2 flex items-center gap-2 text-gray-800 dark:text-white"><Icons.Sparkles className="w-4 h-4 text-purple-500" /> {t('ai_edit')}</h4>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            value={aiPrompt} 
                                            onChange={(e) => setAiPrompt(e.target.value)} 
                                            placeholder={t('ai_prompt_placeholder')} 
                                            className="flex-1 p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm dark:bg-gray-700 dark:text-white outline-none"
                                        />
                                        <button onClick={handleAIGenerate} disabled={isAIProcessing || !aiPrompt} className="bg-purple-600 text-white p-2 rounded-lg disabled:opacity-50 hover:bg-purple-700 transition-colors">
                                            {isAIProcessing ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <Icons.ArrowLeft className="rotate-180 w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                )}

                                <div className="pt-4 flex gap-2">
                                    <button onClick={() => setStep('select')} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">{t('back')}</button>
                                    <button onClick={handleSave} disabled={isSaving} className="flex-1 py-2 bg-green-600 text-white rounded-lg font-bold shadow-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                                        {isSaving ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div> : t('save_update')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
