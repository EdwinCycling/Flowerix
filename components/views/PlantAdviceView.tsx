
import React, { useState } from 'react';
import { Icons } from '../Icons';
import { PlantAdviceFormData, PlantRecommendation, TimelineItem } from '../../types';
import { getPlantAdvice, searchWikiImages, performWebSearch } from '../../services/geminiService';
import { generateAdvicePDF } from '../../services/pdfService';
import { SearchResultsModal } from '../modals/InfoModals';
import { DatePicker } from '../ui/DatePicker';
import { AISpark } from '../ui/AISpark';

interface PlantAdviceViewProps {
    onBack: () => void;
    onAddToNotebook: (item: TimelineItem) => void;
    showToast: (msg: string) => void;
    lang: 'en' | 'nl';
    t: (key: string) => string;
    onAskFlora: (text: string) => void;
}

export const PlantAdviceView: React.FC<PlantAdviceViewProps> = ({ onBack, onAddToNotebook, showToast, lang, t, onAskFlora }) => {
    const [step, setStep] = useState<'intro' | 'location' | 'preferences' | 'generating' | 'results'>('intro');
    const [formData, setFormData] = useState<PlantAdviceFormData>({
        location: 'outdoor',
        outdoorType: 'ground',
        climate: 'temperate',
        minTemperature: -5,
        sunlight: 'partial',
        soil: 'loam',
        moisture: 'average',
        space: 'medium',
        minHeight: 0,
        maxHeight: 200,
        plantTypes: [],
        colors: [],
        seasons: [],
        maintenance: 50, // 0-100
        special: []
    });
    const [recommendations, setRecommendations] = useState<{rec: PlantRecommendation, img?: string}[]>([]);
    
    // Search Modal State
    const [searchModalOpen, setSearchModalOpen] = useState(false);
    const [searchResults, setSearchResults] = useState<{ summary: string, sources: { title: string, url: string }[] } | null>(null);
    const [isSearching, setIsSearching] = useState(false);

    // Add to Notebook Modal State
    const [notebookModalOpen, setNotebookModalOpen] = useState(false);
    const [noteData, setNoteData] = useState<{ title: string, desc: string, date: string, imageUrl?: string }>({ title: '', desc: '', date: '', imageUrl: undefined });

    const handleToggle = (field: keyof PlantAdviceFormData, value: string) => {
        setFormData(prev => {
            const current = prev[field] as string[];
            if (current.includes(value)) {
                return { ...prev, [field]: current.filter(v => v !== value) };
            } else {
                return { ...prev, [field]: [...current, value] };
            }
        });
    };

    const executeAdvice = async () => {
        setStep('generating');
        try {
            const recs = await getPlantAdvice(formData, lang);
            
            // Fetch images for recommendations
            const enrichedRecs = await Promise.all(recs.map(async (rec) => {
                const images = await searchWikiImages(rec.scientificName || rec.name);
                return { rec, img: images[0] }; // Take first result
            }));
            
            setRecommendations(enrichedRecs);
            setStep('results');
        } catch (e) {
            console.error(e);
            alert("Error generating advice.");
            setStep('preferences'); // Go back
        }
    };

    const handleWebSearch = async (rec: PlantRecommendation) => {
        setSearchModalOpen(true);
        setIsSearching(true);
        setSearchResults(null);
        
        const query = `${rec.name} ${rec.scientificName}`;
        const results = await performWebSearch(query, lang);
        
        setSearchResults(results);
        setIsSearching(false);
    };

    const handleCopy = () => {
        const text = recommendations.map(r => `${r.rec.name} (${r.rec.scientificName})\n${r.rec.reason}`).join('\n\n');
        navigator.clipboard.writeText(text);
        showToast(t('copy_success'));
    };

    const handlePDF = () => {
        if(generateAdvicePDF(recommendations.map(r => r.rec), lang, t)) {
            showToast(t('pdf_downloaded'));
        } else {
            showToast(t('pdf_error'));
        }
    };

    // Create a readable criteria string
    const formatCriteria = () => {
        const parts = [];
        parts.push(`${t('q_location_type')}: ${t(`loc_${formData.location}` as any)}`);
        if (formData.location === 'outdoor') parts.push(`${t('q_outdoor_sub')}: ${t(`loc_${formData.outdoorType}` as any)}`);
        parts.push(`${t('q_sunlight')}: ${t(`sun_${formData.sunlight.replace('_', '')}` as any)}`); // Hack for key match if needed
        if (formData.soil) parts.push(`${t('q_soil')}: ${t(`soil_${formData.soil}` as any)}`);
        return parts.join(', ');
    };

    const openNotebookModal = (item: {rec: PlantRecommendation, img?: string}) => {
        const criteria = formatCriteria();
        setNoteData({
            title: `${t('wanted_plant')} : ${item.rec.name} / ${item.rec.scientificName}`,
            desc: `${t('criteria_label')}:\n${criteria}\n\n${item.rec.reason}`,
            date: new Date().toISOString().split('T')[0],
            imageUrl: item.img
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

    // --- Step Components ---
    
    const renderLocationStep = () => (
        <div className="space-y-6 animate-in slide-in-from-right">
            <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('q_location_type')}</label>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setFormData({...formData, location: 'indoor'})} className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${formData.location === 'indoor' ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
                        <Icons.Home className="w-6 h-6"/>
                        <span className="text-sm font-medium">{t('loc_indoor')}</span>
                    </button>
                    <button onClick={() => setFormData({...formData, location: 'outdoor'})} className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${formData.location === 'outdoor' ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
                        <Icons.Sun className="w-6 h-6"/>
                        <span className="text-sm font-medium">{t('loc_outdoor')}</span>
                    </button>
                </div>
            </div>

            {formData.location === 'outdoor' && (
                <>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('q_outdoor_sub')}</label>
                         <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setFormData({...formData, outdoorType: 'ground'})} className={`p-3 rounded-xl border transition-all text-sm ${formData.outdoorType === 'ground' ? 'bg-green-600 text-white border-green-600' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'}`}>{t('loc_ground')}</button>
                            <button onClick={() => setFormData({...formData, outdoorType: 'pot'})} className={`p-3 rounded-xl border transition-all text-sm ${formData.outdoorType === 'pot' ? 'bg-green-600 text-white border-green-600' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'}`}>{t('loc_pot')}</button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('q_climate')}</label>
                        <select value={formData.climate} onChange={(e) => setFormData({...formData, climate: e.target.value as any})} className="w-full p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white outline-none">
                            <option value="temperate">{t('cli_temperate')}</option>
                            <option value="continental">{t('cli_continental')}</option>
                            <option value="mediterranean">{t('cli_mediterranean')}</option>
                            <option value="tropical">{t('cli_tropical')}</option>
                            <option value="arid">{t('cli_arid')}</option>
                        </select>
                    </div>

                    <div>
                         <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                             {t('q_min_temp')}: <span className="text-green-600">{formData.minTemperature}°C</span>
                         </label>
                         <input type="range" min="-30" max="20" step="1" value={formData.minTemperature} onChange={(e) => setFormData({...formData, minTemperature: Number(e.target.value)})} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                         <div className="flex justify-between text-xs text-gray-500 mt-1">
                             <span>-30°C</span>
                             <span>+20°C</span>
                         </div>
                    </div>
                </>
            )}

            <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('q_sunlight')}</label>
                <select value={formData.sunlight} onChange={(e) => setFormData({...formData, sunlight: e.target.value as any})} className="w-full p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white outline-none">
                    <option value="full_sun">{t('sun_full')}</option>
                    <option value="partial">{t('sun_partial')}</option>
                    <option value="shade">{t('sun_shade')}</option>
                </select>
            </div>

            {formData.outdoorType !== 'pot' && (
                <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('q_soil')}</label>
                    <select value={formData.soil} onChange={(e) => setFormData({...formData, soil: e.target.value as any})} className="w-full p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white outline-none">
                        <option value="loam">{t('soil_loam')}</option>
                        <option value="sandy">{t('soil_sandy')}</option>
                        <option value="clay">{t('soil_clay')}</option>
                        <option value="peat">{t('soil_peat')}</option>
                        <option value="unknown">{t('soil_unknown')}</option>
                    </select>
                </div>
            )}

            <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('q_space')}</label>
                 <div className="flex gap-2">
                    {['small', 'medium', 'large'].map((s) => (
                        <button key={s} onClick={() => setFormData({...formData, space: s as any})} className={`flex-1 p-2 rounded-lg border text-xs font-medium transition-colors ${formData.space === s ? 'bg-green-100 border-green-500 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'}`}>
                            {t(`space_${s}` as any)}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                 <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                     {t('q_height_range')}
                 </label>
                 
                 {/* Min Height */}
                 <div className="mb-4">
                     <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">{t('min_height')}</span>
                        <span className="text-green-600 font-bold">{formData.minHeight}cm</span>
                     </div>
                     <input 
                        type="range" 
                        min="0" 
                        max="500" 
                        step="10" 
                        value={formData.minHeight} 
                        onChange={(e) => {
                            const val = Number(e.target.value);
                            if (val <= formData.maxHeight) {
                                setFormData({...formData, minHeight: val});
                            }
                        }} 
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600" 
                     />
                 </div>

                 {/* Max Height */}
                 <div>
                     <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">{t('max_height')}</span>
                        <span className="text-green-600 font-bold">{formData.maxHeight >= 500 ? '500+' : formData.maxHeight + 'cm'}</span>
                     </div>
                     <input 
                        type="range" 
                        min="0" 
                        max="500" 
                        step="10" 
                        value={formData.maxHeight} 
                        onChange={(e) => {
                            const val = Number(e.target.value);
                            if (val >= formData.minHeight) {
                                setFormData({...formData, maxHeight: val});
                            }
                        }} 
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600" 
                     />
                 </div>
                 
                 <div className="flex justify-between text-xs text-gray-500 mt-1">
                     <span>0cm</span>
                     <span>5m+</span>
                 </div>
            </div>
            
            <button onClick={() => setStep('preferences')} className="w-full py-3 bg-green-600 text-white font-bold rounded-xl shadow-md">{t('next')}</button>
        </div>
    );

    const renderPreferencesStep = () => {
        // Helper to get maintenance text
        const getMaintText = (val: number) => {
            if (val < 25) return t('maint_desc_0');
            if (val < 50) return t('maint_desc_25');
            if (val < 75) return t('maint_desc_50');
            return t('maint_desc_75');
        };

        const plantTypes = [
            'annual', 'perennial', 'bulb', 'tuber', // Life cycle/root
            'shrubs', 'trees', 'climber', 'ground', // Growth habit
            'flowering', 'foliage', 'grass', 'fern', 'succulent', 'edible' // Features
        ];

        return (
            <div className="space-y-6 animate-in slide-in-from-right pb-10">
                 <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('q_types')}</label>
                    <div className="flex flex-wrap gap-2">
                        {plantTypes.map(type => (
                            <button key={type} onClick={() => handleToggle('plantTypes', type)} className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${formData.plantTypes.includes(type) ? 'bg-green-600 text-white border-green-600' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'}`}>
                                {t(`type_${type}` as any)}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('q_colors')}</label>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                        {['red', 'yellow', 'blue', 'purple', 'pink', 'white', 'orange'].map(c => (
                            <button key={c} onClick={() => handleToggle('colors', c)} className={`w-8 h-8 rounded-full border-2 flex-shrink-0 ${formData.colors.includes(c) ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent'}`} style={{ backgroundColor: c === 'white' ? '#f0f0f0' : c }} />
                        ))}
                    </div>
                </div>

                <div>
                     <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('q_maintenance')}</label>
                     <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        step="1" 
                        value={formData.maintenance} 
                        onChange={(e) => setFormData({...formData, maintenance: Number(e.target.value)})} 
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600" 
                     />
                     <div className="mt-2 text-center font-medium text-green-600 dark:text-green-400 text-sm bg-green-50 dark:bg-green-900/20 p-2 rounded-lg border border-green-100 dark:border-green-800 transition-all">
                         {getMaintText(formData.maintenance)}
                     </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('q_special')}</label>
                    <div className="flex flex-wrap gap-2">
                        {['scent', 'pollinator', 'nontoxic', 'edible', 'fast', 'evergreen'].map(spec => (
                            <button key={spec} onClick={() => handleToggle('special', spec)} className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${formData.special.includes(spec) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'}`}>
                                {t(`spec_${spec}` as any)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex gap-3 pt-4">
                    <button onClick={() => setStep('location')} className="flex-1 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-200 font-bold rounded-xl">{t('back')}</button>
                    <button onClick={executeAdvice} className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl shadow-md">{t('analyze_button')}</button>
                </div>
            </div>
        );
    };

    const renderResults = () => (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 pb-10">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('advice_results_title')}</h3>
                <div className="flex gap-2">
                    <button onClick={handleCopy} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"><Icons.Copy className="w-5 h-5"/></button>
                    <button onClick={handlePDF} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"><Icons.FileText className="w-5 h-5"/></button>
                </div>
            </div>

            {recommendations.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                    <Icons.Search className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 dark:text-gray-300">{t('no_advice_match')}</p>
                    <button onClick={() => setStep('location')} className="mt-4 text-green-600 font-bold underline">{t('advice_new_search')}</button>
                </div>
            ) : (
                <div className="space-y-4">
                    {recommendations.map((item, idx) => (
                        <div key={idx} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
                            <div className="flex h-40 sm:h-32">
                                <div className="w-32 bg-gray-200 dark:bg-gray-700 flex-shrink-0 relative group">
                                    {item.img ? (
                                        <img src={item.img} className="w-full h-full object-cover" alt={item.rec.name} />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400"><Icons.Sprout className="w-8 h-8" /></div>
                                    )}
                                    {/* Overlay Search Button */}
                                    <button 
                                        onClick={() => handleWebSearch(item.rec)}
                                        className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                                        title={t('web_search')}
                                    >
                                        <Icons.Search className="w-8 h-8 drop-shadow-md" />
                                    </button>
                                </div>
                                <div className="flex-1 p-3 flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-gray-900 dark:text-white truncate pr-2">{item.rec.name}</h4>
                                            <span className="text-[10px] font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded-full whitespace-nowrap">{item.rec.matchPercentage}%</span>
                                        </div>
                                        <p className="text-xs text-gray-500 italic mb-1">{item.rec.scientificName}</p>
                                    </div>
                                    <div className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 mb-2">
                                        {item.rec.reason}
                                        <div onClick={(e) => e.stopPropagation()} className="inline-block">
                                            <AISpark content={item.rec.reason} isMultiline onAskFlora={onAskFlora} t={t} />
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-end gap-2">
                                        <button 
                                            onClick={() => openNotebookModal(item)}
                                            className="flex items-center gap-1 text-xs font-medium text-yellow-600 dark:text-yellow-400 hover:underline bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-lg transition-colors"
                                        >
                                            <Icons.Book className="w-3 h-3" /> {t('add_to_notebook')}
                                        </button>
                                        <button 
                                            onClick={() => handleWebSearch(item.rec)}
                                            className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg transition-colors"
                                        >
                                            <Icons.Search className="w-3 h-3" /> {t('web_search')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    <button onClick={() => setStep('intro')} className="w-full py-3 mt-4 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-200 font-bold rounded-xl">{t('advice_new_search')}</button>
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors">
            <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                <button onClick={onBack} className="text-gray-600 dark:text-gray-300"><Icons.ArrowLeft /></button>
                <h2 className="ml-4 font-semibold text-lg text-gray-900 dark:text-white">{t('advice_title')}</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {step === 'intro' && (
                    <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-6 animate-in fade-in">
                        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
                            <Icons.Sprout className="w-10 h-10" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('advice_title')}</h2>
                            <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto">{t('advice_desc')}</p>
                        </div>
                        <button onClick={() => setStep('location')} className="px-8 py-3 bg-green-600 text-white font-bold rounded-full shadow-lg hover:bg-green-700 transition-transform active:scale-95">
                            {t('get_started')}
                        </button>
                    </div>
                )}

                {step === 'location' && renderLocationStep()}
                {step === 'preferences' && renderPreferencesStep()}
                
                {step === 'generating' && (
                    <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6 animate-in fade-in">
                        <div className="relative w-24 h-24">
                             <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                             <div className="absolute inset-0 border-4 border-green-500 rounded-full border-t-transparent animate-spin"></div>
                             <Icons.Leaf className="absolute inset-0 m-auto w-10 h-10 text-green-500" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('advice_generating')}</h3>
                        <p className="text-gray-500 dark:text-gray-400">{t('advice_generating_desc')}</p>
                    </div>
                )}

                {step === 'results' && renderResults()}
            </div>

            {/* Search Modal */}
            <SearchResultsModal 
                isOpen={searchModalOpen} 
                onClose={() => setSearchModalOpen(false)} 
                results={searchResults}
                loading={isSearching}
                t={t}
            />

            {/* Add to Notebook Modal */}
            {notebookModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                        <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2"><Icons.Notebook className="w-5 h-5 text-yellow-500"/> {t('add_note')}</h3>
                        <div className="space-y-4 overflow-y-auto">
                            {noteData.imageUrl && (
                                <div className="w-full h-32 rounded-xl overflow-hidden relative">
                                    <img src={noteData.imageUrl} alt="Plant" className="w-full h-full object-cover" />
                                </div>
                            )}
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">{t('note_title_label')} *</label>
                                <input type="text" value={noteData.title} onChange={e => setNoteData({...noteData, title: e.target.value})} className="w-full p-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 rounded-xl border border-gray-200 dark:border-gray-600 outline-none focus:ring-2 focus:ring-green-500" />
                            </div>
                            <DatePicker 
                                label={`${t('log_date_label')} *`}
                                value={noteData.date} 
                                onChange={(d) => setNoteData({...noteData, date: d})} 
                                required 
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
