
import React, { useState, useEffect } from 'react';
import { Icons } from '../Icons';
import { Plant, GardenLogItem } from '../../types';

interface PhotoMergeModalProps {
    isOpen: boolean;
    onClose: () => void;
    plants: Plant[];
    gardenLogs: GardenLogItem[];
    showToast: (msg: string) => void;
    lang: 'en' | 'nl';
    t: (key: string) => string;
}

interface MergeImage {
    id: string;
    url: string;
    date: string;
    selected: boolean;
}

type LayoutType = 'grid' | 'masonry' | 'polaroid' | 'film' | 'circle' | 'honeycomb' | 'strips' | 'focus' | 'heart';

export const PhotoMergeModal: React.FC<PhotoMergeModalProps> = ({ isOpen, onClose, plants, gardenLogs, showToast, lang, t }) => {
    const [step, setStep] = useState<'select' | 'config' | 'result'>('select');
    const [images, setImages] = useState<MergeImage[]>([]);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Config State
    const [layout, setLayout] = useState<LayoutType>('grid');
    const [bgColor, setBgColor] = useState('#ffffff');
    const [spacing, setSpacing] = useState(20);

    // Initialize images on open
    useEffect(() => {
        if (isOpen) {
            const allImages: MergeImage[] = [];
            
            plants.forEach(p => {
                if (p.imageUrl) {
                    allImages.push({ id: `p_${p.id}`, url: p.imageUrl, date: p.dateAdded, selected: false });
                }
                p.logs.forEach(l => {
                    if (l.imageUrl) {
                        allImages.push({ id: `pl_${l.id}`, url: l.imageUrl, date: l.date, selected: false });
                    }
                });
            });

            gardenLogs.forEach(l => {
                if (l.imageUrl) {
                    allImages.push({ id: `gl_${l.id}`, url: l.imageUrl, date: l.date, selected: false });
                }
            });

            // Sort by date Desc (Newest first) - ensuring correct sort order
            allImages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
            setImages(allImages);
            setResultImage(null);
            setStep('select');
            setLayout('grid');
            setBgColor('#ffffff');
            setSpacing(20);
        }
    }, [isOpen, plants, gardenLogs]);

    const toggleSelection = (id: string) => {
        setImages(prev => {
            const target = prev.find(img => img.id === id);
            const selectedCount = prev.filter(img => img.selected).length;
            
            if (!target?.selected && selectedCount >= 10) return prev; // Max limit

            return prev.map(img => img.id === id ? { ...img, selected: !img.selected } : img);
        });
    };

    const executeMerge = async () => {
        const selected = images.filter(img => img.selected);
        if (selected.length < 2 || selected.length > 10) {
            alert(t('merge_error_count'));
            return;
        }

        setIsProcessing(true);

        try {
            const loadedImages = await Promise.all(selected.map(imgData => {
                return new Promise<HTMLImageElement>((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = "Anonymous";
                    img.onload = () => resolve(img);
                    img.onerror = reject;
                    img.src = imgData.url;
                });
            }));

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("No Canvas Context");

            const count = loadedImages.length;
            // Fixed canvas size ensures consistent output regardless of input image size
            // Scaling logic in drawImageCover handles resizing
            const finalSize = 1200; 
            
            // Basic Setup
            canvas.width = finalSize;
            canvas.height = finalSize;
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // --- Layout Logic ---

            if (layout === 'grid') {
                let cols = Math.ceil(Math.sqrt(count));
                let rows = Math.ceil(count / cols);
                if (count === 2) { cols = 2; rows = 1; }
                if (count === 3) { cols = 3; rows = 1; }

                const totalSpacingW = (cols + 1) * spacing;
                const totalSpacingH = (rows + 1) * spacing;
                const cellW = Math.floor((finalSize - totalSpacingW) / cols);
                const cellH = Math.floor((finalSize - totalSpacingH) / rows);

                loadedImages.forEach((img, index) => {
                    const col = index % cols;
                    const row = Math.floor(index / cols);
                    
                    const x = spacing + col * (cellW + spacing);
                    const y = spacing + row * (cellH + spacing);

                    drawImageCover(ctx, img, x, y, cellW, cellH);
                    drawBorder(ctx, x, y, cellW, cellH, spacing);
                });
            }

            else if (layout === 'masonry') {
                const half = Math.ceil(count / 2);
                const col1 = loadedImages.slice(0, half);
                const col2 = loadedImages.slice(half);

                const w = Math.floor((finalSize - 3 * spacing) / 2);
                
                // Column 1
                let curY = spacing;
                const h1 = Math.floor((finalSize - (col1.length + 1) * spacing) / col1.length);
                col1.forEach(img => {
                    drawImageCover(ctx, img, spacing, curY, w, h1);
                    drawBorder(ctx, spacing, curY, w, h1, spacing/2);
                    curY += h1 + spacing;
                });

                // Column 2
                curY = spacing;
                const h2 = Math.floor((finalSize - (col2.length + 1) * spacing) / col2.length);
                col2.forEach(img => {
                    drawImageCover(ctx, img, spacing + w + spacing, curY, w, h2);
                    drawBorder(ctx, spacing + w + spacing, curY, w, h2, spacing/2);
                    curY += h2 + spacing;
                });
            }

            else if (layout === 'polaroid') {
                const cardW = 300;
                const cardH = 350;
                
                loadedImages.forEach((img, i) => {
                    const x = Math.random() * (finalSize - cardW - 100) + 50;
                    const y = Math.random() * (finalSize - cardH - 100) + 50;
                    const rot = (Math.random() - 0.5) * 30 * (Math.PI / 180);

                    ctx.save();
                    ctx.translate(x + cardW/2, y + cardH/2);
                    ctx.rotate(rot);
                    ctx.translate(-cardW/2, -cardH/2);
                    
                    ctx.shadowColor = "rgba(0,0,0,0.3)";
                    ctx.shadowBlur = 20;
                    ctx.shadowOffsetX = 5;
                    ctx.shadowOffsetY = 5;
                    
                    ctx.fillStyle = "#fff";
                    ctx.fillRect(0, 0, cardW, cardH);
                    
                    ctx.shadowColor = "transparent";
                    drawImageCover(ctx, img, 20, 20, cardW - 40, cardW - 40);
                    ctx.restore();
                });
            }

            else if (layout === 'film') {
                const stripW = 400;
                const holeSize = 20;
                const x = (finalSize - stripW) / 2;
                
                ctx.fillStyle = "#000";
                ctx.fillRect(x, 0, stripW, finalSize);
                
                ctx.fillStyle = "#fff";
                for(let hy = 10; hy < finalSize; hy += 40) {
                    ctx.fillRect(x + 10, hy, holeSize, holeSize); 
                    ctx.fillRect(x + stripW - 30, hy, holeSize, holeSize); 
                }

                const photoH = Math.floor((finalSize - (count+1)*spacing)/count);
                let cy = spacing;
                loadedImages.forEach(img => {
                    drawImageCover(ctx, img, x + 50, cy, stripW - 100, photoH);
                    cy += photoH + spacing;
                });
            }

            else if (layout === 'circle') {
                 let cols = Math.ceil(Math.sqrt(count));
                 let rows = Math.ceil(count / cols);
                 if (count === 2) { cols = 2; rows = 1; }
 
                 const totalSpacingW = (cols + 1) * spacing;
                 const totalSpacingH = (rows + 1) * spacing;
                 const cellW = Math.floor((finalSize - totalSpacingW) / cols);
                 const cellH = Math.floor((finalSize - totalSpacingH) / rows);
                 const size = Math.min(cellW, cellH);
 
                 loadedImages.forEach((img, index) => {
                     const col = index % cols;
                     const row = Math.floor(index / cols);
                     
                     const x = spacing + col * (cellW + spacing) + (cellW - size)/2;
                     const y = spacing + row * (cellH + spacing) + (cellH - size)/2;
 
                     ctx.save();
                     ctx.beginPath();
                     ctx.arc(x + size/2, y + size/2, size/2, 0, Math.PI * 2);
                     ctx.clip();
                     drawImageCover(ctx, img, x, y, size, size);
                     ctx.restore();

                     ctx.beginPath();
                     ctx.arc(x + size/2, y + size/2, size/2, 0, Math.PI * 2);
                     ctx.lineWidth = spacing / 2;
                     ctx.strokeStyle = "#fff";
                     ctx.stroke();
                 });
            }

            else if (layout === 'honeycomb') {
                const hexRadius = 150;
                const hexHeight = Math.sqrt(3) * hexRadius;
                const hexWidth = 2 * hexRadius;
                const horizDist = hexWidth * 0.75;
                const vertDist = hexHeight;

                let startX = spacing + hexRadius;
                let startY = spacing + hexRadius;

                loadedImages.forEach((img, i) => {
                    const col = i % 3; 
                    const row = Math.floor(i / 3);

                    let cx = startX + col * horizDist;
                    let cy = startY + row * vertDist;
                    if (col % 2 === 1) cy += vertDist / 2;

                    ctx.save();
                    ctx.beginPath();
                    for (let side = 0; side < 6; side++) {
                        const angle = 2 * Math.PI / 6 * side;
                        const hx = cx + hexRadius * Math.cos(angle);
                        const hy = cy + hexRadius * Math.sin(angle);
                        if (side === 0) ctx.moveTo(hx, hy);
                        else ctx.lineTo(hx, hy);
                    }
                    ctx.closePath();
                    ctx.clip();
                    drawImageCover(ctx, img, cx - hexRadius, cy - hexRadius, hexWidth, hexWidth);
                    ctx.restore();

                    ctx.save();
                    ctx.beginPath();
                    for (let side = 0; side < 6; side++) {
                        const angle = 2 * Math.PI / 6 * side;
                        const hx = cx + hexRadius * Math.cos(angle);
                        const hy = cy + hexRadius * Math.sin(angle);
                        if (side === 0) ctx.moveTo(hx, hy);
                        else ctx.lineTo(hx, hy);
                    }
                    ctx.closePath();
                    ctx.lineWidth = spacing / 2;
                    ctx.strokeStyle = "#fff";
                    ctx.stroke();
                    ctx.restore();
                });
            }

            else if (layout === 'strips') {
                // Horizontal Strips
                const stripH = Math.floor((finalSize - (count + 1) * spacing) / count);
                let curY = spacing;
                
                loadedImages.forEach(img => {
                    drawImageCover(ctx, img, spacing, curY, finalSize - (spacing * 2), stripH);
                    drawBorder(ctx, spacing, curY, finalSize - (spacing * 2), stripH, spacing/2);
                    curY += stripH + spacing;
                });
            }

            else if (layout === 'focus') {
                // One large on left (or top), others grid
                // Layout: Left half is Img 0. Right half is grid of others.
                const halfW = Math.floor((finalSize - 3 * spacing) / 2);
                const mainH = finalSize - 2 * spacing;
                
                // Draw Main (First Image)
                drawImageCover(ctx, loadedImages[0], spacing, spacing, halfW, mainH);
                drawBorder(ctx, spacing, spacing, halfW, mainH, spacing/2);

                // Draw Rest
                const rest = loadedImages.slice(1);
                const restCount = rest.length;
                if (restCount > 0) {
                    const cols = 1; // Single column on right
                    const rows = restCount;
                    const cellH = Math.floor((finalSize - (rows + 1) * spacing) / rows);
                    
                    let curY = spacing;
                    rest.forEach(img => {
                        const x = spacing + halfW + spacing;
                        drawImageCover(ctx, img, x, curY, halfW, cellH);
                        drawBorder(ctx, x, curY, halfW, cellH, spacing/2);
                        curY += cellH + spacing;
                    });
                }
            }

            else if (layout === 'heart') {
                // Draw grid first, then apply heart mask
                const offScreenCanvas = document.createElement('canvas');
                offScreenCanvas.width = finalSize;
                offScreenCanvas.height = finalSize;
                const osCtx = offScreenCanvas.getContext('2d');
                
                if (osCtx) {
                    // Draw Grid on Offscreen
                    osCtx.fillStyle = bgColor;
                    osCtx.fillRect(0, 0, finalSize, finalSize);
                    
                    let cols = Math.ceil(Math.sqrt(count));
                    let rows = Math.ceil(count / cols);
                    const totalSpacingW = (cols + 1) * spacing;
                    const totalSpacingH = (rows + 1) * spacing;
                    const cellW = Math.floor((finalSize - totalSpacingW) / cols);
                    const cellH = Math.floor((finalSize - totalSpacingH) / rows);

                    loadedImages.forEach((img, index) => {
                        const col = index % cols;
                        const row = Math.floor(index / cols);
                        const x = spacing + col * (cellW + spacing);
                        const y = spacing + row * (cellH + spacing);
                        drawImageCover(osCtx, img, x, y, cellW, cellH);
                    });

                    // Reset canvas to transparent/bg
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.fillStyle = bgColor;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                    ctx.save();
                    ctx.beginPath();
                    const w = finalSize;
                    const h = finalSize;
                    // Heart path
                    ctx.moveTo(w/2, h * 0.9);
                    ctx.bezierCurveTo(w * 0.9, h * 0.6, w, h * 0.4, w, h * 0.3);
                    ctx.bezierCurveTo(w, h * 0.1, w * 0.75, 0, w * 0.5, h * 0.25);
                    ctx.bezierCurveTo(w * 0.25, 0, 0, h * 0.1, 0, h * 0.3);
                    ctx.bezierCurveTo(0, h * 0.4, w * 0.1, h * 0.6, w/2, h * 0.9);
                    ctx.closePath();
                    
                    ctx.clip(); // Clip to the heart path defined above
                    ctx.drawImage(offScreenCanvas, 0, 0);
                    ctx.restore();

                    // Draw border around heart
                    ctx.lineWidth = spacing;
                    ctx.strokeStyle = "#fff";
                    ctx.stroke();
                }
            }

            const result = canvas.toDataURL('image/jpeg', 0.9);
            setResultImage(result);
            setStep('result');

        } catch (e) {
            console.error(e);
            alert("Error merging photos");
        } finally {
            setIsProcessing(false);
        }
    };

    // Helper: Draw image covering area with explicit clipping and source cropping (AspectRatio Fit)
    const drawImageCover = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) => {
        // Destination rectangle (Integers for safety)
        const dx = Math.floor(x);
        const dy = Math.floor(y);
        const dw = Math.floor(w);
        const dh = Math.floor(h);

        // Source dimensions
        const sw = img.width;
        const sh = img.height;

        const targetRatio = dw / dh;
        const sourceRatio = sw / sh;

        let sx = 0, sy = 0, sWidth = sw, sHeight = sh;

        if (sourceRatio > targetRatio) {
            // Source is wider than target: Crop width (keep height full, calculate matching width)
            sHeight = sh;
            sWidth = sh * targetRatio;
            sx = (sw - sWidth) / 2;
        } else {
            // Source is taller than target: Crop height (keep width full, calculate matching height)
            sWidth = sw;
            sHeight = sw / targetRatio;
            sy = (sh - sHeight) / 2;
        }

        ctx.save();
        // Clip to destination to ensure no bleeding outside the box
        ctx.beginPath();
        ctx.rect(dx, dy, dw, dh);
        ctx.clip();
        
        // Draw using source/destination method for strict resizing and clipping
        ctx.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dw, dh);
        ctx.restore();
    };

    const drawBorder = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, width: number) => {
        if (width <= 0) return;
        ctx.lineWidth = width;
        ctx.strokeStyle = "#fff"; 
        ctx.strokeRect(x, y, w, h);
    }

    const handleDownload = () => {
        if (!resultImage) return;
        const link = document.createElement('a');
        link.href = resultImage;
        link.download = `merged-garden-${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Toast notification
        showToast(t('download_success'));
    };

    if (!isOpen) return null;

    // --- RESULT VIEW ---
    if (step === 'result' && resultImage) {
        return (
            <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-4">
                <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-black/50 backdrop-blur-md z-20">
                    <h3 className="text-white font-bold text-lg">{t('photo_merge')}</h3>
                    <button onClick={onClose} className="bg-white/20 hover:bg-white/40 text-white p-2 rounded-full">
                        <Icons.X className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="flex-1 w-full flex items-center justify-center overflow-hidden p-4">
                    <img src={resultImage} alt="Merged" className="max-w-full max-h-full object-contain shadow-2xl border-4 border-white" />
                </div>

                <div className="w-full max-w-md flex gap-4 p-4">
                    <button onClick={() => setStep('config')} className="flex-1 bg-gray-700 text-white py-3 rounded-xl font-bold hover:bg-gray-600 transition-colors">
                        {t('back')}
                    </button>
                    <button onClick={handleDownload} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                        <Icons.Download className="w-5 h-5" /> {t('merge_download')}
                    </button>
                </div>
            </div>
        );
    }

    const selectedCount = images.filter(i => i.selected).length;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                
                {/* Header - Fixed */}
                <div className="flex-none p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t(step === 'config' ? 'merge_config_title' : 'photo_merge')}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {step === 'select' ? `${t('select_photos_merge')} (${selectedCount})` : `${t('merge_processing')}`}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"><Icons.X className="w-6 h-6" /></button>
                </div>

                {/* Content Body - Scrollable */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-100 dark:bg-gray-900 min-h-0">
                    
                    {/* STEP 1: SELECT */}
                    {step === 'select' && (
                        images.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                <Icons.Image className="w-12 h-12 opacity-30 mb-2" />
                                <p>{t('no_photos')}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                                {images.map(img => (
                                    <div 
                                        key={img.id} 
                                        onClick={() => toggleSelection(img.id)}
                                        className={`relative aspect-square cursor-pointer group rounded-lg overflow-hidden border-2 transition-all ${img.selected ? 'border-green-500 opacity-100 scale-95' : 'border-transparent opacity-70 hover:opacity-100'}`}
                                    >
                                        <img src={img.url} className="w-full h-full object-cover" alt="Thumbnail" />
                                        {img.selected && (
                                            <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                                                <div className="bg-green-500 text-white rounded-full p-1 shadow-sm">
                                                    <Icons.Check className="w-4 h-4" />
                                                </div>
                                            </div>
                                        )}
                                        {/* Date Label overlay */}
                                        <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] p-1 text-center truncate">
                                            {new Date(img.date).toLocaleDateString(lang === 'nl' ? 'nl-NL' : 'en-US')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}

                    {/* STEP 2: CONFIG */}
                    {step === 'config' && (
                         <div className="max-w-lg mx-auto space-y-6 pb-10">
                             {/* Layout Selection */}
                             <div className="space-y-3">
                                 <label className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Layout Style</label>
                                 <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                     {[
                                         { id: 'grid', icon: <Icons.LayoutGrid className="w-6 h-6" />, label: t('layout_grid') },
                                         { id: 'masonry', icon: <Icons.StretchHorizontal className="w-6 h-6" />, label: t('layout_masonry') },
                                         { id: 'polaroid', icon: <Icons.Image className="w-6 h-6" />, label: t('layout_polaroid') },
                                         { id: 'film', icon: <Icons.Film className="w-6 h-6" />, label: t('layout_film') },
                                         { id: 'circle', icon: <Icons.Circle className="w-6 h-6" />, label: t('layout_circle') },
                                         { id: 'honeycomb', icon: <Icons.Hexagon className="w-6 h-6" />, label: t('layout_honeycomb') },
                                         { id: 'strips', icon: <Icons.StretchHorizontal className="w-6 h-6 rotate-90" />, label: t('layout_strips') },
                                         { id: 'focus', icon: <Icons.LayoutGrid className="w-6 h-6" />, label: t('layout_focus') },
                                         { id: 'heart', icon: <Icons.Heart className="w-6 h-6" />, label: t('layout_heart') },
                                     ].map(opt => (
                                         <button 
                                            key={opt.id}
                                            onClick={() => setLayout(opt.id as LayoutType)}
                                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${layout === opt.id ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 hover:border-gray-300'}`}
                                         >
                                             {opt.icon}
                                             <span className="text-xs font-medium text-center">{opt.label}</span>
                                         </button>
                                     ))}
                                 </div>
                             </div>

                             {/* Customization */}
                             <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4">
                                 <div>
                                     <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('bg_color')}</label>
                                     <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                                         {['#ffffff', '#000000', '#f3f4f6', '#fee2e2', '#fef3c7', '#dcfce7', '#dbeafe', '#fae8ff'].map(c => (
                                             <button 
                                                key={c} 
                                                onClick={() => setBgColor(c)}
                                                className={`w-10 h-10 rounded-full border-2 shadow-sm ${bgColor === c ? 'border-green-500 scale-110' : 'border-gray-200'}`}
                                                style={{ backgroundColor: c }}
                                             />
                                         ))}
                                         <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-10 h-10 rounded-full overflow-hidden border-0 p-0 cursor-pointer" />
                                     </div>
                                 </div>

                                 <div>
                                     <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                         {t('spacing')}: <span className="text-green-600">{spacing}px</span>
                                     </label>
                                     <input 
                                        type="range" 
                                        min="0" max="100" 
                                        value={spacing} 
                                        onChange={(e) => setSpacing(Number(e.target.value))}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                                     />
                                 </div>
                             </div>
                         </div>
                    )}
                </div>

                {/* Footer - Fixed */}
                <div className="flex-none p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex gap-3 shadow-md z-10">
                    {step === 'select' ? (
                        <>
                            <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-200 font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                                {t('merge_cancel')}
                            </button>
                            <button 
                                onClick={() => setStep('config')} 
                                disabled={selectedCount < 2 || selectedCount > 10}
                                className="flex-1 py-3 rounded-xl bg-green-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-bold shadow-lg hover:bg-green-700 transition-colors"
                            >
                                {t('next')}
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => setStep('select')} className="flex-1 py-3 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-200 font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                                {t('back')}
                            </button>
                            <button 
                                onClick={executeMerge} 
                                disabled={isProcessing}
                                className="flex-1 py-3 rounded-xl bg-green-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-bold shadow-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                            >
                                {isProcessing ? (
                                    <><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div> {t('merge_processing')}</>
                                ) : (
                                    <><Icons.Sparkles className="w-5 h-5" /> {t('merge_execute')}</>
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
