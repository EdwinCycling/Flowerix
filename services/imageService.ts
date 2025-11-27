
/**
 * Image Service
 * Handles client-side compression and resizing to optimize for:
 * 1. LocalStorage limits (critical for offline web apps)
 * 2. Gemini API Token usage (512x512 hits the lower token tier)
 * 3. Bandwidth
 */

export type CompressionMode = 'standard' | 'high';

// Configuration for "The Crunch"
const COMPRESSION_CONFIG = {
    standard: {
        maxWidth: 512,
        maxHeight: 512,
        quality: 0.6, // 60% quality (Good for ID/Storage)
    },
    high: {
        maxWidth: 1024,
        maxHeight: 1024,
        quality: 0.85, // 85% quality (Needed for Plant Doctor details)
    },
    mimeType: 'image/jpeg'
};

const MAX_FILE_SIZE_MB = 10; // Hard limit 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

export const compressImage = (file: File, mode: CompressionMode = 'standard'): Promise<string> => {
    return new Promise((resolve, reject) => {
        // 1. Security: File Size Check
        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
            reject(new Error(`File too large. Max ${MAX_FILE_SIZE_MB}MB allowed.`));
            return;
        }

        // 2. Security: File Type Check
        if (!ALLOWED_TYPES.includes(file.type)) {
            reject(new Error("Invalid file type. Please upload an image (JPEG, PNG, WEBP)."));
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        const config = COMPRESSION_CONFIG[mode];

        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions (Maintain Aspect Ratio)
                if (width > height) {
                    if (width > config.maxWidth) {
                        height = Math.round(height * (config.maxWidth / width));
                        width = config.maxWidth;
                    }
                } else {
                    if (height > config.maxHeight) {
                        width = Math.round(width * (config.maxHeight / height));
                        height = config.maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error("Could not get canvas context"));
                    return;
                }

                // Draw and compress
                ctx.drawImage(img, 0, 0, width, height);
                
                // Result is a Base64 string
                const dataUrl = canvas.toDataURL(COMPRESSION_CONFIG.mimeType, config.quality);
                resolve(dataUrl);
            };

            img.onerror = (err) => reject(new Error("Failed to load image data."));
        };

        reader.onerror = (err) => reject(new Error("File reading failed."));
    });
};
