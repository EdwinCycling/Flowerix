
import { PRICING_CONFIG, UserTier } from "../pricingConfig";
import { supabase } from '../supabaseClient';
import { SubscriptionDetails } from '../types';

export const USAGE_KEY = 'flowerix_ai_usage_stats_v4_secure'; // Bump version for security reset

// Simple "salt" for client-side obfuscation (Not true security, but deters casual console editing)
const SALT = "FLX_SECURE_SALT_992";

export interface UsageStats {
    totalScore: number; 
    dailyScore: number; 
    lastUsageDate: string; 
    inputTokens: number;
    outputTokens: number;
    requests: number;
    imagesScanned: number;
    tier: UserTier;
    extraTokens: number;
    hash?: string; // Integrity Checksum
    dbLoads?: number;
    periodLoads?: Record<string, number>;
}

const IMAGE_TOKEN_COST = 258;

// Helper: Generate Checksum
const generateHash = (stats: Omit<UsageStats, 'hash'>): string => {
    const str = `${stats.totalScore}|${stats.dailyScore}|${stats.tier}|${stats.extraTokens}|${SALT}`;
    // Simple hash implementation for browser without async crypto
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
};

export const getUsageStats = (): UsageStats => {
    const today = new Date().toISOString().split('T')[0];
    const defaultStats: UsageStats = { 
        totalScore: 0, 
        dailyScore: 0, 
        lastUsageDate: today, 
        inputTokens: 0, 
        outputTokens: 0, 
        requests: 0, 
        imagesScanned: 0,
        tier: 'FREE',
        extraTokens: 0,
        dbLoads: 0,
        periodLoads: {}
    };

    try {
        const data = localStorage.getItem(USAGE_KEY);
        
        if (!data) return defaultStats;

        let stats: UsageStats = JSON.parse(data);

        // 1. Integrity Check
        const { hash, ...cleanStats } = stats;
        const computedHash = generateHash(cleanStats);
        
        if (hash !== computedHash) {
            console.warn("Security: Usage stats integrity check failed. Resetting.");
            // Reset critical values if tampered
            stats = { ...defaultStats, tier: 'FREE', extraTokens: 0 }; 
        }

        // 2. Migration/Defaults
        if (!stats.tier) stats.tier = 'FREE';
        if (stats.extraTokens === undefined) stats.extraTokens = 0;
        if (stats.dbLoads === undefined) stats.dbLoads = 0;
        if (!stats.periodLoads) stats.periodLoads = {};

        // 3. Daily Reset
        if (stats.lastUsageDate !== today) {
            stats.dailyScore = 0;
            stats.lastUsageDate = today;
            saveStats(stats); // Resave with new date
        }

        return stats;
    } catch {
        return defaultStats;
    }
};

const saveStats = (stats: UsageStats) => {
    // Strip hash, calculate new one, save
    const { hash, ...cleanStats } = stats;
    const newHash = generateHash(cleanStats);
    const toSave = { ...cleanStats, hash: newHash };
    
    localStorage.setItem(USAGE_KEY, JSON.stringify(toSave));
};

export const getActiveModelId = (): string => {
    const stats = getUsageStats();
    const tierConfig = PRICING_CONFIG[stats.tier];
    return tierConfig.aiModelId;
};

export const trackUsage = (inputText: string, outputText: string, imageCount: number = 0) => {
    const stats = getUsageStats();

    // 1 Token ~= 4 characters
    const textInputTokens = Math.ceil(inputText.length / 4);
    const textOutputTokens = Math.ceil(outputText.length / 4);
    const imageInputTokens = imageCount * IMAGE_TOKEN_COST;

    const totalInput = textInputTokens + imageInputTokens;
    
    // Formula: Input + (Output * 5)
    const actionScore = totalInput + (textOutputTokens * 5);

    const newStats: UsageStats = {
        ...stats,
        requests: stats.requests + 1,
        imagesScanned: stats.imagesScanned + imageCount,
        inputTokens: stats.inputTokens + totalInput,
        outputTokens: stats.outputTokens + textOutputTokens,
        totalScore: stats.totalScore + actionScore,
        dailyScore: stats.dailyScore + actionScore
    };

    // Consume extra tokens if daily limit is exceeded
    const config = PRICING_CONFIG[stats.tier];
    if (newStats.dailyScore > config.dailyLimit && newStats.extraTokens > 0) {
        const dailyOverage = newStats.dailyScore - config.dailyLimit;
        // If we were ALREADY over limit, allow using extra tokens
        if (stats.dailyScore >= config.dailyLimit) {
             newStats.extraTokens = Math.max(0, stats.extraTokens - actionScore);
        } else if (newStats.dailyScore > config.dailyLimit) {
             const overage = newStats.dailyScore - config.dailyLimit;
             newStats.extraTokens = Math.max(0, stats.extraTokens - overage);
        }
    }

    saveStats(newStats);
    window.dispatchEvent(new Event('usageUpdated'));
};

