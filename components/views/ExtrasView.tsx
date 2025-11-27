
import React from 'react';
import { Icons } from '../Icons';
import { isFeatureAllowed } from '../../services/usageService';
import { PRICING_CONFIG } from '../../pricingConfig';
import { ModulesConfig } from '../../types';

interface ExtrasViewProps {
    onOpenSlideshowConfig: () => void;
    onOpenPhotoMerge: () => void;
    onOpenPhotoOptimize: () => void;
    onOpenPhotoTimelapse: () => void;
    onOpenPlantAnalysis: () => void;
    onOpenSeasons: () => void;
    onOpenPlantAdvice: () => void;
    onOpenIdentify: () => void;
    onOpenProfessor: () => void;
    t: (key: string) => string;
    limitAI?: boolean;
    onShowRestriction?: (featureName: string) => void;
    handleImageUpload?: (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void, mode?: 'standard' | 'high') => void;
    modules?: ModulesConfig;
}

export const ExtrasView: React.FC<ExtrasViewProps> = ({ 
    onOpenSlideshowConfig, onOpenPhotoMerge, onOpenPhotoOptimize, onOpenPhotoTimelapse, onOpenPlantAnalysis, onOpenSeasons, onOpenPlantAdvice, onOpenIdentify, onOpenProfessor, t, limitAI, onShowRestriction, modules 
}) => {
    
    const handleAction = (action: () => void, featureKey?: keyof typeof PRICING_CONFIG['FREE']['features'], featureName?: string) => {
        // 1. Check explicit user limit preference (Limit AI)
        // Note: Identify, Advice, Professor, Analysis are heavily AI dependent.
        // Visual tools like Slideshow, Merge might use AI or just canvas.
        // The new Tier logic is dominant for feature access.
        
        if (featureKey && !isFeatureAllowed(featureKey)) {
            if (onShowRestriction) onShowRestriction(featureName || "Premium Feature");
            return;
        }

        action();
    };

    return (
        <div className="p-4 pb-24 animate-in slide-in-from-right duration-300">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">{t('extras_menu_title')}</h2>
            
            {/* Top Tile: Identify Plant */}
            <button 
                onClick={() => handleAction(onOpenIdentify)}
                className={`w-full bg-gradient-to-r from-green-600 to-green-500 text-white p-6 rounded-3xl shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] mb-6 flex items-center justify-between group relative overflow-hidden`}
            >
                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
                <div className="absolute -right-10 -bottom-10 text-white/20 transform rotate-12">
                    <Icons.ScanLine className="w-40 h-40" />
                </div>
                
                <div className="relative z-10 flex items-center gap-5">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white shadow-inner">
                        <Icons.Camera className="w-8 h-8" />
                    </div>
                    <div className="text-left">
                        <h3 className="text-2xl font-bold mb-1">{t('identify_title')}</h3>
                        <p className="text-green-100 text-sm font-medium max-w-[200px]">{t('identify_desc')}</p>
                    </div>
                </div>
                <div className="relative z-10 bg-white/20 p-2 rounded-full backdrop-blur-sm">
                    <Icons.ArrowLeft className="w-6 h-6 rotate-180" />
                </div>
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Plant Advice Button */}
                <button 
                    onClick={() => handleAction(onOpenPlantAdvice)}
                    className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center gap-4 border border-transparent hover:border-green-600 group"
                >
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform">
                        <Icons.Sprout className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 flex items-center justify-center gap-2">
                            {t('advice_title')}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('advice_desc')}</p>
                    </div>
                </button>

                {/* Plant Doctor Button */}
                <button 
                    onClick={() => handleAction(onOpenPlantAnalysis)}
                    className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center gap-4 border border-transparent hover:border-red-500 group"
                >
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform">
                        <Icons.Stethoscope className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 flex items-center justify-center gap-2">
                            {t('plant_doctor')}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('plant_doctor_desc')}</p>
                    </div>
                </button>

                {/* The Professor Button */}
                <button 
                    onClick={() => handleAction(onOpenProfessor)}
                    className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center gap-4 border border-transparent hover:border-indigo-500 group"
                >
                    <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                        <Icons.GraduationCap className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 flex items-center justify-center gap-2">
                            {t('professor_title')}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('professor_desc')}</p>
                    </div>
                </button>

                {/* Seasons Button (RESTRICTED) - Only if Garden Log is enabled */}
                {(!modules || modules.gardenLogs) && (
                    <button 
                        onClick={() => handleAction(onOpenSeasons, 'seasons', t('seasons_title'))}
                        className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center gap-4 border border-transparent hover:border-teal-500 group"
                    >
                        <div className="w-16 h-16 bg-teal-100 dark:bg-teal-900/50 rounded-full flex items-center justify-center text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform relative">
                            <Icons.CloudSnow className="w-8 h-8" />
                            {!isFeatureAllowed('seasons') && <div className="absolute top-0 right-0 bg-yellow-400 rounded-full p-1 shadow-sm border border-white"><Icons.Lock className="w-3 h-3 text-white" /></div>}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 flex items-center justify-center gap-2">
                                {t('seasons_title')}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('seasons_desc')}</p>
                        </div>
                    </button>
                )}

                {/* Slideshow Button (RESTRICTED) */}
                <button 
                    onClick={() => handleAction(onOpenSlideshowConfig, 'slideshow', t('slideshow'))}
                    className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center gap-4 border border-transparent hover:border-green-500 group"
                >
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform relative">
                        <Icons.Image className="w-8 h-8" />
                        {!isFeatureAllowed('slideshow') && <div className="absolute top-0 right-0 bg-yellow-400 rounded-full p-1 shadow-sm border border-white"><Icons.Lock className="w-3 h-3 text-white" /></div>}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{t('slideshow')}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('slideshow_desc')}</p>
                    </div>
                </button>

                {/* Photo Merge Button (RESTRICTED) */}
                <button 
                    onClick={() => handleAction(onOpenPhotoMerge, 'merge', t('photo_merge'))}
                    className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center gap-4 border border-transparent hover:border-blue-500 group"
                >
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform relative">
                        <Icons.ArrowDownWideNarrow className="w-8 h-8" />
                        {!isFeatureAllowed('merge') && <div className="absolute top-0 right-0 bg-yellow-400 rounded-full p-1 shadow-sm border border-white"><Icons.Lock className="w-3 h-3 text-white" /></div>}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{t('photo_merge')}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('photo_merge_desc')}</p>
                    </div>
                </button>

                {/* Photo Optimize Button (RESTRICTED) */}
                <button 
                    onClick={() => handleAction(onOpenPhotoOptimize, 'optimize', t('photo_optimize'))}
                    className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center gap-4 border border-transparent hover:border-purple-500 group"
                >
                    <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform relative">
                        <Icons.Sparkles className="w-8 h-8" />
                        {!isFeatureAllowed('optimize') && <div className="absolute top-0 right-0 bg-yellow-400 rounded-full p-1 shadow-sm border border-white"><Icons.Lock className="w-3 h-3 text-white" /></div>}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{t('photo_optimize')}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('photo_optimize_desc')}</p>
                    </div>
                </button>

                {/* Photo Timelapse Button (RESTRICTED) */}
                <button 
                    onClick={() => handleAction(onOpenPhotoTimelapse, 'timelapse', t('timelapse'))}
                    className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center gap-4 border border-transparent hover:border-orange-500 group"
                >
                    <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/50 rounded-full flex items-center justify-center text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform relative">
                        <Icons.Clock className="w-8 h-8" />
                        {!isFeatureAllowed('timelapse') && <div className="absolute top-0 right-0 bg-yellow-400 rounded-full p-1 shadow-sm border border-white"><Icons.Lock className="w-3 h-3 text-white" /></div>}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{t('timelapse')}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('timelapse_desc')}</p>
                    </div>
                </button>
            </div>
        </div>
    );
};
