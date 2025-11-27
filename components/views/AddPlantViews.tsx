
import React from 'react';
import { Icons } from '../Icons';
import { AISuggestion, Plant } from '../../types';
import { DatePicker } from '../ui/DatePicker';

// --- Photo Upload View ---
interface AddPlantPhotoViewProps {
    newPlantImage: string | null;
    onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onIdentify: () => void;
    onManual: () => void;
    onBack: () => void;
    t: (key: string) => string;
    limitAI: boolean;
}

export const AddPlantPhotoView: React.FC<AddPlantPhotoViewProps> = ({ newPlantImage, onImageUpload, onIdentify, onManual, onBack, t, limitAI }) => (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col transition-colors">
        <div className="px-4 py-3 flex items-center border-b border-gray-200 dark:border-gray-700">
            <button onClick={onBack} className="text-gray-600 dark:text-gray-300"><Icons.ArrowLeft /></button>
            <h2 className="ml-4 font-semibold text-lg text-gray-900 dark:text-white">{t('add_plant_title')}</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
            {newPlantImage ? (
                <div className="relative w-full max-w-sm aspect-[3/4] rounded-2xl overflow-hidden shadow-lg">
                    <img src={newPlantImage} alt="Preview" className="w-full h-full object-cover" />
                </div>
            ) : (
                <div className="w-full max-w-sm aspect-[3/4] bg-gray-100 dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center text-gray-400 gap-2">
                    <Icons.Camera className="w-12 h-12" />
                    <span>No photo selected</span>
                </div>
            )}
            <div className="flex flex-col w-full max-w-sm gap-3">
                <label className="bg-white dark:bg-gray-800 border border-green-600 text-green-600 dark:text-green-400 font-medium py-3 rounded-xl text-center cursor-pointer hover:bg-green-50 dark:hover:bg-gray-700 transition-colors">
                    {newPlantImage ? t('retake_photo') : t('take_photo')}
                    <input type="file" accept="image/*" className="hidden" onChange={onImageUpload} />
                </label>
                
                {newPlantImage && !limitAI && (
                    <button onClick={onIdentify} className="bg-green-600 text-white font-medium py-3 rounded-xl shadow-lg hover:bg-green-700 flex items-center justify-center gap-2 transition-colors">
                        <Icons.Search className="w-5 h-5" />
                        {t('identify_ai')}
                    </button>
                )}

                {newPlantImage && (
                    limitAI ? (
                        <button onClick={onManual} className="bg-green-600 text-white font-medium py-3 rounded-xl shadow-lg hover:bg-green-700 flex items-center justify-center gap-2 transition-colors">
                            <Icons.Edit2 className="w-5 h-5" />
                            {t('manual_entry_btn')}
                        </button>
                    ) : (
                        <button onClick={onManual} className="text-gray-500 dark:text-gray-400 text-sm py-2 underline hover:text-gray-700 dark:hover:text-gray-200">{t('skip_manual')}</button>
                    )
                )}
            </div>
        </div>
    </div>
);

// --- Identifying Loader ---
export const IdentifyingView: React.FC<{ t: (key: string) => string }> = ({ t }) => (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center justify-center p-6 text-center transition-colors">
        <div className="animate-spin mb-4">
            <Icons.Leaf className="w-12 h-12 text-green-600 dark:text-green-500" />
        </div>
        <h2 className="text-xl font-bold text-green-900 dark:text-green-100">{t('analyzing')}</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">{t('analyzing_desc')}</p>
    </div>
);

// --- Identification Result ---
interface IdentificationResultViewProps {
    image: string | null;
    suggestion: AISuggestion | null;
    onConfirm: () => void;
    onManual: () => void;
    onBack: () => void;
    t: (key: string) => string;
}

export const IdentificationResultView: React.FC<IdentificationResultViewProps> = ({ image, suggestion, onConfirm, onManual, onBack, t }) => (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors">
        <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
            <button onClick={onBack} className="text-gray-600 dark:text-gray-300"><Icons.ArrowLeft /></button>
            <h2 className="ml-4 font-semibold text-lg text-center flex-1 mr-6 text-gray-900 dark:text-white">{t('identified_title')}</h2>
        </div>
        <div className="flex-1 flex flex-col p-6 overflow-y-auto pb-10">
            <div className="w-full aspect-square max-w-xs mx-auto bg-gray-200 dark:bg-gray-700 rounded-2xl overflow-hidden shadow-lg mb-6 relative">
                <img src={image || ''} className="w-full h-full object-cover" alt="Identified Plant" />
                <div className="absolute bottom-4 right-4 bg-green-500 text-white p-2 rounded-full shadow-lg"><Icons.Sparkles className="w-6 h-6" /></div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm space-y-4 mb-6 transition-colors">
                <div className="text-center border-b border-gray-100 dark:border-gray-700 pb-4">
                    <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full inline-block mb-2">{t('best_match')}</div>
                    <h2 className="text-2xl font-bold text-green-900 dark:text-white">{suggestion?.name}</h2>
                    <p className="text-green-700 dark:text-green-400 italic font-medium">{suggestion?.scientificName}</p>
                    {suggestion?.isIndoor !== undefined && (
                        <div className={`inline-block px-2 py-1 rounded-full text-xs mt-2 ${suggestion.isIndoor ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'}`}>
                            {suggestion.isIndoor ? t('plant_type_indoor') : t('plant_type_outdoor')}
                        </div>
                    )}
                </div>
                <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t('description')}</h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{suggestion?.description}</p>
                </div>
                <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t('care_preview')}</h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed line-clamp-3">{suggestion?.careInstructions}</p>
                </div>
            </div>
            <div className="space-y-3 mt-auto">
                <button onClick={onConfirm} className="w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-md hover:bg-green-700 flex items-center justify-center gap-2 transition-transform active:scale-95"><Icons.Check className="w-5 h-5" />{t('yes_use')}</button>
                <button onClick={onManual} className="w-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold py-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center gap-2 transition-colors"><Icons.Edit2 className="w-4 h-4" />{t('no_manual')}</button>
            </div>
        </div>
    </div>
);

