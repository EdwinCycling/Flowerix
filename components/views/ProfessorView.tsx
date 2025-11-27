
import React, { useState } from 'react';
import { Icons } from '../Icons';
import { Plant, TimelineItem, LogItem } from '../../types';
import { askPlantProfessor } from '../../services/geminiService';
import { DatePicker } from '../ui/DatePicker';
import { generateProfessorPDF } from '../../services/pdfService';
import { AISpark } from '../ui/AISpark';

interface ProfessorViewProps {
    plants: Plant[];
    onBack: () => void;
    onSaveToLog: (plantId: string, title: string, desc: string, image: string) => void;
    onAddToNotebook: (item: TimelineItem) => void;
    handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => void;
    lang: 'en' | 'nl';
    t: (key: string) => string;
    onAskFlora: (text: string) => void;
}

type ProfessorStep = 'select_source' | 'select_plant' | 'select_question' | 'thinking' | 'result';

export const ProfessorView: React.FC<ProfessorViewProps> = ({ 
    plants, onBack, onSaveToLog, onAddToNotebook, handleImageUpload, lang, t, onAskFlora 
}) => {
    const [step, setStep] = useState<ProfessorStep>('select_source');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
    const [selectedQuestionKey, setSelectedQuestionKey] = useState<string>('');
    const [resultText, setResultText] = useState<string | null>(null);
    
    // Notebook Modal
    const [notebookModalOpen, setNotebookModalOpen] = useState(false);
    const [noteData, setNoteData] = useState<{ title: string, desc: string, date: string }>({ title: '', desc: '', date: '' });

    // Categories Definition
    const categories = [
        {
            id: 'cat1',
            title: t('prof_cat_basic'),
            questions: ['prof_q_guide', 'prof_q_light', 'prof_q_water', 'prof_q_nutrition', 'prof_q_soil', 'prof_q_temp']
        },
        {
            id: 'cat2',
            title: t('prof_cat_growth'),
            questions: ['prof_q_profile', 'prof_q_bloom', 'prof_q_propagation', 'prof_q_pruning']
        },
        {
            id: 'cat3',
            title: t('prof_cat_specific'),
            questions: ['prof_q_problems', 'prof_q_toxicity', 'prof_q_trivia', 'prof_q_winter', 'prof_q_compare']
        }
    ];

    const handleNewPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleImageUpload(e, (base64) => {
            setSelectedImage(base64);
            setSelectedPlantId(null);
            setStep('select_question');
        });
    };

    const handlePlantSelect = (plant: Plant) => {
        // Use the main image or the latest log image
        let img = plant.imageUrl;
        if (!img && plant.logs.length > 0) {
            const logWithImg = plant.logs.find(l => l.imageUrl);
            if (logWithImg) img = logWithImg.imageUrl;
        }

        if (img) {
            setSelectedImage(img);
            setSelectedPlantId(plant.id);
            setStep('select_question');
        } else {
            alert(t('no_photos'));
        }
    };

    const executeQuestion = async (qKey: string) => {
        if (!selectedImage) return;
        setSelectedQuestionKey(qKey);
        setStep('thinking');
        
        const questionText = t(qKey);
        const response = await askPlantProfessor(selectedImage, questionText, lang);
        
        if (response) {
            setResultText(response);
            setStep('result');
        } else {
            alert("Professor is busy. Please try again.");
            setStep('select_question');
        }
    };

    const handleSaveLog = () => {
        if (selectedPlantId && resultText && selectedImage) {
            const title = `${t('professor_title')}: ${t(selectedQuestionKey)}`;
            onSaveToLog(selectedPlantId, title, resultText, selectedImage);
        }
    };

    const openNotebookModal = () => {
        if (!resultText) return;
        setNoteData({
            title: `${t('professor_title')}: ${t(selectedQuestionKey)}`,
            desc: resultText,
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

    // Custom Markdown Renderer
    const renderMarkdown = (text: string) => {
        if (!text) return null;
        
        // Helper to parse inline bold/italic
        const parseContent = (content: string) => {
            // Split by bold syntax (**text**)
            const parts = content.split(/(\*\*.*?\*\*)/g);
            return parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={i} className="font-bold text-indigo-900 dark:text-indigo-200">{part.slice(2, -2)}</strong>;
                }
                // Handle italics (*text*) - basic check ensuring length > 2
                if (part.startsWith('*') && part.endsWith('*') && part.length > 2 && !part.includes('**')) {
                     return <em key={i} className="italic">{part.slice(1, -1)}</em>;
                }
                return part;
            });
        };

        return text.split('\n').map((line, index) => {
            const trimmed = line.trim();
            if (!trimmed) return <div key={index} className="h-2" />; // Spacer

            // Headers
            if (trimmed.startsWith('# ')) return <h2 key={index} className="text-xl font-bold mt-5 mb-2 text-indigo-700 dark:text-indigo-300 pb-1 border-b border-indigo-100 dark:border-indigo-800">{parseContent(trimmed.slice(2))}</h2>;
            if (trimmed.startsWith('## ')) return <h3 key={index} className="text-lg font-bold mt-4 mb-2 text-indigo-600 dark:text-indigo-400">{parseContent(trimmed.slice(3))}</h3>;
            if (trimmed.startsWith('### ')) return <h4 key={index} className="text-md font-bold mt-3 mb-1 text-indigo-500 dark:text-indigo-500">{parseContent(trimmed.slice(4))}</h4>;
            if (trimmed.startsWith('#### ')) return <h5 key={index} className="text-sm font-bold mt-2 mb-1 text-indigo-400 dark:text-indigo-300 uppercase tracking-wide">{parseContent(trimmed.slice(5))}</h5>;

            // Unordered Lists (- or *)
            if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                return (
                    <div key={index} className="flex items-start gap-2 ml-1 mb-2">
                        <span className="text-indigo-400 mt-2 w-1.5 h-1.5 bg-indigo-400 rounded-full flex-shrink-0"></span>
                        <span className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm">{parseContent(trimmed.slice(2))}</span>
                    </div>
                );
            }

            // Ordered Lists (1. , 2. )
            const orderedMatch = trimmed.match(/^(\d+)\.\s(.*)/);
            if (orderedMatch) {
                const number = orderedMatch[1];
                const content = orderedMatch[2];
                return (
                    <div key={index} className="flex items-start gap-2 ml-1 mb-2">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 min-w-[20px] text-sm mt-0.5">{number}.</span>
                        <span className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm">{parseContent(content)}</span>
                    </div>
                );
            }

            // Standard Paragraph
            return <p key={index} className="mb-2 text-gray-700 dark:text-gray-300 leading-relaxed text-sm">{parseContent(trimmed)}</p>;
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <button onClick={() => {
                        if (step === 'result') setStep('select_question');
                        else if (step === 'select_question') setStep('select_source');
                        else if (step === 'select_plant') setStep('select_source');
                        else onBack();
                    }} className="text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-full transition-colors"><Icons.ArrowLeft /></button>
                    <h2 className="font-semibold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                        <Icons.GraduationCap className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        {t('professor_title')}
                    </h2>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 pb-24">
                
                {/* STEP 1: SOURCE */}
                {step === 'select_source' && (
                    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-8 animate-in fade-in">
                        <div className="text-center max-w-xs mb-4">
                            <p className="text-gray-600 dark:text-gray-300">{t('professor_desc')}</p>
                        </div>

                        <button onClick={() => setStep('select_plant')} className="flex flex-col items-center gap-4 group">
                            <div className="w-24 h-24 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center shadow-md group-hover:scale-105 transition-transform border-2 border-indigo-100 dark:border-indigo-800 group-hover:border-indigo-300">
                                <Icons.Sprout className="w-10 h-10 text-indigo-500 dark:text-indigo-400" />
                            </div>
                            <span className="font-bold text-gray-700 dark:text-gray-200 text-lg">{t('choose_plant')}</span>
                        </button>

                        <div className="w-full max-w-xs">
                            <label className="flex items-center justify-center w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg cursor-pointer hover:bg-indigo-700 transition-transform active:scale-95 gap-3">
                                <Icons.Camera className="w-6 h-6" />
                                {t('take_photo')}
                                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleNewPhoto} />
                            </label>
                        </div>
                    </div>
                )}

                {/* STEP 2: SELECT PLANT (Compact Cards) */}
                {step === 'select_plant' && (
                    <div className="space-y-4 animate-in slide-in-from-right">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center">{t('choose_plant')}</h3>
                        {plants.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {plants.map(p => {
                                    const img = p.imageUrl || (p.logs.find(l => l.imageUrl)?.imageUrl);
                                    if (!img) return null;
                                    return (
                                        <div key={p.id} onClick={() => handlePlantSelect(p)} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between h-24 cursor-pointer hover:border-indigo-500 transition-all group">
                                            <div>
                                                <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">{p.name}</h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 italic truncate">{p.scientificName}</p>
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <span className="text-[10px] text-gray-400 truncate max-w-[80px]">{p.description?.slice(0, 15)}...</span>
                                                <Icons.ArrowRight className="w-4 h-4 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
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

                {/* STEP 3: SELECT QUESTION */}
                {step === 'select_question' && selectedImage && (
                    <div className="space-y-6 animate-in slide-in-from-right pb-10">
                        <div className="w-32 h-32 mx-auto rounded-full overflow-hidden shadow-lg border-4 border-white dark:border-gray-700 mb-4">
                            <img src={selectedImage} className="w-full h-full object-cover" alt="Selected" />
                        </div>
                        
                        <h3 className="text-center text-lg font-bold text-gray-900 dark:text-white">{t('prof_select_topic')}</h3>

                        <div className="space-y-4">
                            {categories.map(cat => (
                                <div key={cat.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
                                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 border-b border-indigo-100 dark:border-indigo-800/30">
                                        <h4 className="font-bold text-indigo-800 dark:text-indigo-300 text-sm">{cat.title}</h4>
                                    </div>
                                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {cat.questions.map(q => (
                                            <button 
                                                key={q} 
                                                onClick={() => executeQuestion(q)}
                                                className="w-full text-left p-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex justify-between items-center"
                                            >
                                                {t(q)}
                                                <Icons.ArrowLeft className="w-4 h-4 text-gray-400 rotate-180" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* STEP 4: THINKING */}
                {step === 'thinking' && (
                    <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6 animate-in fade-in">
                        <div className="relative w-24 h-24">
                             <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                             <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
                             <Icons.GraduationCap className="absolute inset-0 m-auto w-10 h-10 text-indigo-500" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('prof_thinking')}</h3>
                    </div>
                )}

                {/* STEP 5: RESULT */}
                {step === 'result' && resultText && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-3 mb-4 border-b border-gray-100 dark:border-gray-700 pb-3">
                                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400">
                                    <Icons.GraduationCap className="w-6 h-6" />
                                </div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                    {t('prof_answer_title')}
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <AISpark content={resultText} isMultiline onAskFlora={onAskFlora} t={t} />
                                    </div>
                                </h3>
                            </div>
                            
                            {/* Optimized Markdown Rendering */}
                            <div className="prose-sm dark:prose-invert max-w-none">
                                {renderMarkdown(resultText)}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                                <button onClick={() => { navigator.clipboard.writeText(resultText); alert(t('copy_success')); }} className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2 text-sm">
                                    <Icons.Copy className="w-4 h-4" /> {t('copy_text')}
                                </button>
                                <button onClick={() => generateProfessorPDF(`${t('professor_title')}: ${t(selectedQuestionKey)}`, resultText, selectedImage, lang, t)} className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2 text-sm">
                                    <Icons.FileText className="w-4 h-4" /> PDF
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button onClick={openNotebookModal} className="flex-1 py-3 bg-yellow-500 text-white font-bold rounded-xl shadow-md hover:bg-yellow-600 transition-colors flex items-center justify-center gap-2">
                                <Icons.Book className="w-5 h-5" /> {t('add_to_notebook')}
                            </button>
                            {selectedPlantId && (
                                <button onClick={handleSaveLog} className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl shadow-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                                    <Icons.FileText className="w-5 h-5" /> {t('prof_save_log')}
                                </button>
                            )}
                        </div>
                        
                        <button onClick={() => setStep('select_question')} className="w-full py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            {t('prof_ask_another')}
                        </button>
                    </div>
                )}
            </div>

            {/* Notebook Modal */}
            {notebookModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                        <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2"><Icons.Notebook className="w-5 h-5 text-yellow-500"/> {t('add_note')}</h3>
                        <div className="space-y-4 overflow-y-auto">
                            {selectedImage && (
                                <div className="w-full h-32 rounded-xl overflow-hidden relative">
                                    <img src={selectedImage} alt="Plant" className="w-full h-full object-cover" />
                                </div>
                            )}
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">{t('note_title_label')} *</label>
                                <input type="text" value={noteData.title} onChange={e => setNoteData({...noteData, title: e.target.value})} className="w-full p-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 rounded-xl border border-gray-200 dark:border-gray-600 outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <DatePicker 
                                label={`${t('log_date_label')} *`}
                                value={noteData.date} 
                                onChange={(d) => setNoteData({...noteData, date: d})} 
                                required 
                            />
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">{t('desc_label')}</label>
                                <textarea rows={5} value={noteData.desc} onChange={e => setNoteData({...noteData, desc: e.target.value})} className="w-full p-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 rounded-xl border border-gray-200 dark:border-gray-600 outline-none focus:ring-2 focus:ring-indigo-500" />
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
