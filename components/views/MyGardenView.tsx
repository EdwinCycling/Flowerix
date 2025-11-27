
import React, { useState } from 'react';
import { Icons } from '../Icons';
import { GardenArea, Plant, WeatherData, HomeLocation, TempUnit, LengthUnit } from '../../types';
import { WeatherWidget } from '../ui/WeatherWidget';

interface MyGardenViewProps {
    gardenAreas: GardenArea[];
    plants: Plant[];
    selectedGardenAreaId: string | null;
    setSelectedGardenAreaId: (id: string) => void;
    
    isAddingArea: boolean;
    setIsAddingArea: (val: boolean) => void;
    newAreaName: string;
    setNewAreaName: (name: string) => void;
    newAreaImage: string | null;
    setNewAreaImage: (img: string | null) => void;
    
    onAddArea: () => void;
    onDeleteArea: (id: string) => void;
    handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>, callback: (b64: string) => void, mode?: 'standard' | 'high') => void;
    
    isPinning: string | null;
    setIsPinning: (id: string | null) => void;
    handlePinPlant: (x: number, y: number, id: string) => void;
    onUnpinPlant: (plantId: string, areaId: string) => void;
    
    onSelectPlant: (id: string) => void;
    
    weather: WeatherData | null;
    homeLocation: HomeLocation | null;
    useWeather: boolean;
    tempUnit: TempUnit;
    lengthUnit: LengthUnit;
    lang: 'en' | 'nl';
    t: (key: string) => string;
}

