
import React, { useState, useRef, useEffect } from 'react';
import { Icons } from '../Icons';

interface AISparkProps {
    content: string;
    isMultiline?: boolean;
    onAskFlora: (text: string) => void;
    t: (key: string) => string;
    limitAI?: boolean;
}

export const AISpark: React.FC<AISparkProps> = ({ content, isMultiline, onAskFlora, t, limitAI }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [alignRight, setAlignRight] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (limitAI) return null;

    const handleAction = (option: 'tell_more' | 'explain' | 'ask') => {
        setIsOpen(false);
        
        let contentToUse = content;
        // Special logic for Multiline "Ask Flora" - truncate to summary length
        if (isMultiline && option === 'ask' && content.length > 80) {
             contentToUse = content.substring(0, 77).trim() + "...";
        }

        let textToSend = "";
        if (option === 'tell_more') {
            textToSend = `${t('spark_tell_more')}: ${contentToUse}`;
        } else if (option === 'explain') {
            textToSend = `${t('spark_explain')}: ${contentToUse}`;
        } else if (option === 'ask') {
            textToSend = contentToUse;
        }
        onAskFlora(textToSend);
    };

    return (
        <div className="relative inline-block ml-2 align-middle" ref={wrapperRef}>
            <button 
                onClick={() => {
                    const rect = wrapperRef.current?.getBoundingClientRect();
                    const menuWidth = 192; // w-48
                    const viewportWidth = window.innerWidth;
                    setAlignRight(Boolean(rect && rect.right + menuWidth > viewportWidth));
                    setIsOpen(!isOpen);
                }} 
                className="text-indigo-500 hover:text-indigo-600 transition-colors p-1 rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
            >
                <Icons.Sparkles className="w-4 h-4" />
            </button>

            {isOpen && (
                <div className={`absolute top-full ${alignRight ? 'right-0' : 'left-0'} mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden animate-in zoom-in-95 duration-200`}>
                    <button 
                        onClick={() => handleAction('tell_more')}
                        className="w-full text-left px-4 py-3 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                    >
                        <Icons.Book className="w-3 h-3 text-indigo-500" /> {t('spark_tell_more')}
                    </button>
                    <button 
                        onClick={() => handleAction('explain')}
                        className="w-full text-left px-4 py-3 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                    >
                        <Icons.Info className="w-3 h-3 text-blue-500" /> {t('spark_explain')}
                    </button>
                    <button 
                        onClick={() => handleAction('ask')}
                        className="w-full text-left px-4 py-3 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                    >
                        <Icons.MessageCircle className="w-3 h-3 text-green-500" /> {t('spark_ask')}
                    </button>
                </div>
            )}
        </div>
    );
};
