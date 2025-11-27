import React, { useState } from 'react';
import { Icons } from '../Icons';
import { useAuth } from '../../contexts/AuthContext';

export const WaitlistView: React.FC = () => {
    const { signOut, profile, refreshProfile } = useAuth();
    const [refreshing, setRefreshing] = useState(false);

    const handleCheckStatus = async () => {
        setRefreshing(true);
        await refreshProfile();
        // Small artificial delay for UX so user sees something happened
        setTimeout(() => setRefreshing(false), 1000);
    };

    return (
        <div className="min-h-screen bg-green-50 dark:bg-gray-900 flex flex-col items-center justify-center p-6">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden transform transition-all">
                <div className="h-48 bg-cover bg-center relative" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80)' }}>
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center backdrop-blur-[2px]">
                        <Icons.Lock className="w-16 h-16 text-white/90" />
                    </div>
                </div>
                
                <div className="p-8 text-center">
                    <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-white mb-2">
                        Almost There!
                    </h2>
                    
                    <div className="inline-block px-4 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 text-sm font-bold uppercase tracking-widest mb-6 border border-yellow-200 dark:border-yellow-800">
                        Status: {profile?.status || 'Pending'}
                    </div>
                    
                    <div className="space-y-4 text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                        <p>
                            Welcome, <span className="font-bold">{profile?.display_name || profile?.email}</span>! 
                        </p>
                        <p>
                            Flowerix is currently in a private beta phase. We're reviewing your request to join the garden.
                        </p>
                        <p className="italic border-l-4 border-green-500 pl-3 mx-4 text-left bg-green-50 dark:bg-green-900/20 p-2 rounded-r-lg">
                            "Patience is the secret to good gardening."
                        </p>
                    </div>

                    <div className="mt-8 space-y-3">
                        <button 
                            onClick={handleCheckStatus}
                            disabled={refreshing}
                            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 transition-all active:scale-95 shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {refreshing ? <Icons.Loader className="w-5 h-5 animate-spin" /> : <Icons.RefreshCw className="w-5 h-5" />}
                            {refreshing ? 'Checking...' : 'Check Status'}
                        </button>

                        <button 
                            onClick={signOut}
                            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            <Icons.LogOut className="w-4 h-4" /> Sign Out
                        </button>
                    </div>
                </div>
            </div>
            <div className="mt-8 text-xs text-gray-400 text-center">
                Flowerix ID: {profile?.id?.split('-')[0]}...
            </div>
        </div>
    );
};