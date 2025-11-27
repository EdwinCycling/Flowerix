

import React, { useEffect, useState } from 'react';
import { Icons } from '../Icons';
import { SlideshowConfig } from '../../types';

interface SlideshowPlayerProps {
    images: string[];
    config: SlideshowConfig;
    onClose: () => void;
}

export const SlideshowPlayer: React.FC<SlideshowPlayerProps> = ({ images, config, onClose }) => {
    const [shuffledImages, setShuffledImages] = useState<string[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [nextIndex, setNextIndex] = useState<number | null>(null);

    // Shuffle on mount
    useEffect(() => {
        const shuffled = [...images].sort(() => Math.random() - 0.5);
        setShuffledImages(shuffled);
    }, [images]);

    // Timer
    useEffect(() => {
        if (shuffledImages.length <= 1) return;

        const interval = setInterval(() => {
            const next = (currentIndex + 1) % shuffledImages.length;
            setNextIndex(next);
            
            // Allow transition time (approx 1s) then switch main index
            setTimeout(() => {
                setCurrentIndex(next);
                setNextIndex(null);
            }, 1000); // Match transition duration
            
        }, config.duration * 1000);

        return () => clearInterval(interval);
    }, [currentIndex, config.duration, shuffledImages.length]);

    if (shuffledImages.length === 0) return null;

    const getEnterClass = () => {
        const base = 'z-20 transition-all duration-1000 ease-in-out';
        switch (config.transition) {
            case 'fade': return `${base} opacity-0 animate-fade-in`;
            case 'cut': return 'z-30'; 
            case 'slide_right': return `${base} translate-x-full animate-slide-in-right`;
            case 'slide_left': return `${base} -translate-x-full animate-slide-in-left`;
            case 'slide_top': return `${base} -translate-y-full animate-slide-in-top`;
            case 'slide_bottom': return `${base} translate-y-full animate-slide-in-bottom`;
            case 'zoom': return `${base} scale-0 animate-zoom-in`;
            
            // New Types
            case 'rotate': return `${base} opacity-0 animate-rotate-in`;
            case 'cube': return `${base} opacity-50 animate-cube-in`;
            // Wipe/Push - Entering direction
            case 'wipe_left': return `${base} translate-x-full animate-wipe-left-in`; // From Right to Left
            case 'wipe_right': return `${base} -translate-x-full animate-wipe-right-in`; // From Left to Right
            case 'wipe_top': return `${base} translate-y-full animate-wipe-top-in`; // From Bottom to Top
            case 'wipe_bottom': return `${base} -translate-y-full animate-wipe-bottom-in`; // From Top to Bottom

            default: return 'z-20';
        }
    };

    const getExitClass = () => {
        // Standard transitions mostly cover the old one, so we keep it simple or just let it sit below.
        // New transitions (Rotate, Cube, Wipe) require the old one to animate OUT.
        
        const base = 'z-10 transition-all duration-1000 ease-in-out';
        switch (config.transition) {
            case 'rotate': return `${base} animate-rotate-out`;
            case 'cube': return `${base} animate-cube-out`;
            // Wipe/Push - Exiting direction
            case 'wipe_left': return `${base} animate-wipe-left-out`; // Move Left
            case 'wipe_right': return `${base} animate-wipe-right-out`; // Move Right
            case 'wipe_top': return `${base} animate-wipe-top-out`; // Move Top
            case 'wipe_bottom': return `${base} animate-wipe-bottom-out`; // Move Bottom
            
            // Defaults (Fade, Slide, Cut) don't strictly need exit animations for the current implementation, 
            // as the new one covers them. We keep z-10 to ensure it's below the incoming z-20.
            default: return 'z-10';
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center overflow-hidden group" style={{ perspective: '1000px' }}>
            <style>
                {`
                /* Standard Enter */
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slide-in-right { from { transform: translateX(100%); } to { transform: translateX(0); } }
                @keyframes slide-in-left { from { transform: translateX(-100%); } to { transform: translateX(0); } }
                @keyframes slide-in-top { from { transform: translateY(-100%); } to { transform: translateY(0); } }
                @keyframes slide-in-bottom { from { transform: translateY(100%); } to { transform: translateY(0); } }
                @keyframes zoom-in { from { transform: scale(0); } to { transform: scale(1); } }
                
                .animate-fade-in { animation: fade-in 1s forwards; }
                .animate-slide-in-right { animation: slide-in-right 1s forwards; }
                .animate-slide-in-left { animation: slide-in-left 1s forwards; }
                .animate-slide-in-top { animation: slide-in-top 1s forwards; }
                .animate-slide-in-bottom { animation: slide-in-bottom 1s forwards; }
                .animate-zoom-in { animation: zoom-in 1s forwards; }

                /* Rotate */
                @keyframes rotate-out { to { transform: rotate(180deg) scale(0); opacity: 0; } }
                @keyframes rotate-in { from { transform: rotate(-180deg) scale(0); opacity: 0; } to { transform: rotate(0) scale(1); opacity: 1; } }
                .animate-rotate-out { animation: rotate-out 1s forwards; }
                .animate-rotate-in { animation: rotate-in 1s forwards; }

                /* Cube */
                @keyframes cube-out { to { transform: rotateY(-90deg); opacity: 0.5; } }
                @keyframes cube-in { from { transform: rotateY(90deg); opacity: 0.5; } to { transform: rotateY(0); opacity: 1; } }
                .animate-cube-out { animation: cube-out 1s forwards; transform-origin: right center; }
                .animate-cube-in { animation: cube-in 1s forwards; transform-origin: left center; }

                /* Wipe / Push */
                /* Left (Move Left) */
                @keyframes wipe-left-out { from { transform: translateX(0); } to { transform: translateX(-100%); } }
                @keyframes wipe-left-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
                .animate-wipe-left-out { animation: wipe-left-out 1s forwards; }
                .animate-wipe-left-in { animation: wipe-left-in 1s forwards; }

                /* Right (Move Right) */
                @keyframes wipe-right-out { from { transform: translateX(0); } to { transform: translateX(100%); } }
                @keyframes wipe-right-in { from { transform: translateX(-100%); } to { transform: translateX(0); } }
                .animate-wipe-right-out { animation: wipe-right-out 1s forwards; }
                .animate-wipe-right-in { animation: wipe-right-in 1s forwards; }

                /* Top (Move Up) */
                @keyframes wipe-top-out { from { transform: translateY(0); } to { transform: translateY(-100%); } }
                @keyframes wipe-top-in { from { transform: translateY(100%); } to { transform: translateY(0); } }
                .animate-wipe-top-out { animation: wipe-top-out 1s forwards; }
                .animate-wipe-top-in { animation: wipe-top-in 1s forwards; }

                /* Bottom (Move Down) */
                @keyframes wipe-bottom-out { from { transform: translateY(0); } to { transform: translateY(100%); } }
                @keyframes wipe-bottom-in { from { transform: translateY(-100%); } to { transform: translateY(0); } }
                .animate-wipe-bottom-out { animation: wipe-bottom-out 1s forwards; }
                .animate-wipe-bottom-in { animation: wipe-bottom-in 1s forwards; }
                `}
            </style>

            {/* Current Image */}
            <img 
                key={`curr-${currentIndex}`}
                src={shuffledImages[currentIndex]} 
                alt="Slideshow" 
                className={`absolute inset-0 w-full h-full object-contain ${nextIndex !== null ? getExitClass() : 'z-10'}`}
            />

            {/* Next Image (Entering) */}
            {nextIndex !== null && (
                <img 
                    key={`next-${nextIndex}`}
                    src={shuffledImages[nextIndex]} 
                    alt="Next" 
                    className={`absolute inset-0 w-full h-full object-contain ${getEnterClass()}`}
                />
            )}

            <button 
                onClick={onClose} 
                className="absolute top-4 right-4 bg-black/50 hover:bg-black/80 text-white p-3 rounded-full z-50 opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <Icons.X className="w-6 h-6" />
            </button>
        </div>
    );
};