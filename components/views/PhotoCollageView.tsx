
import React from 'react';
import { Icons } from '../Icons';
import { Plant, GardenLogItem } from '../../types';

interface PhotoCollageViewProps {
    config: { type: 'PLANT' | 'GARDEN', id?: string } | null;
    plants: Plant[];
    gardenLogs: GardenLogItem[];
    onBack: () => void;
    lang: 'en' | 'nl';
    t: (key: string) => string;
}

export const PhotoCollageView: React.FC<PhotoCollageViewProps> = ({ config, plants, gardenLogs, onBack, lang, t }) => {
    if (!config) return null;

    let photos: { id: string, imageUrl: string, date: string, label: string }[] = [];
    let title = t('collage_title');

    if (config.type === 'PLANT' && config.id) {
        const plant = plants.find(p => p.id === config.id);
        if (plant) {
            title = plant.name;
            // Add main plant image
            if (plant.imageUrl) {
                photos.push({
                    id: 'main_' + plant.id,
                    imageUrl: plant.imageUrl,
                    date: plant.dateAdded,
                    label: t('snapshot')
                });
            }
            // Add log images
            plant.logs.forEach(log => {
                if (log.imageUrl) {
                    photos.push({
                        id: log.id,
                        imageUrl: log.imageUrl,
                        date: log.date,
                        label: log.title
                    });
                }
            });
        }
    } else if (config.type === 'GARDEN') {
        title = t('my_garden');
        gardenLogs.forEach(log => {
            if (log.imageUrl) {
                photos.push({
                    id: log.id,
                    imageUrl: log.imageUrl,
                    date: log.date,
                    label: log.title
                });
            }
        });
    }

    // Modified sort order: Newest first (Desc)
    photos.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const calculateTimeLabel = (dateStr: string) => {
        const now = new Date();
        const past = new Date(dateStr);
        const diffTime = Math.max(0, now.getTime() - past.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 1) return t('today');

        if (diffDays < 101) {
            return `${diffDays} ${t('days_ago')}`;
        } else {
            // Round to years and months
            let years = now.getFullYear() - past.getFullYear();
            let months = now.getMonth() - past.getMonth();
            if (months < 0) {
                years--;
                months += 12;
            }

            const parts = [];
            if (years > 0) parts.push(`${years} ${t('years_ago')}`);
            if (months > 0) parts.push(`${months} ${t('months_ago')}`);

            if (parts.length === 0) return `0 ${t('days_ago')}`;
            return parts.join(` ${t('and')} `);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 overflow-y-auto relative">
            {/* Background Texture */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#444 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

            <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-sm">
                <button onClick={onBack} className="text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded-full transition-colors">
                    <Icons.ArrowLeft />
                </button>
                <h2 className="font-marker text-2xl text-gray-800 dark:text-white">{title}</h2>
                <div className="w-8"></div>
            </div>

            <div className="p-8 pb-24 min-h-full">
                {photos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[50vh] text-gray-400">
                        <Icons.Image className="w-16 h-16 opacity-30 mb-4" />
                        <p>{t('no_photos')}</p>
                    </div>
                ) : (
                    <div className="flex flex-wrap justify-center gap-12">
                        {photos.map((photo, index) => {
                            // Determine random rotation class based on index to keep it deterministic during render
                            const rotationClass = `rotate-rnd-${(index % 4) + 1}`;
                            const timeLabel = calculateTimeLabel(photo.date);

                            return (
                                <div key={photo.id} className={`relative bg-white p-4 pb-16 shadow-xl transform transition-transform duration-300 hover:scale-110 hover:z-10 hover:rotate-0 max-w-xs w-full md:w-72 ${rotationClass}`}>
                                    <div className="aspect-square w-full overflow-hidden bg-gray-100">
                                        <img src={photo.imageUrl} alt={photo.label} className="w-full h-full object-cover filter contrast-110 hover:filter-none transition-all" />
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 h-16 flex flex-col items-center justify-center p-2">
                                        <p className="font-marker text-gray-800 text-lg leading-none">{timeLabel}</p>
                                        <p className="font-marker text-gray-500 text-xs mt-1">{new Date(photo.date).toLocaleDateString(lang === 'nl' ? 'nl-NL' : 'en-US')}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
