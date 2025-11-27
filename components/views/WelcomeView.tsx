import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Icons } from '../Icons';
import { useAuth } from '../../contexts/AuthContext';
import { ConfirmationModal } from '../ui/Overlays';
import { sanitizeInput } from '../../services/securityService';

interface WelcomeViewProps {
    onStart: () => void; 
    t: (key: string) => string;
    lang: 'en' | 'nl';
    setLang: (l: 'en' | 'nl') => void;
    onOpenTerms: () => void;
}

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

export const WelcomeView: React.FC<WelcomeViewProps> = ({ t, lang, setLang, onOpenTerms }) => {
    const { signInWithGoogle, signInWithPassword, signUp, resetPassword } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoginLoading, setIsLoginLoading] = useState(false);
    const [authMode, setAuthMode] = useState<'LOGIN' | 'SIGNUP' | 'FORGOT'>('LOGIN');
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [errorModal, setErrorModal] = useState<{ isOpen: boolean, title: string, message: string }>({ isOpen: false, title: '', message: '' });
    const passwordInputRef = useRef<HTMLInputElement>(null);
    const emailInputRef = useRef<HTMLInputElement>(null);
    const remoteHero = "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=2500&q=80";
    const [heroSrc, setHeroSrc] = useState<string>("/intro/hero.jpg");
    const scrollerRef = useRef<HTMLDivElement>(null);
    const introImages = [10,9,8,7,6,5,4].map(n => "/intro/" + encodeURIComponent(`plant (${n}).jpg`));
    const { scrollYProgress } = useScroll();
    const ySlow = useTransform(scrollYProgress, [0, 1], [0, -50]);
    const yMedium = useTransform(scrollYProgress, [0, 1], [0, -120]);
    const yFast = useTransform(scrollYProgress, [0, 1], [0, -200]);
    const [scrolled, setScrolled] = useState(false);
    const pillars = [
        { titleKey: 'pillars_ai_title', descKey: 'pillars_ai_desc' },
        { titleKey: 'pillars_journal_title', descKey: 'pillars_journal_desc' },
        { titleKey: 'pillars_weather_title', descKey: 'pillars_weather_desc' }
    ];
    const testimonialKeys = ['testimonial_1','testimonial_2','testimonial_3','testimonial_4','testimonial_5','testimonial_6','testimonial_7','testimonial_8','testimonial_9'];
    const parallaxSources = Array.from({ length: 9 }, (_, i) => ({
        local: `/intro/${encodeURIComponent(`plant (${i+1}).jpg`)}`,
        remote: `https://source.unsplash.com/featured/?plants,green&sig=${i+1}`
    }));

    useEffect(() => {
        const savedRemember = localStorage.getItem('flowerix_remember_me');
        const remembered = savedRemember === 'true';
        setRememberMe(remembered);
        if (remembered) {
            const savedEmail = localStorage.getItem('flowerix_last_email');
            if (savedEmail) setEmail(savedEmail);
        }
    }, []);

    useEffect(() => {
        const el = scrollerRef.current;
        if (!el) return;
        let index = 0;
        const tick = () => {
            const child = el.children[index % el.children.length] as HTMLElement | undefined;
            if (child) {
                el.scrollTo({ left: child.offsetLeft, behavior: 'smooth' });
            }
            index++;
        };
        const id = setInterval(tick, 3000);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        const stored = localStorage.getItem('flowerix_lang');
        if (stored === 'nl' || stored === 'en') {
            setLang(stored as 'nl' | 'en');
        }
    }, []);

    const handleCTA = () => {
        setAuthMode('LOGIN');
        document.getElementById('auth-box')?.scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => {
            emailInputRef.current?.focus();
        }, 300);
    };

    const calculateStrength = (pass: string) => {
        let score = 0;
        if (pass.length >= 8) score++;
        if (/[A-Za-z]/.test(pass)) score++;
        if (/[0-9]/.test(pass)) score++;
        return score;
    };

    const passwordStrength = calculateStrength(password);

    const handleAuth = async () => {
        const cleanEmail = sanitizeInput(email);
        
        if (!cleanEmail.includes('@') || cleanEmail.length > 100) {
            setErrorModal({ isOpen: true, title: "Input Error", message: t('auth_invalid_input') });
            return;
        }

        if (authMode === 'FORGOT') {
            setIsLoginLoading(true);
            try {
                const { error } = await resetPassword(cleanEmail);
                if (error) {
                    setErrorModal({ isOpen: true, title: "Error", message: error.message || t('reset_error') });
                } else {
                    setErrorModal({ isOpen: true, title: "Success", message: t('reset_email_sent') });
                    setAuthMode('LOGIN');
                }
            } catch (e: any) {
                setErrorModal({ isOpen: true, title: "Error", message: e.message || t('reset_error') });
            } finally {
                setIsLoginLoading(false);
            }
            return;
        }

        if (authMode === 'SIGNUP') {
            if (password.length < 8) {
                setErrorModal({ isOpen: true, title: "Input Error", message: t('pass_strength_weak') });
                return;
            }
            if (password !== confirmPassword) {
                setErrorModal({ isOpen: true, title: "Error", message: t('auth_pass_match_error') });
                return;
            }
            if (passwordStrength < 3) {
                setErrorModal({ isOpen: true, title: "Weak Password", message: t('auth_pass_weak') });
                return;
            }
            if (!acceptedTerms) {
                setErrorModal({ isOpen: true, title: "Terms Required", message: t('terms_error') });
                return;
            }
        }

        setIsLoginLoading(true);
        try {
            let result;
            if (authMode === 'LOGIN') {
                result = await signInWithPassword(cleanEmail, password);
            } else {
                result = await signUp(cleanEmail, password);
            }

            if (result.error) {
                let title = "Error";
                let msg = result.error.message;

                if (authMode === 'SIGNUP' && (msg.includes('already registered') || msg.includes('User already exists'))) {
                    title = t('auth_account_exists_title');
                    msg = t('auth_account_exists_msg');
                } else if (authMode === 'LOGIN' && (msg.includes('Invalid login credentials') || msg.includes('Invalid email or password'))) {
                    title = t('auth_login_error_title');
                    msg = t('auth_login_error_msg');
                } else if (msg.includes('Too many attempts')) {
                    title = "Security";
                    msg = "Too many attempts. Please wait a moment.";
                }

                setErrorModal({ isOpen: true, title, message: msg });
            } else {
                if (authMode === 'LOGIN') {
                    if (rememberMe) {
                        localStorage.setItem('flowerix_last_email', cleanEmail);
                        localStorage.setItem('flowerix_remember_me', 'true');
                    } else {
                        localStorage.removeItem('flowerix_last_email');
                        localStorage.setItem('flowerix_remember_me', 'false');
                    }
                } else if (authMode === 'SIGNUP') {
                    if (result.data?.user) {
                        setErrorModal({ isOpen: true, title: "Success", message: t('signup_success') });
                        setAuthMode('LOGIN');
                        if (rememberMe) {
                            localStorage.setItem('flowerix_last_email', cleanEmail);
                            localStorage.setItem('flowerix_remember_me', 'true');
                        } else {
                            localStorage.removeItem('flowerix_last_email');
                            localStorage.setItem('flowerix_remember_me', 'false');
                        }
                    }
                }
            }
        } catch (e: any) {
            console.error(e);
            setErrorModal({ isOpen: true, title: "System Error", message: e.message || t('auth_error_login') });
        } finally {
            setIsLoginLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden selection:bg-green-500 selection:text-white">
            
            <div className={`fixed top-0 left-0 right-0 z-50 transition-colors ${scrolled ? 'bg-black/30 backdrop-blur-md border-b border-white/10' : 'bg-transparent'}`}>
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="text-white font-serif text-xl">{t('welcome_title')}</div>
                    <div className="flex bg-black/40 backdrop-blur-md rounded-full p-1 border border-white/10 shadow-xl">
                        <button 
                            onClick={() => { setLang('en'); localStorage.setItem('flowerix_lang', 'en'); }} 
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${lang === 'en' ? 'bg-white text-black shadow-sm scale-105' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                        >
                            EN
                        </button>
                        <button 
                            onClick={() => { setLang('nl'); localStorage.setItem('flowerix_lang', 'nl'); }} 
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${lang === 'nl' ? 'bg-white text-black shadow-sm scale-105' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                        >
                            NL
                        </button>
                    </div>
                </div>
            </div>

            {/* Error Modal */}
            <ConfirmationModal 
                isOpen={errorModal.isOpen}
                title={errorModal.title}
                message={errorModal.message}
                onConfirm={() => setErrorModal({ ...errorModal, isOpen: false })}
                onCancel={() => setErrorModal({ ...errorModal, isOpen: false })}
                confirmText="OK"
                cancelText=""
            />

            {/* --- HERO SECTION --- */}
            <div className="relative min-h-[100dvh] flex flex-col justify-center items-center px-6 py-20 overflow-hidden">
                {/* Parallax Background */}
                <div className="absolute inset-0 z-0">
                    <img
                        src={heroSrc}
                        onError={() => setHeroSrc(remoteHero)}
                        className="w-full h-full object-cover opacity-60 animate-[pulse_15s_ease-in-out_infinite_alternate] scale-110"
                        alt="Green Garden Landscape"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/90"></div>
                </div>

                <div className="relative z-10 w-full max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
                    {/* Text Content */}
                    <div className="text-center lg:text-left animate-in slide-in-from-bottom-10 fade-in duration-1000">
                        <h1 className="text-6xl md:text-8xl font-serif font-bold leading-tight tracking-tight mb-6 drop-shadow-2xl">
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-300 via-white to-green-200">
                                {t('welcome_title')}
                            </span>
                        </h1>
                        <p className="text-2xl md:text-3xl font-light text-green-50 mb-4 opacity-90">
                            {t('welcome_subtitle')}
                        </p>
                        <p className="text-lg text-gray-300 max-w-lg mx-auto lg:mx-0 leading-relaxed border-l-2 border-green-500 pl-4">
                            {t('welcome_hero_sub')}
                        </p>
                    </div>

                    {/* Auth Box - Glassmorphism */}
                    <div id="auth-box" className="w-full max-w-md mx-auto bg-white/5 backdrop-blur-xl p-8 rounded-[2rem] border border-white/10 shadow-2xl animate-in zoom-in-95 duration-1000 delay-200 hover:border-white/20 transition-colors">
                        
                        {authMode !== 'FORGOT' && (
                            <div className="flex p-1 bg-black/20 rounded-xl mb-6">
                                <button 
                                    onClick={() => setAuthMode('LOGIN')}
                                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${authMode === 'LOGIN' ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                >
                                    {t('login_btn')}
                                </button>
                                <button 
                                    onClick={() => setAuthMode('SIGNUP')}
                                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${authMode === 'SIGNUP' ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                >
                                    {t('signup_btn')}
                                </button>
                            </div>
                        )}

                        {authMode === 'FORGOT' && (
                            <div className="mb-6 text-center animate-in fade-in slide-in-from-top-2">
                                <h3 className="text-xl font-bold text-white mb-2">{t('reset_password_title')}</h3>
                                <p className="text-sm text-gray-400">{t('reset_password_desc')}</p>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="group">
                                <input 
                                    ref={emailInputRef}
                                    type="email" 
                                    placeholder={t('email_placeholder')} 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoComplete="off"
                                    name="flowerix-email"
                                    autoCorrect="off"
                                    autoCapitalize="none"
                                    spellCheck={false}
                                    className="w-full px-5 py-4 rounded-2xl bg-black/30 text-white placeholder-gray-500 border border-white/10 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/50 transition-all"
                                />
                            </div>
                            
                            {authMode !== 'FORGOT' && (
                                <div className="relative group">
                                    <input 
                                        ref={passwordInputRef}
                                        type={showPassword ? "text" : "password"}
                                        placeholder={t('password_placeholder')} 
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        autoComplete="off"
                                        name="flowerix-password"
                                        className="w-full px-5 py-4 rounded-2xl bg-black/30 text-white placeholder-gray-500 border border-white/10 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/50 transition-all pr-12"
                                        onKeyDown={(e) => e.key === 'Enter' && authMode === 'LOGIN' && handleAuth()}
                                    />
                                    <button 
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                                        type="button"
                                    >
                                        {showPassword ? <Icons.EyeOff className="w-5 h-5" /> : <Icons.Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            )}

                            {authMode === 'LOGIN' && (
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-2 text-xs text-gray-400">
                                        <input
                                            type="checkbox"
                                            checked={rememberMe}
                                            onChange={(e) => {
                                                const val = e.target.checked;
                                                setRememberMe(val);
                                                localStorage.setItem('flowerix_remember_me', val ? 'true' : 'false');
                                                if (!val) localStorage.removeItem('flowerix_last_email');
                                            }}
                                            className="w-4 h-4 rounded border-white/30 bg-white/10 text-green-500 focus:ring-green-500 focus:ring-offset-0 cursor-pointer"
                                        />
                                        {t('remember_me')}
                                    </label>
                                    <button onClick={() => setAuthMode('FORGOT')} className="text-xs text-gray-400 hover:text-white transition-colors underline decoration-transparent hover:decoration-white underline-offset-2">
                                        {t('forgot_password')}
                                    </button>
                                </div>
                            )}

                            {authMode === 'SIGNUP' && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
                                    {/* Strength Bar */}
                                    {password && (
                                        <div className="px-1">
                                            <div className="flex gap-1 h-1 mb-1">
                                                <div className={`flex-1 rounded-full transition-colors ${passwordStrength > 0 ? 'bg-red-500' : 'bg-gray-700'}`}></div>
                                                <div className={`flex-1 rounded-full transition-colors ${passwordStrength > 1 ? 'bg-yellow-500' : 'bg-gray-700'}`}></div>
                                                <div className={`flex-1 rounded-full transition-colors ${passwordStrength > 2 ? 'bg-green-500' : 'bg-gray-700'}`}></div>
                                            </div>
                                            <div className="text-[10px] text-right text-gray-400">
                                                {t('pass_strength_weak')} / {t('pass_strength_medium')} / {t('pass_strength_strong')}
                                            </div>
                                        </div>
                                    )}

                                    <div className="group">
                                        <input 
                                            type={showPassword ? "text" : "password"}
                                            placeholder={t('pass_confirm_placeholder')} 
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full px-5 py-4 rounded-2xl bg-black/30 text-white placeholder-gray-500 border border-white/10 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/50 transition-all"
                                            onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                                        />
                                    </div>

                                    <div className="flex items-start gap-3 px-1">
                                        <input 
                                            type="checkbox" 
                                            checked={acceptedTerms} 
                                            onChange={(e) => setAcceptedTerms(e.target.checked)}
                                            className="mt-1.5 w-4 h-4 rounded border-white/30 bg-white/10 text-green-500 focus:ring-green-500 focus:ring-offset-0 cursor-pointer"
                                        />
                                        <span className="text-xs text-gray-400 leading-relaxed">
                                            {t('terms_agree')}{" "}
                                            <button onClick={onOpenTerms} className="text-green-400 hover:text-green-300 underline decoration-green-400/50 underline-offset-2 transition-colors">
                                                {t('terms_link')}
                                            </button>
                                        </span>
                                    </div>
                                </div>
                            )}

                            <button 
                                onClick={handleAuth} 
                                disabled={isLoginLoading}
                                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-4 rounded-2xl transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-green-900/30"
                            >
                                {isLoginLoading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> 
                                ) : (
                                    <span className="flex items-center gap-2">
                                        {authMode === 'LOGIN' ? t('login_btn') : authMode === 'SIGNUP' ? t('create_account_btn') : t('reset_password_btn')} 
                                        <Icons.ArrowLeft className="rotate-180 w-4 h-4" />
                                    </span>
                                )}
                            </button>
                        </div>

                        {authMode !== 'FORGOT' && (
                            <>
                                <div className="my-6 flex items-center gap-4">
                                    <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent flex-1"></div>
                                    <span className="text-xs text-white/30 font-medium uppercase tracking-widest">{t('or')}</span>
                                    <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent flex-1"></div>
                                </div>

                                <button 
                                    onClick={signInWithGoogle} 
                                    className="w-full bg-white hover:bg-gray-50 text-gray-700 font-medium py-3.5 rounded-2xl transition-all flex items-center justify-center gap-3 text-sm shadow-lg active:scale-95"
                                >
                                    <GoogleIcon />
                                    <span>{t('continue_google')}</span>
                                </button>
                            </>
                        )}

                        {authMode === 'FORGOT' && (
                            <button onClick={() => setAuthMode('LOGIN')} className="mt-6 w-full text-sm text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-2">
                                <Icons.ArrowLeft className="w-4 h-4" /> {t('back_to_login')}
                            </button>
                        )}
                    </div>
                </div>
                
                <button
                    className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce text-white/70 hover:text-white"
                    onClick={() => document.getElementById('landing-intro')?.scrollIntoView({ behavior: 'smooth' })}
                >
                    <Icons.ChevronDown className="w-10 h-10" />
                </button>
            </div>

            <motion.section id="landing-intro" className="py-28 px-6 bg-black relative overflow-hidden"
                initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }}>
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-900/20 via-black to-black"></div>
                <div className="max-w-7xl mx-auto relative z-10 space-y-16">
                    <div className="text-center">
                        <h2 className="text-5xl md:text-6xl font-serif font-bold mb-4">
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-300 via-white to-green-200">{t('home_intro_title')}</span>
                        </h2>
                        <p className="text-xl md:text-2xl text-gray-300">{t('home_intro_subtitle')}</p>
                        <p className="text-base md:text-lg text-gray-400 max-w-3xl mx-auto">{t('home_intro_text')}</p>
                    </div>

                    <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-8" initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                        {pillars.map((p, i) => (
                            <div key={p.titleKey} className="relative" style={{ perspective: '1200px' }}>
                                <div
                                    onMouseMove={(e) => {
                                        const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                                        const x = e.clientX - r.left - r.width / 2;
                                        const y = e.clientY - r.top - r.height / 2;
                                        const inner = e.currentTarget.querySelector('.tilt') as HTMLDivElement;
                                        if (inner) inner.style.transform = `rotateY(${x * 0.02}deg) rotateX(${(-y) * 0.02}deg)`;
                                    }}
                                    onMouseLeave={(e) => {
                                        const inner = e.currentTarget.querySelector('.tilt') as HTMLDivElement;
                                        if (inner) inner.style.transform = `rotateY(0deg) rotateX(0deg)`;
                                    }}
                                    className="group rounded-3xl bg-white/5 border border-white/10 p-8 hover:bg-white/10 transition-colors">
                                    <div className="tilt transform-gpu will-change-transform rounded-2xl">
                                        <h3 className="text-2xl font-bold text-white mb-2">{t(p.titleKey as any)}</h3>
                                        <p className="text-gray-400 leading-relaxed">{t(p.descKey as any)}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </motion.div>

                    <motion.div className="grid md:grid-cols-12 gap-4" initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                        {parallaxSources.map((src, idx) => (
                            <motion.div key={idx} className={`${idx % 3 === 0 ? 'md:col-span-5' : idx % 3 === 1 ? 'md:col-span-4' : 'md:col-span-3'} col-span-12 overflow-hidden rounded-3xl border border-white/10`}
                                style={{ y: idx % 3 === 0 ? ySlow : idx % 3 === 1 ? yMedium : yFast }}>
                                <motion.img src={src.local} onError={(e) => (e.currentTarget.src = src.remote)} alt="Parallax" className="w-full h-[40vh] md:h-[50vh] object-cover"
                                    whileHover={{ scale: 1.03, rotateZ: 0.5 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }} />
                            </motion.div>
                        ))}
                        <motion.div className="md:col-span-12 col-span-12 text-center py-8" style={{ y: ySlow }}>
                            <p className="text-xl md:text-2xl text-gray-300">{t('oasis_line')}</p>
                        </motion.div>
                    </motion.div>

                    <motion.div className="relative overflow-hidden" initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                        <motion.div className="flex gap-6" animate={{ x: ['0%', '-100%'] }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}>
                            {[...testimonialKeys, ...testimonialKeys].map((key, i) => (
                                <div key={i} className="min-w-[300px] bg-white/5 border border-white/10 rounded-3xl p-6 text-gray-300">
                                    {t(key as any)}
                                </div>
                            ))}
                        </motion.div>
                    </motion.div>

                    <motion.div className="text-center" initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                        <h3 className="text-2xl md:text-3xl text-white mb-4">{t('home_cta_header')}</h3>
                        <button onClick={handleCTA} className="px-8 py-4 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold shadow-lg active:scale-95">{t('home_cta_button')}</button>
                        <p className="text-sm text-gray-400 mt-2">{t('home_cta_sub')}</p>
                    </motion.div>
                </div>
            </motion.section>

            

            {/* Footer */}
            <footer className="bg-black py-8 text-center border-t border-white/5">
                <p className="text-gray-500 text-sm">
                    {t('welcome_made_by')} <br /> 
                    <span className="text-xs opacity-50">© 2025 Flowerix</span>
                </p>
            </footer>
        </div>
    );
};