export const MyGardenView: React.FC<MyGardenViewProps> = ({
    gardenAreas, plants, selectedGardenAreaId, setSelectedGardenAreaId,
    isAddingArea, setIsAddingArea, newAreaName, setNewAreaName, newAreaImage, setNewAreaImage,
    onAddArea, onDeleteArea, handleImageUpload,
    isPinning, setIsPinning, handlePinPlant, onUnpinPlant,
    onSelectPlant,
    weather, homeLocation, useWeather, tempUnit, lengthUnit, lang, t
}) => {
    const [showThumbnails, setShowThumbnails] = useState(false);
    const [bottomTab, setBottomTab] = useState<'UNPINNED' | 'PINNED'>('UNPINNED');
    const [previewPlant, setPreviewPlant] = useState<Plant | null>(null);
    const [plantSearch, setPlantSearch] = useState('');
    const [onlyUnpinned, setOnlyUnpinned] = useState(false);
    const [visibleUnpinnedCount, setVisibleUnpinnedCount] = useState(5);
    const [highlightPlantId, setHighlightPlantId] = useState<string | null>(null);
    const photoScrollRef = React.useRef<HTMLDivElement>(null);

    const selectedArea = gardenAreas.find(a => a.id === selectedGardenAreaId);
    
    // Filter logic
    // 1. Plants pinned IN this area
    const plantsInArea = plants.filter(p => (p.location || []).some(l => l.gardenAreaId === selectedGardenAreaId));
    
    // 2. Plants NOT in this area (Available to pin)
    const plantsAvailableBase = plants.sort((a, b) => (a.isActive === b.isActive ? 0 : a.isActive ? -1 : 1));
    const plantsAvailableFiltered = plantsAvailableBase.filter(p => {
        const matchesSearch = (p.name + ' ' + (p.scientificName || '')).toLowerCase().includes(plantSearch.toLowerCase());
        const pinnedInArea = (p.location || []).some(l => l.gardenAreaId === selectedGardenAreaId);
        const passPinned = onlyUnpinned ? !pinnedInArea : true;
        return matchesSearch && passPinned;
    });
    const plantsAvailable = plantsAvailableFiltered.slice(0, visibleUnpinnedCount);

    // Initialize tab
    React.useEffect(() => {
        if (plantsAvailable.length === 0 && plantsInArea.length > 0) {
            setBottomTab('PINNED');
        } else {
            setBottomTab('UNPINNED');
        }
    }, [selectedGardenAreaId]);

    return (
        <div className="h-full flex flex-col transition-colors pb-20">
             <div className="flex-1 overflow-y-auto flex flex-col">
                 
                {/* Header Area REMOVED */}
                   {/* Controls moved to overlay */}


                 
                 {/* Area Selector moved to overlay */}


                {/* Add Area Form moved to modal overlay */}

                 {/* Main Content */}
                 {gardenAreas.length === 0 && !isAddingArea ? (
                     <div className="flex flex-col items-center justify-center h-[50vh] text-gray-400 dark:text-gray-500 p-6 text-center">
                         <div className="bg-green-50 dark:bg-gray-800 p-6 rounded-full mb-4"><Icons.MapPin className="w-12 h-12 text-green-200 dark:text-gray-600" /></div>
                         <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">{t('no_areas_title')}</h3>
                         <p className="text-sm max-w-xs mb-6 leading-relaxed whitespace-pre-line">{t('no_areas_desc')}</p>
                         <button onClick={() => setIsAddingArea(true)} className="bg-green-600 text-white px-6 py-3 rounded-full font-bold shadow-lg hover:bg-green-700 transition-transform active:scale-95">{t('upload_garden_title')}</button>
                     </div>
                 ) : selectedArea ? (
                     <div className="flex flex-col flex-1 min-h-0">
                        {/* Controls Bar removed to match top header placement */}

                        {/* Interactive Photo Map */}
                        <div className="relative w-full bg-gray-200 dark:bg-gray-800 overflow-hidden shadow-inner flex-1 min-h-0 h-full flex justify-center items-center bg-black/5">
                            {/* Overlay Controls */}
                            {gardenAreas.length > 1 && (
                                <div className="absolute top-4 left-4 z-10 flex gap-2 overflow-x-auto max-w-[50%] no-scrollbar">
                                    {gardenAreas.map(area => (
                                        <button 
                                            key={area.id} 
                                            onClick={() => setSelectedGardenAreaId(area.id)}
                                            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors shadow-sm ${selectedGardenAreaId === area.id ? 'bg-green-600 text-white shadow-md' : 'bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-200 backdrop-blur-sm'}`}
                                        >
                                            {area.name}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                                <button 
                                   onClick={() => setShowThumbnails(!showThumbnails)} 
                                   className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-colors shadow-sm backdrop-blur-sm ${showThumbnails ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400 border border-green-200 dark:border-green-800' : 'bg-white/90 text-gray-700 dark:bg-gray-800/90 dark:text-gray-200 border border-transparent'}`}
                                >
                                   {showThumbnails ? <Icons.Image className="w-3 h-3" /> : <Icons.MapPin className="w-3 h-3" />}
                                   {t('toggle_markers')}
                                </button>
                                
                                {selectedArea && gardenAreas.length > 0 && (
                                    <button onClick={() => onDeleteArea(selectedArea.id)} className="bg-white/90 dark:bg-gray-800/90 text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors shadow-sm backdrop-blur-sm" title={t('delete_area')}>
                                        <Icons.Trash2 className="w-5 h-5"/>
                                    </button>
                                )}
                                
                                <button onClick={() => setIsAddingArea(true)} className="bg-green-600 text-white p-2 rounded-full shadow-lg hover:bg-green-700 transition-colors" title={t('upload_garden_title')}>
                                    <Icons.Plus className="w-5 h-5"/>
                                </button>
                            </div>

                            <div ref={photoScrollRef} className="relative inline-block w-full h-full overflow-auto touch-pan-x touch-pan-y">
                                <div className="relative inline-block min-w-full min-h-full">
                                    <img 
                                       src={selectedArea.imageUrl} 
                                       alt={selectedArea.name} 
                                        className="max-w-none h-auto block"
                                        style={{ width: '100%', minHeight: '200px', objectFit: 'contain' }}
                                        onClick={(e) => {
                                            if (isPinning) {
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                const x = ((e.clientX - rect.left) / rect.width) * 100;
                                                const y = ((e.clientY - rect.top) / rect.height) * 100;
                                                handlePinPlant(x, y, isPinning);
                                                setIsPinning(null);
                                                setBottomTab('PINNED'); // Switch to pinned view
                                            }
                                        }}
                                     />
                                     
                                     {/* Render Pins */}
                                     {plantsInArea.flatMap(p => (p.location || []).filter(l => l.gardenAreaId === selectedArea.id).map((loc, idx) => ({ plant: p, loc, idx }))).map(({ plant, loc, idx }) => (
                                         <div 
                                            id={`pin-${plant.id}-${idx}`}
                                            key={`${plant.id}-${idx}`} 
                                            className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-transform cursor-pointer drop-shadow-md group ${highlightPlantId === plant.id ? 'z-50 scale-110' : 'hover:scale-110 hover:z-20'}`} 
                                            style={{ left: `${loc.x}%`, top: `${loc.y}%` }} 
                                            onClick={(e) => { e.stopPropagation(); onSelectPlant(plant.id); }}
                                         >
                                            {highlightPlantId === plant.id ? (
                                                <div className="flex flex-col items-center animate-in zoom-in duration-300">
                                                    <div className="w-32 h-32 rounded-xl overflow-hidden border-4 border-yellow-400 shadow-2xl bg-white mb-2 relative">
                                                        {plant.imageUrl ? (
                                                            <img src={plant.imageUrl} className="w-full h-full object-cover" alt={plant.name} />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-gray-100"><Icons.Leaf className="w-12 h-12 text-green-600"/></div>
                                                        )}
                                                    </div>
                                                    <div className="bg-yellow-400 text-black font-bold text-xs px-3 py-1 rounded-full shadow-lg whitespace-nowrap">
                                                        {plant.name}
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    {showThumbnails && plant.imageUrl ? (
                                                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white dark:border-gray-600 shadow-sm bg-gray-200">
                                                            <img src={plant.imageUrl} className="w-full h-full object-cover" alt={plant.name} />
                                                        </div>
                                                    ) : (
                                                        <Icons.MapPin className="w-10 h-10 text-green-600 fill-white dark:text-green-400 dark:fill-gray-800 drop-shadow-lg" />
                                                    )}
                                                    
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-30">
                                                        {plant.name}
                                                    </div>
                                                </>
                                            )}
                                         </div>
                                     ))}

                                     {/* Placing Hint */}
                                     {isPinning && (
                                         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/70 backdrop-blur-md text-white px-6 py-3 rounded-full text-sm font-bold shadow-2xl animate-pulse pointer-events-none border border-white/20 z-40 text-center">
                                             {t('tap_to_place')}<br/>
                                             <span className="text-xs font-normal text-gray-300">{plants.find(p => p.id === isPinning)?.name}</span>
                                         </div>
                                     )}
                                </div>
                             </div>
                         </div>

                        {/* Bottom Panel */}
                        <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex flex-col max-h-[35vh]">
                            <div className="grid md:grid-cols-2 gap-4 p-4">
                                <div className="flex flex-col min-h-[120px]">
                                    <div className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2">{t('garden_tab_add')}</div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <input type="text" value={plantSearch} onChange={(e) => setPlantSearch(e.target.value)} placeholder={lang === 'nl' ? 'Zoek plant' : 'Search plant'} className="flex-1 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm outline-none" />
                                        <label className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300">
                                            <input type="checkbox" checked={onlyUnpinned} onChange={(e) => setOnlyUnpinned(e.target.checked)} />
                                            <span>{lang === 'nl' ? 'Alleen ongeplaatst' : 'Only unpinned'}</span>
                                        </label>
                                    </div>
                                    <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                                        {plantsAvailable.map(plant => (
                                            <div 
                                               key={plant.id} 
                                               onClick={() => setIsPinning(plant.id)} 
                                               className={`flex-shrink-0 w-24 flex flex-col justify-between bg-white dark:bg-gray-800 p-2 rounded-xl border-2 transition-all cursor-pointer ${
                                                   isPinning === plant.id 
                                                   ? 'bg-green-50 dark:bg-green-900/30 border-green-500 shadow-md' 
                                                   : 'border-gray-200 dark:border-gray-700 hover:border-green-300'
                                               } ${!plant.isActive ? 'opacity-60 grayscale' : ''}`}
                                            >
                                                <div className="flex-1">
                                                    <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">{plant.name}</h4>
                                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 italic truncate">{plant.scientificName}</p>
                                                </div>
                                                <div className="mt-2 flex justify-between items-center">
                                                    <span className="text-[9px] text-gray-400 truncate max-w-[50px]">{plant.description?.slice(0, 15)}...</span>
                                                    <button onClick={(e) => { e.stopPropagation(); setPreviewPlant(plant); }} className="text-blue-500 hover:text-blue-600 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20">
                                                        <Icons.Info className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {plantsAvailable.length === 0 && <div className="text-sm text-gray-400 italic w-full text-center py-4">{t('all_mapped')}</div>}
                                    </div>
                                    {visibleUnpinnedCount < plantsAvailableFiltered.length && (
                                        <div className="flex justify-center pt-2">
                                            <button onClick={() => setVisibleUnpinnedCount(prev => prev + 5)} className="px-3 py-1 text-xs rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200">{lang === 'nl' ? 'Meer laden' : 'Load more'}</button>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col min-h-[120px] md:items-end">
                                    <div className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2 md:text-right">{t('garden_tab_list')}</div>
                                    {plantsInArea.length === 0 ? (
                                        <div className="text-center py-4 text-gray-400 italic text-sm">{t('no_plants')}</div>
                                    ) : (
                                        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar max-w-full">
                                            {plantsInArea.map(plant => (
                                                <div key={plant.id} onClick={() => { setHighlightPlantId(plant.id); setTimeout(() => setHighlightPlantId(null), 2000); const el = document.getElementById(`pin-${plant.id}-0`); if (el && photoScrollRef.current) { el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }); } }} className="flex-shrink-0 w-24 flex flex-col justify-between bg-white dark:bg-gray-800 p-2 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-sm">
                                                    <div className="flex-1">
                                                        <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">{plant.name}</h4>
                                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 italic truncate">{plant.scientificName}</p>
                                                    </div>
                                                    <div className="mt-2 flex justify-between items-center">
                                                        <span className="text-[9px] text-gray-400 truncate max-w-[50px]">{plant.description?.slice(0, 15)}...</span>
                                                        <button onClick={(e) => { e.stopPropagation(); setPreviewPlant(plant); }} className="text-blue-500 hover:text-blue-600 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20">
                                                            <Icons.Info className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                     </div>
                 ) : null}
        </div>

            {/* Add Area Modal */}
            {isAddingArea && (
                <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">{t('upload_garden_title')}</h3>
                            <button onClick={() => setIsAddingArea(false)} className="text-gray-500 hover:text-gray-800 dark:hover:text-white"><Icons.X /></button>
                        </div>
                        <div className="p-4 space-y-3">
                            <input type="text" value={newAreaName} onChange={(e) => setNewAreaName(e.target.value)} placeholder={t('area_name_placeholder')} className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none" />
                            <div className="relative w-full rounded-xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 min-h-[220px]">
                                {newAreaImage ? (
                                    <>
                                        <img src={newAreaImage} className="w-full h-auto max-h-[60vh] object-contain" alt="Preview" />
                                        <button onClick={() => setNewAreaImage(null)} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-sm"><Icons.X className="w-4 h-4"/></button>
                                    </>
                                ) : (
                                    <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer text-gray-400 dark:text-gray-500">
                                        <Icons.Image className="w-8 h-8 mb-2"/>
                                        <span className="text-sm font-medium">{t('choose_photo')}</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setNewAreaImage, 'high')} />
                                    </label>
                                )}
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex gap-2">
                            <button onClick={() => setIsAddingArea(false)} className="flex-1 py-2 text-gray-900 hover:text-gray-800 dark:text-gray-200 font-bold bg-gray-200 dark:bg-gray-700 rounded-xl transition-colors">{t('cancel')}</button>
                            <button onClick={onAddArea} disabled={!newAreaName || !newAreaImage} className="flex-1 py-2 bg-green-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-xl font-bold shadow-sm">{t('add_area')}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Plant Modal */}
            {previewPlant && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-4 shadow-2xl relative">
                         <button onClick={() => setPreviewPlant(null)} className="absolute top-2 right-2 p-2 bg-white/50 dark:bg-black/50 rounded-full hover:bg-white dark:hover:bg-black text-gray-800 dark:text-white z-10">
                             <Icons.X className="w-5 h-5" />
                         </button>
                         <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 mb-4">
                             {previewPlant.imageUrl ? (
                                 <img src={previewPlant.imageUrl} className="w-full h-full object-cover" alt={previewPlant.name} />
                             ) : (
                                 <div className="w-full h-full flex items-center justify-center"><Icons.Leaf className="w-16 h-16 text-gray-400" /></div>
                             )}
                         </div>
                         <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-1">{previewPlant.name}</h3>
                         <p className="text-sm text-gray-500 dark:text-gray-400 text-center italic mb-3">{previewPlant.scientificName}</p>
                         <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4 max-h-32 overflow-y-auto">{previewPlant.description || t('no_desc')}</p>
                         <div className="flex gap-2">
                             <button onClick={() => { setIsPinning(previewPlant.id); setPreviewPlant(null); }} className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                                 <Icons.MapPin className="w-4 h-4" /> Place on Map
                             </button>
                         </div>
                     </div>
                </div>
            )}
        </div>
    );
};
