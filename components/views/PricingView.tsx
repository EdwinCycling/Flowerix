
import React, { useState, useEffect } from 'react';
import { Icons } from '../Icons';
import { PRICING_CONFIG, UserTier, FLOWERIX_BLOCK } from '../../pricingConfig';
import { getUsageStats, getSubscriptionDetails } from '../../services/usageService';
import { ConfirmationModal } from '../ui/Overlays';
import { SubscriptionDetails } from '../../types';

interface PricingViewProps {
    onBack: () => void;
    onOpenUsage?: () => void;
    t: (key: string) => string;
}

export const PricingView: React.FC<PricingViewProps> = ({ onBack, onOpenUsage, t }) => {
    const [currentTier, setCurrentTier] = useState<UserTier>('FREE');
    const [extraTokens, setExtraTokens] = useState(0);
    const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
    
    // Modal State
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        targetTier?: UserTier;
        confirmText: string;
        isUpgrade: boolean;
    }>({ isOpen: false, title: '', message: '', confirmText: '', isUpgrade: false });

    useEffect(() => {
        const stats = getUsageStats();
        setCurrentTier(stats.tier);
        setExtraTokens(stats.extraTokens);
        setSubscription(getSubscriptionDetails());
    }, []);

    const handleTierClick = (tier: UserTier) => {
        if (tier === currentTier) return;

        const currentRank = PRICING_CONFIG[currentTier].rank;
        const targetRank = PRICING_CONFIG[tier].rank;
        const isUpgrade = targetRank > currentRank;

        if (isUpgrade) {
            setModalConfig({
                isOpen: true,
                title: t('upgrade_confirm_title'),
                message: t('upgrade_confirm_msg').replace('{tier}', PRICING_CONFIG[tier].name),
                targetTier: tier,
                confirmText: t('upgrade_now'),
                isUpgrade: true
            });
        } else {
            setModalConfig({
                isOpen: true,
                title: t('downgrade_confirm_title'),
                message: t('downgrade_confirm_msg').replace('{tier}', PRICING_CONFIG[currentTier].name),
                targetTier: tier,
                confirmText: t('downgrade_btn'),
                isUpgrade: false
            });
        }
    };

    const confirmChange = async () => {
        if (!modalConfig.targetTier) return;
        try {
            const res = await fetch('/.netlify/functions/stripeCreateCheckout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tier: modalConfig.targetTier, userId: subscription?.stripeCustomerId ? undefined : (window as any).supabaseUserId })
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (e) { alert('Error: Unable to start checkout'); }
        setModalConfig({ ...modalConfig, isOpen: false });
    };

    const handleBuyBlock = async () => {
        try {
            const res = await fetch('/.netlify/functions/stripeCreateCheckout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ block: true, userId: (window as any).supabaseUserId })
            });
            const data = await res.json();
            if (data.url) window.location.href = data.url; else alert('Error: Could not create checkout');
        } catch { alert('Error: Could not create checkout'); }
    };

    const tiers: UserTier[] = ['FREE', 'SILVER', 'GOLD'];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors">
            <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                <button onClick={onBack} className="text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-full transition-colors">
                    <Icons.ArrowLeft className="w-6 h-6" />
                </button>
                <h2 className="ml-3 font-bold text-lg text-gray-900 dark:text-white">{t('pricing_title')}</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 pb-24">
                
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('pricing_subtitle')}</h1>
                    <p className="text-gray-600 dark:text-gray-400">{t('pricing_desc')}</p>
                </div>

                {/* Current Plan Status Banner */}
                {subscription && subscription.tier !== 'FREE' && (
                    <div className="max-w-5xl mx-auto mb-8 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center justify-between">
                        <div>
                            <span className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wide">{t('sub_plan')}</span>
                            <div className="font-bold text-gray-900 dark:text-white text-lg">{PRICING_CONFIG[subscription.tier].name}</div>
                        </div>
                        <div className="text-right">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                {subscription.cancelAtPeriodEnd ? t('sub_active_until') : t('sub_renews_on')}
                            </span>
                            {subscription.currentPeriodEnd && (
                                <div className="font-medium text-gray-700 dark:text-gray-300">
                                    {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                                </div>
                            )}
                            <div className="mt-2">
                                <button onClick={onOpenUsage} className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700">
                                    {t('view_usage')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tiers Grid */}
                <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                    {tiers.map(tierKey => {
                        const config = PRICING_CONFIG[tierKey];
                        const isCurrent = currentTier === tierKey;
                        const currentRank = PRICING_CONFIG[currentTier].rank;
                        const thisRank = config.rank;
                        const isUpgrade = thisRank > currentRank;

                        return (
                            <div key={tierKey} className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg border-2 transition-all transform ${isCurrent ? 'border-green-500 scale-105 z-10' : 'border-transparent hover:border-green-200'} flex flex-col`}>
                                {config.badge && (
                                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                                        {config.badge}
                                    </div>
                                )}
                                
                                <div className={`p-6 ${config.color} text-white rounded-t-xl`}>
                                    <h3 className="text-2xl font-bold">{config.name}</h3>
                                    <div className="text-3xl font-extrabold mt-2">{config.price}</div>
                                    <div className="text-xs opacity-90 mt-2 font-medium flex items-center gap-1">
                                        <Icons.Zap className="w-3 h-3" />
                                        {t('per_day_limit')}: {config.dailyLimit.toLocaleString()}
                                    </div>
                                    <div className="text-[10px] opacity-75 uppercase tracking-wider mt-1">Flowerix Points</div>
                                </div>

                                <div className="p-6 flex-1 flex flex-col">
                                    <ul className="space-y-3 mb-6 flex-1">
                                        <li className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                                            <Icons.Zap className="w-5 h-5 text-purple-500 flex-shrink-0" />
                                            <span className="font-bold text-purple-600 dark:text-purple-400">{config.aiModelDisplay}</span>
                                        </li>
                                        
                                        {/* AI Sparks Check */}
                                        <li className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                                            {config.features.aiSparks ? <Icons.Check className="w-5 h-5 text-green-500 flex-shrink-0" /> : <Icons.X className="w-5 h-5 text-gray-400 flex-shrink-0" />}
                                            <span className={config.features.aiSparks ? '' : 'text-gray-400 decoration-line-through'}>AI Sparks</span>
                                        </li>

                                        <li className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                                            <Icons.Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                                            <span>{t('feature_basic')}</span>
                                        </li>
                                        <li className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                                            {config.features.slideshow ? <Icons.Check className="w-5 h-5 text-green-500 flex-shrink-0" /> : <Icons.X className="w-5 h-5 text-gray-400 flex-shrink-0" />}
                                            <span className={config.features.slideshow ? '' : 'text-gray-400 decoration-line-through'}>{t('feature_advanced')}</span>
                                        </li>
                                        <li className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                                            {config.features.unlimited_history ? <Icons.Check className="w-5 h-5 text-green-500 flex-shrink-0" /> : <Icons.X className="w-5 h-5 text-gray-400 flex-shrink-0" />}
                                            <span className={config.features.unlimited_history ? '' : 'text-gray-400 decoration-line-through'}>{t('feature_history')}</span>
                                        </li>
                                    </ul>

                                    <button 
                                        onClick={() => handleTierClick(tierKey)}
                                        disabled={isCurrent}
                                        className={`w-full py-3 rounded-xl font-bold transition-colors shadow-sm ${
                                            isCurrent 
                                                ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 cursor-default' 
                                                : isUpgrade 
                                                    ? 'bg-green-600 text-white hover:bg-green-700 shadow-green-200 dark:shadow-none' 
                                                    : 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        {isCurrent ? t('current_plan') : isUpgrade ? t('upgrade_now') : t('downgrade_btn')}
                                    </button>
                                    {isCurrent && subscription?.stripeCustomerId && (
                                        <button onClick={async () => {
                                            try {
                                                const res = await fetch(`/.netlify/functions/stripeCreatePortal?customer_id=${subscription.stripeCustomerId}`);
                                                const data = await res.json();
                                                if (data.url) window.location.href = data.url;
                                            } catch { alert('Error: Cannot open portal'); }
                                        }} className="mt-2 w-full py-2 rounded-xl font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                            Manage Subscription
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Flowerix Block */}
                <div className="max-w-5xl mx-auto mt-12 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
                        <Icons.Zap className="w-64 h-64 -mr-10 -mt-10" />
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div>
                            <h3 className="text-2xl font-bold flex items-center gap-2">
                                <Icons.Hexagon className="w-8 h-8" /> {t('block_title')}
                            </h3>
                            <p className="text-indigo-100 mt-2 max-w-md">{t('block_desc')}</p>
                            <div className="mt-4 inline-block bg-white/20 px-4 py-2 rounded-lg text-sm font-mono">
                                {t('extra_balance')}: {extraTokens.toLocaleString()} pts
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-bold mb-2">{FLOWERIX_BLOCK.price}</div>
                            <button 
                                onClick={handleBuyBlock}
                                className="bg-white text-indigo-600 px-8 py-3 rounded-full font-bold hover:bg-indigo-50 transition-colors shadow-lg active:scale-95"
                            >
                                {t('buy_block')}
                            </button>
                            <p className="text-xs opacity-75 mt-2">+{FLOWERIX_BLOCK.tokens.toLocaleString()} Flowerix Points</p>
                        </div>
                    </div>
                </div>

            </div>

            {/* Confirmation Modal */}
            <ConfirmationModal 
                isOpen={modalConfig.isOpen}
                title={modalConfig.title}
                message={modalConfig.message}
                onConfirm={confirmChange}
                onCancel={() => setModalConfig({ ...modalConfig, isOpen: false })}
                confirmText={modalConfig.confirmText}
                cancelText={t('cancel')}
            />
        </div>
    );
};
