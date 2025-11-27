
import React, { useState } from 'react';
import { Icons } from '../Icons';
import { Plant, PlantLocation, LogItem, TimelineItem, ModulesConfig } from '../../types';
import { DatePicker } from '../ui/DatePicker';
import { AISpark } from '../ui/AISpark';

interface PlantDetailsViewProps {
    plant: Plant;
    onBack: () => void;
    onAddPlant: () => void;
    onEdit: () => void;
    onArchive: (id: string) => void;
    onDelete: (id: string) => void;
    onOpenCollage: (type: 'PLANT', id: string) => void;
    onShowWebImages: (name: string, sciName?: string) => void;
    onShowSummary: (plant: Plant) => void;
    onGeneratePdf: (plant: Plant) => void;
    onViewInGarden: (areaId: string) => void;
    onPinLocation: () => void;
    onAddLog: () => void;
    onViewLog: (log: LogItem) => void;
    onAddToNotebook: (item: TimelineItem) => void;
    
    visibleLogsCount: number;
    setVisibleLogsCount: (count: number | ((prev: number) => number)) => void;

    plantUISettings: Record<string, { aboutCollapsed: boolean, careCollapsed: boolean }>;
    togglePlantSection: (plantId: string, section: 'about' | 'care') => void;
    
    formatDate: (date: string) => string;
    getWeatherIcon: (code: number) => React.ReactNode;
    t: (key: string) => string;
    onAskFlora: (text: string) => void;
    limitAI?: boolean;
    modules: ModulesConfig;
    onNextPlant?: () => void;
    onPrevPlant?: () => void;
}

