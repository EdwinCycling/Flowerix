
import React, { useState, useRef, useEffect } from 'react';
import { Icons } from '../Icons';
import { Plant } from '../../types';

interface PhotoTimelapseModalProps {
    isOpen: boolean;
    onClose: () => void;
    plants: Plant[];
    lang: 'en' | 'nl';
    t: (key: string) => string;
}

export const PhotoTimelapseModal: React.FC<PhotoTimelapseModalProps> = ({ isOpen, onClose, plants, lang, t }) => {
    const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [durationPerPhoto, setDurationPerPhoto] = useState(0.8); // seconds

    useEffect(() => {
        if (!isOpen) {
            setSelectedPlantId(null);
            setVideoUrl(null);
            setIsGenerating(false);
        }
    }, [isOpen]);

    const getSupportedMimeType = () => {
        const types = [
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm',
            'video/mp4'
        ];
        return types.find(t => MediaRecorder.isTypeSupported(t)) || '';
    };

    const handleGenerate = async () => {
        if (!selectedPlantId) return;
        
        const plant = plants.find(p => p.id === selectedPlantId);
        if (!plant) return;

        // Collect images
        const images: { url: string, date: string }[] = [];
        if (plant.imageUrl) {
            images.push({ url: plant.imageUrl, date: plant.dateAdded });
        }
        plant.logs.forEach(log => {
            if (log.imageUrl) {
                images.push({ url: log.imageUrl, date: log.date });
            }
        });

        if (images.length === 0) return;

        // Sort Old to New (Ascending) - Explicit check
        images.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        setIsGenerating(true);
        setVideoUrl(null);

        // Video Generation Logic
        try {
            // Use in-memory canvas to avoid rendering issues/hanging
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Context not found");

            const mimeType = getSupportedMimeType();
            if (!mimeType) {
                alert("Video recording is not supported in this browser.");
                setIsGenerating(false);
                return;
            }

            // Set canvas size (Square 1080p)
            const size = 1080;
            canvas.width = size;
            canvas.height = size;

            // Load all images
            const loadedImages = await Promise.all(images.map(imgData => {
                return new Promise<{ img: HTMLImageElement, date: string }>((resolve) => {
                    const img = new Image();
                    img.crossOrigin = "Anonymous";
                    img.onload = () => resolve({ img, date: imgData.date });
                    img.onerror = () => resolve({ img: new Image(), date: imgData.date }); // Fallback
                    img.src = imgData.url;
                });
            }));

            // Prepare Recorder
            const stream = canvas.captureStream(30); // 30 FPS
            const recorder = new MediaRecorder(stream, { mimeType });
            const chunks: Blob[] = [];
            
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            // Create a promise that resolves when recording stops and data is available
            const recordingPromise = new Promise<string>((resolve) => {
                recorder.onstop = () => {
                    const blob = new Blob(chunks, { type: mimeType });
                    const url = URL.createObjectURL(blob);
                    resolve(url);
                };
            });

            recorder.start(); // Start recording

            // Animation Loop
            const fps = 30;
            const framesPerImage = Math.max(1, Math.round(durationPerPhoto * fps)); 
            
            for (const item of loadedImages) {
                if (!item.img.width) continue; // Skip failed images

                const draw = () => {
                    // Background
                    ctx.fillStyle = '#000';
                    ctx.fillRect(0, 0, size, size);

                    // Draw Image (Cover)
                    const img = item.img;
                    const scale = Math.max(size / img.width, size / img.height);
                    const x = (size - img.width * scale) / 2;
                    const y = (size - img.height * scale) / 2;
                    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

                    // Date Overlay
                    ctx.fillStyle = 'rgba(0,0,0,0.5)';
                    ctx.fillRect(0, size - 150, size, 150);
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 60px Inter, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(new Date(item.date).toLocaleDateString(lang === 'nl' ? 'nl-NL' : 'en-US'), size/2, size - 60);
                };

                // Draw multiple frames for this image to create duration
                for (let i = 0; i < framesPerImage; i++) {
                    draw();
                    // Wait approx 33ms (30fps)
                    await new Promise(r => setTimeout(r, 33)); 
                }
            }

            // Stop recorder and wait for the URL
            recorder.stop();
            const url = await recordingPromise;
            
            setVideoUrl(url);
        } catch (e) {
            console.error(e);
            alert("Error generating video");
        } finally {
            setIsGenerating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh]">
                
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('timelapse')}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('timelapse_desc')}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"><Icons.X className="w-6 h-6" /></button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-100 dark:bg-gray-900">
                    {!videoUrl && !isGenerating && (
                        <>
                            <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-4 uppercase text-xs tracking-wider">{t('select_plant_timelapse')}</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                                {plants.map(plant => (
                                    <div 
                                        key={plant.id} 
                                        onClick={() => setSelectedPlantId(plant.id)}
                                        className={`relative aspect-square cursor-pointer group rounded-xl overflow-hidden border-4 transition-all ${selectedPlantId === plant.id ? 'border-green-500 scale-95 shadow-md' : 'border-transparent hover:border-green-300'}`}
                                    >
                                        {plant.imageUrl ? (
                                            <img src={plant.imageUrl} className="w-full h-full object-cover" alt={plant.name} />
                                        ) : (
                                            <div className="w-full h-full bg-gray-200 flex items-center justify-center"><Icons.Leaf className="text-gray-400" /></div>
                                        )}
                                        <div className="absolute bottom-0 inset-x-0 bg-black/60 p-2">
                                            <p className="text-white text-xs font-bold truncate">{plant.name}</p>
                                            <p className="text-gray-300 text-[10px]">{plant.logs.length + 1} photos</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {selectedPlantId && (
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 mb-4">
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                        Speed: <span className="text-green-600">{durationPerPhoto}s</span> per photo
                                    </label>
                                    <input 
                                        type="range" 
                                        min="0.1" 
                                        max="3.0" 
                                        step="0.1"
                                        value={durationPerPhoto} 
                                        onChange={(e) => setDurationPerPhoto(Number(e.target.value))} 
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                                    />
                                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                                        <span>Fast (0.1s)</span>
                                        <span>Slow (3.0s)</span>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Generation View */}
                    {(isGenerating || videoUrl) && (
                        <div className="flex flex-col items-center justify-center h-full min-h-[300px]">
                             <div className="relative w-full max-w-md aspect-square bg-black rounded-xl overflow-hidden shadow-lg border border-gray-700 flex items-center justify-center">
                                 {videoUrl && (
                                     <video src={videoUrl} controls autoPlay loop className="w-full h-full object-contain" />
                                 )}
                                 {isGenerating && (
                                     <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                                         <div className="flex flex-col items-center text-white">
                                             <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mb-2"></div>
                                             <span className="font-bold">{t('generating_video')}</span>
                                         </div>
                                     </div>
                                 )}
                             </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-200 font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                        {t('cancel')}
                    </button>
                    
                    {videoUrl ? (
                         <a href={videoUrl} download="plant-timelapse.webm" className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                            <Icons.Download className="w-5 h-5" /> {t('timelapse_download')}
                         </a>
                    ) : (
                        <button 
                            onClick={handleGenerate} 
                            disabled={!selectedPlantId || isGenerating}
                            className="flex-1 py-3 rounded-xl bg-green-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-bold shadow-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                        >
                            {isGenerating ? (
                                <><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div> {t('generating')}</>
                            ) : (
                                <><Icons.Clock className="w-5 h-5" /> {t('create_timelapse')}</>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
