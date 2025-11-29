


import React from 'react';
import { Icons } from '../Icons';

// --- App Report Modal (Generic Info Modal) ---
interface AppReportModalProps {
    isOpen: boolean;
    type: 'ABOUT' | 'DISCLAIMER' | 'COOKIE' | 'TEAM' | 'TERMS';
    onClose: () => void;
    t: (key: string) => string;
    appVersion?: string;
}

export const AppReportModal: React.FC<AppReportModalProps> = ({ isOpen, type, onClose, t, appVersion }) => {
    if (!isOpen) return null;

    let title = t('about_app');
    let content = null;

    if (type === 'ABOUT') {
        title = t('about_app');
        content = (
            <>
                <section>
                    <h1 className="text-2xl font-bold text-green-800 dark:text-green-400 mb-2">{t('report_title')}</h1>
                    <p className="leading-relaxed">{t('report_intro')}</p>
                </section>
                <section>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t('target_audience_title')}</h2>
                    <p className="leading-relaxed">{t('target_audience_desc')}</p>
                </section>
                <section>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('features_title')}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[1, 2, 3, 4, 5, 6, 7].map(num => (
                            <div key={num} className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                                <h4 className="font-bold text-green-700 dark:text-green-400 text-sm mb-1">
                                    {t(`feature_${num}_title` as any)}
                                </h4>
                                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                                    {t(`feature_${num}_desc` as any)}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>
                {appVersion && (
                    <div className="text-center text-xs text-gray-400 mt-6">
                        Version: {appVersion}
                    </div>
                )}
            </>
        );
    } else if (type === 'DISCLAIMER') {
        title = "Disclaimer";
        content = (
            <section className="space-y-4">
                <p className="leading-relaxed">The information provided by Flowerix is for general informational purposes only. All information on the Site is provided in good faith, however we make no representation or warranty of any kind, express or implied, regarding the accuracy, adequacy, validity, reliability, availability, or completeness of any information on the Site.</p>
                <p>Under no circumstance shall we have any liability to you for any loss or damage of any kind incurred as a result of the use of the site or reliance on any information provided on the site. Your use of the site and your reliance on any information on the site is solely at your own risk.</p>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-2">Weather Data Attribution</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        Weather data is provided by <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Open-Meteo.com</a> under the Creative Commons Attribution 4.0 International (CC BY 4.0) license.
                    </p>
                </div>
            </section>
        );
    } else if (type === 'COOKIE') {
        title = "Cookie Policy";
        content = (
            <section className="space-y-4">
                <p>Flowerix uses local storage on your device to save your garden data, settings, and preferences. We do not use third-party tracking cookies.</p>
                <p>By using this application, you consent to the storage of this data on your local device to enable the application's core functionality.</p>
            </section>
        );
    } else if (type === 'TEAM') {
        title = "Our Team";
        content = (
            <section className="space-y-4 text-center">
                <h2 className="text-xl font-bold text-green-700 dark:text-green-400">The Flowerix Team</h2>
                <p>We are a passionate group of developers and gardening enthusiasts dedicated to making plant care accessible and fun for everyone.</p>
                <div className="grid grid-cols-1 gap-4 mt-6">
                     <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                        <Icons.User className="w-8 h-8 mx-auto mb-2 text-gray-400"/>
                        <p className="font-bold">Development Team</p>
                     </div>
                     <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                        <Icons.Flower className="w-8 h-8 mx-auto mb-2 text-green-500"/>
                        <p className="font-bold">Botany Experts</p>
                     </div>
                </div>
            </section>
        );
    } else if (type === 'TERMS') {
        title = t('terms_title');
        content = (
            <section className="space-y-6">
                <p className="text-sm italic">{t('terms_intro')}</p>
                
                {[1, 2, 3, 4, 5, 6].map(num => (
                    <div key={num} className="border-l-4 border-green-500 pl-4">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">{t(`terms_sec_${num}_title` as any)}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line leading-relaxed">{t(`terms_sec_${num}_text` as any)}</p>
                    </div>
                ))}
            </section>
        );
    }

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full h-[80vh] flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800 sticky top-0">
                    <div className="flex items-center gap-2">
                        <Icons.Info className="text-green-600 dark:text-green-400" />
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
                    </div>
                    <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"><Icons.X /></button>
                </div>
                <div className="p-6 overflow-y-auto text-gray-700 dark:text-gray-300 space-y-6">
                    {content}
                </div>
            </div>
        </div>
    );
};

