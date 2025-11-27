
import React, { useState, useEffect } from 'react';

interface CookieConsentProps {
    lang: 'en' | 'nl';
    t: (key: string) => string;
}

export const CookieConsent: React.FC<CookieConsentProps> = ({ lang, t }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('flowerix_cookie_consent');
        if (!consent) {
            // Small delay for smoother entrance
            setTimeout(() => setIsVisible(true), 1000);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('flowerix_cookie_consent', 'true');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 inset-x-0 z-[100] p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom-full duration-500 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-600 dark:text-gray-300 text-center sm:text-left">
                {t('cookie_message')}
            </p>
            <button 
                onClick={handleAccept}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-full transition-colors shadow-sm text-sm whitespace-nowrap"
            >
                {t('cookie_accept')}
            </button>
        </div>
    );
};
