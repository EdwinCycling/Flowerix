
import React, { useState, useEffect } from 'react';
import { Icons } from '../Icons';
import { GardenLogItem, Plant } from '../../types';
import { transformToSeason, TransformationConfig } from '../../services/geminiService';

interface SeasonsModalProps {
    isOpen: boolean;
    onClose: () => void;
    plants: Plant[];
    gardenLogs: GardenLogItem[];
    onSaveToGarden: (image: string, label: string) => Promise<void>;
    handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => void;
    t: (key: string) => string;
}

export const SeasonsModal: React.FC<SeasonsModalProps> = ({ isOpen, onClose, plants, gardenLogs, onSaveToGarden, handleImageUpload, t }) => {
    const [step, setStep] = useState<'select' | 'config' | 'result'>('select');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    
    // Config State
    const [config, setConfig] = useState<TransformationConfig>({
        season: 'spring',
        weather: 'sunny',
        time: 'noon',
        style: 'realistic'
    });

    useEffect(() => {
        if (isOpen) {
            setStep('select');
            setSelectedImage(null);
            setGeneratedImage(null);
            setIsGenerating(false);
            setIsSaving(false);
            setConfig({ season: 'spring', weather: 'sunny', time: 'noon', style: 'realistic' });
        }
    }, [isOpen]);

    const allImages = React.useMemo(() => {
        const imgs: { url: string, date: string }[] = [];
        gardenLogs.forEach(l => { if (l.imageUrl) imgs.push({ url: l.imageUrl, date: l.date }); });
        return imgs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [gardenLogs]);

    const handleSelect = (url: string) => {
        setSelectedImage(url);
        setStep('config');
    };

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleImageUpload(e, (base64) => {
            setSelectedImage(base64);
            setStep('config');
        });
    };

    const executeTransform = async () => {
        if (!selectedImage) return;
        setIsGenerating(true);
        try {
            const result = await transformToSeason(selectedImage, config);
            if (result) {
                setGeneratedImage(result);
                setStep('result');
            } else {
                alert("Failed to generate image.");
            }
        } catch (e) {
            console.error(e);
            alert("Error generating image.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = () => {
        if (!generatedImage) return;
        const link = document.createElement('a');
        link.href = generatedImage;
        link.download = `transform-${config.season}-${config.weather}-${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleSave = async () => {
        if (generatedImage) {
            setIsSaving(true);
            try {
                // Create a descriptive label
                const sLabel = t(`season_${config.season}` as any);
                const wLabel = t(`weather_${config.weather}` as any);
                const stLabel = config.style !== 'realistic' ? `(${t(`style_${config.style}` as any)})` : '';
                const label = `${sLabel}, ${wLabel} ${stLabel}`;
                
                await onSaveToGarden(generatedImage, label);
                onClose();
            } catch (e) {
                console.error(e);
                // App handles error toast
            } finally {
                setIsSaving(false);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 relative">
                
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('seasons_title')}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('seasons_desc')}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"><Icons.X className="w-6 h-6" /></button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-900 relative flex flex-col">
                    
                    {/* Step 1: Select */}
                    {step === 'select' && (
                        <div className="h-full overflow-y-auto p-4">
                             <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm text-center space-y-4 mb-6">
                                <div className="bg-blue-100 dark:bg-blue-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400">
                                    <Icons.Camera className="w-8 h-8" />
                                </div>
                                <h3 className="font-bold text-gray-900 dark:text-white">{t('select_photo_season')}</h3>
                                <label className="block w-full bg-blue-600 text-white font-bold py-3 rounded-xl cursor-pointer hover:bg-blue-700 transition-colors">
                                    {t('take_photo')}
                                    <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                                </label>
                            </div>
                            
                            {allImages.length > 0 ? (
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                    {allImages.map((img, idx) => (
                                        <div key={idx} onClick={() => handleSelect(img.url)} className="aspect-square rounded-lg overflow-hidden cursor-pointer border-2 border-transparent hover:border-blue-500 relative">
                                            <img src={img.url} className="w-full h-full object-cover" alt="Gallery" />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-sm text-gray-600 dark:text-gray-300 text-center">
                                    {t('no_garden_log_photos')} <button onClick={() => { window.dispatchEvent(new Event('openModulesTab')); onClose(); }} className="text-blue-600 dark:text-blue-400 underline">{t('activate_garden_logs')}</button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 2: Config */}
                    {step === 'config' && selectedImage && (
                        <div className="h-full flex flex-col lg:flex-row relative">
                            {/* Preview Image */}
                            <div className="flex-1 relative bg-black overflow-hidden min-h-[40vh] lg:min-h-full">
                                <img src={selectedImage} className="w-full h-full object-contain" alt="Selected" />
                                {isGenerating && (
                                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center text-white z-20 animate-in fade-in">
                                        <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4"></div>
                                        <h3 className="text-xl font-bold text-center px-4">{t('generating_season')}</h3>
                                    </div>
                                )}
                            </div>
                            
                            {/* Sidebar Controls */}
                            <div className="w-full lg:w-80 bg-white dark:bg-gray-800 border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
                                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                                    
                                    {/* Season */}
                                    <div>
                                        <h4 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-3">{t('category_season')}</h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { id: 'spring', icon: Icons.Flower, color: 'text-green-500' },
                                                { id: 'summer', icon: Icons.Sun, color: 'text-yellow-500' },
                                                { id: 'autumn', icon: Icons.Leaf, color: 'text-orange-500' },
                                                { id: 'winter', icon: Icons.Snowflake, color: 'text-blue-500' },
                                            ].map(item => (
                                                <button 
                                                    key={item.id}
                                                    onClick={() => setConfig({...config, season: item.id as any})}
                                                    className={`p-3 rounded-xl flex flex-col items-center gap-1 border-2 transition-all ${config.season === item.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-transparent bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'}`}
                                                >
                                                    <item.icon className={`w-6 h-6 ${item.color}`} />
                                                    <span className="text-xs font-medium text-gray-700 dark:text-gray-200">{t(`season_${item.id}` as any)}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Weather */}
                                    <div>
                                        <h4 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-3">{t('category_weather')}</h4>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { id: 'sunny', icon: Icons.Sun },
                                                { id: 'rainy', icon: Icons.CloudRain },
                                                { id: 'windy', icon: Icons.Wind },
                                                { id: 'misty', icon: Icons.CloudFog },
                                                { id: 'hail', icon: Icons.CloudSnow },
                                                { id: 'stormy', icon: Icons.CloudLightning },
                                            ].map(item => (
                                                <button 
                                                    key={item.id}
                                                    onClick={() => setConfig({...config, weather: item.id as any})}
                                                    className={`p-2 rounded-lg flex flex-col items-center gap-1 border transition-all ${config.weather === item.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'border-transparent bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
                                                >
                                                    <item.icon className="w-5 h-5" />
                                                    <span className="text-[10px] font-medium">{t(`weather_${item.id}` as any)}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Time of Day */}
                                    <div>
                                        <h4 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-3">{t('category_time')}</h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { id: 'morning', icon: Icons.Sunrise },
                                                { id: 'noon', icon: Icons.Sun },
                                                { id: 'sunset', icon: Icons.Sunset },
                                                { id: 'night', icon: Icons.Moon },
                                            ].map(item => (
                                                <button 
                                                    key={item.id}
                                                    onClick={() => setConfig({...config, time: item.id as any})}
                                                    className={`p-2 rounded-lg flex items-center gap-2 border transition-all ${config.time === item.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-transparent bg-gray-50 dark:bg-gray-700'}`}
                                                >
                                                    <item.icon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                                                    <span className="text-xs font-medium text-gray-700 dark:text-gray-200">{t(`time_${item.id}` as any)}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Art Style */}
                                    <div>
                                        <h4 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-3">{t('category_style')}</h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { id: 'realistic', icon: Icons.Camera },
                                                { id: 'watercolor', icon: Icons.Brush },
                                                { id: 'oil', icon: Icons.Palette },
                                                { id: 'sketch', icon: Icons.Edit2 },
                                                { id: 'cyberpunk', icon: Icons.Zap },
                                                { id: 'ghibli', icon: Icons.Sparkles },
                                            ].map(item => (
                                                <button 
                                                    key={item.id}
                                                    onClick={() => setConfig({...config, style: item.id as any})}
                                                    className={`p-2 rounded-lg flex items-center gap-2 border transition-all ${config.style === item.id ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300' : 'border-transparent bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
                                                >
                                                    <item.icon className="w-4 h-4" />
                                                    <span className="text-xs font-medium">{t(`style_${item.id}` as any)}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                                    <button 
                                        onClick={executeTransform}
                                        disabled={isGenerating}
                                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isGenerating ? (
                                            <><div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div> {t('generating')}...</>
                                        ) : (
                                            <><Icons.Sparkles className="w-5 h-5" /> {t('generate_button')}</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Result */}
                    {step === 'result' && generatedImage && (
                         <div className="h-full flex flex-col relative">
                            <div className="flex-1 bg-black flex items-center justify-center p-4">
                                <img src={generatedImage} className="max-w-full max-h-full object-contain shadow-2xl border-4 border-white" alt="Result" />
                            </div>
                            <div className="p-4 bg-white dark:bg-gray-800 grid grid-cols-2 gap-3">
                                <button onClick={handleDownload} className="col-span-1 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl font-bold text-gray-700 dark:text-gray-200 flex items-center justify-center gap-2">
                                    <Icons.Download className="w-5 h-5" /> {t('merge_download')}
                                </button>
                                <button onClick={handleSave} disabled={isSaving} className="col-span-1 py-3 bg-green-600 disabled:bg-green-800 rounded-xl font-bold text-white flex items-center justify-center gap-2">
                                    {isSaving ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div> : <><Icons.Book className="w-5 h-5" /> {t('save_to_garden_log')}</>}
                                </button>
                                <button onClick={() => setStep('config')} className="col-span-2 py-3 border border-gray-300 dark:border-gray-600 rounded-xl font-bold text-gray-600 dark:text-gray-400">
                                    {t('try_another')}
                                </button>
                            </div>
                         </div>
                    )}
                </div>
            </div>
        </div>
    );
};
