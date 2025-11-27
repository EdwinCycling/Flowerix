
import React from 'react';
import { Icons } from '../Icons';

interface PremiumFeatureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGoToPricing: () => void;
    featureName: string;
    t: (key: string) => string;
}

export const PremiumFeatureModal: React.FC<PremiumFeatureModalProps> = ({ isOpen, onClose, onGoToPricing, featureName, t }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 to-orange-500"></div>
                
                <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-yellow-600 dark:text-yellow-400">
                    <Icons.Lock className="w-8 h-8" />
                </div>

                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('premium_feature')}</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm leading-relaxed">
                    {featureName} {t('premium_desc')}
                </p>

                <div className="space-y-3">
                    <button 
                        onClick={() => { onClose(); onGoToPricing(); }}
                        className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold rounded-xl shadow-lg hover:from-yellow-600 hover:to-orange-600 transition-all transform hover:scale-[1.02]"
                    >
                        {t('upgrade_to_unlock')}
                    </button>
                    <button 
                        onClick={onClose}
                        className="w-full py-2 text-gray-500 dark:text-gray-400 font-medium text-sm hover:text-gray-700 dark:hover:text-gray-200"
                    >
                        {t('maybe_later')}
                    </button>
                </div>
            </div>
        </div>
    );
};
