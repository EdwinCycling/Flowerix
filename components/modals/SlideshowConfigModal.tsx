
import React, { useState } from 'react';
import { Icons } from '../Icons';
import { SlideshowConfig, SlideshowTransition } from '../../types';

interface SlideshowConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExecute: (config: SlideshowConfig) => void;
    t: (key: string) => string;
}

export const SlideshowConfigModal: React.FC<SlideshowConfigModalProps> = ({ isOpen, onClose, onExecute, t }) => {
    const [duration, setDuration] = useState(5);
    const [transition, setTransition] = useState<SlideshowTransition>('fade');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('slideshow_config_title')}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <Icons.X className="w-6 h-6" />
                    </button>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('duration_label')}: <span className="font-bold text-green-600 dark:text-green-400">{duration}s</span>
                        </label>
                        <input 
                            type="range" 
                            min="5" 
                            max="100" 
                            value={duration} 
                            onChange={(e) => setDuration(Number(e.target.value))} 
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>5s</span>
                            <span>100s</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('transition_label')}
                        </label>
                        <select 
                            value={transition} 
                            onChange={(e) => setTransition(e.target.value as SlideshowTransition)}
                            className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-green-500"
                        >
                            <option value="fade">{t('trans_fade')}</option>
                            <option value="cut">{t('trans_cut')}</option>
                            <option value="slide_right">{t('trans_slide_right')}</option>
                            <option value="slide_left">{t('trans_slide_left')}</option>
                            <option value="slide_top">{t('trans_slide_top')}</option>
                            <option value="slide_bottom">{t('trans_slide_bottom')}</option>
                            <option value="zoom">{t('trans_zoom')}</option>
                            <option value="rotate">{t('trans_rotate')}</option>
                            <option value="cube">{t('trans_cube')}</option>
                            <option value="wipe_right">{t('trans_wipe_right')}</option>
                            <option value="wipe_left">{t('trans_wipe_left')}</option>
                            <option value="wipe_top">{t('trans_wipe_top')}</option>
                            <option value="wipe_bottom">{t('trans_wipe_bottom')}</option>
                        </select>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-200 font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                            {t('cancel')}
                        </button>
                        <button onClick={() => onExecute({ duration, transition })} className="flex-1 py-3 rounded-xl bg-green-600 text-white font-bold shadow-lg hover:bg-green-700 transition-colors">
                            {t('execute')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