export const PlantDetailsView: React.FC<PlantDetailsViewProps> = ({
    plant, onBack, onAddPlant, onEdit, onArchive, onDelete, 
    onOpenCollage, onShowWebImages, onShowSummary, onGeneratePdf,
    onViewInGarden, onPinLocation, onAddLog, onViewLog, onAddToNotebook,
    visibleLogsCount, setVisibleLogsCount,
    plantUISettings, togglePlantSection,
    formatDate, getWeatherIcon, t, onAskFlora, limitAI, modules,
    onNextPlant, onPrevPlant
}) => {
    const uiState = plantUISettings[plant.id] || { aboutCollapsed: true, careCollapsed: true };
    const visibleLogs = plant.logs.slice(0, visibleLogsCount);
    const [showFullscreen, setShowFullscreen] = useState(false);
    const [portrait, setPortrait] = useState(false);

    // Notebook Modal State
    const [notebookModalOpen, setNotebookModalOpen] = useState(false);
    const [noteData, setNoteData] = useState<{ title: string, desc: string, date: string, imageUrl?: string }>({ title: '', desc: '', date: '', imageUrl: undefined });

    const openNotebookForPlant = () => {
        setNoteData({
            title: plant.name,
            desc: '', // Do not pre-fill description
            date: new Date().toISOString().split('T')[0],
            imageUrl: plant.imageUrl
        });
        setNotebookModalOpen(true);
    };

    const openNotebookForLog = (e: React.MouseEvent, log: LogItem) => {
        e.stopPropagation();
        setNoteData({
            title: log.title,
            desc: log.description || '',
            date: new Date(log.date).toISOString().split('T')[0],
            imageUrl: log.imageUrl
        });
        setNotebookModalOpen(true);
    };

    const saveToNotebook = () => {
        if (!noteData.title) return;
        const newNote: TimelineItem = {
            id: Date.now().toString(),
            type: 'NOTE',
            title: noteData.title,
            description: noteData.desc,
            date: noteData.date,
            imageUrl: noteData.imageUrl
        };
        onAddToNotebook(newNote);
        setNotebookModalOpen(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 transition-colors">
            <div className="fixed top-0 inset-x-0 z-20 flex justify-between items-center p-4 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
                <div className="flex gap-2 pointer-events-auto items-center">
                    <button onClick={onBack} className="flex items-center gap-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur text-green-700 dark:text-green-400 p-2 rounded-full shadow-lg font-bold text-sm">
                        <Icons.ArrowLeft className="w-5 h-5" />
                    </button>
                    
                    <div className="flex bg-white/90 dark:bg-gray-800/90 backdrop-blur rounded-full shadow-lg p-1">
                        {onPrevPlant && (
                            <button onClick={onPrevPlant} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                                <Icons.ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                            </button>
                        )}
                        <button onClick={onAddPlant} className="flex items-center gap-2 px-3 py-1 rounded-full font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-green-700 dark:text-green-400">
                            <Icons.Plus className="w-5 h-5" /><span className="hidden sm:inline">{t('add_plant_title')}</span>
                        </button>
                        {onNextPlant && (
                            <button onClick={onNextPlant} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                                <Icons.ArrowRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                            </button>
                        )}
                    </div>
                </div>
                <div className="flex gap-2 pointer-events-auto">
                    <button onClick={onEdit} className="text-white p-2 rounded-full shadow-lg transition-colors bg-blue-500/80 hover:bg-blue-600 backdrop-blur-md" title="Edit Plant">
                        <Icons.Edit2 className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => onArchive(plant.id)}
                        className={`text-white p-2 rounded-full shadow-lg transition-colors ${plant.isActive ? 'bg-yellow-500/80 hover:bg-yellow-600' : 'bg-gray-500/80 hover:bg-gray-600'} backdrop-blur-md`}
                        title={plant.isActive ? t('archive_plant') : t('unarchive_plant')}
                    >
                        <Icons.Book className="w-5 h-5" />
                    </button>
                    <button onClick={() => onDelete(plant.id)} className="text-white p-2 bg-red-500/80 backdrop-blur-md rounded-full hover:bg-red-600 shadow-lg"><Icons.Trash2 className="w-5 h-5" /></button>
                </div>
            </div>
            <div className={`relative w-full group ${portrait ? 'h-[60vh]' : 'h-80'}`}>
                {plant.imageUrl ? (
                    <>
                        <img src={plant.imageUrl} className={`w-full h-full ${portrait ? 'object-contain' : 'object-cover'}`} alt={plant.name} onLoad={(e) => { const i = e.currentTarget; setPortrait(i.naturalHeight > i.naturalWidth); }} />
                        <button 
                            onClick={() => setShowFullscreen(true)}
                            className="absolute top-20 right-4 p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md text-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            title="Fullscreen"
                        >
                            <Icons.Maximize className="w-5 h-5" />
                        </button>
                    </>
                ) : (
                    <div className="w-full h-full bg-green-200 dark:bg-green-800 flex items-center justify-center"><Icons.Sprout className="w-20 h-20 text-green-400 dark:text-green-600" /></div>
                )}
                <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent pt-12">
                    <div className="flex items-end gap-2 flex-wrap">
                        <div className="flex items-center">
                            <h1 className="text-3xl font-bold text-white drop-shadow-md">{plant.name}</h1>
                            <AISpark content={plant.name} onAskFlora={onAskFlora} t={t} limitAI={limitAI} />
                        </div>
                        {plant.sequenceNumber > 1 && <span className="text-green-300 text-xl drop-shadow-md">#{plant.sequenceNumber}</span>}
                        
                        {!plant.isActive && <span className="bg-yellow-500/80 text-white text-xs px-2 py-1 rounded mb-1">{t('filter_archived')}</span>}
                        {plant.isIndoor !== undefined && (
                            <span className={`text-xs px-2 py-1 rounded mb-1 font-medium ${plant.isIndoor ? 'bg-purple-500/80 text-white' : 'bg-green-500/80 text-white'}`}>
                                {plant.isIndoor ? t('plant_type_indoor') : t('plant_type_outdoor')}
                            </span>
                        )}
                    </div>
                    {plant.scientificName && (
                        <div className="flex items-center">
                            <p className="text-gray-300 italic drop-shadow-md">{plant.scientificName}</p>
                            <AISpark content={plant.scientificName} onAskFlora={onAskFlora} t={t} limitAI={limitAI} />
                        </div>
                    )}
                </div>
            </div>
            <div className="px-4 py-6 space-y-4">
                {plant.datePlanted && (
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400"><Icons.Calendar className="w-4 h-4 mr-2" />{t('date_planted_label')}: {formatDate(plant.datePlanted)}</div>
                )}
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                    {modules.notebook && (
                        <button onClick={openNotebookForPlant} className="min-w-[70px] flex-1 bg-yellow-500 text-white py-3 rounded-xl shadow-sm flex flex-col items-center justify-center gap-1 hover:bg-yellow-600 transition-colors">
                            <Icons.Book className="w-5 h-5" />
                            <span className="text-xs font-medium">{t('tab_notebook')}</span>
                        </button>
                    )}
                    <button onClick={() => onOpenCollage('PLANT', plant.id)} className="min-w-[70px] flex-1 bg-pink-500 text-white py-3 rounded-xl shadow-sm flex flex-col items-center justify-center gap-1 hover:bg-pink-600 transition-colors">
                        <Icons.Image className="w-5 h-5" />
                        <span className="text-xs font-medium">{t('photo_collage')}</span>
                    </button>
                    <button onClick={() => onShowWebImages(plant.name, plant.scientificName)} className="min-w-[70px] flex-1 bg-blue-600 text-white py-3 rounded-xl shadow-sm flex flex-col items-center justify-center gap-1 hover:bg-blue-700 transition-colors"><Icons.Image className="w-5 h-5" /><span className="text-xs font-medium">{t('web_photos')}</span></button>
                    <button onClick={() => onShowSummary(plant)} className="min-w-[70px] flex-1 bg-purple-600 text-white py-3 rounded-xl shadow-sm flex flex-col items-center justify-center gap-1 hover:bg-purple-700 transition-colors"><Icons.FileText className="w-5 h-5" /><span className="text-xs font-medium">Summary</span></button>
                    <button onClick={() => onGeneratePdf(plant)} className="min-w-[70px] flex-1 bg-orange-500 text-white py-3 rounded-xl shadow-sm flex flex-col items-center justify-center gap-1 hover:bg-orange-600 transition-colors"><Icons.FileText className="w-5 h-5" /><span className="text-xs font-medium">PDF</span></button>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border-l-4 border-green-400 dark:border-green-500 transition-colors">
                    <div className="p-4 flex justify-between items-center cursor-pointer" onClick={() => togglePlantSection(plant.id, 'about')}>
                        <h3 className="font-bold text-green-800 dark:text-green-400 flex items-center gap-2">
                            <Icons.Leaf className="w-4 h-4" /> {t('about')}
                            <div onClick={(e) => e.stopPropagation()}>
                                <AISpark content={plant.description || ''} isMultiline onAskFlora={onAskFlora} t={t} limitAI={limitAI} />
                            </div>
                        </h3>
                        {uiState.aboutCollapsed ? <Icons.ChevronDown className="w-4 h-4 text-gray-400" /> : <Icons.ChevronUp className="w-4 h-4 text-gray-400" />}
                    </div>
                    {!uiState.aboutCollapsed && (
                        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 pt-2">
                            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{plant.description || t('no_desc')}</p>
                        </div>
                    )}
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border-l-4 border-blue-400 dark:border-blue-500 transition-colors">
                    <div className="p-4 flex justify-between items-center cursor-pointer" onClick={() => togglePlantSection(plant.id, 'care')}>
                        <h3 className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2">
                            <Icons.Flower className="w-4 h-4" /> {t('care_label')}
                            <div onClick={(e) => e.stopPropagation()}>
                                <AISpark content={plant.careInstructions || ''} isMultiline onAskFlora={onAskFlora} t={t} limitAI={limitAI} />
                            </div>
                        </h3>
                        {uiState.careCollapsed ? <Icons.ChevronDown className="w-4 h-4 text-gray-400" /> : <Icons.ChevronUp className="w-4 h-4 text-gray-400" />}
                    </div>
                    {!uiState.careCollapsed && (
                        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 pt-2">
                            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-line">{plant.careInstructions || t('no_instr')}</p>
                        </div>
                    )}
                </div>
                
                {modules.gardenView && (
                    plant.location && plant.location.length > 0 ? (
                        <button onClick={() => onViewInGarden(plant.location![0].gardenAreaId)} className="w-full bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm flex items-center justify-between text-green-700 dark:text-green-400 transition-colors"><span className="flex items-center gap-2"><Icons.MapPin className="w-5 h-5" /> {t('view_in_garden')}</span><Icons.ArrowLeft className="rotate-180 w-4 h-4" /></button>
                    ) : (
                        <button onClick={onPinLocation} className="w-full border border-dashed border-green-300 dark:border-green-700 p-3 rounded-xl text-green-600 dark:text-green-400 text-sm flex items-center justify-center gap-2 hover:bg-green-50 dark:hover:bg-gray-800 transition-colors"><Icons.MapPin className="w-4 h-4" /> {t('pin_location')}</button>
                    )
                )}

                <div>
                    <div className="flex items-center justify-between mb-3 mt-6">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">{t('logbook')}</h2>
                        <button onClick={onAddLog} className="text-green-600 dark:text-green-400 font-medium text-sm bg-green-100 dark:bg-green-900/50 px-3 py-1 rounded-full hover:bg-green-200 dark:hover:bg-green-900 transition-colors">{t('new_entry')}</button>
                    </div>
                    <div className="space-y-4">
                        {plant.logs.length === 0 && (<p className="text-gray-400 text-center py-4 text-sm">{t('no_logs')}</p>)}
                        {visibleLogs.map(log => (
                            <div key={log.id} onClick={() => onViewLog(log)} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm flex gap-4 cursor-pointer transition-colors hover:shadow-md group relative">
                                {log.imageUrl && (
                                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
                                        <img src={log.imageUrl} className="w-full h-full object-cover" alt="" />
                                    </div>
                                )}
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <div className="text-xs text-gray-400 font-medium uppercase">{formatDate(log.date)}</div>
                                        {log.weather && (
                                            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                                                <div className="w-3 h-3">{getWeatherIcon(log.weather.weatherCode)}</div>
                                                <span>{Math.round(log.weather.temperature)}°</span>
                                            </div>
                                        )}
                                    </div>
                                    <h4 className="font-bold text-gray-800 dark:text-gray-200 mt-1 flex items-center gap-2">
                                        {log.title}
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <AISpark content={log.title} onAskFlora={onAskFlora} t={t} limitAI={limitAI} />
                                        </div>
                                    </h4>
                                    <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 relative">
                                        {log.description}
                                        {log.description && (
                                            <div onClick={(e) => e.stopPropagation()} className="inline-block">
                                                <AISpark content={log.description} isMultiline onAskFlora={onAskFlora} t={t} limitAI={limitAI} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {modules.notebook && (
                                    <button onClick={(e) => openNotebookForLog(e, log)} className="absolute top-2 right-2 p-1.5 text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-full transition-colors" title={t('add_to_notebook')}>
                                        <Icons.Book className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                        {visibleLogsCount < plant.logs.length && (
                            <button onClick={() => setVisibleLogsCount(prev => Number(prev) + 5)} className="w-full py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                                {t('load_more')}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Fullscreen Image Overlay */}
            {showFullscreen && plant.imageUrl && (
                <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center animate-in fade-in duration-200" onClick={() => setShowFullscreen(false)}>
                    <button 
                        onClick={(e) => { e.stopPropagation(); setShowFullscreen(false); }}
                        className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-full z-50"
                    >
                        <Icons.X className="w-6 h-6" />
                    </button>
                    <div className="w-full h-full p-4 flex items-center justify-center">
                        <img 
                            src={plant.imageUrl} 
                            alt={plant.name} 
                            className="max-w-full max-h-full object-contain shadow-2xl"
                            onClick={(e) => e.stopPropagation()} 
                        />
                    </div>
                </div>
            )}

            {/* Add to Notebook Modal */}
            {notebookModalOpen && modules.notebook && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                        <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2"><Icons.Notebook className="w-5 h-5 text-yellow-500"/> {t('add_note')}</h3>
                        <div className="space-y-4 overflow-y-auto">
                            {noteData.imageUrl && (
                                <div className="w-full h-32 rounded-xl overflow-hidden relative">
                                    <img src={noteData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                </div>
                            )}
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">{t('note_title_label')} *</label>
                                <input type="text" value={noteData.title} onChange={e => setNoteData({...noteData, title: e.target.value})} className="w-full p-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 rounded-xl border border-gray-200 dark:border-gray-600 outline-none focus:ring-2 focus:ring-green-500" />
                            </div>
                            <DatePicker 
                                label={`${t('log_date_label')} *`}
                                value={noteData.date}
                                max={new Date().toISOString().split('T')[0]}
                                onChange={(val) => setNoteData({...noteData, date: val})}
                            />
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">{t('desc_label')}</label>
                                <textarea rows={5} value={noteData.desc} onChange={e => setNoteData({...noteData, desc: e.target.value})} className="w-full p-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 rounded-xl border border-gray-200 dark:border-gray-600 outline-none focus:ring-2 focus:ring-green-500" />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button onClick={() => setNotebookModalOpen(false)} className="flex-1 py-3 bg-gray-200 dark:bg-gray-700 rounded-xl font-bold text-gray-900 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">{t('cancel')}</button>
                                <button onClick={saveToNotebook} className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold">{t('save_entry')}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
