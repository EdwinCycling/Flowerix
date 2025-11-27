
import React from 'react';
import { Icons } from '../Icons';
import { Plant } from '../../types';
import { DatePicker } from '../ui/DatePicker';

interface EditPlantModalProps {
    isOpen: boolean;
    onClose: () => void;
    editPlantData: Partial<Plant>;
    setEditPlantData: (data: Partial<Plant>) => void;
    handleSave: () => void;
    handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    t: (key: string) => string;
}

export const EditPlantModal: React.FC<EditPlantModalProps> = ({
    isOpen, onClose, editPlantData, setEditPlantData, handleSave, handleImageUpload, t
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('add_plant_title')}</h3>
                    <button onClick={onClose} className="text-gray-500"><Icons.X /></button>
                </div>
                <div className="p-6 overflow-y-auto space-y-4">
                    {/* Image */}
                    <div className="flex flex-col items-center gap-2 w-full">
                        <div className="w-full h-80 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 relative group shadow-inner">
                            {editPlantData.imageUrl ? (
                                <img src={editPlantData.imageUrl} className="w-full h-full object-cover" alt="Plant" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center"><Icons.Sprout className="w-16 h-16 text-gray-400" /></div>
                            )}
                            <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                                <div className="bg-black/50 p-4 rounded-full backdrop-blur-md hover:bg-black/70 transition-colors">
                                    <Icons.Camera className="w-8 h-8" />
                                </div>
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                            </label>
                        </div>
                        <label className="text-sm text-green-600 dark:text-green-400 font-bold cursor-pointer mt-2 hover:underline">
                            {t('change_photo')}
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        </label>
                    </div>

                    {/* Fields */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('name_label')}</label>
                        <input type="text" maxLength={99} value={editPlantData.name || ''} onChange={(e) => setEditPlantData({ ...editPlantData, name: e.target.value })} className="w-full p-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white focus:border-green-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('scientific_name_label')}</label>
                        <input type="text" value={editPlantData.scientificName || ''} onChange={(e) => setEditPlantData({ ...editPlantData, scientificName: e.target.value })} className="w-full p-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white italic focus:border-green-500 outline-none" />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('is_indoor_label')}</label>
                        <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer border border-gray-200 dark:border-gray-600">
                            <input 
                                type="checkbox" 
                                checked={!!editPlantData.isIndoor} 
                                onChange={(e) => setEditPlantData({...editPlantData, isIndoor: e.target.checked})}
                                className="w-5 h-5 rounded text-green-600 focus:ring-green-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-200">{t('plant_type_indoor')}</span>
                        </label>
                    </div>

                    <DatePicker 
                        label={t('date_planted_label')}
                        value={editPlantData.datePlanted || ''}
                        max={new Date().toISOString().split('T')[0]}
                        onChange={(val) => setEditPlantData({ ...editPlantData, datePlanted: val })}
                    />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('about')}</label>
                        <textarea rows={3} value={editPlantData.description || ''} onChange={(e) => setEditPlantData({ ...editPlantData, description: e.target.value })} className="w-full p-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white focus:border-green-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('care_label')}</label>
                        <textarea rows={5} value={editPlantData.careInstructions || ''} onChange={(e) => setEditPlantData({ ...editPlantData, careInstructions: e.target.value })} className="w-full p-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white focus:border-green-500 outline-none" />
                    </div>
                </div>
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-3 bg-gray-50 dark:bg-gray-800">
                    <button onClick={onClose} className="flex-1 py-3 text-gray-900 dark:text-gray-200 font-medium bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 shadow-sm">{t('cancel')}</button>
                    <button onClick={handleSave} className="flex-1 py-3 text-white font-bold bg-green-600 rounded-xl hover:bg-green-700 shadow-sm">{t('save_changes')}</button>
                </div>
            </div>
        </div>
    );
};