// --- Summary Modal ---
interface SummaryModalProps {
    isOpen: boolean;
    content: string;
    onClose: () => void;
    onCopy: () => void;
    onDownloadPdf?: () => void;
    t: (key: string) => string;
}

export const SummaryModal: React.FC<SummaryModalProps> = ({ isOpen, content, onClose, onCopy, onDownloadPdf, t }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full flex flex-col overflow-hidden max-h-[85vh]">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">{t('summary_title')}</h3>
                    <button onClick={onClose}><Icons.X className="text-gray-500" /></button>
                </div>
                <div className="p-4 overflow-y-auto flex-1">
                    <textarea readOnly className="w-full h-[50vh] p-3 rounded-lg bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 text-sm resize-none outline-none border border-gray-200 dark:border-gray-700" value={content} />
                </div>
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-3 gap-3">
                    <button onClick={onCopy} className="bg-green-600 text-white py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-green-700 transition-colors">
                        <Icons.Copy className="w-4 h-4" /> {t('copy_clipboard')}
                    </button>
                    <button onClick={onDownloadPdf} className="bg-blue-600 text-white py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors">
                        <Icons.Download className="w-4 h-4" /> PDF
                    </button>
                    <button onClick={onClose} className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                        <Icons.X className="w-4 h-4" /> {t('close')}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Web Images Modal ---
interface WebImagesModalProps {
    isOpen: boolean;
    loading: boolean;
    images: string[];
    onClose: () => void;
    t: (key: string) => string;
}

export const WebImagesModal: React.FC<WebImagesModalProps> = ({ isOpen, loading, images, onClose, t }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full h-[80vh] flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('web_photos')}</h3>
                    <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"><Icons.X className="w-6 h-6" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 bg-gray-100 dark:bg-gray-900">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 gap-3">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                            <span>{t('loading_images')}</span>
                        </div>
                    ) : images.length > 0 ? (
                        <div className="space-y-4">
                            {images.map((url, idx) => (
                                <div key={idx} className="bg-white dark:bg-gray-800 p-2 rounded-xl shadow-sm">
                                    <img src={url} alt={`Web result ${idx}`} className="w-full h-auto rounded-lg object-cover" loading="lazy" />
                                </div>
                            ))}
                            <p className="text-center text-xs text-gray-400 mt-4">{t('web_images_source')}</p>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                            <Icons.Image className="w-12 h-12 mb-2 opacity-50" />
                            <span>{t('no_web_images')}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Search Results Modal (New) ---
interface SearchResultsModalProps {
    isOpen: boolean;
    onClose: () => void;
    results: { summary: string, sources: { title: string, url: string }[] } | null;
    loading: boolean;
    t: (key: string) => string;
}

export const SearchResultsModal: React.FC<SearchResultsModalProps> = ({ isOpen, onClose, results, loading, t }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full h-[80vh] flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Icons.Search className="w-5 h-5" /> {t('search_results_title')}
                    </h3>
                    <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"><Icons.X className="w-6 h-6" /></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 gap-4">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
                            <span>{t('searching')}</span>
                        </div>
                    ) : results ? (
                        <div className="space-y-6">
                            {/* Summary */}
                            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                                <h4 className="font-bold text-green-800 dark:text-green-400 mb-2 flex items-center gap-2">
                                    <Icons.Sparkles className="w-4 h-4" /> Flowerix Summary
                                </h4>
                                <div className="prose dark:prose-invert text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                                    {results.summary}
                                </div>
                            </div>

                            {/* Links */}
                            <div>
                                <h4 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-3 tracking-wider">{t('source')}s</h4>
                                {results.sources.length > 0 ? (
                                    <div className="grid gap-3">
                                        {results.sources.map((source, idx) => (
                                            <a 
                                                key={idx} 
                                                href={source.url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="block bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-green-500 hover:shadow-md transition-all group"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium text-green-700 dark:text-green-400 text-sm line-clamp-1 group-hover:underline">{source.title}</span>
                                                    <Icons.ArrowUpNarrowWide className="w-4 h-4 text-gray-400 rotate-45" />
                                                </div>
                                                <span className="text-xs text-gray-400 truncate block mt-1">{source.url}</span>
                                            </a>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500 italic">No direct links found.</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-gray-500 py-10">No results.</div>
                    )}
                </div>
            </div>
        </div>
    );
};
