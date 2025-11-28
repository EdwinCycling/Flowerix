
import React, { useState, useEffect, useRef } from 'react';
import { Icons } from '../Icons';
import { Plant, GardenLogItem, SocialPost, WeatherData, HomeLocation, DashboardTab, GardenArea, TempUnit, LengthUnit, TimelineItem, ModulesConfig } from '../../types';
import { WeatherWidget } from '../ui/WeatherWidget';
import { useAuth } from '../../contexts/AuthContext';
import { validateAndSyncWithServer } from '../../services/usageService';

// Sub-view imports
import { GardenLogGridView } from './LogViews';
import { WorldView } from './SocialViews';
import { MyGardenView } from './MyGardenView';
import { ExtrasView } from './ExtrasView';
import { NotebookView } from './NotebookView';

// Internal Component for Image Error Handling (Simple fallback)
const PlantCardImage: React.FC<{ src?: string; alt: string }> = ({ src, alt }) => {
    const [error, setError] = useState(false);

    useEffect(() => {
        setError(false);
    }, [src]);

    if (!src || error) {
        return (
            <div className="w-full h-full bg-green-100 dark:bg-green-900 flex items-center justify-center absolute inset-0">
                <Icons.Sprout className="w-12 h-12 text-green-300 dark:text-green-600" />
                {error && <span className="absolute bottom-2 text-[10px] text-red-400">Unavailable</span>}
            </div>
        );
    }

    return (
        <img 
            src={src} 
            className="w-full h-full object-cover absolute inset-0 transition-opacity duration-300" 
            alt={alt} 
            onError={() => setError(true)}
            loading="lazy"
        />
    );
};

interface DashboardViewProps {
    plants: Plant[];
    gardenLogs: GardenLogItem[];
    socialPosts: SocialPost[];
    weather: WeatherData | null;
    homeLocation: HomeLocation | null;
    useWeather: boolean; 
    tempUnit: TempUnit;
    lengthUnit: LengthUnit;
    tab: DashboardTab;
    setTab: (tab: DashboardTab) => void;
    setView: (view: any) => void;
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    showArchivedPlants: boolean;
    setShowArchivedPlants: (show: boolean) => void;
    visiblePlantsCount: number;
    setVisiblePlantsCount: (count: number | ((prev: number) => number)) => void;
    
    onStartAddPlant: () => void;
    onSelectPlant: (id: string) => void;
    onMenuToggle: () => void;
    onStartAddGardenLog: () => void;
    onSelectGardenLog: (log: GardenLogItem) => void;
    
    // Garden View Props
    gardenAreas: GardenArea[];
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

    // World View Props
    onLikePost: (id: string) => void;
    onOpenPostDetails: (id: string) => void;
    onLoadMoreSocial: () => void;
    onRefreshSocial: () => void;
    socialHasMore: boolean;
    showToast: (msg: string) => void;
    
    // Extras
    onOpenSlideshowConfig: () => void;
    onOpenPhotoMerge: () => void;
    onOpenPhotoOptimize: () => void;
    onOpenPhotoTimelapse: () => void;
    onOpenPlantAnalysis: () => void;
    onOpenSeasons: () => void;
    onOpenPlantAdvice: () => void;
    onOpenIdentify: () => void;
    onOpenProfessor: () => void;
    onShowRestriction: (featureName: string) => void;
    
    // Notebook
    timelineItems: TimelineItem[];
    onAddNotebookItem: (item: TimelineItem | TimelineItem[]) => void;
    onUpdateNotebookItem: (item: TimelineItem) => void;
    onDeleteNotebookItem: (id: string | string[]) => void;
    firstDayOfWeek: 'mon' | 'sun' | 'sat';

    // App Props
    darkMode: boolean;
    setDarkMode: (val: boolean) => void;
    appVersion: string;
    onOpenInfoModal: (type: 'ABOUT' | 'DISCLAIMER' | 'COOKIE' | 'TEAM' | 'TERMS') => void;

