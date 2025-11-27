
import React, { useState, useRef, useEffect } from 'react';
import { Icons } from '../Icons';
import { identifyPlantMulti, searchWikiImages } from '../../services/geminiService';
import { IdentificationResult } from '../../types';
import { WebImagesModal } from '../modals/InfoModals';
import { generateIdentificationPDF } from '../../services/pdfService';
import { AISpark } from '../ui/AISpark';

interface IdentifyPlantViewProps {
    onBack: () => void;
    lang: 'en' | 'nl';
    t: (key: string) => string;
    onAskFlora: (text: string) => void;
}

export const IdentifyPlantView: React.FC<IdentifyPlantViewProps> = ({ onBack, lang, t, onAskFlora }) => {
    const [mode, setMode] = useState<'camera' | 'analyzing' | 'results' | 'detail' | 'error'>('camera');
    const [capturedImages, setCapturedImages] = useState<string[]>([]);
    const [results, setResults] = useState<(IdentificationResult & { displayImage?: string })[]>([]);
    const [selectedResult, setSelectedResult] = useState<(IdentificationResult & { displayImage?: string }) | null>(null);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    
    // Web Images Modal State
    const [webImagesModal, setWebImagesModal] = useState<{isOpen: boolean, images: string[], loading: boolean}>({ isOpen: false, images: [], loading: false });

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);

    // --- Camera Logic ---
    useEffect(() => {
        if (mode === 'camera') {
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [mode]);

    const startCamera = async () => {
        try {
            const constraints = {
                video: {
                    facingMode: 'environment', // Prefer back camera
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };
            const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            setCameraError(null);
        } catch (err) {
            console.error("Camera Error:", err);
            setCameraError("Camera access denied or unavailable.");
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            
            // Check if video is ready
            if (video.videoWidth === 0 || video.videoHeight === 0) {
                console.warn("Camera not ready for capture");
                return;
            }

            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            
            // Match canvas size to video size
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                // Compress to jpeg 0.6 for speed and API size limits
                const base64 = canvas.toDataURL('image/jpeg', 0.6);
                setCapturedImages(prev => [...prev, base64]);
            }
        }
    };

    const removePhoto = (index: number) => {
        setCapturedImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleAnalyze = async () => {
        if (capturedImages.length === 0) return;
        setMode('analyzing');
        setAnalysisError(null);
        
        try {
            // Get AI Results
            const identificationResults = await identifyPlantMulti(capturedImages, lang);
            
            if (!identificationResults || identificationResults.length === 0) {
                throw new Error("Could not identify any plants. Please ensure the plant is clearly visible and try again.");
            }

            // Fetch Web Images for results
            const enrichedResults = await Promise.all(identificationResults.map(async (res) => {
                const images = await searchWikiImages(res.scientificName || res.name);
                return { ...res, displayImage: images.length > 0 ? images[0] : undefined };
            }));

            setResults(enrichedResults);
            setMode('results');
        } catch (e: any) {
            console.error("Analysis Error:", e);
            setAnalysisError(e.message || "Unknown error occurred");
            setMode('error');
        }
    };

    const handleSelectResult = (result: IdentificationResult & { displayImage?: string }) => {
        setSelectedResult(result);
        setMode('detail');
    };

    const handleShowWebPhotos = async () => {
        if (!selectedResult) return;
        setWebImagesModal({ isOpen: true, images: [], loading: true });
        const imgs = await searchWikiImages(selectedResult.scientificName || selectedResult.name);
        setWebImagesModal({ isOpen: true, images: imgs, loading: false });
    };

    const handleCopyDetails = () => {
        if (!selectedResult) return;
        const text = `
${selectedResult.name} (${selectedResult.scientificName})

${t('description')}:
${selectedResult.description}

${t('id_soil_care')}:
${selectedResult.soil}

${t('id_climate')}:
${selectedResult.climate}

${t('id_size')}:
${selectedResult.size}

${t('id_pruning')}:
${selectedResult.pruning}
        `.trim();
        navigator.clipboard.writeText(text);
        alert(t('copy_success'));
    };

    const handleExportPDF = () => {
        if (!selectedResult) return;
        if (generateIdentificationPDF(selectedResult, lang, t)) {
            alert(t('pdf_downloaded'));
        } else {
            alert(t('pdf_error'));
        }
    };

    // --- Renders ---

    if (mode === 'analyzing') {
        return (
            <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white p-6 text-center">
                <div className="w-20 h-20 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                <h2 className="text-2xl font-bold mb-2">{t('analyzing')}</h2>
                <p className="text-gray-400">{t('analyzing_desc')}</p>
            </div>
        );
    }

    if (mode === 'error') {
        return (
            <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white p-6 text-center">
                <div className="bg-red-500/20 p-6 rounded-full mb-6">
                    <Icons.X className="w-12 h-12 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Analysis Failed</h2>
                <p className="text-gray-400 mb-8">{analysisError || "Please try again with clearer photos."}</p>
                <button 
                    onClick={() => setMode('camera')} 
                    className="bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-gray-200 transition-colors"
                >
                    Try Again
                </button>
            </div>
        );
    }

    if (mode === 'detail' && selectedResult) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col animate-in slide-in-from-right">
                <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20 shadow-sm">
                    <button onClick={() => setMode('results')} className="text-gray-600 dark:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                        <Icons.ArrowLeft className="w-6 h-6" />
                    </button>
                    <h2 className="ml-3 font-bold text-lg text-gray-900 dark:text-white truncate flex-1">{selectedResult.name}</h2>
                    <button onClick={onBack} className="text-gray-500 dark:text-gray-400"><Icons.X /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-6">
                    <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-lg bg-gray-200 dark:bg-gray-700 relative">
                        {selectedResult.displayImage ? (
                            <img src={selectedResult.displayImage} className="w-full h-full object-cover" alt={selectedResult.name} />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400"><Icons.Leaf className="w-16 h-16" /></div>
                        )}
                        <div className="absolute top-2 right-2 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                            {selectedResult.confidence}% {t('certainty')}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                                {t('id_info')}
                                <AISpark content={selectedResult.description || ''} isMultiline onAskFlora={onAskFlora} t={t} />
                            </h3>
                            <p className="text-green-600 dark:text-green-400 italic mb-2">{selectedResult.scientificName}</p>
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm">{selectedResult.description}</p>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                            {[
                                { title: t('id_soil_care'), icon: Icons.Sprout, content: selectedResult.soil, color: 'text-amber-600' },
                                { title: t('id_climate'), icon: Icons.Sun, content: selectedResult.climate, color: 'text-yellow-500' },
                                { title: t('id_size'), icon: Icons.Maximize, content: selectedResult.size, color: 'text-blue-500' },
                                { title: t('id_pruning'), icon: Icons.ScanLine, content: selectedResult.pruning, color: 'text-red-500' },
                            ].map((item, idx) => (
                                <div key={idx}>
                                    <h4 className={`font-bold text-sm flex items-center gap-2 mb-1 ${item.color}`}>
                                        <item.icon className="w-4 h-4" /> {item.title}
                                        <AISpark content={item.content || ''} isMultiline onAskFlora={onAskFlora} t={t} />
                                    </h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 pl-6 leading-relaxed">{item.content || "N/A"}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                    <button onClick={handleShowWebPhotos} className="flex-1 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl font-bold text-sm flex flex-col items-center justify-center gap-1">
                        <Icons.Image className="w-5 h-5" /> {t('web_photos')}
                    </button>
                    <button onClick={handleCopyDetails} className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold text-sm flex flex-col items-center justify-center gap-1">
                        <Icons.Copy className="w-5 h-5" /> {t('copy_text')}
                    </button>
                    <button onClick={handleExportPDF} className="flex-1 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-bold text-sm flex flex-col items-center justify-center gap-1">
                        <Icons.FileText className="w-5 h-5" /> PDF
                    </button>
                </div>

                <WebImagesModal 
                    isOpen={webImagesModal.isOpen} 
                    loading={webImagesModal.loading} 
                    images={webImagesModal.images} 
                    onClose={() => setWebImagesModal(prev => ({...prev, isOpen: false}))} 
                    t={t} 
                />
            </div>
        );
    }

    if (mode === 'results') {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
                <div className="bg-white dark:bg-gray-800 px-4 py-4 flex items-center border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20 shadow-sm">
                    <button onClick={() => { setCapturedImages([]); setMode('camera'); }} className="text-gray-600 dark:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                        <Icons.Camera className="w-6 h-6" />
                    </button>
                    <h2 className="ml-3 font-bold text-lg text-gray-900 dark:text-white">{t('identify_results_title')}</h2>
                    <div className="flex-1"></div>
                    <button onClick={onBack} className="text-gray-500 dark:text-gray-400 font-medium text-sm">{t('close')}</button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
                    {results.map((res, idx) => (
                        <div 
                            key={idx} 
                            onClick={() => handleSelectResult(res)}
                            className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-md border border-gray-100 dark:border-gray-700 flex flex-col animate-in slide-in-from-bottom-2 cursor-pointer hover:shadow-lg transition-shadow" 
                            style={{ animationDelay: `${idx * 100}ms` }}
                        >
                            <div className="h-40 bg-gray-200 dark:bg-gray-700 relative pointer-events-none">
                                {res.displayImage ? (
                                    <img src={res.displayImage} className="w-full h-full object-cover" alt={res.name} />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        <Icons.Leaf className="w-12 h-12" />
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                                    {res.confidence}% {t('certainty')}
                                </div>
                            </div>
                            <div className="p-4 pointer-events-none">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 flex items-center justify-between">
                                    {res.name}
                                    <Icons.ArrowLeft className="w-4 h-4 text-gray-400 rotate-180" />
                                </h3>
                                <p className="text-sm text-green-600 dark:text-green-400 italic mb-2">{res.scientificName}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{t('id_tap_for_details')}</p>
                            </div>
                        </div>
                    ))}
                    {results.length === 0 && (
                        <div className="text-center py-10 text-gray-500">No results found.</div>
                    )}
                </div>
            </div>
        );
    }

    // Camera Mode
    return (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col">
            {/* Top Bar */}
            <div className="absolute top-0 inset-x-0 z-20 p-4 flex justify-between items-start bg-gradient-to-b from-black/70 to-transparent pb-12">
                <button onClick={onBack} className="bg-black/30 p-2 rounded-full text-white backdrop-blur-sm">
                    <Icons.X className="w-6 h-6" />
                </button>
                <div className="bg-black/50 px-4 py-1 rounded-full backdrop-blur-sm">
                    <span className="text-white font-bold">{capturedImages.length} / 3</span>
                </div>
                <div className="w-10"></div> {/* Spacer */}
            </div>

            {/* Focus Instruction */}
            <div className="absolute top-20 inset-x-0 z-10 flex justify-center pointer-events-none">
                <span className="text-white/90 text-shadow-sm font-medium bg-black/20 px-4 py-2 rounded-full backdrop-blur-sm text-sm text-center">
                    {t('id_camera_instruction')}
                </span>
            </div>

            {/* Camera View */}
            <div className="flex-1 relative bg-black overflow-hidden">
                {cameraError ? (
                    <div className="absolute inset-0 flex items-center justify-center text-white p-6 text-center">
                        <p>{cameraError}</p>
                    </div>
                ) : (
                    <>
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                        <canvas ref={canvasRef} className="hidden" />
                        
                        {/* Focus Frame Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-64 h-64 border-2 border-white/50 rounded-lg relative">
                                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-white -mt-1 -ml-1"></div>
                                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-white -mt-1 -mr-1"></div>
                                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-white -mb-1 -ml-1"></div>
                                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-white -mb-1 -mr-1"></div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Bottom Control Area */}
            <div className="bg-black pt-4 pb-8 px-6 flex flex-col gap-4">
                {/* Thumbnails */}
                <div className="h-16 flex gap-2 overflow-x-auto items-center justify-center no-scrollbar min-h-[64px]">
                    {capturedImages.map((img, idx) => (
                        <div key={idx} className="relative w-12 h-12 rounded-lg overflow-hidden border border-white/50">
                            <img src={img} className="w-full h-full object-cover" alt="Captured" />
                            <button onClick={() => removePhoto(idx)} className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 hover:opacity-100">
                                <Icons.X className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    {capturedImages.length === 0 && (
                        <span className="text-gray-500 text-xs italic">{t('id_no_photos_yet')}</span>
                    )}
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between">
                    <div className="flex-1"></div> {/* Spacer */}
                    
                    {/* Capture Button */}
                    <button 
                        onClick={capturePhoto}
                        disabled={capturedImages.length >= 3}
                        className={`w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-all ${capturedImages.length >= 3 ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                    >
                        <div className="w-16 h-16 bg-white rounded-full"></div>
                    </button>

                    <div className="flex-1 flex justify-end">
                        {capturedImages.length > 0 && (
                            <button 
                                onClick={handleAnalyze}
                                className="bg-green-600 text-white px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 shadow-lg animate-in slide-in-from-right"
                            >
                                {t('analyze_button')} <Icons.ArrowLeft className="rotate-180 w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
