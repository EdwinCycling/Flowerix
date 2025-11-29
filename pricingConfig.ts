
export type UserTier = 'FREE' | 'SILVER' | 'GOLD' | 'DIAMOND';

export interface TierConfig {
    id: UserTier;
    rank: number; // 0, 1, 2, 3 - Used for Upgrade/Downgrade logic
    name: string;
    dailyLimit: number;
    price: string; // Display string
    priceValue: number; // Numeric value for logic
    features: {
        slideshow: boolean;
        seasons: boolean;
        merge: boolean;
        optimize: boolean;
        timelapse: boolean;
        unlimited_history: boolean;
        aiSparks: boolean; // New feature flag
    };
    aiModelDisplay: string; // User friendly name
    aiModelId: string;      // Technical model ID for API
    color: string;
    badge?: string;
    buttonColor: string;
}

export const PRICING_CONFIG: Record<UserTier, TierConfig> = {
    FREE: {
        id: 'FREE',
        rank: 0,
        name: 'Free',
        dailyLimit: 50000,
        price: '€0',
        priceValue: 0,
        features: {
            slideshow: false,
            seasons: false,
            merge: false,
            optimize: false,
            timelapse: false,
            unlimited_history: false,
            aiSparks: false
        },
        aiModelDisplay: 'Gemini 2.0 Flash-Lite',
        aiModelId: 'gemini-2.0-flash-lite', 
        color: 'bg-gray-500',
        buttonColor: 'bg-gray-600'
    },
    SILVER: {
        id: 'SILVER',
        rank: 1,
        name: 'Silver',
        dailyLimit: 250000,
        price: '€3 / mnd',
        priceValue: 3,
        features: {
            slideshow: true,
            seasons: true,
            merge: true,
            optimize: true,
            timelapse: true,
            unlimited_history: true,
            aiSparks: true
        },
        aiModelDisplay: 'Gemini 2.5 Flash-Lite', 
        aiModelId: 'gemini-2.5-flash-lite', 
        color: 'bg-slate-500',
        buttonColor: 'bg-slate-600',
        badge: 'Popular'
    },
    GOLD: {
        id: 'GOLD',
        rank: 2,
        name: 'Gold',
        dailyLimit: 500000,
        price: '€5 / mnd',
        priceValue: 5,
        features: {
            slideshow: true,
            seasons: true,
            merge: true,
            optimize: true,
            timelapse: true,
            unlimited_history: true,
            aiSparks: true
        },
        aiModelDisplay: 'Gemini 2.5 Pro', 
        aiModelId: 'gemini-2.5-pro', 
        color: 'bg-yellow-500',
        buttonColor: 'bg-yellow-600',
        badge: 'Best Value'
    },
    DIAMOND: {
        id: 'DIAMOND',
        rank: 3,
        name: 'Diamond',
        dailyLimit: 999999999, 
        price: 'Admin',
        priceValue: 999,
        features: {
            slideshow: true,
            seasons: true,
            merge: true,
            optimize: true,
            timelapse: true,
            unlimited_history: true,
            aiSparks: true
        },
        aiModelDisplay: 'Gemini Ultra',
        aiModelId: 'gemini-2.5-pro',
        color: 'bg-cyan-500',
        buttonColor: 'bg-cyan-600'
    }
};

export const FLOWERIX_BLOCK = {
    tokens: 250000,
    price: '€2,50'
};
