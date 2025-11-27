
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isConfigured } from '../supabaseClient';
import { Session, User } from '@supabase/supabase-js';
import { UserProfile } from '../types';
import { checkRateLimit, sanitizeInput } from '../services/securityService';
import { setTier, getUsageStats } from '../services/usageService';
import { runRLSAssertions } from '../services/policyAssert';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    profile: UserProfile | null;
    isLoading: boolean;
    missingDatabase: boolean;
    signInWithGoogle: () => Promise<void>;
    signInWithEmail: (email: string) => Promise<{ error: any }>;
    signInWithPassword: (email: string, password: string) => Promise<{ data: any; error: any }>;
    signUp: (email: string, password: string) => Promise<{ data: any; error: any }>;
    resetPassword: (email: string) => Promise<{ data: any; error: any }>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [missingDatabase, setMissingDatabase] = useState(false);

    useEffect(() => {
        if (!isConfigured) {
            console.log("AuthContext: Supabase not configured, skipping session fetch.");
            setIsLoading(false);
            return;
        }

        // 1. Get initial session
        supabase.auth.getSession()
            .then(({ data: { session } }) => {
                setSession(session);
                setUser(session?.user ?? null);
                if (session?.user) {
                    fetchProfile(session.user);
                } else {
                    setIsLoading(false);
                }
            })
            .catch((err) => {
                console.error("Auth initialization error:", err);
                setIsLoading(false);
            });

        // 2. Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            
            if (session?.user) {
                fetchProfile(session.user);
            } else {
                setProfile(null);
                setIsLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (!user || !isConfigured) return;

        // Initial validation
        validateSubscription(user.id);

        // Periodic check (every 5 minutes) to detect tampering or external updates
        const intervalId = setInterval(() => {
            validateSubscription(user.id);
        }, 5 * 60 * 1000); 

        return () => clearInterval(intervalId);
    }, [user]);

    const validateSubscription = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('settings')
                .eq('id', userId)
                .single();

            if (data && data.settings && data.settings.tier) {
                const dbTier = data.settings.tier;
                const localStats = getUsageStats();
                
                if (localStats.tier !== dbTier) {
                    console.log(`Security: Tier mismatch detected. Local: ${localStats.tier}, DB: ${dbTier}. Syncing...`);
                    setTier(dbTier);
                    // Also update context state if needed
                    setProfile(prev => prev ? { ...prev, settings: { ...prev.settings, tier: dbTier } } : null);
                }
            }
        } catch (e) {
            console.error("Subscription validation failed", e);
        }
    };

    const fetchProfile = async (currentUser: User) => {
        if (!isConfigured) return;
        setMissingDatabase(false);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', currentUser.id)
                .maybeSingle();

            if (error) {
                if (error.code === '42P01' || error.message.includes('Could not find the table')) {
                    console.error("CRITICAL: Database tables missing.");
                    setMissingDatabase(true);
                    setIsLoading(false);
                    return;
                } else {
                    console.warn('Profile fetch warning:', error.message);
                }
            }

            if (!data) {
                console.log("Profile missing for existing user. Attempting self-heal...");
                const { data: newProfile, error: insertError } = await supabase
                    .from('profiles')
                    .insert([
                        { 
                            id: currentUser.id, 
                            email: currentUser.email,
                            display_name: sanitizeInput(currentUser.user_metadata?.display_name || currentUser.email?.split('@')[0]),
                            avatar_url: currentUser.user_metadata?.avatar_url,
                            status: 'pending'
                        }
                    ])
                    .select()
                    .single();

                if (insertError) {
                    if (insertError.code === '42P01' || insertError.message.includes('Could not find the table')) {
                        setMissingDatabase(true);
                    }
                } else {
                    setProfile(newProfile as UserProfile);
                }
            } else {
                const userProf = data as UserProfile;
                setProfile(userProf);
                
                // Security: Sync Tier from DB to LocalStorage (Server Authoritative)
                // If settings.tier exists in DB, enforce it locally
                if (userProf.settings && userProf.settings.tier) {
                    const localStats = getUsageStats();
                    if (localStats.tier !== userProf.settings.tier) {
                        console.log("Syncing tier from server:", userProf.settings.tier);
                        setTier(userProf.settings.tier);
                    }
                }
                try { await runRLSAssertions(currentUser.id); } catch {}
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const signInWithGoogle = async () => {
        if (!isConfigured) {
            alert("Supabase is not configured.");
            return;
        }
        if (!checkRateLimit('login', 5, 60)) {
            alert("Too many login attempts. Please wait a minute.");
            return;
        }
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: window.location.origin }
            });
            if (error) throw error;
        } catch (error) {
            console.error('Error signing in:', error);
            alert('Error signing in.');
        }
    };

    const signInWithEmail = async (email: string) => {
        if (!checkRateLimit('login', 5, 60)) return { error: { message: "Too many attempts. Wait 1 min." } };
        if (!isConfigured) return { error: { message: "Supabase not configured" } };
        
        try {
            const { error } = await supabase.auth.signInWithOtp({
                email: sanitizeInput(email),
                options: {}
            });
            return { error };
        } catch (error) {
            return { error };
        }
    };

    const signInWithPassword = async (email: string, password: string) => {
        if (!checkRateLimit('login', 5, 60)) return { data: null, error: { message: "Too many attempts. Wait 1 min." } };
        if (!isConfigured) return { data: null, error: { message: "Supabase not configured" } };
        
        const result = await supabase.auth.signInWithPassword({ 
            email: sanitizeInput(email), 
            password 
        });
        return result;
    };

    const signUp = async (email: string, password: string) => {
        if (!checkRateLimit('signup', 3, 300)) return { data: null, error: { message: "Too many account creation attempts." } };
        if (!isConfigured) return { data: null, error: { message: "Supabase not configured" } };
        
        const result = await supabase.auth.signUp({ 
            email: sanitizeInput(email), 
            password,
            options: {
                emailRedirectTo: window.location.origin,
                data: { display_name: sanitizeInput(email.split('@')[0]) }
            }
        });

        if (result.error && result.error.message.includes("already registered")) {
             return { data: null, error: { message: "Account exists. Please use 'Login' instead." } };
        }

        return result;
    };

    const resetPassword = async (email: string) => {
        if (!checkRateLimit('reset_pw', 3, 300)) return { data: null, error: { message: "Too many reset attempts." } };
        if (!isConfigured) return { data: null, error: { message: "Supabase not configured" } };
        return await supabase.auth.resetPasswordForEmail(sanitizeInput(email), {
            redirectTo: window.location.origin,
        });
    };

    const signOut = async () => {
        if (!isConfigured) return;
        await supabase.auth.signOut();
        setProfile(null);
        setSession(null);
        setUser(null);
        setMissingDatabase(false);
    };

    const refreshProfile = async () => {
        if (!checkRateLimit('refresh_profile', 10, 60)) return; // Prevent hammering
        if (user) await fetchProfile(user);
    };

    return (
        <AuthContext.Provider value={{ session, user, profile, isLoading, missingDatabase, signInWithGoogle, signInWithEmail, signInWithPassword, signUp, resetPassword, signOut, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
