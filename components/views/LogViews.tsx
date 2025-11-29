
import React from 'react';
import { Icons } from '../Icons';
import { GardenLogItem, HomeLocation, LogItem, TempUnit, LengthUnit, WeatherData } from '../../types';
import { WeatherWidget } from '../ui/WeatherWidget';
import { DatePicker } from '../ui/DatePicker';

// --- Garden Log Grid (Used in Dashboard) ---
interface GardenLogGridViewProps {
    logs: GardenLogItem[];
    weather: WeatherData | null;
    homeLocation: HomeLocation | null;
    onSelectLog: (log: GardenLogItem) => void;
    onAddLog: () => void;
    onOpenCollage: () => void;
    useWeather: boolean;
    tempUnit: TempUnit;
    lengthUnit: LengthUnit;
    lang: 'en' | 'nl';
    t: (key: string) => string;
}

export const GardenLogGridView: React.FC<GardenLogGridViewProps> = ({
    logs, weather, homeLocation, onSelectLog, onAddLog, onOpenCollage, useWeather, tempUnit, lengthUnit, lang, t
}) => {
    const [sortOrder, setSortOrder] = React.useState<'desc' | 'asc'>('desc');
    const [visibleCount, setVisibleCount] = React.useState(5);

    const sortedLogs = [...logs].sort((a, b) => {
        const timeA = new Date(a.date).getTime();
        const timeB = new Date(b.date).getTime();
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    const visibleLogs = sortedLogs.slice(0, visibleCount);

    const getWeatherIcon = (code: number) => {
        if (code === 0) return <Icons.Sun className="w-full h-full text-yellow-500" />;
        // Simplified check
        if ([1,2,3].includes(code)) return <Icons.Cloud className="w-full h-full text-gray-400" />;
        if (code > 50) return <Icons.CloudRain className="w-full h-full text-blue-400" />;
        return <Icons.Sun className="w-full h-full text-yellow-500" />;
    };

    const formatTemp = (t: number) => tempUnit === 'F' ? Math.round(t * 9/5 + 32) : Math.round(t);

    return (
        <div className="pb-20">
            <div className="px-4 py-2">
                <div className="flex items-center justify-between mb-4 mt-2">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">{t('garden_logbook_title')}</h3>
                    <div className="flex gap-2">
                        <button onClick={onOpenCollage} className="bg-pink-500 text-white p-2 rounded-full shadow hover:bg-pink-600" title={t('photo_collage')}>
                            <Icons.Image className="w-5 h-5" />
                        </button>
                        <button onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')} className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 p-2 rounded-full shadow hover:bg-gray-200 dark:hover:bg-gray-600">
                            {sortOrder === 'desc' ? <Icons.ArrowDownWideNarrow className="w-5 h-5" /> : <Icons.ArrowUpNarrowWide className="w-5 h-5" />}
                        </button>
                        <button onClick={onAddLog} className="bg-green-600 text-white p-2 rounded-full shadow hover:bg-green-700">
                            <Icons.Plus className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                {logs.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 dark:text-gray-500 flex flex-col items-center p-4">
                        <div className="bg-gray-100 dark:bg-gray-800 rounded-full p-6 mb-4">
                            <Icons.Book className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">{t('no_garden_logs_title')}</h3>
                        <p className="mb-6 text-sm max-w-md mx-auto leading-relaxed whitespace-pre-line">{t('no_garden_logs_desc')}</p>
                         <button onClick={onAddLog} className="bg-green-600 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-green-700 transition-transform active:scale-95 flex items-center gap-2">
                             <Icons.Plus className="w-5 h-5" /> {t('new_entry')}
                         </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {visibleLogs.map(log => (
                            <div key={log.id} onClick={() => onSelectLog(log)} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden cursor-pointer hover:shadow-md relative">
                                <div className="aspect-video relative bg-gray-200 dark:bg-gray-700">
                                    {log.imageUrl ? (
                                        <img src={log.imageUrl} className="w-full h-full object-cover" alt={log.title} />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Icons.FileText className="w-10 h-10 text-gray-400" />
                                        </div>
                                    )}
                                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8">
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <h4 className="text-white font-bold text-lg">{log.title}</h4>
                                                <span className="text-gray-300 text-xs">{new Date(log.date).toLocaleDateString(lang === 'nl' ? 'nl-NL' : 'en-US')}</span>
                                            </div>
                                            {log.weather && (
                                                <div className="flex items-center gap-1 text-white text-xs bg-white/20 px-2 py-1 rounded-full backdrop-blur-sm">
                                                    <span className="w-3 h-3">{getWeatherIcon(log.weather.weatherCode)}</span>
                                                    <span>{formatTemp(log.weather.temperature)}°{tempUnit}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {visibleCount < sortedLogs.length && (
                    <button onClick={() => setVisibleCount(prev => prev + 5)} className="w-full mt-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                        {t('load_more')}
                    </button>
                )}
            </div>
        </div>
    );
};

// --- Add/Edit Log Form ---
interface LogFormViewProps {
    isGardenLog?: boolean;
    logTitle: string;
    setLogTitle: (v: string) => void;
    logDesc: string;
    setLogDesc: (v: string) => void;
    logDate: string;
    setLogDate: (v: string) => void;
    logImg?: string;
    setLogImg: (v: string | undefined) => void;
    includeWeather: boolean;
    setIncludeWeather: (v: boolean) => void;
    isMainPhoto?: boolean;
    setIsMainPhoto?: (v: boolean) => void;
    shareToSocial?: boolean;
    setShareToSocial?: (v: boolean) => void;
    addToNotebook?: boolean;
    setAddToNotebook?: (v: boolean) => void;
    
    onSave: () => void;
    onBack: () => void;
    handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>, cb: (v: string) => void, mode?: 'standard' | 'high') => void;
    homeLocation: HomeLocation | null;
    allowWeather: boolean;
    t: (key: string) => string;
    
    // Flags for module availability
    allowSocial?: boolean;
    allowNotebook?: boolean;
}

export const LogFormView: React.FC<LogFormViewProps> = ({
    isGardenLog, logTitle, setLogTitle, logDesc, setLogDesc, logDate, setLogDate,
    logImg, setLogImg, includeWeather, setIncludeWeather,
    isMainPhoto, setIsMainPhoto, shareToSocial, setShareToSocial, addToNotebook, setAddToNotebook,
    onSave, onBack, handleImageUpload, homeLocation, allowWeather, t,
    allowSocial = true, allowNotebook = true
}) => {
    return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors">
        <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center border-b border-gray-200 dark:border-gray-700">
            <button onClick={onBack} className="text-gray-600 dark:text-gray-300"><Icons.ArrowLeft /></button>
            <h2 className="ml-4 font-semibold text-lg text-gray-900 dark:text-white">{t('new_log_title')} {isGardenLog && '(Garden)'}</h2>
        </div>
        <div className="p-4 space-y-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm space-y-4 transition-colors">
                <DatePicker 
                    label={t('log_date_label')}
                    value={logDate}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={setLogDate}
                />

                {allowWeather && (homeLocation ? (
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer bg-blue-50 dark:bg-gray-700 p-3 rounded-lg border border-blue-100 dark:border-gray-600">
                        <input type="checkbox" checked={includeWeather} onChange={(e) => setIncludeWeather(e.target.checked)} className="rounded border-gray-300 text-green-600 focus:ring-green-500" />
                        <div className="flex items-center gap-2"><Icons.Thermometer className="w-4 h-4 text-blue-500" /><span>{t('include_weather')}</span></div>
                    </label>
                ) : (
                    <div className="text-sm text-gray-500 italic p-2 border border-dashed border-gray-300 rounded-lg text-center">Set a home location to enable weather features.</div>
                ))}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('add_photo_opt')}</label>
                    {logImg ? (
                        <div className="mb-2">
                            <div className={`relative w-full rounded-lg overflow-hidden mb-2 bg-gray-100 dark:bg-gray-700 min-h-[220px]`}>
                                <img src={logImg} className={`w-full h-auto object-contain max-h-[60vh]`} alt="Log" />
                                <button onClick={() => { setLogImg(undefined); if (setIsMainPhoto) setIsMainPhoto(false); }} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"><Icons.Trash2 className="w-4 h-4" /></button>
                            </div>
                            {/* Conditional Options for Plant Logs */}
                            {!isGardenLog && setIsMainPhoto && setShareToSocial && setAddToNotebook && (
                                <div className="grid grid-cols-1 gap-2">
                                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer bg-green-50 dark:bg-green-900/30 p-3 rounded-lg border border-green-100 dark:border-green-800">
                                        <input type="checkbox" checked={isMainPhoto} onChange={(e) => setIsMainPhoto(e.target.checked)} className="rounded border-gray-300 text-green-600 focus:ring-green-500" />
                                        <div className="flex items-center gap-2"><Icons.Image className="w-4 h-4 text-green-600" /><span>{t('set_as_main_photo')}</span></div>
                                    </label>
                                    {allowSocial && (
                                        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800">
                                            <input type="checkbox" checked={shareToSocial} onChange={(e) => setShareToSocial(e.target.checked)} className="rounded border-gray-300 text-green-600 focus:ring-green-500" />
                                            <div className="flex items-center gap-2"><Icons.Globe className="w-4 h-4 text-indigo-500" /><span>{t('share_to_timeline')}</span></div>
                                        </label>
                                    )}
                                    {allowNotebook && (
                                        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer bg-yellow-50 dark:bg-yellow-900/30 p-3 rounded-lg border border-yellow-100 dark:border-yellow-800">
                                            <input type="checkbox" checked={addToNotebook} onChange={(e) => setAddToNotebook(e.target.checked)} className="rounded border-gray-300 text-green-600 focus:ring-green-500" />
                                            <div className="flex items-center gap-2"><Icons.Notebook className="w-4 h-4 text-yellow-600" /><span>{t('add_to_notebook')}</span></div>
                                        </label>
                                    )}
                                    {allowWeather && (homeLocation ? (
                                        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer bg-blue-50 dark:bg-gray-700 p-3 rounded-lg border border-blue-100 dark:border-gray-600">
                                            <input type="checkbox" checked={includeWeather} onChange={(e) => setIncludeWeather(e.target.checked)} className="rounded border-gray-300 text-green-600 focus:ring-green-500" />
                                            <div className="flex items-center gap-2"><Icons.Thermometer className="w-4 h-4 text-blue-500" /><span>{t('include_weather')}</span></div>
                                        </label>
                                    ) : (
                                        <div className="text-sm text-gray-500 italic p-2 border border-dashed border-gray-300 rounded-lg text-center">Set a home location to enable weather features.</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-400 transition-colors">
                            <div className="flex flex-col items-center"><Icons.Camera className="w-8 h-8 mb-1" /><span>{t('take_photo')}</span></div>
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setLogImg, isGardenLog ? 'high' : 'standard')} />
                        </label>
                    )}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('title_label')} *</label>
                    <input type="text" value={logTitle} onChange={(e) => setLogTitle(e.target.value)} className={`w-full p-3 rounded-lg bg-gray-50 dark:bg-gray-700 border ${!logTitle.trim() ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-600'} text-gray-900 dark:text-white outline-none`} placeholder={t('log_title_placeholder')} />
                    {!logTitle.trim() && (<div className="text-red-600 text-xs mt-1">Titel is verplicht</div>)}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('notes_label')}</label>
                    <textarea rows={3} value={logDesc} onChange={(e) => setLogDesc(e.target.value)} className="w-full p-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white outline-none" placeholder={t('log_notes_placeholder')} />
                </div>
                <button onClick={onSave} disabled={!logTitle.trim()} className="w-full bg-green-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl hover:bg-green-700 transition-colors">{t('save_entry')}</button>
            </div>
        </div>
    </div>
    );
}

// --- Log Detail View (Generic for Plant and Garden Logs) ---
interface LogDetailsViewProps {
    isGardenLog?: boolean;
    onBack: () => void;
    onDelete: () => void;
    onSave: () => void;
    
    logTitle: string;
    setLogTitle: (v: string) => void;
    logDesc: string;
    setLogDesc: (v: string) => void;
    logDate: string;
    setLogDate: (v: string) => void;
    logImg?: string;
    setLogImg: (v: string | undefined) => void;
    includeWeather: boolean;
    setIncludeWeather: (v: boolean) => void;
    logWeather: any; 
    logWeatherTemp: number | null;
    setLogWeatherTemp: (v: number | null) => void;
    isMainPhoto?: boolean;
    setIsMainPhoto?: (v: boolean) => void;
    
    handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>, cb: (v: string) => void, mode?: 'standard' | 'high') => void;
    homeLocation: HomeLocation | null;
    allowWeather: boolean;
    getWeatherIcon: (code: number) => React.ReactNode;
    getWeatherDesc: (code: number) => string;
    tempUnit: TempUnit;
    t: (key: string) => string;
}

export const LogDetailsView: React.FC<LogDetailsViewProps> = ({
    isGardenLog, onBack, onDelete, onSave,
    logTitle, setLogTitle, logDesc, setLogDesc, logDate, setLogDate,
    logImg, setLogImg, includeWeather, setIncludeWeather,
    logWeather, logWeatherTemp, setLogWeatherTemp,
    isMainPhoto, setIsMainPhoto,
    handleImageUpload, homeLocation, allowWeather, getWeatherIcon, getWeatherDesc, tempUnit, t
}) => {
    
    const displayTemp = logWeatherTemp !== null ? (tempUnit === 'F' ? Math.round(logWeatherTemp * 9/5 + 32) : logWeatherTemp) : '';

    const handleTempChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        if (isNaN(val)) {
            setLogWeatherTemp(null);
            return;
        }
        // Convert back to C for storage if F
        const storeVal = tempUnit === 'F' ? (val - 32) * 5/9 : val;
        setLogWeatherTemp(storeVal);
    };

    return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors">
        <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
                <button onClick={onBack} className="text-gray-600 dark:text-gray-300"><Icons.ArrowLeft /></button>
                <h2 className="ml-4 font-semibold text-lg text-gray-900 dark:text-white">{t('edit_log_title')}</h2>
            </div>
            <button onClick={onDelete} className="text-red-500"><Icons.Trash2 className="w-5 h-5" /></button>
        </div>
        <div className="p-4 flex-1 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm space-y-4 transition-colors">
                <div className="mb-4">
                    <div className="relative w-full rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 min-h-[200px]">
                        {logImg ? (
                            <img src={logImg} className="w-full h-auto object-contain max-h-[500px]" alt="Log Detail" />
                        ) : (
                            <div className="flex items-center justify-center h-48 text-gray-400">
                                <Icons.Camera className="w-12 h-12 opacity-50" />
                            </div>
                        )}
                        <label className="absolute bottom-2 right-2 bg-black/50 text-white p-2 rounded-full cursor-pointer hover:bg-black/70 backdrop-blur-sm">
                            <Icons.Edit2 className="w-5 h-5" />
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setLogImg, isGardenLog ? 'high' : 'standard')} />
                        </label>
                    </div>
                    {!isGardenLog && logImg && setIsMainPhoto && (
                        <label className="flex items-center gap-2 mt-3 text-sm text-gray-700 dark:text-gray-300 cursor-pointer bg-green-50 dark:bg-green-900/30 p-3 rounded-lg border border-green-100 dark:border-green-800">
                            <input type="checkbox" checked={isMainPhoto} onChange={(e) => setIsMainPhoto(e.target.checked)} className="rounded border-gray-300 text-green-600 focus:ring-green-500" />
                            <div className="flex items-center gap-2"><Icons.Image className="w-4 h-4 text-green-600" /><span>{t('set_as_main_photo')}</span></div>
                        </label>
                    )}
                </div>
                
                <DatePicker 
                    label={t('log_date_label')}
                    value={logDate}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={setLogDate}
                />

                {logWeather && (
                    <div className="bg-blue-50 dark:bg-gray-700 p-3 rounded-xl flex items-center gap-4">
                        <div className="bg-white/50 dark:bg-gray-600 p-2 rounded-full">
                            <div className="w-8 h-8">{getWeatherIcon(logWeather.weatherCode)}</div>
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <input 
                                    type="number" 
                                    step="1" 
                                    className="text-lg font-bold text-gray-800 dark:text-white bg-transparent border-b border-gray-300 dark:border-gray-500 w-20 focus:outline-none focus:border-blue-500" 
                                    value={displayTemp} 
                                    onChange={handleTempChange} 
                                />
                                <span className="text-lg font-bold text-gray-800 dark:text-white">°{tempUnit}</span>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">{getWeatherDesc(logWeather.weatherCode)}</div>
                        </div>
                    </div>
                )}
                {allowWeather && (homeLocation ? (
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                        <input type="checkbox" checked={includeWeather} onChange={(e) => setIncludeWeather(e.target.checked)} className="rounded border-gray-300 text-green-600 focus:ring-green-500" />
                        <div className="flex items-center gap-2"><Icons.Thermometer className="w-4 h-4 text-blue-500" /><span>{t('include_weather')}</span></div>
                    </label>
                ) : (
                    <div className="text-sm text-gray-500 italic p-2 border border-dashed border-gray-300 rounded-lg text-center">Set location to update weather data</div>
                ))}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('title_label')}</label>
                    <input type="text" value={logTitle} onChange={(e) => setLogTitle(e.target.value)} className="w-full p-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white outline-none font-semibold" placeholder={t('log_title_placeholder')} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('notes_label')}</label>
                    <textarea rows={5} value={logDesc} onChange={(e) => setLogDesc(e.target.value)} className="w-full p-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white outline-none" placeholder={t('log_notes_placeholder')} />
                </div>
                <button onClick={onSave} className="w-full bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition-colors">{t('save_changes')}</button>
            </div>
        </div>
    </div>
    );
};
