
import { createClient } from '@supabase/supabase-js';

const getEnvVar = (key: string) => {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
        return (import.meta as any).env[key];
    }
    if (typeof process !== 'undefined' && process.env) {
        return process.env[key];
    }
    return undefined;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

export const isConfigured = !!supabaseUrl && !!supabaseAnonKey;

if (!isConfigured) {
    throw new Error("Error: Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");
}

export const supabase = createClient(
    String(supabaseUrl),
    String(supabaseAnonKey)
);