export const setTier = (tier: UserTier) => {
    const stats = getUsageStats();
    stats.tier = tier;
    saveStats(stats);
    window.dispatchEvent(new Event('usageUpdated'));
    (async () => {
        try {
            const { data: auth } = await supabase.auth.getUser();
            const userId = auth?.user?.id;
            if (!userId) return;
            const { data: prof } = await supabase
                .from('profiles')
                .select('settings')
                .eq('id', userId)
                .single();
            const existing = (prof && prof.settings) ? prof.settings : {};
            await supabase
                .from('profiles')
                .update({ settings: { ...existing, tier } })
                .eq('id', userId);
        } catch {}
    })();
};

export const addExtraTokens = (_amount: number) => {
    // Deprecated: tokens now awarded server-side via Stripe webhook
};

export const canPerformAction = (estimatedCost: number = 100): { allowed: boolean, reason?: 'LIMIT' | 'FEATURE' } => {
    const stats = getUsageStats();
    const config = PRICING_CONFIG[stats.tier];
    
    const totalCapacity = config.dailyLimit + stats.extraTokens;
    
    if (stats.dailyScore + estimatedCost > totalCapacity) {
        return { allowed: false, reason: 'LIMIT' };
    }
    
    return { allowed: true };
};

export const isFeatureAllowed = (feature: keyof typeof PRICING_CONFIG['FREE']['features']): boolean => {
    const stats = getUsageStats();
    return PRICING_CONFIG[stats.tier].features[feature];
};

export const trackDbLoad = async (userId?: string) => {
    const stats = getUsageStats();
    const now = new Date();
    const periodKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`; // YYYY-MM
    const newStats: UsageStats = { ...stats, dbLoads: (stats.dbLoads || 0) + 1, periodLoads: { ...(stats.periodLoads || {}), [periodKey]: ((stats.periodLoads || {})[periodKey] || 0) + 1 } };
    saveStats(newStats);
    window.dispatchEvent(new Event('usageUpdated'));

    if (!userId) return;
    try {
        await supabase
            .from('user_usage')
            .upsert({ user_id: userId, period: periodKey, loads: ((newStats.periodLoads || {})[periodKey] || 0) }, { onConflict: 'user_id,period' });
    } catch (e: any) {
        // Missing table or permissions; ignore gracefully
    }
};

/**
 * Mock function to get subscription details.
 * In production this would fetch from the 'user_subscriptions' table.
 */
export const getSubscriptionDetails = (): SubscriptionDetails => {
    const stats = getUsageStats();
    // Client displays tier quickly; server will update via periodic sync (AuthContext)
    return { tier: stats.tier, status: 'active', currentPeriodEnd: '', cancelAtPeriodEnd: false };
};

/**
 * Security Check: Syncs local data with Server Truth
 * Called on sensitive navigation events (Tab changes)
 */
export const validateAndSyncWithServer = async (userId: string) => {
    try {
        const localStats = getUsageStats();

        // Prefer authoritative subscription row
        const { data: sub } = await supabase
            .from('user_subscriptions')
            .select('tier')
            .eq('user_id', userId)
            .maybeSingle();

        const serverTier = sub?.tier || (await (async () => {
            const { data } = await supabase
                .from('profiles')
                .select('settings')
                .eq('id', userId)
                .maybeSingle();
            return data?.settings?.tier || 'FREE';
        })());

        if (localStats.tier !== serverTier) {
            console.warn(`Security Mismatch Detected: Local(${localStats.tier}) vs Server(${serverTier}). Enforcing Server Truth.`);
            setTier(serverTier as any);
        }
    } catch (e) {
        console.error("Security sync check failed", e);
    }
};