// --- Details Form ---
interface AddPlantDetailsViewProps {
    tempPlantDetails: Partial<Plant>;
    setTempPlantDetails: (d: Partial<Plant>) => void;
    isGeneratingInfo: boolean;
    onAutoFill: () => void;
    onSave: () => void;
    onBack: () => void;
    t: (key: string) => string;
}

export const AddPlantDetailsView: React.FC<AddPlantDetailsViewProps> = ({
    tempPlantDetails, setTempPlantDetails, isGeneratingInfo, onAutoFill, onSave, onBack, t
}) => (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col transition-colors">
        <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
            <button onClick={onBack} className="text-gray-600 dark:text-gray-300"><Icons.ArrowLeft /></button>
            <h2 className="ml-4 font-semibold text-lg text-gray-900 dark:text-white">{t('plant_details_title')}</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-6 pb-24">
            <div className="space-y-6 max-w-lg mx-auto">
                {/* Image Preview if available */}
                {tempPlantDetails.imageUrl && (
                    <div className="w-32 h-32 mx-auto rounded-full overflow-hidden shadow-lg border-4 border-white dark:border-gray-700">
                        <img src={tempPlantDetails.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('name_label')}</label>
                    <input 
                        type="text" 
                        maxLength={99}
                        value={tempPlantDetails.name || ''} 
                        onChange={(e) => setTempPlantDetails({ ...tempPlantDetails, name: e.target.value })} 
                        placeholder={t('name_placeholder')}
                        className="w-full p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-green-500 transition-all" 
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('scientific_name_label')}</label>
                    <input 
                        type="text" 
                        value={tempPlantDetails.scientificName || ''} 
                        onChange={(e) => setTempPlantDetails({ ...tempPlantDetails, scientificName: e.target.value })} 
                        placeholder={t('scientific_placeholder')}
                        className="w-full p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white italic outline-none focus:ring-2 focus:ring-green-500 transition-all" 
                    />
                </div>

                <div className="flex justify-end">
                    <button onClick={onAutoFill} disabled={isGeneratingInfo || (!tempPlantDetails.name && !tempPlantDetails.scientificName)} className="text-sm text-green-600 dark:text-green-400 font-bold flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed hover:underline">
                        {isGeneratingInfo ? (
                            <><div className="animate-spin h-3 w-3 border-2 border-green-600 border-t-transparent rounded-full"></div> {t('generating')}</>
                        ) : (
                            <><Icons.Sparkles className="w-4 h-4" /> {t('autofill_ai')}</>
                        )}
                    </button>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('is_indoor_label')}</label>
                    <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                        <button onClick={() => setTempPlantDetails({...tempPlantDetails, isIndoor: true})} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tempPlantDetails.isIndoor ? 'bg-white dark:bg-gray-600 shadow text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>{t('plant_type_indoor')}</button>
                        <button onClick={() => setTempPlantDetails({...tempPlantDetails, isIndoor: false})} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tempPlantDetails.isIndoor === false ? 'bg-white dark:bg-gray-600 shadow text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>{t('plant_type_outdoor')}</button>
                    </div>
                </div>

                <DatePicker 
                    label={t('date_planted_label')}
                    value={tempPlantDetails.datePlanted || ''}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(val) => setTempPlantDetails({ ...tempPlantDetails, datePlanted: val })}
                />

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('desc_label')}</label>
                    <textarea 
                        rows={3} 
                        value={tempPlantDetails.description || ''} 
                        onChange={(e) => setTempPlantDetails({ ...tempPlantDetails, description: e.target.value })} 
                        placeholder={t('desc_placeholder')}
                        className="w-full p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-green-500 transition-all" 
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('care_label')}</label>
                    <textarea 
                        rows={5} 
                        value={tempPlantDetails.careInstructions || ''} 
                        onChange={(e) => setTempPlantDetails({ ...tempPlantDetails, careInstructions: e.target.value })} 
                        placeholder={t('care_placeholder')}
                        className="w-full p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-green-500 transition-all" 
                    />
                </div>
            </div>
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <button onClick={onSave} disabled={!tempPlantDetails.name} className="w-full bg-green-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-green-700 transition-all active:scale-95">
                {t('add_to_garden')}
            </button>
        </div>
    </div>
);