    lang: 'en' | 'nl';
    t: (key: string) => string;
    limitAI?: boolean;
  modules: ModulesConfig;
  showPwaBanner?: boolean;
  onInstallPwa?: () => void;
  onOpenPwaInfo?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
    plants, gardenLogs, socialPosts, weather, homeLocation, useWeather, tempUnit, lengthUnit,
    tab, setTab, setView,
    searchQuery, setSearchQuery,
    showArchivedPlants, setShowArchivedPlants,
    visiblePlantsCount, setVisiblePlantsCount,
    onStartAddPlant, onSelectPlant, onMenuToggle,
    onStartAddGardenLog, onSelectGardenLog,
    gardenAreas, selectedGardenAreaId, setSelectedGardenAreaId,
    isAddingArea, setIsAddingArea, newAreaName, setNewAreaName, newAreaImage, setNewAreaImage,
    onAddArea, onDeleteArea, handleImageUpload, isPinning, setIsPinning, handlePinPlant, onUnpinPlant,
    onLikePost, onOpenPostDetails, onLoadMoreSocial, onRefreshSocial, socialHasMore, showToast,
    onOpenSlideshowConfig, onOpenPhotoMerge, onOpenPhotoOptimize, onOpenPhotoTimelapse, onOpenPlantAnalysis, onOpenSeasons, onOpenPlantAdvice, onOpenIdentify, onOpenProfessor, onShowRestriction,
    timelineItems, onAddNotebookItem, onUpdateNotebookItem, onDeleteNotebookItem, firstDayOfWeek,
    darkMode, setDarkMode, appVersion, onOpenInfoModal,
    lang, t, limitAI, modules,
    showPwaBanner, onInstallPwa, onOpenPwaInfo
}) => {
    const { user } = useAuth();
    const [plantSortType, setPlantSortType] = useState<'name' | 'datePlanted' | 'lastModified'>('datePlanted');
    const [plantModal, setPlantModal] = useState<Plant | null>(null);
    const [filterLocation, setFilterLocation] = useState<'ALL' | 'INDOOR' | 'OUTDOOR'>('ALL');
    
    // Today Modal State
    const [showTodayModal, setShowTodayModal] = useState(false);
    const [selectedTodayItem, setSelectedTodayItem] = useState<TimelineItem | null>(null);
    
    const todayStr = new Date().toISOString().split('T')[0];
    const todayItems = timelineItems.filter(i => i.date === todayStr);

    // Security Check on Tab Switch
    const handleTabChange = (newTab: DashboardTab) => {
        if (user) {
            validateAndSyncWithServer(user.id);
        }
        setTab(newTab);
    };

    const getLatestPlantDate = (plant: Plant) => {
        let latest = new Date(plant.dateAdded).getTime();
        if (plant.logs && plant.logs.length > 0) {
            const logDates = plant.logs.map(l => new Date(l.date).getTime());
            const maxLog = Math.max(...logDates);
            if (maxLog > latest) latest = maxLog;
        }
        return latest;
    };

    // Filter Plants
    const filteredPlants = plants
        .filter(p => showArchivedPlants ? !p.isActive : p.isActive)
        .filter(p => {
            if (filterLocation === 'ALL') return true;
            if (filterLocation === 'INDOOR') return p.isIndoor;
            if (filterLocation === 'OUTDOOR') return !p.isIndoor; 
            return !p.isIndoor; 
        })
        .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => {
            if (plantSortType === 'name') return a.name.localeCompare(b.name);
            if (plantSortType === 'datePlanted') {
                const da = a.datePlanted ? new Date(a.datePlanted).getTime() : 0;
                const db = b.datePlanted ? new Date(b.datePlanted).getTime() : 0;
                return db - da;
            }
            if (plantSortType === 'lastModified') {
                return getLatestPlantDate(b) - getLatestPlantDate(a);
            }
            return 0;
        });

    const visiblePlants = filteredPlants.slice(0, visiblePlantsCount);

    const allTabs = [
        { id: 'PLANTS', label: t('tab_my_plants'), icon: Icons.Flower, color: 'text-green-600 dark:text-green-400', show: true },
        { id: 'GARDEN_LOGS', label: t('tab_garden_logs'), icon: Icons.Book, color: 'text-purple-600 dark:text-purple-400', show: modules.gardenLogs },
        { id: 'GARDEN_VIEW', label: t('tab_garden_view'), icon: Icons.Map, color: 'text-orange-600 dark:text-orange-400', show: modules.gardenView },
        { id: 'WORLD', label: t('tab_world'), icon: Icons.Globe, color: 'text-blue-600 dark:text-blue-400', show: modules.social },
        { id: 'NOTEBOOK', label: t('tab_notebook'), icon: Icons.Notebook, color: 'text-yellow-600 dark:text-yellow-400', show: modules.notebook },
        { id: 'EXTRAS', label: t('tab_extras'), icon: Icons.LayoutGrid, color: 'text-pink-600 dark:text-pink-400', show: true },
    ];

    const tabs = allTabs.filter(t => t.show);

    const toggleTaskDone = (id: string) => {
        const item = timelineItems.find(i => i.id === id);
        if (item) {
            onUpdateNotebookItem({ ...item, isDone: !item.isDone });
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors flex flex-col">
            {/* Header & Tabs */}
            <div className="sticky top-0 z-30 bg-white dark:bg-gray-800 shadow-sm px-4 py-3 flex flex-col gap-3 transition-colors">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setTab('PLANTS')}>
                            <Icons.Leaf className="w-6 h-6 text-green-600 dark:text-green-400" />
                            <span className="font-bold text-xl text-green-900 dark:text-green-50">{t('dashboard_title')}</span>
                        </div>
                        <button onClick={() => setDarkMode(!darkMode)} className="text-gray-600 dark:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ml-2" title={darkMode ? t('theme_light') : t('theme_dark')}>
                             {darkMode ? <Icons.Sun className="w-5 h-5" /> : <Icons.Moon className="w-5 h-5" />}
                        </button>
                    </div>
                    <div className="flex items-center gap-3">
                        {todayItems.length > 0 && modules.notebook && (
                            <button 
                                onClick={() => setShowTodayModal(true)} 
                                className="relative text-yellow-600 dark:text-yellow-400 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors animate-in fade-in zoom-in"
                                title={t('today_items_title')}
                            >
                                <Icons.Calendar className="w-6 h-6" />
                                <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></span>
                            </button>
                        )}
                        {useWeather && homeLocation && (
                            <button onClick={() => setView('WEATHER_DETAILS')} className="text-blue-500 dark:text-blue-400 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Weather Station">
                                <Icons.CloudSun className="w-6 h-6" />
                            </button>
                        )}
                        <button onClick={onMenuToggle} className="text-gray-600 dark:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            <Icons.Menu className="w-6 h-6" />
                        </button>
                    </div>
                </div>
                <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl overflow-hidden overflow-x-auto no-scrollbar">
                    {tabs.map(tabItem => (
                        <button 
                            key={tabItem.id} 
                            onClick={() => handleTabChange(tabItem.id as DashboardTab)} 
                            className={`flex-1 py-2 px-1 rounded-lg transition-all truncate min-w-[40px] flex items-center justify-center gap-2 ${
                                tab === tabItem.id 
                                ? `bg-white dark:bg-gray-600 shadow ${tabItem.color}` 
                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                        >
                            <tabItem.icon className={`w-5 h-5 ${tab === tabItem.id ? '' : 'opacity-70'} block`} />
                            <span className="hidden md:block text-xs md:text-sm font-bold truncate">
                                {tabItem.label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
            {showPwaBanner && (
                <div className="px-4 py-2 bg-green-50 dark:bg-green-900 text-green-800 dark:text-green-200 flex items-center justify-between">
                    <div className="text-sm font-medium">
                        {t('pwa_banner_text')}
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onOpenPwaInfo} className="text-xs px-3 py-1 rounded-lg bg-white dark:bg-gray-800 border border-green-200 dark:border-green-700">
                            {t('info')}
                        </button>
                        <button onClick={onInstallPwa} className="text-xs px-3 py-1 rounded-lg bg-green-600 text-white">
                            {t('pwa_install')}
                        </button>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1">
                {tab === 'PLANTS' && (
                    <div className="pb-4">
                        <div className="px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between mt-2 gap-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold text-gray-800 dark:text-white">{t('my_plants')}</h3>
                                <button onClick={onStartAddPlant} className="bg-green-600 text-white p-2 rounded-full shadow hover:bg-green-700 sm:hidden">
                                    <Icons.Plus className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                                    <button onClick={() => setShowArchivedPlants(false)} className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold rounded ${!showArchivedPlants ? 'bg-white dark:bg-gray-600 shadow text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                        {t('active')}
                                    </button>
                                    <button onClick={() => setShowArchivedPlants(true)} className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold rounded ${showArchivedPlants ? 'bg-white dark:bg-gray-600 shadow text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                        {t('inactive')}
                                    </button>
                                </div>
                                
                                <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1 overflow-x-auto no-scrollbar">
                                    <button onClick={() => setFilterLocation('ALL')} className={`whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded ${filterLocation === 'ALL' ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                        {t('filter_all')}
                                    </button>
                                    <button onClick={() => setFilterLocation('INDOOR')} className={`whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded ${filterLocation === 'INDOOR' ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                        {t('filter_indoor')}
                                    </button>
                                    <button onClick={() => setFilterLocation('OUTDOOR')} className={`whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded ${filterLocation === 'OUTDOOR' ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                        {t('filter_outdoor')}
                                    </button>
                                </div>

                                <button onClick={onStartAddPlant} className="bg-green-600 text-white p-2 rounded-full shadow hover:bg-green-700 hidden sm:block">
                                    <Icons.Plus className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="px-4 py-2 flex gap-2 items-center flex-wrap">
                            <div className="relative flex-1">
                                <Icons.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder={t('search_placeholder')}
                                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-none shadow-sm focus:ring-2 focus:ring-green-500 outline-none transition-colors text-sm"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="relative">
                                <select
                                    value={plantSortType}
                                    onChange={(e) => setPlantSortType(e.target.value as any)}
                                    className="appearance-none bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 py-2 pl-3 pr-8 rounded-xl shadow-sm text-sm border-none outline-none focus:ring-2 focus:ring-green-500"
                                >
                                    <option value="name">{t('sort_name')}</option>
                                    <option value="datePlanted">{t('sort_date_planted')}</option>
                                    <option value="lastModified">{t('sort_last_modified')}</option>
                                </select>
                                <Icons.ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                            </div>
                        </div>

                        {showArchivedPlants && (
                            <div className="px-4 py-1">
                                <span className="text-xs font-bold uppercase text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{t('filter_archived')}</span>
                            </div>
                        )}

                        <div className="px-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-2">
                            {visiblePlants.map(plant => (
                                <div key={plant.id} onClick={() => onSelectPlant(plant.id)} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-all p-3 flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400">
                                            <Icons.Leaf className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold truncate text-gray-900 dark:text-white">{plant.name}</h3>
                                            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{plant.scientificName}</span>
                                        </div>
                                    </div>
                                    <div className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2">{plant.description || t('no_desc')}</div>
                                </div>
                            ))}
                            {filteredPlants.length === 0 && (
                                <div className="col-span-2 md:col-span-3 lg:col-span-4 flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500 p-4 text-center">
                                    <div className="bg-gray-100 dark:bg-gray-800 rounded-full p-6 mb-4">
                                        <Icons.Sprout className="w-16 h-16 text-gray-300 dark:text-gray-600" />
                                    </div>
                                    {plants.length === 0 ? (
                                        <>
                                            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">{t('no_plants_title')}</h3>
                                            <p className="mb-6 text-sm max-w-md mx-auto leading-relaxed whitespace-pre-line">{t('no_plants_desc')}</p>
                                            <button onClick={onStartAddPlant} className="bg-green-600 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-green-700 transition-transform active:scale-95 flex items-center gap-2 mx-auto">
                                                <Icons.Plus className="w-5 h-5" /> {t('add_plant_title')}
                                            </button>
                                        </>
                                    ) : (
                                        <p>{t('no_search_results')}</p>
                                    )}
                                </div>
                            )}
                        </div>
                        {visiblePlantsCount < filteredPlants.length && (
                            <div className="px-4 mt-4">
                                <button onClick={() => setVisiblePlantsCount(prev => prev + 5)} className="w-full py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                                    {t('load_more')}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {tab === 'GARDEN_LOGS' && modules.gardenLogs && (
                    <GardenLogGridView
                        logs={gardenLogs}
                        weather={weather}
                        homeLocation={homeLocation}
                        onSelectLog={onSelectGardenLog}
                        onAddLog={onStartAddGardenLog}
                        onOpenCollage={() => setView('PHOTO_COLLAGE')} 
                        useWeather={useWeather}
                        tempUnit={tempUnit}
                        lengthUnit={lengthUnit}
                        lang={lang}
                        t={t}
                    />
                )}

                {tab === 'GARDEN_VIEW' && modules.gardenView && (
                    <MyGardenView 
                        gardenAreas={gardenAreas}
                        plants={plants}
                        selectedGardenAreaId={selectedGardenAreaId}
                        setSelectedGardenAreaId={setSelectedGardenAreaId}
                        isAddingArea={isAddingArea}
                        setIsAddingArea={setIsAddingArea}
                        newAreaName={newAreaName}
                        setNewAreaName={setNewAreaName}
                        newAreaImage={newAreaImage}
                        setNewAreaImage={setNewAreaImage}
                        onAddArea={onAddArea}
                        onDeleteArea={onDeleteArea}
                        handleImageUpload={handleImageUpload}
                        isPinning={isPinning}
                        setIsPinning={setIsPinning}
                        handlePinPlant={handlePinPlant}
                        onUnpinPlant={onUnpinPlant}
                        onSelectPlant={onSelectPlant}
                        weather={weather}
                        homeLocation={homeLocation}
                        useWeather={useWeather}
                        tempUnit={tempUnit}
                        lengthUnit={lengthUnit}
                        lang={lang}
                        t={t}
                    />
                )}

                {tab === 'WORLD' && modules.social && (
                    <WorldView
                        posts={socialPosts}
                        plants={plants}
                        onLike={onLikePost}
                        onOpenDetails={onOpenPostDetails}
                        showToast={showToast}
                        onLoadMore={onLoadMoreSocial}
                        onRefresh={onRefreshSocial}
                        hasMore={socialHasMore}
                        lang={lang}
                        t={t}
                    />
                )}

                {tab === 'NOTEBOOK' && modules.notebook && (
                    <NotebookView 
                        timelineItems={timelineItems}
                        onAddNotebookItem={onAddNotebookItem}
                        onUpdateNotebookItem={onUpdateNotebookItem}
                        onDeleteNotebookItem={onDeleteNotebookItem}
                        handleImageUpload={handleImageUpload}
                        lang={lang}
                        t={t}
                        firstDayOfWeek={firstDayOfWeek}
                        weather={weather}
                        homeLocation={homeLocation}
                        useWeather={useWeather}
                    />
                )}

                {tab === 'EXTRAS' && (
                    <ExtrasView 
                        onOpenSlideshowConfig={onOpenSlideshowConfig}
                        onOpenPhotoMerge={onOpenPhotoMerge}
                        onOpenPhotoOptimize={onOpenPhotoOptimize}
                        onOpenPhotoTimelapse={onOpenPhotoTimelapse}
                        onOpenPlantAnalysis={onOpenPlantAnalysis}
                        onOpenSeasons={onOpenSeasons}
                        onOpenPlantAdvice={onOpenPlantAdvice}
                        onOpenIdentify={onOpenIdentify}
                        onOpenProfessor={onOpenProfessor}
                        t={t}
                        limitAI={limitAI}
                        onShowRestriction={onShowRestriction}
                        handleImageUpload={handleImageUpload}
                        modules={modules}
                    />
                )}
            </div>

            {/* Footer */}
            <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-6 mt-auto">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex gap-4 flex-wrap justify-center">
                        <button onClick={() => onOpenInfoModal('ABOUT')} className="hover:text-green-600 dark:hover:text-green-400 transition-colors">About</button>
                        <button onClick={() => onOpenInfoModal('TERMS')} className="hover:text-green-600 dark:hover:text-green-400 transition-colors">Terms</button>
                        <button onClick={() => onOpenInfoModal('DISCLAIMER')} className="hover:text-green-600 dark:hover:text-green-400 transition-colors">Disclaimer</button>
                        <button onClick={() => onOpenInfoModal('COOKIE')} className="hover:text-green-600 dark:hover:text-green-400 transition-colors">Cookie Policy</button>
                        <button onClick={() => onOpenInfoModal('TEAM')} className="hover:text-green-600 dark:hover:text-green-400 transition-colors">Our Team</button>
                    </div>
                    <div className="font-mono text-gray-400">
                        {appVersion}
                    </div>
                </div>
            </div>

            {/* Today Items Modal */}
            {showTodayModal && modules.notebook && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[80vh] animate-in zoom-in-95">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white">{t('today_items_title')}</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{t('today_items_desc')}</p>
                            </div>
                            <button onClick={() => setShowTodayModal(false)}><Icons.X className="text-gray-500" /></button>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1 space-y-3">
                            {todayItems.map(item => (
                                <div 
                                    key={item.id} 
                                    onClick={() => setSelectedTodayItem(item)}
                                    className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer hover:shadow-md transition-shadow ${item.type === 'NOTE' ? 'bg-[#fef9c3] dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800/50' : item.isDone ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}
                                >
                                    {item.imageUrl ? (
                                        <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                                            <img src={item.imageUrl} className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className={`w-16 h-16 shrink-0 rounded-lg flex items-center justify-center ${item.type === 'NOTE' ? 'bg-yellow-200' : 'bg-blue-100'}`}>
                                            {item.type === 'NOTE' ? <Icons.Notebook className="w-8 h-8 text-yellow-700"/> : <Icons.ListTodo className="w-8 h-8 text-blue-600"/>}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <h4 className={`font-bold text-base mb-1 ${item.isDone ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>{item.title}</h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{item.description || t('no_desc')}</p>
                                    </div>
                                    {item.type === 'TASK' && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); toggleTaskDone(item.id); }}
                                            className={`p-2 rounded-full transition-colors ${item.isDone ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400 hover:bg-gray-300'}`}
                                        >
                                            <Icons.CheckSquare className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-b-2xl">
                            <button onClick={() => setShowTodayModal(false)} className="w-full py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-200 font-bold rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">{t('close')}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Read-Only Detail Modal */}
            {selectedTodayItem && (
                <div className="fixed inset-0 z-[70] bg-gray-50 dark:bg-gray-900 flex flex-col animate-in slide-in-from-bottom-10">
                    <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                        <button onClick={() => setSelectedTodayItem(null)} className="text-gray-600 dark:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                            <Icons.ArrowLeft className="w-6 h-6" />
                        </button>
                        <h2 className="ml-3 font-bold text-lg text-gray-900 dark:text-white flex-1">
                            {t(selectedTodayItem.type === 'NOTE' ? 'note_details' : 'task_details')}
                        </h2>
                    </div>

                    <div className="flex-1 overflow-y-auto pb-20">
                        {selectedTodayItem.imageUrl && (
                            <div className="w-full bg-black min-h-[200px] flex items-center justify-center">
                                <img src={selectedTodayItem.imageUrl} alt="Detail" className="w-full max-h-[50vh] object-contain" />
                            </div>
                        )}

                        <div className="p-6 space-y-6">
                            <div className="flex items-start gap-3">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('title_label')}</label>
                                    <div className="text-xl font-bold text-gray-900 dark:text-white">{selectedTodayItem.title}</div>
                                </div>
                                {selectedTodayItem.type === 'TASK' && (
                                    <div className={`p-2 px-3 rounded-lg text-xs font-bold ${selectedTodayItem.isDone ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                        {selectedTodayItem.isDone ? t('task_done') : 'Todo'}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('log_date_label')}</label>
                                <div className="text-gray-900 dark:text-white font-medium">{new Date(selectedTodayItem.date).toLocaleDateString(lang === 'nl' ? 'nl-NL' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('desc_label')}</label>
                                <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{selectedTodayItem.description || t('no_desc')}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Plant Modal */}
            {plantModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white truncate">{plantModal.name}</h3>
                            <button onClick={() => setPlantModal(null)} className="text-gray-500 hover:text-gray-800 dark:hover:text-white"><Icons.X /></button>
                        </div>
                        <div className="p-4 space-y-3">
                            <div className="w-full rounded-xl bg-black flex items-center justify-center min-h-[220px]">
                                {plantModal.imageUrl ? (
                                    <img src={plantModal.imageUrl} alt={plantModal.name} className="w-full h-auto max-h-[60vh] object-contain" />
                                ) : (
                                    <div className="w-full h-40 flex items-center justify-center"><Icons.Leaf className="w-12 h-12 text-gray-400"/></div>
                                )}
                            </div>
                            {plantModal.scientificName && (
                                <div className="text-sm text-gray-500 dark:text-gray-400 italic">{plantModal.scientificName}</div>
                            )}
                            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{plantModal.description || t('no_desc')}</div>
                        </div>
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex gap-2">
                            <button onClick={() => { setPlantModal(null); onSelectPlant(plantModal.id); }} className="flex-1 py-2 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                                <Icons.ArrowRight className="w-4 h-4" /> Open
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
