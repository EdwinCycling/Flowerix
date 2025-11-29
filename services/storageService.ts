
import { supabase } from '../supabaseClient';

const base64ToBlob = (dataUrl: string): Blob => {
    const parts = dataUrl.split(',');
    const meta = parts[0];
    const base64 = parts[1];
    const mimeMatch = meta.match(/data:(.*?);base64/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
};

export const uploadPlantImage = async (base64: string, userId: string): Promise<string | null> => {
    try {
        const blob = base64ToBlob(base64);
        if (!blob.type.startsWith('image/')) return null;
        if (blob.size > 5 * 1024 * 1024) return null;
        
        // 2. Generate unique filename
        const filename = `${userId}/${Date.now()}.jpg`;

        // 3. Upload to Supabase Storage
        const { data, error } = await supabase
            .storage
            .from('flowerix-media')
            .upload(filename, blob, {
                contentType: 'image/jpeg',
                cacheControl: '3600',
                upsert: true
            });

        if (error) {
            console.error("Upload Error:", error);
            return null;
        }
        return filename;

    } catch (e) {
        console.error("Upload exception:", e);
        return null;
    }
};

export const deletePlantImage = async (imageUrl: string): Promise<void> => {
    if (!imageUrl) return;
    
    try {
        const bucketName = 'flowerix-media';
        let filePath = imageUrl;
        if (imageUrl.startsWith('http')) {
            const urlObj = new URL(imageUrl);
            const parts = urlObj.pathname.split(`/${bucketName}/`);
            if (parts.length < 2) return;
            filePath = decodeURIComponent(parts[1]);
        }
        
        const { error } = await supabase
            .storage
            .from(bucketName)
            .remove([filePath]);
            
        if (error) {
            console.error("Delete Error:", error);
        }
    } catch (e) {
        console.warn("Delete exception:", e);
    }
};

export const getSignedUrl = async (filePath: string, expiresIn: number = 3600): Promise<string | null> => {
    try {
        const { data, error } = await supabase
            .storage
            .from('flowerix-media')
            .createSignedUrl(filePath, expiresIn);
        if (error) return null;
        return data?.signedUrl || null;
    } catch {
        return null;
    }
};

export const resolveImageUrl = async (input: string | null | undefined, expiresIn: number = 3600): Promise<string | undefined> => {
    if (!input) return undefined;
    if (input.startsWith('http')) {
        try {
            const urlObj = new URL(input);
            const isSigned = urlObj.pathname.includes('/object/sign/');
            if (isSigned) {
                const bucketName = 'flowerix-media';
                const parts = urlObj.pathname.split(`/${bucketName}/`);
                if (parts.length >= 2) {
                    const filePath = decodeURIComponent(parts[1]);
                    const refreshed = await getSignedUrl(filePath, expiresIn);
                    if (refreshed) return refreshed;
                }
            }
            return input;
        } catch {
            return input;
        }
    }
    const signed = await getSignedUrl(input, expiresIn);
    return signed || undefined;
};
