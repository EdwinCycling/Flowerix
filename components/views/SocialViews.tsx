
import React, { useState } from 'react';
import { Icons } from '../Icons';
import { Plant, SocialPost, SocialComment } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../supabaseClient';
import { compressImage } from '../../services/imageService';
import { uploadPlantImage } from '../../services/storageService';
import { getUsageStats } from '../../services/usageService';

// --- World View (Feed) ---
interface WorldViewProps {
    posts: SocialPost[];
    plants: Plant[];
    onLike: (id: string) => void;
    onOpenDetails: (id: string) => void;
    onLoadMore: () => void;
    onRefresh: () => void;
    hasMore: boolean;
    showToast: (msg: string) => void;
    lang: 'en' | 'nl';
    t: (key: string) => string;
}

export const WorldView: React.FC<WorldViewProps> = ({ posts, plants, onLike, onOpenDetails, onLoadMore, onRefresh, hasMore, showToast, lang, t }) => {
    const [socialCountryFilter, setSocialCountryFilter] = useState<string>('ALL');
    const [socialPlantFilter, setSocialPlantFilter] = useState<string>('ALL');
    const [socialOwnershipFilter, setSocialOwnershipFilter] = useState<'ALL' | 'MINE'>('ALL');
    const { user, profile } = useAuth();

    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [composeTitle, setComposeTitle] = useState('');
    const [composeDesc, setComposeDesc] = useState('');
    const [composeImage, setComposeImage] = useState<string | null>(null);
    const [composePlant, setComposePlant] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);

    React.useEffect(() => {
        if (isComposeOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isComposeOpen]);

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString(lang === 'nl' ? 'nl-NL' : 'en-US', {
                year: 'numeric', month: 'long', day: 'numeric'
            });
        } catch { return dateStr; }
    };

    const getPostWeatherIcon = (code: number) => {
        if (code === 0) return <Icons.Sun className="w-full h-full text-yellow-500" />;
        return <Icons.Cloud className="w-full h-full text-gray-400" />;
    };
    
    const getPostWeatherDesc = (code: number) => {
        return code === 0 ? t('weather_clear') : t('weather_cloudy');
    }

    return (
        <div className="relative min-h-[calc(100vh-120px)]">
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <img
                    src="https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80"
                    alt="Garden Background"
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-white/40 dark:from-gray-900/70 dark:via-transparent dark:to-gray-900/80"></div>
            </div>

            <div className="relative z-10 flex flex-col gap-6 p-4 max-w-7xl mx-auto pb-24">
                <div className="flex flex-wrap gap-2 mb-2 justify-end">
                    <select
                        value={socialOwnershipFilter}
                        onChange={(e) => setSocialOwnershipFilter(e.target.value as 'ALL' | 'MINE')}
                        className="bg-white/90 dark:bg-gray-800/90 backdrop-blur border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500 shadow-sm"
                    >
                        <option value="ALL">{t('filter_all_posts')}</option>
                        <option value="MINE">{t('filter_my_posts')}</option>
                    </select>

                    <select
                        value={socialCountryFilter}
                        onChange={(e) => setSocialCountryFilter(e.target.value)}
                        disabled={socialOwnershipFilter === 'MINE'}
                        className={`bg-white/90 dark:bg-gray-800/90 backdrop-blur border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500 shadow-sm ${socialOwnershipFilter === 'MINE' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <option value="ALL">{t('country_all')}</option>
                        {Array.from(new Set(posts.map(p => p.country))).map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                    <select
                        value={socialPlantFilter}
                        onChange={(e) => setSocialPlantFilter(e.target.value)}
                        disabled={plants.filter(p => p.isActive).length === 0}
                        className="bg-white/90 dark:bg-gray-800/90 backdrop-blur border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <option value="ALL">{t('plant_all')}</option>
                        {plants.filter(p => p.isActive).map(p => (
                            <option key={p.id} value={p.name}>{p.name}</option>
                        ))}
                    </select>
                </div>
                <div className="flex justify-end">
                    <button onClick={() => setIsComposeOpen(true)} className="bg-green-600 text-white px-3 py-2 rounded-lg font-bold shadow hover:bg-green-700 transition-colors flex items-center gap-2">
                        <Icons.Plus className="w-4 h-4" /> {lang === 'nl' ? 'Bericht' : 'Post'}
                    </button>
                </div>

                {(() => {
                    let filteredPosts = posts.filter(p => {
                        if (socialOwnershipFilter === 'MINE') {
                            if (!p.isCurrentUser) return false;
                        } else {
                            const countryMatch = socialCountryFilter === 'ALL' || p.country === socialCountryFilter;
                            if (!countryMatch) return false;
                        }

                        let plantMatch = true;
                        if (socialPlantFilter !== 'ALL') {
                            plantMatch = p.plantName.toLowerCase().includes(socialPlantFilter.toLowerCase());
                        }
                        return plantMatch;
                    });

                    if (filteredPosts.length === 0) {
                        return (
                            <div className="text-center text-gray-600 dark:text-gray-400 py-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-2xl p-8 shadow-sm">
                                <Icons.Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>{t('world_no_posts')}</p>
                            </div>
                        )
                    }

                    return (
                        <>
                            {filteredPosts.map(post => {
                                const postedDate = formatDate(post.createdDate);
                                const eventDate = formatDate(post.date);
                                const showEventDate = new Date(post.createdDate).toDateString() !== new Date(post.date).toDateString();

                                return (
                                    <div key={post.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden animate-in slide-in-from-bottom-4 hover:shadow-lg transition-shadow">
                                        <div className="p-4 flex items-center gap-3 border-b border-gray-50 dark:border-gray-700">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-sm ${post.userAvatarColor}`}>
                                                {post.userName.charAt(0)}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <h4 className="font-bold text-gray-900 dark:text-white text-sm">{post.userName}</h4>
                                                    <span className="text-[10px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 px-1.5 py-0.5 rounded">{post.country}</span>
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-col mt-1">
                                                    <span>{t('posted_on')}: {postedDate}</span>
                                                    {showEventDate && (
                                                        <div className="flex justify-end w-full mt-0.5">
                                                            <span className="italic text-green-600 dark:text-green-400 font-medium bg-green-50 dark:bg-green-900/20 px-2 rounded">{t('event_date')}: {eventDate}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-4 pb-2">
                                            <div className="flex justify-between items-baseline mb-2">
                                                <h3 className="font-bold text-lg text-gray-800 dark:text-white">{post.title}</h3>
                                                <span className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">{post.plantName}</span>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 leading-relaxed">{post.description}</p>
                                            {post.weather && (
                                                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-gray-700/50 w-fit px-2 py-1 rounded mb-2">
                                                    <span className="w-4 h-4">{getPostWeatherIcon(post.weather.weatherCode)}</span>
                                                    <span>{Math.round(post.weather.temperature)}°C, {getPostWeatherDesc(post.weather.weatherCode)}</span>
                                                </div>
                                            )}
                                        </div>

                                        {post.imageUrl && (
                                            <div className="w-full max-h-[500px] overflow-hidden bg-gray-100 dark:bg-gray-900">
                                                <img src={post.imageUrl} className="w-full h-full object-contain" alt="Post" loading="lazy" />
                                            </div>
                                        )}

                                        <div className="p-3 flex items-center justify-between border-t border-gray-100 dark:border-gray-700 mt-0">
                                            <button
                                                onClick={() => onLike(post.id)}
                                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg transition-colors ${post.isLiked ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                            >
                                                <Icons.Heart className={`w-5 h-5 ${post.isLiked ? 'fill-current' : ''}`} />
                                                <span className="text-sm font-medium">{post.likes > 0 ? post.likes : t('likes')}</span>
                                            </button>
                                            <button
                                                onClick={() => onOpenDetails(post.id)}
                                                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                <Icons.MessageCircle className="w-5 h-5" />
                                                <span className="text-sm font-medium">{post.comments?.length || 0} {t('comments')}</span>
                                            </button>
                                            <button
                                                onClick={() => showToast(t('copy_success'))}
                                                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                <Icons.Share2 className="w-5 h-5" />
                                                <span className="text-sm font-medium">{t('share')}</span>
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                            {hasMore && (
                                <button
                                    onClick={onLoadMore}
                                    className="w-full py-3 bg-white/50 dark:bg-gray-800/50 backdrop-blur text-gray-800 dark:text-gray-200 font-bold rounded-xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-colors shadow-sm"
                                >
                                    {t('load_more')}
                                </button>
                            )}
                        </>
                    );
                })()}
            </div>
            {isComposeOpen && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">{lang === 'nl' ? 'Nieuw bericht' : 'New Post'}</h3>
                            <button onClick={() => setIsComposeOpen(false)} className="text-gray-500 hover:text-gray-800 dark:hover:text-white"><Icons.X /></button>
                        </div>
                        <div className="p-4 space-y-3">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">{lang === 'nl' ? 'Titel' : 'Title'} *</label>
                                <input value={composeTitle} onChange={e => setComposeTitle(e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white outline-none border border-gray-200 dark:border-gray-600" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">{lang === 'nl' ? 'Bericht' : 'Message'} *</label>
                                <textarea rows={4} value={composeDesc} onChange={e => setComposeDesc(e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white outline-none border border-gray-200 dark:border-gray-600" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">{lang === 'nl' ? 'Plant (optioneel)' : 'Plant (optional)'} </label>
                                <select value={composePlant} onChange={e => setComposePlant(e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white outline-none border border-gray-200 dark:border-gray-600">
                                    <option value="">{lang === 'nl' ? 'Geen' : 'None'}</option>
                                    {plants.filter(p => p.isActive).map(p => (<option key={p.id} value={p.name}>{p.name}</option>))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">{lang === 'nl' ? 'Foto (optioneel)' : 'Photo (optional)'} </label>
                                <div className="flex items-center gap-2">
                                    <input id="compose-photo-input" type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { const b64 = await compressImage(f, 'standard'); setComposeImage(b64); } catch {} }} />
                                    <button onClick={() => document.getElementById('compose-photo-input')?.click()} className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                                        {lang === 'nl' ? 'Kies foto' : 'Choose photo'}
                                    </button>
                                    {composeImage && <span className="text-xs text-gray-500 dark:text-gray-400">{lang === 'nl' ? 'Gekozen' : 'Selected'}</span>}
                                </div>
                                {composeImage && (
                                    <div className="mt-2 w-full h-32 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700">
                                        <img src={composeImage} className="w-full h-full object-cover" />
                                    </div>
                                )}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{(() => { const tier = getUsageStats().tier; const lim = tier === 'FREE' ? 1 : 3; return lang === 'nl' ? `Limiet: ${lim} per dag (${tier})` : `Limit: ${lim} per day (${tier})`; })()}</div>
                        </div>
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex gap-2">
                            <button onClick={async () => { if (!user) { showToast('Login required'); return; } const tier = getUsageStats().tier; const lim = tier === 'FREE' ? 1 : 3; if (!composeTitle.trim() || !composeDesc.trim()) { showToast(lang === 'nl' ? 'Titel en bericht verplicht' : 'Title and message required'); return; } const start = new Date(); start.setHours(0,0,0,0); const end = new Date(); end.setHours(23,59,59,999); const { count } = await supabase.from('social_posts').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', start.toISOString()).lte('created_at', end.toISOString()); if ((count || 0) >= lim) { showToast(lang === 'nl' ? 'Daglimiet bereikt' : 'Daily limit reached'); return; } setIsSaving(true); try { let imageUrl: string | null = null; if (composeImage && composeImage.startsWith('data:')) { const up = await uploadPlantImage(composeImage, user.id); if (up) imageUrl = up; } await supabase.from('social_posts').insert([{ user_id: user.id, plant_name: composePlant || 'Garden', title: composeTitle.trim(), description: composeDesc.trim(), image_url: imageUrl, event_date: new Date().toISOString(), country_code: profile?.settings?.homeLocation?.countryCode || null }]); setIsComposeOpen(false); setComposeTitle(''); setComposeDesc(''); setComposeImage(null); setComposePlant(''); onRefresh(); showToast(lang === 'nl' ? 'Bericht geplaatst' : 'Post created'); } catch (e: any) { showToast(e?.message || 'Failed to create post'); } finally { setIsSaving(false); } }} disabled={isSaving} className="flex-1 py-2 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors">
                                {isSaving ? (lang === 'nl' ? 'Bezig...' : 'Saving...') : (lang === 'nl' ? 'Plaatsen' : 'Post')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Social Post Details ---
interface SocialPostDetailsViewProps {
    post?: SocialPost;
    onBack: () => void;
    onLike: (id: string) => void;
    onComment: (id: string, text: string) => void;
    showToast: (msg: string) => void;
    formatDate: (date: string, includeTime?: boolean) => string;
    getWeatherIcon: (code: number) => React.ReactNode;
    getWeatherDesc: (code: number) => string;
    t: (key: string) => string;
}

export const SocialPostDetailsView: React.FC<SocialPostDetailsViewProps> = ({
    post, onBack, onLike, onComment, showToast, formatDate, getWeatherIcon, getWeatherDesc, t
}) => {
    const [commentText, setCommentText] = useState('');

    if (!post) return null;

    const postedDate = formatDate(post.createdDate);
    const eventDate = formatDate(post.date);
    const showEventDate = new Date(post.createdDate).toDateString() !== new Date(post.date).toDateString();

    const handleSendComment = () => {
        if (commentText.trim()) {
            onComment(post.id, commentText);
            setCommentText('');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col relative">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20 shadow-sm">
                <button onClick={onBack} className="text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-full transition-colors"><Icons.ArrowLeft /></button>
                <h2 className="ml-3 font-semibold text-lg text-gray-900 dark:text-white">{t('comments')}</h2>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto pb-24">
                <div className="max-w-3xl mx-auto">
                    {/* Original Post Card */}
                    <div className="bg-white dark:bg-gray-800 shadow-sm mb-4">
                        {/* User Info */}
                        <div className="p-4 flex items-center gap-3 border-b border-gray-50 dark:border-gray-700">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-sm ${post.userAvatarColor}`}>
                                {post.userName.charAt(0)}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-gray-900 dark:text-white text-sm">{post.userName}</h4>
                                    <span className="text-[10px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 px-1.5 py-0.5 rounded">{post.country}</span>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-col mt-1">
                                    <span>{t('posted_on')}: {postedDate}</span>
                                    {showEventDate && (
                                        <div className="flex justify-end w-full mt-0.5">
                                            <span className="italic text-green-600 dark:text-green-400 font-medium bg-green-50 dark:bg-green-900/20 px-2 rounded">{t('event_date')}: {eventDate}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Post Body */}
                        <div className="p-4 pb-2">
                            <div className="flex justify-between items-baseline mb-2">
                                <h3 className="font-bold text-lg text-gray-800 dark:text-white">{post.title}</h3>
                                <span className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">{post.plantName}</span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 leading-relaxed">{post.description}</p>
                            {post.weather && (
                                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-gray-700/50 w-fit px-2 py-1 rounded mb-2">
                                    <span className="w-4 h-4">{getWeatherIcon(post.weather.weatherCode)}</span>
                                    <span>{Math.round(post.weather.temperature)}°C, {getWeatherDesc(post.weather.weatherCode)}</span>
                                </div>
                            )}
                        </div>

                        {/* Image */}
                        {post.imageUrl && (
                            <div className="w-full bg-gray-100 dark:bg-gray-900">
                                <img src={post.imageUrl} className="w-full h-auto object-contain max-h-[60vh]" alt="Post" />
                            </div>
                        )}

                        {/* Actions Bar */}
                        <div className="p-3 flex items-center justify-between border-t border-gray-100 dark:border-gray-700">
                            <button
                                onClick={() => onLike(post.id)}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg transition-colors ${post.isLiked ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                            >
                                <Icons.Heart className={`w-5 h-5 ${post.isLiked ? 'fill-current' : ''}`} />
                                <span className="text-sm font-medium">{post.likes > 0 ? post.likes : t('likes')}</span>
                            </button>
                            <div className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50">
                                <Icons.MessageCircle className="w-5 h-5" />
                                <span className="text-sm font-medium">{post.comments?.length || 0} {t('comments')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Comments List */}
                    <div className="px-4">
                        <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">{t('comments')}</h3>
                        {post.comments && post.comments.length > 0 ? (
                            <div className="space-y-4">
                                {post.comments.map(comment => (
                                    <div key={comment.id} className="flex gap-3 animate-in slide-in-from-bottom-2">
                                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300 flex-shrink-0">
                                            {comment.userName.charAt(0)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 dark:border-gray-700">
                                                <div className="flex justify-between items-baseline mb-1">
                                                    <span className="font-bold text-sm text-gray-900 dark:text-white">{comment.userName}</span>
                                                    <span className="text-xs text-gray-400">{formatDate(comment.date, true)}</span>
                                                </div>
                                                <p className="text-sm text-gray-700 dark:text-gray-300">{comment.text}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 text-gray-400">
                                <p>{t('no_comments_yet')}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Fixed Input Area */}
            <div className="bg-white dark:bg-gray-800 p-3 border-t border-gray-200 dark:border-gray-700 fixed bottom-0 inset-x-0 z-30 safe-area-bottom">
                <div className="max-w-3xl mx-auto flex gap-2">
                    <input
                        type="text"
                        placeholder={t('add_comment')}
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="flex-1 bg-gray-100 dark:bg-gray-700 border-none rounded-full px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white"
                        onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                        autoFocus
                    />
                    <button onClick={handleSendComment} className="bg-green-600 text-white p-3 rounded-full hover:bg-green-700 transition-colors shadow-md disabled:opacity-50" disabled={!commentText}>
                        <Icons.Send className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};
