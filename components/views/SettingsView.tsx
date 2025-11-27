
import React, { useState, useRef, useEffect } from 'react';
import { Icons } from '../Icons';
import { HomeLocation, TempUnit, LengthUnit, WindUnit, TimeFormat, SubscriptionDetails, ModulesConfig } from '../../types';
import { searchLocation, reverseGeocode } from '../../services/mapService';
import { getUsageStats, UsageStats, getSubscriptionDetails } from '../../services/usageService';
import { PRICING_CONFIG } from '../../pricingConfig';
import { FULL_SCHEMA_SQL } from '../../services/schemaService';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../supabaseClient';

// Declare Leaflet globally
declare const L: any;

interface SettingsViewProps {
    onBack: () => void;
    lang: 'en' | 'nl';
    setLang: (l: 'en' | 'nl') => void;
    homeLocation: HomeLocation | null;
    setHomeLocation: (loc: HomeLocation | null) => void;
    useWeather: boolean;
    setUseWeather: (u: boolean) => void;
    tempUnit: TempUnit;
    setTempUnit: (u: TempUnit) => void;
    lengthUnit: LengthUnit;
    setLengthUnit: (u: LengthUnit) => void;
    windUnit: WindUnit;
    setWindUnit: (u: WindUnit) => void;
    firstDayOfWeek: 'mon' | 'sun' | 'sat';
    setFirstDayOfWeek: (day: 'mon' | 'sun' | 'sat') => void;
    timeFormat: TimeFormat;
    setTimeFormat: (format: TimeFormat) => void;
    limitAI: boolean;
    setLimitAI: (limit: boolean) => void;
    modules: ModulesConfig;
    setModules: (m: ModulesConfig) => void;
    t: (key: string) => string;
}

const MUSIC_VOTE_KEY = 'flowerix_music_votes';

// Generate songs list: /music/song (1..16).mp3 served from public
const songs = Array.from({ length: 16 }, (_, i) => {
    const n = i + 1;
    const title = `Song (${n})`;
    const file = `/music/${encodeURIComponent(`song (${n}).mp3`)}`;
    return { title, file };
});

