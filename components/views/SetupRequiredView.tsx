
import React from 'react';
import { Icons } from '../Icons';
import { useAuth } from '../../contexts/AuthContext';
import { FULL_SCHEMA_SQL } from '../../services/schemaService';

export const SetupRequiredView: React.FC = () => {
    const { signOut } = useAuth();

    const handleCopy = () => {
        navigator.clipboard.writeText(FULL_SCHEMA_SQL);
        alert("SQL copied! Paste it into Supabase SQL Editor.");
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6">
            <div className="max-w-3xl w-full">
                <div className="bg-red-500/10 border border-red-500/50 rounded-2xl p-6 mb-6 flex items-start gap-4">
                    <div className="bg-red-500/20 p-3 rounded-full">
                        <Icons.ShieldAlert className="w-8 h-8 text-red-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold mb-2">Database Update Required</h1>
                        <p className="text-gray-300 mb-2">
                            Security Update: To enforce tier security and new features, please update your database schema.
                        </p>
                        <p className="text-sm text-gray-400">
                            Run this SQL script in <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-blue-400 underline hover:text-blue-300">Supabase SQL Editor</a>.
                        </p>
                    </div>
                </div>

                <div className="bg-gray-800 rounded-2xl overflow-hidden shadow-2xl mb-6">
                    <div className="bg-gray-950 px-4 py-2 flex justify-between items-center border-b border-gray-700">
                        <span className="text-xs font-mono text-gray-400">full_schema.sql</span>
                        <button onClick={handleCopy} className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded text-white flex items-center gap-1 transition-colors">
                            <Icons.Copy className="w-3 h-3" /> Copy SQL
                        </button>
                    </div>
                    <textarea 
                        readOnly 
                        className="w-full h-96 bg-gray-900 p-4 font-mono text-xs text-green-400 focus:outline-none resize-none"
                        value={FULL_SCHEMA_SQL}
                    />
                </div>

                <div className="flex gap-4 justify-center">
                    <button 
                        onClick={() => window.location.reload()} 
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 transition-colors"
                    >
                        <Icons.RefreshCw className="w-5 h-5" /> I ran the SQL, Refresh!
                    </button>
                    <button 
                        onClick={signOut} 
                        className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-8 rounded-xl transition-colors"
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
};
