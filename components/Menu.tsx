
import React from 'react';
import { Icons } from './Icons';
import { DashboardTab, ModulesConfig } from '../types';

interface MenuProps {
    isOpen: boolean;
    onClose: () => void;
    setView: (view: any) => void;
    setDashboardTab: (tab: DashboardTab) => void;
    setShowLocationModal: (show: boolean) => void;
    darkMode: boolean;
    setDarkMode: (dark: boolean) => void;
    lang: 'en' | 'nl';
    setLang: (lang: 'en' | 'nl') => void;
    t: (key: string) => string;
    onSignOut: () => void;
    modules: ModulesConfig;
}

export const Menu: React.FC<MenuProps> = ({
    isOpen, onClose, setView, setDashboardTab, setShowLocationModal, darkMode, setDarkMode, lang, setLang, t, onSignOut, modules
}) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex">
            <div className="w-72 bg-white dark:bg-gray-800 h-full shadow-xl p-6 flex flex-col gap-4 transition-colors animate-in slide-in-from-left duration-200">
                <h2 className="text-2xl font-bold text-green-800 dark:text-green-400 mb-4">{t('menu_title')}</h2>

                <button onClick={() => { setView('DASHBOARD'); setDashboardTab('PLANTS'); onClose(); }} className="flex items-center gap-3 text-gray-700 dark:text-gray-200 text-lg hover:text-green-600 dark:hover:text-green-400 transition-colors"><Icons.Flower className="w-5 h-5" /> {t('my_plants')}</button>
                {modules.gardenLogs && (
                    <button onClick={() => { setView('DASHBOARD'); setDashboardTab('GARDEN_LOGS'); onClose(); }} className="flex items-center gap-3 text-gray-700 dark:text-gray-200 text-lg hover:text-green-600 dark:hover:text-green-400 transition-colors"><Icons.Book className="w-5 h-5" /> {t('my_garden')}</button>
                )}
                {modules.gardenView && (
                    <button onClick={() => { setView('DASHBOARD'); setDashboardTab('GARDEN_VIEW'); onClose(); }} className="flex items-center gap-3 text-gray-700 dark:text-gray-200 text-lg hover:text-green-600 dark:hover:text-green-400 transition-colors"><Icons.Map className="w-5 h-5" /> {t('visual_map')}</button>
                )}
                {modules.social && (
                    <button onClick={() => { setView('DASHBOARD'); setDashboardTab('WORLD'); onClose(); }} className="flex items-center gap-3 text-gray-700 dark:text-gray-200 text-lg hover:text-green-600 dark:hover:text-green-400 transition-colors"><Icons.Globe className="w-5 h-5" /> {t('tab_world')}</button>
                )}
                {modules.notebook && (
                    <button onClick={() => { setView('DASHBOARD'); setDashboardTab('NOTEBOOK'); onClose(); }} className="flex items-center gap-3 text-gray-700 dark:text-gray-200 text-lg hover:text-green-600 dark:hover:text-green-400 transition-colors"><Icons.Notebook className="w-5 h-5" /> {t('tab_notebook')}</button>
                )}
                <button onClick={() => { setView('DASHBOARD'); setDashboardTab('EXTRAS'); onClose(); }} className="flex items-center gap-3 text-gray-700 dark:text-gray-200 text-lg hover:text-green-600 dark:hover:text-green-400 transition-colors"><Icons.LayoutGrid className="w-5 h-5" /> {t('tab_extras')}</button>

                <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>

                <button onClick={() => { setView('PRICING'); onClose(); }} className="flex items-center gap-3 text-gray-700 dark:text-gray-200 text-lg hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors"><Icons.Star className="w-5 h-5" /> {t('pricing_title')}</button>
                
                
                <button onClick={() => { setView('SETTINGS'); onClose(); }} className="flex items-center gap-3 text-gray-700 dark:text-gray-200 text-lg hover:text-green-600 dark:hover:text-green-400 transition-colors"><Icons.Settings className="w-5 h-5" /> {t('settings_title')}</button>

                <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>

                <div className="flex-1"></div>
                
                <button onClick={() => { onSignOut(); onClose(); }} className="flex items-center gap-3 text-red-600 dark:text-red-400 text-lg hover:bg-red-50 dark:hover:bg-red-900/20 p-2 -ml-2 rounded-lg transition-colors">
                    <Icons.LogOut className="w-5 h-5" /> {t('sign_out')}
                </button>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 mt-2">{t('close')}</button>
            </div>
            <div className="flex-1 bg-black/50 backdrop-blur-md" onClick={onClose}></div>
        </div>
    );
};
