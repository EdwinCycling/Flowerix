
import React, { useState } from 'react';
import { Icons } from '../Icons';
import { AnalysisResult, AnalysisType, Plant, TimelineItem } from '../../types';
import { analyzePlantHealth } from '../../services/geminiService';
import { DatePicker } from '../ui/DatePicker';
import { AISpark } from '../ui/AISpark';

interface PlantAnalysisViewProps {
    plants: Plant[];
    onBack: () => void;
    onSaveToLog: (plantId: string, result: AnalysisResult, image: string) => void;
    onAddToNotebook: (item: TimelineItem) => void;
    handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void, mode?: 'standard' | 'high') => void;
    lang: 'en' | 'nl';
    t: (key: string) => string;
    onAskFlora: (text: string) => void;
}

export const PlantAnalysisView: React.FC<PlantAnalysisViewProps> = ({ plants, onBack, onSaveToLog, onAddToNotebook, handleImageUpload, lang, t, onAskFlora }) => {
    const [step, setStep] = useState<'select_source' | 'select_plant' | 'select_plant_photo' | 'select_type' | 'analyzing' | 'result'>('select_source');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null); // If existing photo selected
    const [analysisType, setAnalysisType] = useState<AnalysisType>('general');
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [targetPlantForLog, setTargetPlantForLog] = useState<string>(''); // User choice for saving
    
    // New: Store the plant we are browsing photos for
    const [browsingPlant, setBrowsingPlant] = useState<Plant | null>(null);

    // Notebook Modal State
    const [notebookModalOpen, setNotebookModalOpen] = useState(false);
    const [noteData, setNoteData] = useState<{ title: string, desc: string, date: string }>({ title: '', desc: '', date: '' });

    // --- Step 1: Image Selection Logic ---
    
    // Handle New Photo (Camera/Upload) with HIGH QUALITY MODE
    const handleNewPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleImageUpload(e, (base64) => {
            setSelectedImage(base64);
            setSelectedPlantId(null);
            setTargetPlantForLog(''); // Reset choice
            setBrowsingPlant(null);
            setStep('select_type');
        }, 'high'); // Request high quality for doctor analysis
    };

    // Triggered when clicking a plant in the main list
    const handlePlantClick = (plant: Plant) => {
        setBrowsingPlant(plant);
        setStep('select_plant_photo');
    };

    // Triggered when selecting a specific photo from the plant's sub-menu
    const handleSelectExistingPhoto = (plantId: string, img: string) => {
        setSelectedImage(img);
        setSelectedPlantId(plantId);
        setTargetPlantForLog(plantId); // Pre-select the correct plant
        setStep('select_type');
    };

    // --- Navigation ---
    const handleInternalBack = () => {
        switch(step) {
            case 'select_source': onBack(); break; // Go to Dashboard
            case 'select_plant': setStep('select_source'); break;
            case 'select_plant_photo': setStep('select_plant'); break;
            case 'select_type': 
                if (selectedPlantId) setStep('select_plant_photo');
                else setStep('select_source');
                break;
            case 'result': setStep('select_type'); break;
            default: onBack();
        }
    };

    // --- Step 2: Analysis Logic ---
    const executeAnalysis = async () => {
        if (!selectedImage) return;
        setStep('analyzing');
        try {
            const analysis = await analyzePlantHealth(selectedImage, analysisType, lang);
            if (analysis) {
                setResult(analysis);
                setStep('result');
            } else {
                alert("Analysis failed. Please try again.");
                setStep('select_type');
            }
        } catch (e) {
            console.error(e);
            alert("Error during analysis.");
            setStep('select_type');
        }
    };

    // --- Step 3: Saving Logic ---
    const handleSave = () => {
        if (result && selectedImage && targetPlantForLog) {
            onSaveToLog(targetPlantForLog, result, selectedImage);
        }
    };

    const openNotebookModal = () => {
        if (!result) return;
        setNoteData({
            title: `${t('plant_doctor')}: ${result.diagnosis}`,
            desc: `${t('symptoms_label')}: ${result.symptoms.join(', ')}\n\n${t('treatment_label')}:\n${result.treatment}`,
            date: new Date().toISOString().split('T')[0],
        });
        setNotebookModalOpen(true);
    };

    const saveToNotebook = () => {
        if (!noteData.title || !selectedImage) return;
        const newNote: TimelineItem = {
            id: Date.now().toString(),
            type: 'NOTE',
            title: noteData.title,
            description: noteData.desc,
            date: noteData.date,
            imageUrl: selectedImage
        };
        onAddToNotebook(newNote);
        setNotebookModalOpen(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <button onClick={handleInternalBack} className="text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-full transition-colors"><Icons.ArrowLeft /></button>
                    <h2 className="font-semibold text-lg text-gray-900 dark:text-white">{t('analysis_title')}</h2>
                </div>
                <button onClick={onBack} className="text-green-600 dark:text-green-400 flex items-center gap-1 text-sm font-bold hover:bg-green-50 dark:hover:bg-green-900/20 px-3 py-1.5 rounded-lg transition-colors">
                    <Icons.Home className="w-4 h-4" /> {t('dashboard')}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 pb-24">
                
                {/* STEP 1: SELECT SOURCE */}
                {step === 'select_source' && (
                    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-8 animate-in fade-in">
                        {/* Select from Plants */}
                        <button onClick={() => setStep('select_plant')} className="flex flex-col items-center gap-4 group">
                            <div className="w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center shadow-md group-hover:scale-105 transition-transform border-2 border-red-100 dark:border-red-800 group-hover:border-red-300">
                                <Icons.Image className="w-10 h-10 text-red-500 dark:text-red-400" />
                            </div>
                            <span className="font-bold text-gray-700 dark:text-gray-200 text-lg">{t('select_photo_btn')}</span>
                        </button>

                        {/* Take Photo */}
                        <div className="w-full max-w-xs">
                            <label className="flex items-center justify-center w-full bg-green-600 text-white font-bold py-4 rounded-2xl shadow-lg cursor-pointer hover:bg-green-700 transition-transform active:scale-95 gap-3">
                                <Icons.Camera className="w-6 h-6" />
                                {t('take_photo')}
                                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleNewPhoto} />
                            </label>
                        </div>
                    </div>
                )}

                {/* STEP 2: SELECT PLANT (Compact Mode) */}
                {step === 'select_plant' && (
                    <div className="space-y-6 animate-in slide-in-from-right">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center">{t('choose_plant')}</h3>
                        {plants.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {plants.map(p => {
                                    // Check if plant has any photos
                                    const hasMain = !!p.imageUrl;
                                    const logPhotos = p.logs.filter(l => l.imageUrl);
                                    if (!hasMain && logPhotos.length === 0) return null;
                                    
                                    return (
                                        <div key={p.id} onClick={() => handlePlantClick(p)} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between h-24 cursor-pointer hover:border-green-500 transition-all group">
                                            <div>
                                                <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">{p.name}</h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 italic truncate">{p.scientificName}</p>
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <span className="text-[10px] text-gray-400 truncate max-w-[80px]">{p.description?.slice(0, 15)}...</span>
                                                <Icons.ArrowRight className="w-4 h-4 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-center text-gray-500 py-10">{t('no_plants')}</p>
                        )}
                    </div>
                )}

                {/* STEP 3: SELECT PHOTO FROM SPECIFIC PLANT */}
                {step === 'select_plant_photo' && browsingPlant && (
                    <div className="space-y-6 animate-in slide-in-from-right">
                        <div className="flex flex-col items-center mb-4">
                            <h3 className="font-bold text-xl text-gray-900 dark:text-white">{browsingPlant.name}</h3>
                            <span className="text-sm text-gray-500 dark:text-gray-400">{t('select_photo_btn')}</span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {/* Main Photo */}
                            {browsingPlant.imageUrl && (
                                <div 
                                    onClick={() => handleSelectExistingPhoto(browsingPlant.id, browsingPlant.imageUrl!)}
                                    className="relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 border-transparent hover:border-green-500 shadow-sm group transition-all"
                                >
                                    <img src={browsingPlant.imageUrl} className="w-full h-full object-cover" alt="Main" />
                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2">
                                        <p className="text-white text-xs font-bold text-center">{t('set_as_main_photo')}</p>
                                    </div>
                                </div>
                            )}

                            {/* Log Photos */}
                            {browsingPlant.logs.filter(l => l.imageUrl).map(log => (
                                <div 
                                    key={log.id}
                                    onClick={() => handleSelectExistingPhoto(browsingPlant.id, log.imageUrl!)}
                                    className="relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 border-transparent hover:border-green-500 shadow-sm group transition-all"
                                >
                                    <img src={log.imageUrl} className="w-full h-full object-cover" alt={log.title} />
                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2">
                                        <p className="text-white text-xs font-bold truncate">{log.title}</p>
                                        <p className="text-gray-300 text-[10px] truncate">{new Date(log.date).toLocaleDateString(lang === 'nl' ? 'nl-NL' : 'en-US')}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        {/* Empty state check just in case */}
                        {(!browsingPlant.imageUrl && browsingPlant.logs.filter(l => l.imageUrl).length === 0) && (
                             <p className="text-center text-gray-500 py-10">{t('no_photos')}</p>
                        )}
                    </div>
                )}

                {/* STEP 4: SELECT TYPE */}
                {step === 'select_type' && selectedImage && (
                    <div className="space-y-6 animate-in slide-in-from-right">
                        <div className="w-48 h-48 mx-auto rounded-xl overflow-hidden shadow-lg mb-4 border-4 border-white dark:border-gray-700">
                            <img src={selectedImage} className="w-full h-full object-cover" alt="Target" />
                        </div>
                        
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white mb-3">{t('analysis_type_label')}</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {[
                                    { id: 'general', icon: Icons.Activity, label: t('analysis_type_general') },
                                    { id: 'disease', icon: Icons.Stethoscope, label: t('analysis_type_disease') },
                                    { id: 'nutrition', icon: Icons.Sprout, label: t('analysis_type_nutrition') },
                                    { id: 'stress', icon: Icons.Thermometer, label: t('analysis_type_stress') },
                                    { id: 'growth', icon: Icons.ArrowUp, label: t('analysis_type_growth') },
                                    { id: 'harvest', icon: Icons.Leaf, label: t('analysis_type_harvest') },
                                    { id: 'pruning', icon: Icons.ScanLine, label: t('analysis_type_pruning') },
                                ].map(type => (
                                    <button
                                        key={type.id}
                                        onClick={() => setAnalysisType(type.id as AnalysisType)}
                                        className={`p-4 rounded-xl border-2 text-left flex items-center gap-3 transition-all ${analysisType === type.id ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 shadow-md' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-red-200'}`}
                                    >
                                        <type.icon className={`w-6 h-6 ${analysisType === type.id ? 'text-red-500' : 'text-gray-400'}`} />
                                        <span className="font-medium">{type.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button onClick={executeAnalysis} className="w-full py-4 bg-red-600 text-white font-bold rounded-xl shadow-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2">
                            <Icons.Sparkles className="w-5 h-5" /> {t('analyze_button')}
                        </button>
                    </div>
                )}

                {/* STEP 5: ANALYZING */}
                {step === 'analyzing' && (
                    <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6 animate-in fade-in">
                        <div className="relative w-24 h-24">
                             <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                             <div className="absolute inset-0 border-4 border-red-500 rounded-full border-t-transparent animate-spin"></div>
                             <Icons.Stethoscope className="absolute inset-0 m-auto w-10 h-10 text-red-500" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('analyzing_health')}</h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto">{t('analyzing_desc')}</p>
                    </div>
                )}

                {/* STEP 6: RESULT */}
                {step === 'result' && result && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4">
                        {/* Status Card */}
                        <div className={`p-6 rounded-2xl shadow-sm text-white ${result.healthy ? 'bg-green-600' : 'bg-red-500'}`}>
                            <div className="flex items-center gap-3 mb-2">
                                {result.healthy ? <Icons.Check className="w-8 h-8" /> : <Icons.Activity className="w-8 h-8" />}
                                <h2 className="text-2xl font-bold">{result.healthy ? t('health_healthy') : t('health_issue')}</h2>
                            </div>
                            <div className="flex items-start gap-2">
                                <p className="opacity-90 font-medium text-lg">{result.diagnosis}</p>
                                <div className="bg-white/20 rounded-full p-1" onClick={(e) => e.stopPropagation()}>
                                    <AISpark content={result.diagnosis} isMultiline onAskFlora={onAskFlora} t={t} />
                                </div>
                            </div>
                            <div className="mt-4 flex items-center gap-2 text-sm bg-white/20 w-fit px-3 py-1 rounded-full">
                                <Icons.Info className="w-4 h-4" />
                                <span>{t('confidence')}: {result.confidence}%</span>
                            </div>
                        </div>

                        {/* Details */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm space-y-6 border border-gray-100 dark:border-gray-700">
                            <div>
                                <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                                    <Icons.Search className="w-5 h-5 text-gray-400" />
                                    {t('symptoms_label')}
                                </h4>
                                <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1 ml-1">
                                    {result.symptoms.map((s, i) => <li key={i}>{s}</li>)}
                                </ul>
                            </div>
                            
                            <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                                <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                                    <Icons.Stethoscope className="w-5 h-5 text-green-600" />
                                    {t('treatment_label')}
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <AISpark content={result.treatment} isMultiline onAskFlora={onAskFlora} t={t} />
                                    </div>
                                </h4>
                                <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                                    {result.treatment}
                                </p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                            <button onClick={openNotebookModal} className="flex-1 py-3 bg-yellow-500 text-white font-bold rounded-xl shadow-md hover:bg-yellow-600 transition-colors flex items-center justify-center gap-2">
                                <Icons.Book className="w-5 h-5" /> {t('add_to_notebook')}
                            </button>
                        </div>

                        {/* Save to Plant Log Action */}
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h4 className="font-bold text-gray-900 dark:text-white mb-3">{t('save_analysis_log')}</h4>
                            
                            {plants.length > 0 ? (
                                <div className="space-y-3">
                                    <select 
                                        value={targetPlantForLog} 
                                        onChange={(e) => setTargetPlantForLog(e.target.value)}
                                        className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white outline-none"
                                    >
                                        <option value="" disabled>{t('select_plant_for_log')}</option>
                                        {plants.filter(p => p.isActive).map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                    
                                    <button 
                                        onClick={handleSave}
                                        disabled={!targetPlantForLog}
                                        className="w-full py-3 bg-green-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-bold rounded-xl shadow-md hover:bg-green-700 transition-colors"
                                    >
                                        {t('save_entry')}
                                    </button>
                                </div>
                            ) : (
                                <p className="text-gray-500 text-sm">{t('no_plants')}</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Add to Notebook Modal */}
            {notebookModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                        <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2"><Icons.Notebook className="w-5 h-5 text-yellow-500"/> {t('add_note')}</h3>
                        <div className="space-y-4 overflow-y-auto">
                            {selectedImage && (
                                <div className="w-full h-32 rounded-xl overflow-hidden relative">
                                    <img src={selectedImage} alt="Analysis" className="w-full h-full object-cover" />
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