export const SettingsView: React.FC<SettingsViewProps> = ({
    onBack, lang, setLang, homeLocation, setHomeLocation, useWeather, setUseWeather, tempUnit, setTempUnit, lengthUnit, setLengthUnit, windUnit, setWindUnit, firstDayOfWeek, setFirstDayOfWeek, timeFormat, setTimeFormat, limitAI, setLimitAI, modules, setModules, t
}) => {
    const { user, profile, refreshProfile } = useAuth();
    const [activeTab, setActiveTab] = useState<'GENERAL' | 'MODULES' | 'LOCATION' | 'MUSIC' | 'PAYMENT'>('GENERAL');
    const [usageSubTab, setUsageSubTab] = useState<'STATS' | 'SUBSCRIPTION'>('STATS');
    
    // Location Map State
    const [locationSearchQuery, setLocationSearchQuery] = useState('');
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const markerInstanceRef = useRef<any>(null);
    const [mapCenter, setMapCenter] = useState<[number, number]>([52.3676, 4.9041]); // Default Amsterdam

    // Music State
    const [currentSong, setCurrentSong] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [userVotes, setUserVotes] = useState<string[]>([]);
    const [votesSubmitted, setVotesSubmitted] = useState(false);
    const [globalStats, setGlobalStats] = useState<{title: string, votes: number}[]>([]);
    const [playingError, setPlayingError] = useState<string | null>(null);
    const [duration, setDuration] = useState<number>(0);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [isPaused, setIsPaused] = useState<boolean>(false);
    const [volume, setVolume] = useState<number>(0.8);

    // Usage Stats
    const [usageStats, setUsageStats] = useState<UsageStats>(getUsageStats());
    const [subscription, setSubscription] = useState<SubscriptionDetails>(getSubscriptionDetails());

    // Schema Modal
    const [showSchemaModal, setShowSchemaModal] = useState(false);

    // Initialize Music selection from profile.settings (JSON)
    useEffect(() => {
        if (activeTab !== 'MUSIC') return;
        if (profile?.settings?.music?.favorites && Array.isArray(profile.settings.music.favorites)) {
            const favs = profile.settings.music.favorites as string[];
            setUserVotes(favs);
            setVotesSubmitted(true);
            fetchStats();
        } else {
            setUserVotes([]);
            setVotesSubmitted(false);
            fetchStats();
        }
    }, [activeTab, profile]);

    // Listen for usage updates
    useEffect(() => {
        const handleUsageUpdate = () => {
            setUsageStats(getUsageStats());
            setSubscription(getSubscriptionDetails());
        };
        window.addEventListener('usageUpdated', handleUsageUpdate);
        return () => window.removeEventListener('usageUpdated', handleUsageUpdate);
    }, []);

    const fetchStats = async () => {
        try {
            const { data, error } = await supabase.from('music_song_stats').select('*').order('votes', { ascending: false });
            if (error || !data) {
                const stats = songs.map(s => ({ title: s.title, votes: 0 }));
                setGlobalStats(stats);
                return;
            }
            const stats = data.map((row: any) => {
                const match = songs.find(s => s.file === row.song_key);
                return { title: match ? match.title : row.song_key, votes: row.votes as number };
            }).sort((a: any, b: any) => b.votes - a.votes);
            setGlobalStats(stats);
        } catch {
            const stats = songs.map(s => ({ title: s.title, votes: 0 }));
            setGlobalStats(stats);
        }
    };

    const addLog = (_msg: string) => {};

    const handlePlay = (file: string) => {
        setPlayingError(null);
        addLog(`Init playback: ${file}`);
        
        if (audioRef.current) {
            try { audioRef.current.pause(); } catch {}
            try { audioRef.current.currentTime = 0; } catch {}
            if (currentSong === file) {
                audioRef.current = null;
                setCurrentSong(null);
                addLog("Stopped current.");
                return;
            }
        }

        fetch(file, { method: 'HEAD' })
            .then(res => {
                if (!res.ok) addLog(`Probe: HTTP ${res.status} (Not OK)`);
                else addLog(`Probe: HTTP ${res.status} (OK)`);
            })
            .catch(e => addLog(`Probe Fail: ${e.message}`));

        const audio = new Audio(file);
        audioRef.current = audio;
        setCurrentSong(file);
        setIsPaused(false);
        setDuration(0);
        setCurrentTime(0);
        audio.volume = volume;

        audio.addEventListener('ended', () => {
            setCurrentSong(null);
            addLog("Audio ended.");
        });
        
        audio.addEventListener('canplay', () => addLog("Event: canplay fired"));
        audio.addEventListener('loadedmetadata', () => { setDuration(audio.duration || 0); });
        audio.addEventListener('timeupdate', () => { setCurrentTime(audio.currentTime || 0); });
        
        audio.addEventListener('error', (e) => {
            const err = audio.error;
            let errMsg = 'Unknown Error';
            if (err) {
                switch (err.code) {
                    case err.MEDIA_ERR_ABORTED: errMsg = 'Aborted'; break;
                    case err.MEDIA_ERR_NETWORK: errMsg = 'Network Error'; break;
                    case err.MEDIA_ERR_DECODE: errMsg = 'Decode Error'; break;
                    case err.MEDIA_ERR_SRC_NOT_SUPPORTED: errMsg = 'Source Not Supported'; break;
                    default: errMsg = `Code ${err.code}`;
                }
                if (err.message) errMsg += ` (${err.message})`;
            }
            addLog(`Media Error: ${errMsg}`);
            setPlayingError(`${file}: ${errMsg}`);
            setCurrentSong(null);
            setIsPaused(false);
            setDuration(0);
            setCurrentTime(0);
            audioRef.current = null;
        });

        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise
                .then(() => addLog("Playback started."))
                .catch(error => {
                    addLog(`Play blocked/failed: ${error.message}`);
                    setPlayingError(`${file}: Playback blocked`);
                    setIsPaused(true);
                });
        }
    };
    const pausePlayback = () => { const a = audioRef.current; if (!a) return; a.pause(); setIsPaused(true); };
    const resumePlayback = () => { const a = audioRef.current; if (!a) return; a.play(); setIsPaused(false); };
    const stopPlayback = () => { const a = audioRef.current; if (!a) return; try { a.pause(); a.currentTime = 0; } catch {} audioRef.current = null; setCurrentSong(null); setIsPaused(false); setDuration(0); setCurrentTime(0); };
    const setVolumeLevel = (v: number) => { setVolume(v); const a = audioRef.current; if (a) a.volume = v; };

    const handleVote = async (title: string, file: string) => {
        if (votesSubmitted) return;
        if (userVotes.includes(title)) {
            setUserVotes(prev => prev.filter(t => t !== title));
            try { await supabase.from('music_votes').delete().eq('user_id', user?.id || '').eq('song_key', file); } catch {}
            fetchStats();
        } else {
            if (userVotes.length < 3) {
                setUserVotes(prev => [...prev, title]);
                try { await supabase.from('music_votes').insert({ user_id: user?.id, song_key: file }); } catch {}
                fetchStats();
            } else {
                alert("You can only vote for 3 songs!");
            }
        }
    };

    const submitVotes = async () => {
        if (!user) { alert(t('not_logged_in')); return; }
        const current = (profile?.settings || {});
        const nextSettings = { ...current, music: { favorites: userVotes } };
        const { error } = await supabase.from('profiles').update({ settings: nextSettings }).eq('id', user.id);
        if (error) {
            alert(error.message || t('save_music_error'));
            return;
        }
        await refreshProfile();
        await fetchStats();
        setVotesSubmitted(true);
    };

    useEffect(() => {
        return () => {
            if (audioRef.current) audioRef.current.pause();
        };
    }, []);

    useEffect(() => {
        if (activeTab === 'LOCATION') {
            setTimeout(() => {
                if (!mapContainerRef.current) return;
                if (mapInstanceRef.current) {
                    mapInstanceRef.current.remove();
                    mapInstanceRef.current = null;
                    markerInstanceRef.current = null;
                }

                const initialLat = homeLocation ? homeLocation.latitude : mapCenter[0];
                const initialLng = homeLocation ? homeLocation.longitude : mapCenter[1];
                const initialZoom = homeLocation ? 13 : 5;

                const map = L.map(mapContainerRef.current).setView([initialLat, initialLng], initialZoom);

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                }).addTo(map);

                map.on('click', async (e: any) => {
                    const { lat, lng } = e.latlng;
                    if (markerInstanceRef.current) {
                        markerInstanceRef.current.setLatLng([lat, lng]);
                    } else {
                        markerInstanceRef.current = L.marker([lat, lng]).addTo(map);
                    }

                    const locationData = await reverseGeocode(lat, lng);
                    setHomeLocation({ 
                        latitude: lat, 
                        longitude: lng, 
                        name: locationData?.name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                        countryCode: locationData?.countryCode
                    });
                });

                if (homeLocation) {
                    markerInstanceRef.current = L.marker([homeLocation.latitude, homeLocation.longitude]).addTo(map);
                }

                mapInstanceRef.current = map;
                map.invalidateSize();
            }, 100);
        } else {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
                markerInstanceRef.current = null;
            }
        }
    }, [activeTab]);

    useEffect(() => {
        if (mapInstanceRef.current && activeTab === 'LOCATION') {
            mapInstanceRef.current.setView(mapCenter, 13);
        }
    }, [mapCenter]);

    const handleLocationSearch = async () => {
        if (!locationSearchQuery) return;
        const results = await searchLocation(locationSearchQuery);
        if (results.length > 0) {
            setMapCenter([results[0].lat, results[0].lon]);
        } else {
            alert(t('location_search_error'));
        }
    };

    const handleUseCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (position) => {
                const { latitude, longitude } = position.coords;
                const locationData = await reverseGeocode(latitude, longitude);
                const newLoc = { 
                    latitude, 
                    longitude, 
                    name: locationData?.name || "Current Location",
                    countryCode: locationData?.countryCode
                };
                setHomeLocation(newLoc);
                if (mapInstanceRef.current) {
                    mapInstanceRef.current.setView([latitude, longitude], 13);
                    if (markerInstanceRef.current) {
                        markerInstanceRef.current.setLatLng([latitude, longitude]);
                    } else {
                        markerInstanceRef.current = L.marker([latitude, longitude]).addTo(mapInstanceRef.current);
                    }
                }
            }, (err) => {
                console.error(err);
                alert("Could not get location. Check permissions.");
            });
        } else {
            alert("Geolocation not supported");
        }
    };

    const handleManageSubscription = () => {
        alert("Redirecting to Stripe Customer Portal...");
    };

    const fmtNum = (num: number) => num.toLocaleString(lang === 'nl' ? 'nl-NL' : 'en-US');
    const fmtDate = (iso: string) => {
        if (!iso) return '';
        return new Date(iso).toLocaleDateString(lang === 'nl' ? 'nl-NL' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const copySQL = () => {
        navigator.clipboard.writeText(FULL_SCHEMA_SQL);
        alert(t('copy_success'));
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors">
            <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 flex-shrink-0">
                <button onClick={onBack} className="text-gray-600 dark:text-gray-300"><Icons.ArrowLeft /></button>
                <h2 className="ml-4 font-semibold text-lg text-gray-900 dark:text-white">{t('settings_title')}</h2>
            </div>

            <div className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0 overflow-x-auto no-scrollbar">
                <button onClick={() => setActiveTab('GENERAL')} className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap px-4 ${activeTab === 'GENERAL' ? 'border-green-600 text-green-600 dark:text-green-400' : 'border-transparent text-gray-500 dark:text-gray-400'}`}>{t('settings_tab_general')}</button>
                <button onClick={() => setActiveTab('MODULES')} className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap px-4 ${activeTab === 'MODULES' ? 'border-green-600 text-green-600 dark:text-green-400' : 'border-transparent text-gray-500 dark:text-gray-400'}`}>{t('settings_tab_modules')}</button>
                <button onClick={() => setActiveTab('LOCATION')} className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap px-4 ${activeTab === 'LOCATION' ? 'border-green-600 text-green-600 dark:text-green-400' : 'border-transparent text-gray-500 dark:text-gray-400'}`}>{t('settings_tab_location')}</button>
                <button onClick={() => setActiveTab('PAYMENT')} className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap px-4 flex items-center justify-center gap-2 ${activeTab === 'PAYMENT' ? 'border-green-600 text-green-600 dark:text-green-400' : 'border-transparent text-gray-500 dark:text-gray-400'}`}><Icons.Zap className="w-4 h-4" /> {t('settings_tab_usage_payment')}</button>
                <button onClick={() => setActiveTab('MUSIC')} className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap px-4 flex items-center justify-center gap-2 ${activeTab === 'MUSIC' ? 'border-green-600 text-green-600 dark:text-green-400' : 'border-transparent text-gray-500 dark:text-gray-400'}`}><Icons.Music className="w-4 h-4" /> {t('settings_tab_music')}</button>
            </div>

            <div className="flex-1 relative flex flex-col min-h-0">
                {activeTab === 'GENERAL' && (
                    <div className="p-4 overflow-y-auto">
                        <div className="space-y-6 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm">
                            {/* Language */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><Icons.Globe className="w-4 h-4" /> {t('language')}</h3>
                                <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
                                    <button onClick={() => setLang('en')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${lang === 'en' ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>English</button>
                                    <button onClick={() => setLang('nl')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${lang === 'nl' ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>Nederlands</button>
                                </div>
                            </div>

                            <hr className="border-gray-100 dark:border-gray-700" />

                            {/* Limit AI */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2"><Icons.ShieldAlert className="w-4 h-4" /> {t('limit_ai')}</h3>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={limitAI} onChange={(e) => setLimitAI(e.target.checked)} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                                    </label>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 pl-6">{t('limit_ai_desc')}</p>
                            </div>

                            <hr className="border-gray-100 dark:border-gray-700" />

                            {/* First Day */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><Icons.Calendar className="w-4 h-4" /> {t('first_day_of_week')}</h3>
                                <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
                                    <button onClick={() => setFirstDayOfWeek('mon')} className={`flex-1 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${firstDayOfWeek === 'mon' ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>{t('day_mon')}</button>
                                    <button onClick={() => setFirstDayOfWeek('sat')} className={`flex-1 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${firstDayOfWeek === 'sat' ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>{t('day_sat')}</button>
                                    <button onClick={() => setFirstDayOfWeek('sun')} className={`flex-1 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${firstDayOfWeek === 'sun' ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>{t('day_sun')}</button>
                                </div>
                            </div>

                            <hr className="border-gray-100 dark:border-gray-700" />

                            {/* Time Format */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><Icons.Clock className="w-4 h-4" /> {t('time_format')}</h3>
                                <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
                                    <button onClick={() => setTimeFormat('24h')} className={`flex-1 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${timeFormat === '24h' ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>{t('time_24h')}</button>
                                    <button onClick={() => setTimeFormat('12h')} className={`flex-1 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${timeFormat === '12h' ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>{t('time_12h')}</button>
                                </div>
                            </div>

                            <hr className="border-gray-100 dark:border-gray-700" />

                            {/* Weather Toggle & Units */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2"><Icons.Cloud className="w-4 h-4" /> {t('use_weather')}</h3>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={useWeather} onChange={(e) => setUseWeather(e.target.checked)} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                                    </label>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 pl-6">{t('weather_helper')}</p>
                            </div>

                            {useWeather && (
                                <div>
                                    <div className="flex items-center justify-between mt-4">
                                        <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2"><Icons.Thermometer className="w-4 h-4" /> {t('temp_unit')}</h3>
                                        <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl w-32">
                                            <button onClick={() => setTempUnit('C')} className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${tempUnit === 'C' ? 'bg-white dark:bg-gray-600 shadow text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>°C</button>
                                            <button onClick={() => setTempUnit('F')} className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${tempUnit === 'F' ? 'bg-white dark:bg-gray-600 shadow text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>°F</button>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between mt-4">
                                        <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2"><Icons.CloudRain className="w-4 h-4" /> {t('length_unit')}</h3>
                                        <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl w-32">
                                            <button onClick={() => setLengthUnit('mm')} className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${lengthUnit === 'mm' ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>{t('unit_mm')}</button>
                                            <button onClick={() => setLengthUnit('in')} className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${lengthUnit === 'in' ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>{t('unit_in')}</button>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between mt-4">
                                        <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2"><Icons.Wind className="w-4 h-4" /> {t('wind_unit')}</h3>
                                        <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl w-32">
                                            <button onClick={() => setWindUnit('kmh')} className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${windUnit === 'kmh' ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>km/h</button>
                                            <button onClick={() => setWindUnit('mph')} className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${windUnit === 'mph' ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>mph</button>
                                            <button onClick={() => setWindUnit('bft')} className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${windUnit === 'bft' ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>Bft</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <hr className="border-gray-100 dark:border-gray-700" />

                            {/* Database Schema */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                    <Icons.Database className="w-4 h-4" /> {t('settings_schema_title')}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 pl-6">{t('schema_modal_desc')}</p>
                                <button onClick={() => setShowSchemaModal(true)} className="w-full py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2">
                                    <Icons.Code className="w-4 h-4" /> {t('view_schema_btn')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'MODULES' && (
                    <div className="p-4 overflow-y-auto">
                        <div className="space-y-6 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2"><Icons.Book className="w-4 h-4" /> {t('module_garden_log')}</h3>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={modules.gardenLogs} onChange={(e) => setModules({...modules, gardenLogs: e.target.checked})} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                                </label>
                            </div>

                            <hr className="border-gray-100 dark:border-gray-700" />

                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2"><Icons.Map className="w-4 h-4" /> {t('module_garden_view')}</h3>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={modules.gardenView} onChange={(e) => setModules({...modules, gardenView: e.target.checked})} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                                </label>
                            </div>

                            <hr className="border-gray-100 dark:border-gray-700" />

                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2"><Icons.Globe className="w-4 h-4" /> {t('module_social')}</h3>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={modules.social} onChange={(e) => setModules({...modules, social: e.target.checked})} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                                </label>
                            </div>

                            <hr className="border-gray-100 dark:border-gray-700" />

                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2"><Icons.Notebook className="w-4 h-4" /> {t('module_notebook')}</h3>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={modules.notebook} onChange={(e) => setModules({...modules, notebook: e.target.checked})} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'LOCATION' && (
                    <div className="flex-1 flex flex-col h-full relative">
                        <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex flex-col gap-2 flex-shrink-0 z-20">
                            <div className="flex gap-2">
                                <input type="text" value={locationSearchQuery} onChange={(e) => setLocationSearchQuery(e.target.value)} placeholder={t('search_location')} className="flex-1 border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" onKeyDown={(e) => e.key === 'Enter' && handleLocationSearch()} />
                                <button onClick={handleLocationSearch} className="bg-blue-600 text-white px-3 py-2 rounded-lg"><Icons.Search className="w-4 h-4" /></button>
                                <button onClick={handleUseCurrentLocation} className="bg-green-600 text-white px-3 py-2 rounded-lg flex items-center gap-1"><Icons.Navigation className="w-4 h-4" /></button>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 flex justify-between items-center">
                                <span className="italic">{t('location_privacy_subtitle')}</span>
                                {homeLocation && <span className="font-bold text-green-600 dark:text-green-400">{t('location_set')}</span>}
                            </div>
                            {homeLocation && (
                                <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate border-t border-gray-100 dark:border-gray-700 pt-1">
                                    {homeLocation.name}
                                </div>
                            )}
                        </div>
                        
                        <div className="flex-1 relative min-h-0 w-full bg-gray-100 dark:bg-gray-900">
                            <div ref={mapContainerRef} className="absolute inset-0 z-0" />
                        </div>
                        
                        {homeLocation && (
                            <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 z-20">
                                <button onClick={() => { setHomeLocation(null); if (markerInstanceRef.current) markerInstanceRef.current.remove(); }} className="w-full py-2 text-red-500 text-sm font-medium border border-red-200 dark:border-red-900/30 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                                    {t('remove_location')}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'PAYMENT' && (
                    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4">
                        <div className="flex justify-center mb-4">
                            <div className="bg-white dark:bg-gray-800 p-1 rounded-xl shadow-sm inline-flex">
                                <button 
                                    onClick={() => setUsageSubTab('STATS')}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${usageSubTab === 'STATS' ? 'bg-gray-100 dark:bg-gray-700 text-green-600 dark:text-green-400' : 'text-gray-500'}`}
                                >
                                    {t('usage_tab_stats')}
                                </button>
                                <button 
                                    onClick={() => setUsageSubTab('SUBSCRIPTION')}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${usageSubTab === 'SUBSCRIPTION' ? 'bg-gray-100 dark:bg-gray-700 text-green-600 dark:text-green-400' : 'text-gray-500'}`}
                                >
                                    {t('usage_tab_sub')}
                                </button>
                            </div>
                        </div>

                        {usageSubTab === 'STATS' ? (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm mb-6 animate-in fade-in">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400"><Icons.Zap className="w-6 h-6" /></div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('usage_title')}</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('usage_desc')}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
                                        <div className="text-xs text-indigo-500 font-bold uppercase tracking-wider mb-1">{t('usage_total_score')}</div>
                                        <div className="text-3xl font-bold text-indigo-700 dark:text-indigo-400">{fmtNum(usageStats.totalScore)}</div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                                        <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">{t('usage_requests')}</div>
                                        <div className="text-3xl font-bold text-gray-700 dark:text-gray-200">{fmtNum(usageStats.requests)}</div>
                                    </div>
                                </div>
                                <div className="mb-6">
                                    <div className="flex justify-between text-xs mb-1 font-medium">
                                        <span className="text-blue-500">{t('usage_input_tokens')}</span>
                                        <span className="text-purple-500">{t('usage_output_tokens')}</span>
                                    </div>
                                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
                                        <div className="h-full bg-blue-500" style={{ width: `${(usageStats.inputTokens / (usageStats.inputTokens + usageStats.outputTokens || 1)) * 100}%` }} />
                                        <div className="h-full bg-purple-500 flex-1" />
                                    </div>
                                    <div className="flex justify-between text-xs mt-1 text-gray-500">
                                        <span>{fmtNum(usageStats.inputTokens)}</span>
                                        <span>{fmtNum(usageStats.outputTokens)}</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-100 dark:border-gray-700">
                                        <span className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2"><Icons.Image className="w-4 h-4" /> {t('usage_images_scanned')}</span>
                                        <span className="font-bold text-gray-800 dark:text-white">{fmtNum(usageStats.imagesScanned)}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-100 dark:border-gray-700">
                                        <span className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2"><Icons.Activity className="w-4 h-4" /> {t('usage_ratio')} (In/Out)</span>
                                        <span className="font-bold text-gray-800 dark:text-white">1 : {(usageStats.outputTokens / (usageStats.inputTokens || 1)).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in">
                                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><Icons.Star className="w-5 h-5 text-yellow-500" /> {t('sub_details')}</h3>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${subscription.tier === 'FREE' ? 'bg-gray-100 text-gray-500' : subscription.cancelAtPeriodEnd ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>{subscription.cancelAtPeriodEnd ? t('sub_canceling') : subscription.tier}</span>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl flex items-center justify-between">
                                            <span className="text-sm text-gray-500 dark:text-gray-400">{t('sub_plan')}</span>
                                            <span className="font-bold text-gray-900 dark:text-white">{PRICING_CONFIG[subscription.tier].name}</span>
                                        </div>
                                        {subscription.tier !== 'FREE' && (
                                            <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl flex items-center justify-between">
                                                <span className="text-sm text-gray-500 dark:text-gray-400">{subscription.cancelAtPeriodEnd ? t('sub_active_until') : t('sub_renews_on')}</span>
                                                <span className={`font-bold ${subscription.cancelAtPeriodEnd ? 'text-orange-500' : 'text-gray-900 dark:text-white'}`}>{fmtDate(subscription.currentPeriodEnd)}</span>
                                            </div>
                                        )}
                                        {subscription.tier !== 'FREE' && (
                                            <div className="pt-2">
                                                <button onClick={handleManageSubscription} className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"><Icons.Settings className="w-4 h-4" /> {t('sub_manage_stripe')}</button>
                                                <p className="text-[10px] text-center text-gray-400 mt-3 flex items-center justify-center gap-1"><Icons.Lock className="w-3 h-3" /> {t('sub_stripe_secure')}</p>
                                            </div>
                                        )}
                                        {subscription.tier === 'FREE' && <div className="text-center py-4"><p className="text-sm text-gray-500 mb-4">{t('sub_free_desc')}</p></div>}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'MUSIC' && (
                    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                        <div className="p-4">
                            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg mb-6 relative overflow-hidden">
                                <div className="absolute right-0 top-0 opacity-10 pointer-events-none"><Icons.Music className="w-40 h-40 -mr-10 -mt-10" /></div>
                                <h2 className="text-2xl font-bold mb-2 flex items-center gap-2"><Icons.Headphones className="w-6 h-6" /> {t('music_title')}</h2>
                                <p className="text-indigo-100 max-w-xs">{t('music_desc')}</p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        <Icons.Volume className="w-5 h-5" /> {currentSong ? t('music_now_playing') : t('music_not_loaded')}
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                        {currentSong ? (songs.find(s => s.file === currentSong)?.title || currentSong) : ''}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        {t('music_time')}: {String(Math.floor(currentTime/60)).padStart(2,'0')}:{String(Math.floor(currentTime%60)).padStart(2,'0')} / {String(Math.floor(duration/60)).padStart(2,'0')}:{String(Math.floor(duration%60)).padStart(2,'0')}
                                    </div>
                                    {currentSong && (
                                        <div className="flex items-center gap-2 ml-auto">
                                            {isPaused ? (
                                                <button onClick={resumePlayback} className="px-3 py-1 rounded-lg bg-green-600 text-white text-xs font-bold">{t('music_resume')}</button>
                                            ) : (
                                                <button onClick={pausePlayback} className="px-3 py-1 rounded-lg bg-yellow-500 text-white text-xs font-bold">{t('music_pause')}</button>
                                            )}
                                            <button onClick={stopPlayback} className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-bold">{t('music_stop')}</button>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-3 flex items-center gap-3">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">{t('music_volume')}</span>
                                    <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => setVolumeLevel(Number(e.target.value))} className="w-48" />
                                </div>
                            </div>
                            {votesSubmitted ? (
                                <div className="space-y-6 animate-in fade-in">
                                    <div className="text-center mb-4"><h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center justify-center gap-2"><Icons.BarChart className="w-6 h-6 text-green-500" /> {t('results_title')}</h3><p className="text-gray-500 dark:text-gray-400 text-sm">{t('results_desc')}</p></div>
                                    {globalStats.map((stat, idx) => {
                                        const isTop3 = idx < 3;
                                        const maxVotes = globalStats[0].votes;
                                        const width = (stat.votes / maxVotes) * 100;
                                        const trophyColor = idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-400' : 'text-amber-600';
                                        return (
                                            <div key={stat.title} className={`bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border transition-transform hover:scale-[1.01] ${isTop3 ? 'border-indigo-100 dark:border-indigo-900/30' : 'border-transparent'}`}>
                                                <div className="flex items-center gap-4 mb-2"><div className="font-bold text-lg w-6 text-center text-gray-400">{idx + 1}</div><div className="flex-1"><h4 className={`font-bold text-sm ${isTop3 ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-800 dark:text-white'}`}>{stat.title}</h4></div>{isTop3 && <Icons.Trophy className={`w-5 h-5 ${trophyColor}`} />}<span className="text-xs font-bold text-gray-500">{fmtNum(stat.votes)} {t('votes')}</span></div>
                                                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden"><div className={`h-full rounded-full ${idx === 0 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 'bg-indigo-500'}`} style={{ width: `${width}%` }} /></div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="pb-20">
                                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-yellow-100 dark:border-yellow-900/20 mb-6 flex items-start gap-3"><Icons.Star className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-1" /><div><h4 className="font-bold text-gray-900 dark:text-white">{t('vote_title')}</h4><p className="text-sm text-gray-600 dark:text-gray-400">{t('vote_subtitle')}</p><div className="mt-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">{userVotes.length} / 3 Selected</div></div></div>
                                    <div className="space-y-3">
                                        {songs.map((song) => {
                                            const isPlaying = currentSong === song.file;
                                            const isSelected = userVotes.includes(song.title);
                                            const isError = playingError && playingError.includes(song.file);
                                            return (
                                                <div key={song.title} className={`flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border transition-all ${isPlaying ? 'border-green-500 ring-1 ring-green-500' : isError ? 'border-red-200' : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700'}`}>
                                                    <button onClick={() => handlePlay(song.file)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isPlaying ? 'bg-green-500 text-white animate-pulse' : isError ? 'bg-red-100 text-red-500' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-600'}`} title={isError ? "Audio unavailable" : "Play"}>{isPlaying ? <Icons.Pause className="w-5 h-5" /> : isError ? <Icons.X className="w-5 h-5" /> : <Icons.Play className="w-5 h-5 ml-0.5" />}</button>
                                                    <div className="flex-1 min-w-0"><h4 className={`text-sm font-medium truncate ${isPlaying ? 'text-green-600 dark:text-green-400' : isError ? 'text-red-500' : 'text-gray-800 dark:text-white'}`}>{song.title}</h4>{isPlaying && <span className="text-xs text-green-500 flex items-center gap-1"><Icons.Volume className="w-3 h-3" /> {t('playing')}...</span>}{isError && <span className="text-xs text-red-400">Error playing file</span>}</div>
                                                    <button onClick={() => handleVote(song.title, song.file)} className={`p-2 rounded-lg transition-all ${isSelected ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600' : 'text-gray-300 hover:text-yellow-400'}`}><Icons.Heart className={`w-5 h-5 ${isSelected ? 'fill-current' : ''}`} /></button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {userVotes.length > 0 && (
                                        <div className="fixed bottom-6 left-0 right-0 p-4 flex justify-center pointer-events-none"><button onClick={submitVotes} className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-full shadow-xl hover:bg-indigo-700 transform hover:scale-105 transition-all pointer-events-auto flex items-center gap-2 animate-in slide-in-from-bottom-4"><Icons.Check className="w-5 h-5" /> {t('submit_votes')} ({userVotes.length})</button></div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Schema Modal */}
            {showSchemaModal && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Icons.Database className="w-5 h-5 text-blue-500" /> SQL Schema
                            </h3>
                            <button onClick={() => setShowSchemaModal(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-white"><Icons.X /></button>
                        </div>
                        <div className="flex-1 p-0 overflow-hidden bg-gray-950">
                            <textarea readOnly className="w-full h-full p-4 bg-gray-950 text-green-400 font-mono text-xs resize-none focus:outline-none" value={FULL_SCHEMA_SQL} />
                        </div>
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-b-2xl flex justify-end gap-2">
                            <button onClick={() => setShowSchemaModal(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg">{t('close')}</button>
                            <button onClick={copySQL} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2"><Icons.Copy className="w-4 h-4" /> {t('copy_text')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
