
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { Plant, LogItem, ViewState, AISuggestion, GardenArea, PlantLocation, WeatherData, HomeLocation, SocialPost, GardenLogItem, DashboardTab, SlideshowConfig, AnalysisResult, TempUnit, LengthUnit, TimelineItem, WindUnit, TimeFormat, SocialComment, ModulesConfig } from './types';
import { identifyPlant, generateDefaultDescription, searchWikiImages, validateImageContent } from './services/geminiService';
import { fetchWeather, fetchWeatherForDate } from './services/weatherService';
import { generatePlantPDF, generateFullExport } from './services/pdfService';
import { compressImage, CompressionMode } from './services/imageService';
import { uploadPlantImage, deletePlantImage, resolveImageUrl } from './services/storageService';
import { translations, Language } from './translations';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { getUsageStats } from './services/usageService';
import { supabase } from './supabaseClient';

// --- Component Imports ---
import { Toast, LoadingOverlay, ConfirmationModal } from './components/ui/Overlays';
import { Menu } from './components/Menu';
import { Icons } from './components/Icons';
import { LocationPickerModal } from './components/modals/LocationPickerModal';
import { AppReportModal, SummaryModal, WebImagesModal } from './components/modals/InfoModals';
import { EditPlantModal } from './components/modals/EditPlantModal';
import { SlideshowConfigModal } from './components/modals/SlideshowConfigModal';
import { PhotoMergeModal } from './components/modals/PhotoMergeModal';
import { PhotoOptimizeModal } from './components/modals/PhotoOptimizeModal';
import { PhotoTimelapseModal } from './components/modals/PhotoTimelapseModal';
import { SeasonsModal } from './components/modals/SeasonsModal';
import { PremiumFeatureModal } from './components/modals/PremiumFeatureModal';
import { SlideshowPlayer } from './components/ui/SlideshowPlayer';
import { FlowerixChatWidget } from './components/ui/FlowerixChatWidget';
import { CookieConsent } from './components/ui/CookieConsent';

import { WelcomeView } from './components/views/WelcomeView';
import { WaitlistView } from './components/views/WaitlistView';
import { SetupRequiredView } from './components/views/SetupRequiredView'; 
import { DashboardView } from './components/views/DashboardView';
import { SettingsView } from './components/views/SettingsView'; 
import { PlantDetailsView } from './components/views/PlantDetailsView';
import { AddPlantPhotoView, IdentifyingView, IdentificationResultView, AddPlantDetailsView } from './components/views/AddPlantViews';
import { LogFormView, LogDetailsView } from './components/views/LogViews';
import { SocialPostDetailsView } from './components/views/SocialViews';
import { PhotoCollageView } from './components/views/PhotoCollageView';
import { ExtrasView } from './components/views/ExtrasView'; 
import { PlantAnalysisView } from './components/views/PlantAnalysisView';
import { PlantAdviceView } from './components/views/PlantAdviceView';
import { IdentifyPlantView } from './components/views/IdentifyPlantView';
import { WeatherDetailsView } from './components/views/WeatherDetailsView';
import { NotebookView } from './components/views/NotebookView';
import { ProfessorView } from './components/views/ProfessorView';
import { PricingView } from './components/views/PricingView';

// --- Constants ---
const APP_VERSION = 'v0.9112725.1';

// --- Helper: Local Storage & Data Management ---
const SETTINGS_KEY = 'mygardenview_settings_v1';

const MainContent: React.FC = () => {
  // Auth Hooks
  const { user, profile, isLoading, missingDatabase, signOut } = useAuth();

  // Global State
  const [view, setView] = useState<ViewState>('WELCOME');
  const [plants, setPlants] = useState<Plant[]>([]);
  const [gardenAreas, setGardenAreas] = useState<GardenArea[]>([]);
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([]);
  const [socialPage, setSocialPage] = useState(0); // For Lazy Loading
  const [socialHasMore, setSocialHasMore] = useState(true);
  const [gardenLogs, setGardenLogs] = useState<GardenLogItem[]>([]);
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]); 
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('PLANTS');
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  // Pagination & UI State
  const [visiblePlantsCount, setVisiblePlantsCount] = useState(5);
  const [visiblePlantLogsCount, setVisiblePlantLogsCount] = useState(5);
  const [lang, setLang] = useState<Language>('en');
  const [darkMode, setDarkMode] = useState(false);
  const [homeLocation, setHomeLocation] = useState<HomeLocation | null>(null);
  const [useWeather, setUseWeather] = useState(true); 
  const [tempUnit, setTempUnit] = useState<TempUnit>('C'); 
  const [lengthUnit, setLengthUnit] = useState<LengthUnit>('mm'); 
  const [windUnit, setWindUnit] = useState<WindUnit>('kmh'); 
  const [timeFormat, setTimeFormat] = useState<TimeFormat>('24h'); 
  const [plantUISettings, setPlantUISettings] = useState<Record<string, { aboutCollapsed: boolean, careCollapsed: boolean }>>({});
  const [showArchivedPlants, setShowArchivedPlants] = useState(false);
  const [firstDayOfWeek, setFirstDayOfWeek] = useState<'mon' | 'sun' | 'sat'>('mon');
  const [limitAI, setLimitAI] = useState(false); 
  const [modules, setModules] = useState<ModulesConfig>({ gardenLogs: true, gardenView: true, social: true, notebook: true });

  // Cloud Sync Debounce
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isChatDocked, setIsChatDocked] = useState(false);
  const [chatWidth, setChatWidth] = useState(380);
  const [chatTrigger, setChatTrigger] = useState<{text: string, timestamp: number} | null>(null);

  // Selection State
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [selectedGardenLogId, setSelectedGardenLogId] = useState<string | null>(null);
  const [selectedGardenAreaId, setSelectedGardenAreaId] = useState<string | null>(null);
  const [selectedSocialPostId, setSelectedSocialPostId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Collage State
  const [collageConfig, setCollageConfig] = useState<{ type: 'PLANT' | 'GARDEN', id?: string } | null>(null);

  // Slideshow State
  const [showSlideshowConfig, setShowSlideshowConfig] = useState(false);
  const [slideshowState, setSlideshowState] = useState<{ active: boolean, config: SlideshowConfig, images: string[] }>({ 
      active: false, 
      config: { duration: 5, transition: 'fade' },
      images: []
  });

  // Photo Extras State
  const [showPhotoMergeModal, setShowPhotoMergeModal] = useState(false);
  const [showPhotoOptimizeModal, setShowPhotoOptimizeModal] = useState(false);
  const [showPhotoTimelapseModal, setShowPhotoTimelapseModal] = useState(false);
  const [showSeasonsModal, setShowSeasonsModal] = useState(false);

  // Add Plant Flow State
  const [newPlantImage, setNewPlantImage] = useState<string | null>(null);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [isGeneratingInfo, setIsGeneratingInfo] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const [tempPlantDetails, setTempPlantDetails] = useState<Partial<Plant>>({});

  // Edit Plant State
  const [showEditPlantModal, setShowEditPlantModal] = useState(false);
  const [editPlantData, setEditPlantData] = useState<Partial<Plant>>({});

  // Add/Edit Log State
  const [logTitle, setLogTitle] = useState('');
  const [logDesc, setLogDesc] = useState('');
  const [logImg, setLogImg] = useState<string | undefined>(undefined);
  const [logDate, setLogDate] = useState<string>(''); 
  const [isMainPhoto, setIsMainPhoto] = useState(false); 
  const [includeWeather, setIncludeWeather] = useState(false);
  const [logWeatherTemp, setLogWeatherTemp] = useState<number | null>(null); 
  const [shareToSocial, setShareToSocial] = useState(false);
  const [addToNotebook, setAddToNotebook] = useState(false); 
  
  // Garden Interaction State
  const [isPinning, setIsPinning] = useState<string | null>(null);
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaImage, setNewAreaImage] = useState<string | null>(null);
  const [isAddingArea, setIsAddingArea] = useState(false);

  // Modals State
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [webImagesModal, setWebImagesModal] = useState<{isOpen: boolean, images: string[], loading: boolean}>({ isOpen: false, images: [], loading: false });
  const [summaryModal, setSummaryModal] = useState<{isOpen: boolean, content: string}>({ isOpen: false, content: '' });
  const [infoModal, setInfoModal] = useState<{ isOpen: boolean; type: 'ABOUT' | 'DISCLAIMER' | 'COOKIE' | 'TEAM' | 'TERMS' }>({ isOpen: false, type: 'ABOUT' });
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; onCancel?: () => void; confirmText?: string; cancelText?: string; }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [restrictionModalOpen, setRestrictionModalOpen] = useState(false); 
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);
  const [premiumFeatureName, setPremiumFeatureName] = useState('');

  // Toast & Validation
  const [toast, setToast] = useState<{message: string, visible: boolean}>({message: '', visible: false});
  const [isValidatingImage, setIsValidatingImage] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);

  const t = (key: keyof typeof translations.en) => translations[lang][key];
  
  const formatDate = (dateStr: string, includeTime = false) => {
      try {
        const date = new Date(dateStr);
        const options: Intl.DateTimeFormatOptions = {
            year: 'numeric', month: 'long', day: 'numeric'
        };
        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
            options.hour12 = timeFormat === '12h';
        }
        return date.toLocaleDateString(lang === 'nl' ? 'nl-NL' : 'en-US', options);
      } catch (e) { return dateStr; }
  };

  const showToast = (msg: string) => {
      setToast({message: msg, visible: true});
      setTimeout(() => setToast(prev => ({...prev, visible: false})), 3000);
  };

  const handleAskFlora = (text: string) => {
      if (!isChatOpen) {
          setIsChatOpen(true);
          setIsChatDocked(true);
      }
      setChatTrigger({ text, timestamp: Date.now() });
  };

  // Navigation Handlers
  const handleNextPlant = () => {
      if (!selectedPlantId) return;
      const currentIndex = plants.findIndex(p => p.id === selectedPlantId);
      if (currentIndex === -1) return;
      const nextIndex = (currentIndex + 1) % plants.length;
      setSelectedPlantId(plants[nextIndex].id);
  };

  const handlePrevPlant = () => {
      if (!selectedPlantId) return;
      const currentIndex = plants.findIndex(p => p.id === selectedPlantId);
      if (currentIndex === -1) return;
      const prevIndex = (currentIndex - 1 + plants.length) % plants.length;
      setSelectedPlantId(plants[prevIndex].id);
  };

  useEffect(() => {
    const checkOverflow = () => {
        const isMobile = window.innerWidth < 768;
        const isChatFreezing = isChatOpen && isMobile;
        
        const isAnyModalOpen = showLocationModal || webImagesModal.isOpen || summaryModal.isOpen || infoModal.isOpen || confirmModal.isOpen || isValidatingImage || showEditPlantModal || isMenuOpen || showSlideshowConfig || showPhotoMergeModal || showPhotoOptimizeModal || showPhotoTimelapseModal || showSeasonsModal || isChatFreezing || restrictionModalOpen || premiumModalOpen;
        
        if (isAnyModalOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => { 
        window.removeEventListener('resize', checkOverflow);
        document.body.style.overflow = 'unset'; 
    }
  }, [showLocationModal, webImagesModal.isOpen, summaryModal.isOpen, infoModal.isOpen, confirmModal.isOpen, isValidatingImage, showEditPlantModal, isMenuOpen, showSlideshowConfig, showPhotoMergeModal, showPhotoOptimizeModal, showPhotoTimelapseModal, showSeasonsModal, isChatOpen, restrictionModalOpen, premiumModalOpen]);

  // --- SOCIAL DATA FETCHING (LAZY) ---
  const fetchSocialPosts = async (page = 0, reset = false) => {
      if (!user || !modules.social) return;
      const PAGE_SIZE = 5;
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      try {
          const { data, error } = await supabase
            .from('social_posts')
            .select(`
                *,
                profiles(display_name),
                social_likes(user_id),
                social_comments(id, text, created_at, profiles(display_name))
            `)
            .order('created_at', { ascending: false })
            .range(from, to);

          if (error) {
              if (error.code === '42P01') {
                  return;
              }
              throw error;
          }

          if (data) {
              const mappedPosts: SocialPost[] = await Promise.all(data.map(async (post) => ({
                  id: post.id,
                  userName: post.profiles?.display_name || 'Unknown',
                  userAvatarColor: 'bg-green-600', // Dynamic avatars later
                  country: post.country_code || 'Global',
                  plantName: post.plant_name || 'Plant',
                  title: post.title,
                  description: post.description,
                  imageUrl: await resolveImageUrl(post.image_url),
                  date: post.event_date || post.created_at,
                  createdDate: post.created_at,
                  weather: post.weather, // JSONB
                  likes: post.social_likes ? post.social_likes.length : 0, 
                  isLiked: post.social_likes ? post.social_likes.some((l: any) => l.user_id === user.id) : false,
                  isCurrentUser: post.user_id === user.id,
                  comments: post.social_comments ? post.social_comments.map((c: any) => ({
                      id: c.id,
                      userName: c.profiles?.display_name || 'User',
                      text: c.text,
                      date: c.created_at
                  })) : []
              })));

              if (reset) {
                  setSocialPosts(mappedPosts);
              } else {
                  setSocialPosts(prev => [...prev, ...mappedPosts]);
              }
              
              setSocialHasMore(data.length === PAGE_SIZE);
          }
      } catch (e) {
          console.error("Error fetching social feed:", e);
      }
  };

  // --- SUPABASE DATA FETCHING ---
  const fetchData = async () => {
      if (!user) return;
      setIsLoadingData(true);

      try {
          // 1. Fetch Plants
          try {
              const { data: plantsData, error: plantsError } = await supabase
                .from('plants')
                .select('*, logs(*)')
                .eq('owner_id', user.id)
                .order('created_at', { ascending: false });

              if (plantsError) throw plantsError;

              if (plantsData) {
                 const mappedPlants: Plant[] = await Promise.all(plantsData.map(async (p) => ({
                    id: p.id,
                    name: p.name,
                    scientificName: p.scientific_name,
                    description: p.description,
                    careInstructions: p.care_instructions,
                    imageUrl: await resolveImageUrl(p.image_url),
                    dateAdded: p.date_added,
                    datePlanted: p.date_planted,
                    isIndoor: p.is_indoor,
                    isActive: p.is_active,
                    sequenceNumber: p.sequence_number,
                    location: p.location || [],
                    logs: p.logs && Array.isArray(p.logs)
                      ? (await Promise.all(
                          p.logs
                            .filter((l: any) => !l.type || l.type === 'PLANT')
                            .map(async (l: any) => ({
                              id: l.id,
                              date: l.log_date,
                              title: l.title,
                              description: l.description,
                              imageUrl: await resolveImageUrl(l.image_url),
                              weather: l.weather
                            }))
                        )).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      : []
                 })));
                 setPlants(mappedPlants);
              }
          } catch (e: any) {
              console.error("Error fetching plants:", e);
          }

          // 2. Fetch Garden Logs (Only if module enabled)
          if (modules.gardenLogs) {
              try {
                  const { data: gLogsData, error: gLogsError } = await supabase
                    .from('logs')
                    .select('*')
                    .eq('owner_id', user.id)
                    .eq('type', 'GARDEN')
                    .order('log_date', { ascending: false });

                  if (gLogsError) {
                      // Gracefully handle missing column (42703) or missing table (42P01)
                      if (gLogsError.code !== '42703' && gLogsError.code !== '42P01') {
                          throw gLogsError;
                      }
                  } else if (gLogsData) {
                     const mapped = await Promise.all(gLogsData.map(async (l) => ({
                         id: l.id,
                         date: l.log_date,
                         title: l.title,
                         description: l.description,
                         imageUrl: await resolveImageUrl(l.image_url),
                         weather: l.weather
                     })));
                     setGardenLogs(mapped);
                  }
              } catch (e: any) {
                  console.error("Error fetching garden logs:", e);
              }
          }

          // 3. Fetch Garden Areas (Only if module enabled)
          if (modules.gardenView) {
              try {
                  const { data: gardensData, error: gardensError } = await supabase.from('gardens').select('*').eq('owner_id', user.id);
                  if (gardensError) {
                       if (gardensError.code !== '42P01') throw gardensError;
                  } else if (gardensData) {
                      const mapped = await Promise.all(gardensData.map(async (g) => ({ id: g.id, name: g.name, imageUrl: await resolveImageUrl(g.image_url) })));
                      setGardenAreas(mapped);
                      if (gardensData.length > 0 && !selectedGardenAreaId) setSelectedGardenAreaId(gardensData[0].id);
                  }
              } catch (e: any) {
                  console.error("Error fetching garden areas:", e);
              }
          }

          // 4. Fetch Notebook Entries (Only if module enabled)
          if (modules.notebook) {
              try {
                  const { data: notebookData, error: notebookError } = await supabase
                    .from('notebook_entries')
                    .select('*')
                    .eq('owner_id', user.id);
                  
                  if (notebookError) {
                      if (notebookError.code !== '42P01') {
                          throw notebookError;
                      }
                  } else if (notebookData) {
                      const mappedItems: TimelineItem[] = await Promise.all(notebookData.map(async (n) => ({
                          id: n.id,
                          type: n.type,
                          title: n.title,
                          description: n.description,
                          date: n.date,
                          imageUrl: await resolveImageUrl(n.image_url),
                          isDone: n.is_done,
                          recurrence: n.recurrence,
                          originalParentId: n.original_parent_id
                      })));
                      setTimelineItems(mappedItems);
                  }
              } catch (nbError) {
                  console.error("Notebook Fetch Error:", nbError);
              }
          }

      } catch (e: any) {
          console.error("Fatal Error fetching data:", e);
          const errorMsg = e.message || (typeof e === 'object' ? JSON.stringify(e) : String(e));
          showToast(`Error loading data: ${errorMsg}`);
      } finally {
          setIsLoadingData(false);
      }
  };

  // Initialization
  useEffect(() => {
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedSettings) {
        const { lang: savedLang, darkMode: savedDark, plantUISettings: savedUI, homeLocation: savedLoc, useWeather: savedUseWeather, tempUnit: savedTempUnit, lengthUnit: savedLengthUnit, windUnit: savedWind, firstDayOfWeek: savedFirstDay, timeFormat: savedTimeFormat, limitAI: savedLimitAI, modules: savedModules } = JSON.parse(savedSettings);
        if (savedLang) setLang(savedLang);
        if (savedDark !== undefined) setDarkMode(savedDark);
        if (savedUI) setPlantUISettings(savedUI);
        if (savedLoc) setHomeLocation(savedLoc);
        if (savedUseWeather !== undefined) setUseWeather(savedUseWeather);
        if (savedTempUnit) setTempUnit(savedTempUnit);
        if (savedLengthUnit) setLengthUnit(savedLengthUnit);
        if (savedWind) setWindUnit(savedWind);
        if (savedFirstDay) setFirstDayOfWeek(savedFirstDay);
        if (savedTimeFormat) setTimeFormat(savedTimeFormat);
        if (savedLimitAI !== undefined) setLimitAI(savedLimitAI);
        if (savedModules) setModules(savedModules);
    }

    const savedDocked = localStorage.getItem('flowerix_chat_docked');
    if (savedDocked === 'true') setIsChatDocked(true);
    const savedWidth = localStorage.getItem('flowerix_chat_width');
    if (savedWidth) setChatWidth(parseInt(savedWidth, 10));

    if (user) {
        fetchData();
        // Initial social fetch (page 0) only if enabled
        if (modules.social) {
            fetchSocialPosts(0, true);
        }
        
        if (profile?.status === 'approved') {
            if (view === 'WELCOME' || view === 'WAITLIST') setView('DASHBOARD');
        } else if (profile?.status === 'pending') {
            if (view !== 'WAITLIST') setView('WAITLIST');
        }
    } else {
        setView('WELCOME');
    }
  }, [user, profile]);
  
  useEffect(() => {
    if (profile?.settings) {
        const s = profile.settings;
        if (s.lang) setLang(s.lang);
        if (s.darkMode !== undefined) setDarkMode(s.darkMode);
        if (s.homeLocation) setHomeLocation(s.homeLocation);
        if (s.plantUISettings) setPlantUISettings(s.plantUISettings);
        if (s.useWeather !== undefined) setUseWeather(s.useWeather);
        if (s.tempUnit) setTempUnit(s.tempUnit);
        if (s.lengthUnit) setLengthUnit(s.lengthUnit);
        if (s.windUnit) setWindUnit(s.windUnit);
        if (s.firstDayOfWeek) setFirstDayOfWeek(s.firstDayOfWeek);
        if (s.timeFormat) setTimeFormat(s.timeFormat);
        if (s.limitAI !== undefined) setLimitAI(s.limitAI);
        if (s.modules) setModules(s.modules);
        
        if (s.flora) {
            if (s.flora.isDocked !== undefined) setIsChatDocked(s.flora.isDocked);
            if (s.flora.isOpen !== undefined && window.innerWidth > 768) setIsChatOpen(s.flora.isOpen); 
        }
        
        if (s.darkMode) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    }
  }, [profile]);

  useEffect(() => {
    const settingsObj = { 
        ...(profile?.settings || {}),
        tier: getUsageStats().tier,
        lang, darkMode, plantUISettings, homeLocation, useWeather, tempUnit, lengthUnit, windUnit, firstDayOfWeek, timeFormat, limitAI, modules,
        flora: { isDocked: isChatDocked, isOpen: isChatOpen } 
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settingsObj));
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');

    if (user && profile) {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(async () => {
            try {
                await supabase.from('profiles').update({ settings: settingsObj }).eq('id', user.id);
            } catch (e) {
                console.error("Failed to sync settings to cloud", e);
            }
        }, 2000);
    }
  }, [lang, darkMode, plantUISettings, homeLocation, useWeather, tempUnit, lengthUnit, windUnit, firstDayOfWeek, timeFormat, limitAI, modules, isChatDocked, isChatOpen, user, profile]);
  
  useEffect(() => {
      localStorage.setItem('flowerix_chat_docked', String(isChatDocked));
      localStorage.setItem('flowerix_chat_width', String(chatWidth));
  }, [isChatDocked, chatWidth]);

  // Auth Redirect: Logged in -> Dashboard, Logged out -> Welcome
  useEffect(() => {
      if (user) {
          if (view === 'WELCOME') setView('DASHBOARD');
      } else {
          if (view !== 'WELCOME' && view !== 'WAITLIST') setView('WELCOME');
      }
  }, [user, view]);

  const handleFetchWeather = async (force = false) => {
      if (!homeLocation || !useWeather) { setWeather(null); return; }
      if (weather && !force) return;
      const wData = await fetchWeather(homeLocation.latitude, homeLocation.longitude);
      setWeather(wData);
      if (force) showToast("Weather updated");
  };

  useEffect(() => {
      if (!useWeather) { setWeather(null); return; }
      if (homeLocation) { if (!weather) { handleFetchWeather(); } }
  }, [useWeather, homeLocation]); 

  const updateHomeLocation = (loc: HomeLocation | null) => {
      setHomeLocation(loc);
      if (loc) setWeather(null); 
  };

  const handleShowRestriction = (featureName: string) => {
      setPremiumFeatureName(featureName);
      setPremiumModalOpen(true);
  };

  const handleStart = () => { };
  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void, mode: CompressionMode = 'standard') => {
    const file = e.target.files?.[0];
    if (file) {
      setIsValidatingImage(true);
      try {
          const compressedBase64 = await compressImage(file, mode);
          const validation = await validateImageContent(compressedBase64);
          if (validation.allowed) {
              callback(compressedBase64);
          } else {
              showToast(validation.reason ? `${t('image_rejected')} (${validation.reason})` : t('image_rejected'));
          }
      } catch (err) {
          console.error(err);
          showToast("Error processing image.");
      } finally {
          setIsValidatingImage(false);
      }
    }
  };

  const startAddPlantFlow = () => { setNewPlantImage(null); setAiSuggestion(null); setTempPlantDetails({ datePlanted: new Date().toISOString().split('T')[0] }); setView('ADD_PLANT_PHOTO'); };
  
  const handleIdentifyPlant = async () => {
    if (!newPlantImage) return;
    setIsIdentifying(true); setView('ADD_PLANT_IDENTIFY');
    try {
      const suggestion = await identifyPlant(newPlantImage, lang);
      if (suggestion) { setAiSuggestion(suggestion); setView('PLANT_IDENTIFICATION_RESULT'); } 
      else { throw new Error("No result"); }
    } catch (error) {
      alert("Failed to identify plant. Please enter details manually.");
      setTempPlantDetails(prev => ({ ...prev, name: "", scientificName: "", description: "", careInstructions: "" }));
      setView('ADD_PLANT_DETAILS');
    } finally { setIsIdentifying(false); }
  };

  const handleAutoFillDetails = async () => {
      const nameToSearch = tempPlantDetails.name || tempPlantDetails.scientificName;
      if (!nameToSearch) return;
      setIsGeneratingInfo(true);
      try {
          const result = await generateDefaultDescription(nameToSearch, lang);
          if (result) {
              setTempPlantDetails(prev => ({ ...prev, description: result.description, careInstructions: result.careInstructions, scientificName: prev.scientificName || result.scientificName, isIndoor: result.isIndoor }));
          } else { alert(t('fill_details_error')); }
      } catch (error) { alert(t('fill_details_error')); } finally { setIsGeneratingInfo(false); }
  };

  const handleSaveNewPlant = async () => {
    if (!user) return;
    setIsLoadingData(true);
    try {
        let imageUrl = undefined;
        const imageSource = newPlantImage || tempPlantDetails.imageUrl;
        
        if (imageSource && imageSource.startsWith('data:')) {
            imageUrl = await uploadPlantImage(imageSource, user.id);
            if (!imageUrl) showToast("Image upload failed, saving without image.");
        }

        const existingCount = plants.filter(p => p.name.toLowerCase().trim() === (tempPlantDetails.name || '').toLowerCase().trim()).length;

        const { error } = await supabase.from('plants').insert([{
            owner_id: user.id,
            name: tempPlantDetails.name || 'Unnamed Plant',
            scientific_name: tempPlantDetails.scientificName,
            description: tempPlantDetails.description,
            care_instructions: tempPlantDetails.careInstructions,
            image_url: imageUrl,
            date_planted: tempPlantDetails.datePlanted,
            is_indoor: tempPlantDetails.isIndoor,
            is_active: true,
            sequence_number: existingCount + 1,
            location: []
        }]);

        if (error) throw error;
        
        await fetchData();
        setView('DASHBOARD');
        showToast("Plant added successfully!");
    } catch (e) {
        console.error(e);
        showToast("Failed to save plant.");
    } finally {
        setIsLoadingData(false);
    }
  };

  const handleSaveEditPlant = async () => {
    if (!selectedPlantId || !editPlantData.name) return;
    setIsLoadingData(true);
    try {
        // Check if we need to delete the old image
        const originalPlant = plants.find(p => p.id === selectedPlantId);
        let imageUrl = editPlantData.imageUrl;

        if (originalPlant && originalPlant.imageUrl && editPlantData.imageUrl && originalPlant.imageUrl !== editPlantData.imageUrl) {
            // Delete old image if it was a storage URL (checked inside deletePlantImage)
            // Only if new image is different (e.g. uploaded new one)
            if (originalPlant.imageUrl.includes('flowerix-media')) {
                 await deletePlantImage(originalPlant.imageUrl);
            }
        }

        if (imageUrl && imageUrl.startsWith('data:')) {
             const uploaded = await uploadPlantImage(imageUrl, user!.id);
             if (uploaded) imageUrl = uploaded;
        }

        const { error } = await supabase.from('plants').update({
            name: editPlantData.name,
            scientific_name: editPlantData.scientificName,
            description: editPlantData.description,
            care_instructions: editPlantData.careInstructions,
            image_url: imageUrl,
            date_planted: editPlantData.datePlanted,
            is_indoor: editPlantData.isIndoor
        }).eq('id', selectedPlantId);

        if (error) throw error;
        await fetchData();
        setShowEditPlantModal(false);
        showToast("Plant updated!");
    } catch (e) {
        console.error(e);
        showToast("Update failed.");
    } finally {
        setIsLoadingData(false);
    }
  };

  // --- Notebook Handlers ---
  const handleAddNotebookEntry = async (item: TimelineItem | TimelineItem[]) => {
      if (!user) return;
      const items = Array.isArray(item) ? item : [item];
      setIsLoadingData(true);

      try {
          let processedItems = [];
          for (const i of items) {
              let imageUrl = i.imageUrl;
              if (imageUrl && imageUrl.startsWith('data:')) {
                  const up = await uploadPlantImage(imageUrl, user.id);
                  if (up) imageUrl = up;
              }
              processedItems.push({
                  owner_id: user.id,
                  type: i.type,
                  title: i.title,
                  description: i.description,
                  date: i.date,
                  image_url: imageUrl,
                  is_done: i.isDone || false,
                  recurrence: i.recurrence || 'none',
                  original_parent_id: i.originalParentId
              });
          }

          const { error } = await supabase.from('notebook_entries').insert(processedItems);
          if (error) throw error;
          
          await fetchData();
          showToast(t('log_saved'));
      } catch (e) {
          console.error(e);
          showToast("Failed to save to notebook.");
      } finally {
          setIsLoadingData(false);
      }
  };

  const handleUpdateNotebookEntry = async (item: TimelineItem) => {
      if (!user) return;
      setIsLoadingData(true);
      try {
          let imageUrl = item.imageUrl;
          if (imageUrl && imageUrl.startsWith('data:')) {
              const up = await uploadPlantImage(imageUrl, user.id);
              if (up) imageUrl = up;
          }

          const { error } = await supabase.from('notebook_entries').update({
              type: item.type,
              title: item.title,
              description: item.description,
              date: item.date,
              image_url: imageUrl,
              is_done: item.isDone,
              recurrence: item.recurrence
          }).eq('id', item.id);

          if (error) throw error;
          await fetchData();
      } catch (e) {
          console.error(e);
          showToast("Failed to update entry.");
      } finally {
          setIsLoadingData(false);
      }
  };

  const handleDeleteNotebookEntry = async (id: string | string[]) => {
      if (!user) return;
      setIsLoadingData(true);
      try {
          const ids = Array.isArray(id) ? id : [id];
          
          // Fetch images to delete first
          const { data: items } = await supabase
            .from('notebook_entries')
            .select('image_url')
            .in('id', ids);
            
          if (items) {
              for (const item of items) {
                  if (item.image_url) {
                      await deletePlantImage(item.image_url);
                  }
              }
          }

          const { error } = await supabase.from('notebook_entries').delete().in('id', ids);
          if (error) throw error;
          await fetchData();
      } catch (e) {
          console.error(e);
          showToast("Failed to delete entry.");
      } finally {
          setIsLoadingData(false);
      }
  };

  const handleStartAddLog = () => { setLogTitle(''); setLogDesc(''); setLogImg(undefined); setLogDate(new Date().toISOString().split('T')[0]); setIsMainPhoto(false); setIncludeWeather(false); setShareToSocial(false); setAddToNotebook(false); setView('ADD_LOG'); };
  const handleStartAddGardenLog = () => { setLogTitle(''); setLogDesc(''); setLogImg(undefined); setLogDate(new Date().toISOString().split('T')[0]); setIncludeWeather(false); setShareToSocial(false); setView('ADD_GARDEN_LOG'); };
  
  const handleAddLog = async () => {
    if (!selectedPlantId || !user) return;
    setIsLoadingData(true);
    
    try {
        let imageUrl = undefined;
        if (logImg && logImg.startsWith('data:')) {
            imageUrl = await uploadPlantImage(logImg, user.id);
        }

        let logWeather = undefined;
        if (includeWeather && homeLocation && logDate && useWeather) { 
            const w = await fetchWeatherForDate(homeLocation.latitude, homeLocation.longitude, logDate); 
            if (w) logWeather = w; 
        }

        const { error } = await supabase.from('logs').insert([{
            owner_id: user.id,
            plant_id: selectedPlantId,
            title: logTitle || t('snapshot'),
            description: logDesc,
            image_url: imageUrl,
            log_date: logDate ? new Date(logDate).toISOString() : new Date().toISOString(),
            weather: logWeather,
            type: 'PLANT'
        }]);

        if (error) throw error;

        if (isMainPhoto && imageUrl) {
            // Fetch old plant data to see if we need to delete an old image
            const oldPlant = plants.find(p => p.id === selectedPlantId);
            if (oldPlant && oldPlant.imageUrl && oldPlant.imageUrl !== imageUrl) {
                // If old image was hosted, delete it.
                // Note: If old image was from a different log that we still want to keep, we shouldn't delete it.
                // But usually imageUrl on plant is a 'copy' or reference.
                // In this app's simple logic, plant.imageUrl is just a string.
                // If it points to a file in storage that is NOT used by other logs... checking usage is hard.
                // SAFEST STRATEGY: Only delete if we know it's not used elsewhere? 
                // Or assume if user replaces main photo, they want to clean up if it was a standalone upload.
                // For now, let's assume replacing main photo replaces the reference. 
                // If the old photo was also a log photo, it might break that log if we delete the file.
                // BETTER STRATEGY: Use the SAME file URL for the plant main image.
                // The code below updates the plant's image_url to the NEW log's image URL.
                // We only delete the OLD main image if it wasn't attached to a log (but we don't track that easily).
                // Compromise: Don't delete old image to be safe, or only delete if we are sure.
                // User request: "als je in logboek entry van plant aangeeft dat de foto van logboek entry gelijk als hoofdfoto moet worden, dan oude hoofdfoto verwijderen uit database."
                // Implementation:
                if (oldPlant.imageUrl.includes('flowerix-media')) {
                     // Check if this URL is used by any other log
                     // This check is expensive. We will just delete it as requested.
                     await deletePlantImage(oldPlant.imageUrl);
                }
            }
            await supabase.from('plants').update({ image_url: imageUrl }).eq('id', selectedPlantId);
        }

        // Social Sharing
        if (shareToSocial && modules.social) {
            const plantName = plants.find(p => p.id === selectedPlantId)?.name || "My Plant";
            await supabase.from('social_posts').insert([{
                user_id: user.id,
                plant_name: plantName,
                title: logTitle || t('snapshot'),
                description: logDesc,
                image_url: imageUrl || (logImg && !logImg.startsWith('data:') ? logImg : null),
                event_date: logDate ? new Date(logDate).toISOString() : new Date().toISOString(),
                weather: logWeather,
                country_code: homeLocation?.countryCode
            }]);
            fetchSocialPosts(0, true);
        }

        if (addToNotebook && modules.notebook) {
            const plantName = plants.find(p => p.id === selectedPlantId)?.name || "Plant";
            const newNote: TimelineItem = {
                id: 'temp', 
                type: 'NOTE',
                title: `${plantName}: ${logTitle || t('snapshot')}`,
                description: logDesc,
                date: logDate,
                imageUrl: imageUrl || logImg
            };
            
            await supabase.from('notebook_entries').insert([{
                owner_id: user.id,
                type: 'NOTE',
                title: newNote.title,
                description: newNote.description,
                date: newNote.date,
                image_url: imageUrl, 
                is_done: false,
                recurrence: 'none'
            }]);
        }

        await fetchData();
        setView('PLANT_DETAILS');
    } catch (e) {
        console.error(e);
        showToast("Failed to add log.");
    } finally {
        setIsLoadingData(false);
    }
  };

  const handleAddGardenLog = async () => {
      if (!user) return;
      setIsLoadingData(true);
      try {
          let imageUrl = undefined;
          if (logImg && logImg.startsWith('data:')) {
              imageUrl = await uploadPlantImage(logImg, user.id);
          }

          let logWeather = undefined;
          if (includeWeather && homeLocation && logDate && useWeather) { 
              const w = await fetchWeatherForDate(homeLocation.latitude, homeLocation.longitude, logDate); 
              if (w) logWeather = w; 
          }

          const { error } = await supabase.from('logs').insert([{
              owner_id: user.id,
              plant_id: null,
              title: logTitle || t('snapshot'),
              description: logDesc,
              image_url: imageUrl,
              log_date: logDate ? new Date(logDate).toISOString() : new Date().toISOString(),
              weather: logWeather,
              type: 'GARDEN'
          }]);

          if (error) throw error;
          await fetchData();
          setDashboardTab('GARDEN_LOGS'); 
          setView('DASHBOARD');
      } catch (e) {
          console.error(e);
          showToast("Failed to add garden log.");
      } finally {
          setIsLoadingData(false);
      }
  };

  const handleUpdateLog = async () => {
    if (!selectedLogId) return;
    setIsLoadingData(true);
    try {
        let imageUrl = logImg;
        if (imageUrl && imageUrl.startsWith('data:')) {
             const uploaded = await uploadPlantImage(imageUrl, user!.id);
             if (uploaded) imageUrl = uploaded;
        }
        
        const { error } = await supabase.from('logs').update({
            title: logTitle,
            description: logDesc,
            image_url: imageUrl,
            log_date: logDate ? new Date(logDate).toISOString() : undefined
        }).eq('id', selectedLogId);

        if (error) throw error;

        if (isMainPhoto && imageUrl && selectedPlantId) {
             const oldPlant = plants.find(p => p.id === selectedPlantId);
             if (oldPlant && oldPlant.imageUrl && oldPlant.imageUrl !== imageUrl) {
                 if (oldPlant.imageUrl.includes('flowerix-media')) {
                     await deletePlantImage(oldPlant.imageUrl);
                 }
             }
             await supabase.from('plants').update({ image_url: imageUrl }).eq('id', selectedPlantId);
        }

        await fetchData();
        setView('PLANT_DETAILS');
    } catch (e) {
        console.error(e);
        showToast("Update failed.");
    } finally {
        setIsLoadingData(false);
    }
  };

  const handleUpdateGardenLog = async () => {
      if (!selectedGardenLogId) return;
      setIsLoadingData(true);
      try {
          let imageUrl = logImg;
          if (imageUrl && imageUrl.startsWith('data:')) {
               const uploaded = await uploadPlantImage(imageUrl, user!.id);
               if (uploaded) imageUrl = uploaded;
          }

          const { error } = await supabase.from('logs').update({
              title: logTitle,
              description: logDesc,
              image_url: imageUrl,
              log_date: logDate ? new Date(logDate).toISOString() : undefined
          }).eq('id', selectedGardenLogId);

          if (error) throw error;
          await fetchData();
          setDashboardTab('GARDEN_LOGS'); setView('DASHBOARD');
      } catch (e) {
          console.error(e);
          showToast("Update failed.");
      } finally {
          setIsLoadingData(false);
      }
  };

  const handleDeleteLog = () => { 
      setConfirmModal({ isOpen: true, title: t('delete_log_title'), message: t('delete_log_confirm'), onConfirm: async () => { 
      if(selectedLogId) {
          const log = selectedPlant?.logs.find(l => l.id === selectedLogId);
          if (log?.imageUrl) {
              await deletePlantImage(log.imageUrl);
          }

          await supabase.from('logs').delete().eq('id', selectedLogId);
          await fetchData();
          setView('PLANT_DETAILS'); 
      }
      setConfirmModal(prev => ({...prev, isOpen: false})); 
  }, cancelText: t('cancel'), onCancel: () => setConfirmModal(prev => ({...prev, isOpen: false})) }); };

  const handleDeleteGardenLog = () => { 
      setConfirmModal({ 
          isOpen: true, 
          title: t('delete_log_title'), 
          message: t('delete_log_confirm'), 
          onConfirm: async () => { 
              if(selectedGardenLogId) {
                  const log = gardenLogs.find(l => l.id === selectedGardenLogId);
                  if (log?.imageUrl) {
                      await deletePlantImage(log.imageUrl);
                  }

                  await supabase.from('logs').delete().eq('id', selectedGardenLogId);
                  await fetchData();
                  setDashboardTab('GARDEN_LOGS'); setView('DASHBOARD'); 
              }
              setConfirmModal(prev => ({...prev, isOpen: false})); 
          }, 
          cancelText: t('cancel'), 
          onCancel: () => setConfirmModal(prev => ({...prev, isOpen: false})) 
      }); 
  };

  const handleDeletePlant = (id: string) => { 
      setConfirmModal({ 
          isOpen: true, 
          title: t('delete_plant_title'), 
          message: t('delete_confirm'), 
          confirmText: t('delete_plant_title'), // Re-using label for confirm button text
          cancelText: t('cancel'),
          onCancel: () => setConfirmModal(prev => ({...prev, isOpen: false})),
          onConfirm: async () => { 
              setIsLoadingData(true); 
              try {
                  const plant = plants.find(p => p.id === id);
                  if (plant) {
                      // Delete main image
                      if (plant.imageUrl) {
                          await deletePlantImage(plant.imageUrl);
                      }
                      // Delete log images
                      if (plant.logs) {
                          for (const log of plant.logs) {
                              if (log.imageUrl) {
                                  await deletePlantImage(log.imageUrl);
                              }
                          }
                      }
                  }

                  await supabase.from('plants').delete().eq('id', id);
                  await fetchData();
                  setView('DASHBOARD'); 
              } catch (e) {
                  console.error(e);
                  showToast("Error deleting plant");
              } finally {
                  setIsLoadingData(false);
                  setConfirmModal(prev => ({...prev, isOpen: false})); 
              }
          } 
      }); 
  };

  const handleArchivePlant = (id: string, currentStatus: boolean) => {
      setConfirmModal({ 
          isOpen: true, 
          title: currentStatus ? t('archive_plant') : t('unarchive_plant'), 
          message: currentStatus ? "Archiving moves this plant to inactive filter." : "Moves plant back to active dashboard.", 
          confirmText: t('confirm'),
          cancelText: t('cancel'),
          onCancel: () => setConfirmModal(prev => ({...prev, isOpen: false})),
          onConfirm: async () => { 
              await supabase.from('plants').update({ is_active: !currentStatus }).eq('id', id);
              await fetchData();
              if(currentStatus) setView('DASHBOARD'); 
              setConfirmModal(prev => ({...prev, isOpen: false})); 
          } 
      });
  }

  const handleAddGardenArea = async () => { 
      if (newAreaName && newAreaImage && user) {
          setIsLoadingData(true);
          try {
              let imageUrl = newAreaImage;
              if (imageUrl.startsWith('data:')) {
                  const uploaded = await uploadPlantImage(imageUrl, user.id);
                  if (uploaded) imageUrl = uploaded;
              }
              const { data, error } = await supabase.from('gardens').insert([{
                  owner_id: user.id,
                  name: newAreaName,
                  image_url: imageUrl
              }]).select();
              
              if (error) throw error;
              
              // Refresh and auto-select
              await fetchData();
              if (data && data[0]) {
                  setSelectedGardenAreaId(data[0].id);
              }
              
              setNewAreaName(''); setNewAreaImage(null); setIsAddingArea(false); 
          } catch(e) {
              console.error(e);
              showToast("Failed to add area.");
          } finally {
              setIsLoadingData(false);
          }
      } 
  };

  const handleDeleteArea = (id: string) => { 
      setConfirmModal({ isOpen: true, title: t('delete_area_title'), message: t('delete_confirm'), onConfirm: async () => { 
      const area = gardenAreas.find(a => a.id === id);
      if (area?.imageUrl) {
          await deletePlantImage(area.imageUrl);
      }

      await supabase.from('gardens').delete().eq('id', id);
      await fetchData();
      if (selectedGardenAreaId === id) setSelectedGardenAreaId(null); 
      setConfirmModal(prev => ({...prev, isOpen: false})); 
  }, cancelText: t('cancel'), onCancel: () => setConfirmModal(prev => ({...prev, isOpen: false})) }); };

  const handlePinPlantToGarden = async (x: number, y: number, plantId: string) => { 
      if (!selectedGardenAreaId) return;
      const plant = plants.find(p => p.id === plantId);
      if (!plant) return;

      const otherLocations = (plant.location || []);
      const currentAreaLocations = otherLocations.filter(l => l.gardenAreaId === selectedGardenAreaId);
      if (currentAreaLocations.length >= 3) {
          showToast(t('max_placements_reached') || "Maximum 3 placements per plant!");
          return;
      }
      
      const newLocations = [...otherLocations, { gardenAreaId: selectedGardenAreaId, x, y }];
      
      setPlants(prev => prev.map(p => p.id === plantId ? { ...p, location: newLocations } : p));
      await supabase.from('plants').update({ location: newLocations }).eq('id', plantId);
  };

  const handleUnpinPlantFromGarden = async (plantId: string, areaId: string) => {
      const plant = plants.find(p => p.id === plantId);
      if (!plant) return;

      const newLocations = (plant.location || []).filter(l => l.gardenAreaId !== areaId);
      
      setPlants(prev => prev.map(p => p.id === plantId ? { ...p, location: newLocations } : p));
      await supabase.from('plants').update({ location: newLocations }).eq('id', plantId);
      showToast(t('remove_pin'));
  };

  // Helper wrappers for Extras
  const handleSaveAnalysisToLog = (plantId: string, result: AnalysisResult, image: string) => { 
      const asyncSave = async () => {
          if(!user) return;
          let imageUrl = image;
          if (image.startsWith('data:')) {
              const up = await uploadPlantImage(image, user.id);
              if(up) imageUrl = up;
          }
          await supabase.from('logs').insert([{
              owner_id: user.id,
              plant_id: plantId,
              title: `${t('analysis_title')}: ${result.diagnosis}`,
              description: `Status: ${result.healthy ? t('health_healthy') : t('health_issue')}\n\nSymptoms: ${result.symptoms.join(', ')}\n\nAdvice: ${result.treatment}`,
              image_url: imageUrl,
              type: 'PLANT',
              log_date: new Date().toISOString()
          }]);
          await fetchData();
          showToast(t('log_saved'));
          setSelectedPlantId(plantId); 
          setView('PLANT_DETAILS');
      };
      asyncSave();
  };

  const handleSaveProfessorToLog = (plantId: string, title: string, desc: string, image: string) => { 
      const asyncSave = async () => {
          if(!user) return;
          let imageUrl = image;
          if (image.startsWith('data:')) {
              const up = await uploadPlantImage(image, user.id);
              if(up) imageUrl = up;
          }
          await supabase.from('logs').insert([{
              owner_id: user.id,
              plant_id: plantId,
              title: title,
              description: desc,
              image_url: imageUrl,
              type: 'PLANT',
              log_date: new Date().toISOString()
          }]);
          await fetchData();
          showToast(t('log_saved'));
          setSelectedPlantId(plantId); 
          setView('PLANT_DETAILS');
      };
      asyncSave();
  };

  // Async wrapper for SeasonsModal
  const handleSaveSeasonToGarden = async (image: string, seasonLabel: string) => {
      if(!user) return;
      
      let imageUrl = image;
      if (image.startsWith('data:')) {
          const up = await uploadPlantImage(image, user.id);
          if(!up) {
              showToast("Image upload failed. Log not saved.");
              throw new Error("Image upload failed");
          }
          imageUrl = up;
      }
      
      const { error } = await supabase.from('logs').insert([{
          owner_id: user.id,
          plant_id: null,
          title: `${t('season_log_title')}: ${seasonLabel}`,
          description: t('seasons_desc'),
          image_url: imageUrl,
          type: 'GARDEN',
          log_date: new Date().toISOString()
      }]);

      if (error) {
          console.error(error);
          showToast("Failed to save log.");
          throw error;
      }

      await fetchData();
      setDashboardTab('GARDEN_LOGS'); 
      setView('DASHBOARD'); 
      showToast(t('log_saved'));
  };

  const handlePhotoUpdate = async (id: string, newBase64: string) => { 
      if(!user) return;
      const uploaded = await uploadPlantImage(newBase64, user.id);
      if(!uploaded) { 
          showToast("Upload failed"); 
          throw new Error("Upload failed");
      }

      if (id.startsWith('p_')) { 
          const plantId = id.replace('p_', ''); 
          await supabase.from('plants').update({ image_url: uploaded }).eq('id', plantId);
      } else if (id.startsWith('pl_')) { 
          const logId = id.replace('pl_', ''); 
          await supabase.from('logs').update({ image_url: uploaded }).eq('id', logId);
      } else if (id.startsWith('gl_')) { 
          const logId = id.replace('gl_', ''); 
          await supabase.from('logs').update({ image_url: uploaded }).eq('id', logId);
      }
      await fetchData();
      showToast(t('photo_updated')); 
  };

  const handleExecuteSlideshow = (config: SlideshowConfig) => { setShowSlideshowConfig(false); const allImages: string[] = []; plants.forEach(p => { if (p.imageUrl) allImages.push(p.imageUrl); p.logs.forEach(l => { if (l.imageUrl) allImages.push(l.imageUrl); }); }); if (allImages.length === 0) { showToast(t('no_photos')); return; } setSlideshowState({ active: true, config, images: allImages }); };
  
  // --- Social Logic ---
  const handleLikePost = async (id: string) => {
      if (!user) return;
      const post = socialPosts.find(p => p.id === id);
      if (!post) return;

      const isLiked = post.isLiked;
      
      setSocialPosts(prev => prev.map(p => p.id === id ? { 
          ...p, 
          isLiked: !isLiked, 
          likes: isLiked ? Math.max(0, p.likes - 1) : p.likes + 1 
      } : p));

      try {
          if (isLiked) {
              await supabase.from('social_likes').delete().eq('post_id', id).eq('user_id', user.id);
          } else {
              await supabase.from('social_likes').insert([{ post_id: id, user_id: user.id }]);
          }
      } catch (e) {
          console.error("Like Error", e);
      }
  };

  const handleCommentPost = async (id: string, text: string) => {
      if (!user || !text.trim()) return;
      
      try {
          const { data, error } = await supabase.from('social_comments').insert([{
              post_id: id,
              user_id: user.id,
              text: text.trim()
          }]).select('*, profiles(display_name)').single();

          if (error) throw error;

          // Update UI
          const newComment: SocialComment = {
              id: data.id,
              userName: data.profiles?.display_name || 'Me',
              text: data.text,
              date: data.created_at
          };

          setSocialPosts(prev => prev.map(p => p.id === id ? { ...p, comments: [...(p.comments || []), newComment] } : p));
      } catch (e) {
          console.error("Comment Error", e);
          showToast("Failed to comment");
      }
  };

  const handleLoadMoreSocial = () => {
      if (socialHasMore) {
          const nextPage = socialPage + 1;
          setSocialPage(nextPage);
          fetchSocialPosts(nextPage);
      }
  };

  // UI Helpers
  const getWeatherIcon = (code: number) => { if (code === 0) return <Icons.Sun className="w-full h-full text-yellow-500" />; if (code >= 1 && code <= 3) return <Icons.Cloud className="w-full h-full text-gray-400" />; return <Icons.Sun className="w-full h-full text-yellow-500" />; };
  const getWeatherDesc = (code: number) => code === 0 ? t('weather_clear') : t('weather_cloudy');
  
  const selectedPlant = plants.find(p => p.id === selectedPlantId);
  const selectedGardenLog = gardenLogs.find(l => l.id === selectedGardenLogId);
  const selectedPost = socialPosts.find(p => p.id === selectedSocialPostId);

  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
  const wrapperStyle = (!limitAI && isChatOpen && isChatDocked && isDesktop) ? { marginRight: `${chatWidth}px`, transition: 'margin-right 0.3s ease-in-out' } : { marginRight: 0, transition: 'margin-right 0.3s ease-in-out' };

  if (isLoading) return <LoadingOverlay visible={true} message="Loading..." />;
  if (missingDatabase) return <SetupRequiredView />;

  return (
      <>
        <Toast message={toast.message} visible={toast.visible} />
        <LoadingOverlay visible={isValidatingImage || isLoadingData} message={isLoadingData ? "Syncing Database..." : t('validating_image')} />
        
        <div id="landscape-warning" className="fixed inset-0 z-[9999] bg-black text-white flex-col items-center justify-center p-8 text-center hidden">
            <Icons.Smartphone className="w-16 h-16 mb-4 rotate-90 animate-pulse text-green-500" />
            <h2 className="text-2xl font-bold mb-2">Please Rotate Device</h2>
            <p className="text-gray-400">Flowerix is designed for portrait mode on mobile devices.</p>
        </div>

        {view !== 'WELCOME' && view !== 'WAITLIST' && (
            <Menu 
                isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} setView={setView} setDashboardTab={setDashboardTab} 
                setShowLocationModal={setShowLocationModal}
                handleExportData={() => { if(generateFullExport(plants, gardenLogs, lang, t)) showToast(t('pdf_downloaded')); else alert(t('pdf_error')); }}
                darkMode={darkMode} setDarkMode={setDarkMode} lang={lang} setLang={setLang} t={t} 
                onSignOut={signOut}
                modules={modules}
            />
        )}

        <div style={wrapperStyle} className="flex-1 min-h-screen bg-gray-50 dark:bg-gray-900 transition-all">
            {(() => {
                switch (view) {
                    case 'WELCOME': 
                        return <WelcomeView onStart={handleStart} t={t} lang={lang} setLang={setLang} onOpenTerms={() => setInfoModal({isOpen: true, type: 'TERMS'})} />;
                    case 'WAITLIST':
                        return <WaitlistView />;
                    case 'DASHBOARD': 
                        return <DashboardView 
                            plants={plants} gardenLogs={gardenLogs} socialPosts={socialPosts} weather={weather} homeLocation={homeLocation} useWeather={useWeather} tempUnit={tempUnit} lengthUnit={lengthUnit}
                            tab={dashboardTab} setTab={setDashboardTab} setView={setView}
                            searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                            showArchivedPlants={showArchivedPlants} setShowArchivedPlants={setShowArchivedPlants}
                            visiblePlantsCount={visiblePlantsCount} setVisiblePlantsCount={setVisiblePlantsCount}
                            onStartAddPlant={startAddPlantFlow} onSelectPlant={(id) => { setSelectedPlantId(id); setView('PLANT_DETAILS'); }}
                            onMenuToggle={() => setIsMenuOpen(true)}
                            onStartAddGardenLog={handleStartAddGardenLog} onSelectGardenLog={(log) => { setSelectedGardenLogId(log.id); setLogTitle(log.title); setLogDesc(log.description); setLogImg(log.imageUrl); setLogDate(new Date(log.date).toISOString().split('T')[0]); setIncludeWeather(!!log.weather); setLogWeatherTemp(log.weather ? Math.round(log.weather.temperature) : null); setView('GARDEN_LOG_DETAILS'); }}
                            gardenAreas={gardenAreas} selectedGardenAreaId={selectedGardenAreaId} setSelectedGardenAreaId={setSelectedGardenAreaId}
                            isAddingArea={isAddingArea} setIsAddingArea={setIsAddingArea} newAreaName={newAreaName} setNewAreaName={setNewAreaName} newAreaImage={newAreaImage} setNewAreaImage={setNewAreaImage}
                            onAddArea={handleAddGardenArea} onDeleteArea={handleDeleteArea} handleImageUpload={handleImageUpload}
                            isPinning={isPinning} setIsPinning={setIsPinning} handlePinPlant={handlePinPlantToGarden}
                            onUnpinPlant={handleUnpinPlantFromGarden}
                            // Social Props
                            onLikePost={handleLikePost}
                            onOpenPostDetails={(id) => { setSelectedSocialPostId(id); setView('SOCIAL_POST_DETAILS'); }}
                            onLoadMoreSocial={handleLoadMoreSocial}
                            onRefreshSocial={() => fetchSocialPosts(0, true)}
                            socialHasMore={socialHasMore}
                            showToast={showToast} lang={lang} t={t}
                            // Extras
                            onOpenSlideshowConfig={() => setShowSlideshowConfig(true)}
                            onOpenPhotoMerge={() => setShowPhotoMergeModal(true)}
                            onOpenPhotoOptimize={() => setShowPhotoOptimizeModal(true)}
                            onOpenPhotoTimelapse={() => setShowPhotoTimelapseModal(true)}
                            onOpenPlantAnalysis={() => setView('PLANT_ANALYSIS')}
                            onOpenSeasons={() => setShowSeasonsModal(true)}
                            onOpenPlantAdvice={() => setView('PLANT_ADVICE')}
                            onOpenIdentify={() => setView('IDENTIFY_PLANT_CAMERA')}
                            onOpenProfessor={() => setView('PROFESSOR')}
                            onShowRestriction={handleShowRestriction}
                            // App Props
                            darkMode={darkMode} setDarkMode={setDarkMode}
                            appVersion={APP_VERSION}
                            onOpenInfoModal={(type) => setInfoModal({isOpen: true, type})}
                            timelineItems={timelineItems} 
                            
                            // Notebook Handlers
                            onAddNotebookItem={handleAddNotebookEntry}
                            onUpdateNotebookItem={handleUpdateNotebookEntry}
                            onDeleteNotebookItem={handleDeleteNotebookEntry}

                            firstDayOfWeek={firstDayOfWeek}
                            limitAI={limitAI}
                            modules={modules}
                        />;
                    case 'SETTINGS':
                        return <SettingsView 
                            onBack={() => setView('DASHBOARD')}
                            lang={lang} setLang={setLang}
                            homeLocation={homeLocation} setHomeLocation={updateHomeLocation}
                            useWeather={useWeather} setUseWeather={setUseWeather}
                            tempUnit={tempUnit} setTempUnit={setTempUnit}
                            lengthUnit={lengthUnit} setLengthUnit={setLengthUnit}
                            windUnit={windUnit} setWindUnit={setWindUnit}
                            firstDayOfWeek={firstDayOfWeek} setFirstDayOfWeek={setFirstDayOfWeek}
                            timeFormat={timeFormat} setTimeFormat={setTimeFormat}
                            limitAI={limitAI} setLimitAI={setLimitAI}
                            modules={modules} setModules={setModules}
                            t={t}
                        />;
                    case 'PRICING':
                        return <PricingView onBack={() => setView('DASHBOARD')} t={t} />;
                    case 'WEATHER_DETAILS':
                        return <WeatherDetailsView 
                            weather={weather} homeLocation={homeLocation} tempUnit={tempUnit} lengthUnit={lengthUnit} 
                            onBack={() => setView('DASHBOARD')} lang={lang} t={t} windUnit={windUnit} timeFormat={timeFormat}
                            onRefresh={() => handleFetchWeather(true)}
                        />;
                    case 'ADD_PLANT_PHOTO': 
                        return <AddPlantPhotoView 
                            newPlantImage={newPlantImage} 
                            onImageUpload={(e) => handleImageUpload(e, (b64) => {
                                setNewPlantImage(b64);
                                // SYNC FIX: Ensure preview sees this image
                                setTempPlantDetails(prev => ({ ...prev, imageUrl: b64 }));
                            }, 'high')} 
                            onIdentify={handleIdentifyPlant} 
                            onManual={() => { setAiSuggestion(null); setTempPlantDetails({ ...tempPlantDetails, name: "", scientificName: "", description: "", careInstructions: "" }); setView('ADD_PLANT_DETAILS'); }} 
                            onBack={() => setView('DASHBOARD')} 
                            t={t} 
                            limitAI={limitAI} 
                        />;
                    case 'ADD_PLANT_IDENTIFY': 
                        return <IdentifyingView t={t} />;
                    case 'PLANT_IDENTIFICATION_RESULT': 
                        return <IdentificationResultView image={newPlantImage} suggestion={aiSuggestion} onConfirm={() => { if(aiSuggestion) setTempPlantDetails(prev => ({...prev, name: aiSuggestion.name, scientificName: aiSuggestion.scientificName, description: aiSuggestion.description, careInstructions: aiSuggestion.careInstructions, isIndoor: aiSuggestion.isIndoor})); setView('ADD_PLANT_DETAILS'); }} onManual={() => { setAiSuggestion(null); setTempPlantDetails({ ...tempPlantDetails, name: "", scientificName: "", description: "", careInstructions: "" }); setView('ADD_PLANT_DETAILS'); }} onBack={() => setView('ADD_PLANT_PHOTO')} t={t} />;
                    case 'ADD_PLANT_DETAILS': 
                        return <AddPlantDetailsView tempPlantDetails={tempPlantDetails} setTempPlantDetails={setTempPlantDetails} isGeneratingInfo={isGeneratingInfo} onAutoFill={handleAutoFillDetails} onSave={handleSaveNewPlant} onBack={() => setView('ADD_PLANT_PHOTO')} t={t} />;
                    case 'PLANT_DETAILS': 
                        return selectedPlant ? <PlantDetailsView 
                            plant={selectedPlant} onBack={() => setView('DASHBOARD')} onAddPlant={startAddPlantFlow} 
                            onEdit={() => { setEditPlantData({ ...selectedPlant }); setShowEditPlantModal(true); }} 
                            onArchive={(id) => handleArchivePlant(id, !!selectedPlant.isActive)} 
                            onDelete={handleDeletePlant} 
                            onOpenCollage={(type, id) => { setCollageConfig({ type, id }); setView('PHOTO_COLLAGE'); }} 
                            onShowWebImages={async (n, s) => { setWebImagesModal({isOpen:true, images:[], loading:true}); const imgs = await searchWikiImages(s||n); setWebImagesModal({isOpen:true, images:imgs, loading:false}); }} 
                            onShowSummary={(p) => { const lines = [`${t('summary_intro')} ${p.name}`, p.scientificName ? `(${p.scientificName})` : '', '', `${t('description')}:`, p.description||t('no_desc'), '', `${t('care_label')}:`, p.careInstructions||t('no_instr')]; setSummaryModal({ isOpen: true, content: lines.join('\n') }); }}
                            onGeneratePdf={(p) => { if(generatePlantPDF(p, lang, t)) showToast(t('pdf_downloaded')); else alert(t('pdf_error')); }}
                            onViewInGarden={(areaId) => { setSelectedGardenAreaId(areaId); setDashboardTab('GARDEN_VIEW'); setView('DASHBOARD'); }}
                            onPinLocation={() => { setDashboardTab('GARDEN_VIEW'); setView('DASHBOARD'); }} 
                            onAddLog={handleStartAddLog} onViewLog={(log) => { setSelectedLogId(log.id); setLogTitle(log.title); setLogDesc(log.description); setLogImg(log.imageUrl); setLogDate(new Date(log.date).toISOString().split('T')[0]); setIsMainPhoto(false); setIncludeWeather(!!log.weather); setLogWeatherTemp(log.weather ? Math.round(log.weather.temperature) : null); setView('LOG_DETAILS'); }}
                            onAddToNotebook={handleAddNotebookEntry}
                            visibleLogsCount={visiblePlantLogsCount} setVisibleLogsCount={setVisiblePlantLogsCount}
                            plantUISettings={plantUISettings} togglePlantSection={(id, sec) => setPlantUISettings(p => ({...p, [id]: {...p[id], [sec === 'about' ? 'aboutCollapsed' : 'careCollapsed']: !p[id]?.[sec === 'about' ? 'aboutCollapsed' : 'careCollapsed']}}))}
                            formatDate={formatDate} getWeatherIcon={getWeatherIcon} t={t}
                            onAskFlora={handleAskFlora}
                            limitAI={limitAI}
                            modules={modules}
                            onNextPlant={handleNextPlant}
                            onPrevPlant={handlePrevPlant}
                        /> : null;
                    case 'ADD_LOG': 
                        return <LogFormView 
                            logTitle={logTitle} setLogTitle={setLogTitle} logDesc={logDesc} setLogDesc={setLogDesc} logDate={logDate} setLogDate={setLogDate} logImg={logImg} setLogImg={setLogImg} includeWeather={includeWeather} setIncludeWeather={setIncludeWeather} isMainPhoto={isMainPhoto} setIsMainPhoto={setIsMainPhoto} shareToSocial={shareToSocial} setShareToSocial={setShareToSocial} addToNotebook={addToNotebook} setAddToNotebook={setAddToNotebook}
                            onSave={handleAddLog} onBack={() => setView('PLANT_DETAILS')} handleImageUpload={handleImageUpload} homeLocation={homeLocation} allowWeather={useWeather} t={t}
                            allowSocial={modules.social} allowNotebook={modules.notebook}
                        />;
                    case 'LOG_DETAILS': 
                        const log = selectedPlant?.logs.find(l => l.id === selectedLogId);
                        return <LogDetailsView 
                            onBack={() => setView('PLANT_DETAILS')} onDelete={handleDeleteLog} onSave={handleUpdateLog}
                            logTitle={logTitle} setLogTitle={setLogTitle} logDesc={logDesc} setLogDesc={setLogDesc} logDate={logDate} setLogDate={setLogDate} logImg={logImg} setLogImg={setLogImg} includeWeather={includeWeather} setIncludeWeather={setIncludeWeather} logWeather={log?.weather} logWeatherTemp={logWeatherTemp} setLogWeatherTemp={setLogWeatherTemp} isMainPhoto={isMainPhoto} setIsMainPhoto={setIsMainPhoto}
                            handleImageUpload={handleImageUpload} homeLocation={homeLocation} allowWeather={useWeather} getWeatherIcon={getWeatherIcon} getWeatherDesc={getWeatherDesc} tempUnit={tempUnit} t={t}
                        />;
                    case 'ADD_GARDEN_LOG': 
                        return <LogFormView isGardenLog
                            logTitle={logTitle} setLogTitle={setLogTitle} logDesc={logDesc} setLogDesc={setLogDesc} logDate={logDate} setLogDate={setLogDate} logImg={logImg} setLogImg={setLogImg} includeWeather={includeWeather} setIncludeWeather={setIncludeWeather}
                            onSave={handleAddGardenLog} onBack={() => { setView('DASHBOARD'); setDashboardTab('GARDEN_LOGS'); }} handleImageUpload={handleImageUpload} homeLocation={homeLocation} allowWeather={useWeather} t={t}
                        />;
                    case 'GARDEN_LOG_DETAILS': 
                        return <LogDetailsView isGardenLog
                            onBack={() => { setView('DASHBOARD'); setDashboardTab('GARDEN_LOGS'); }} onDelete={handleDeleteGardenLog} onSave={handleUpdateGardenLog}
                            logTitle={logTitle} setLogTitle={setLogTitle} logDesc={logDesc} setLogDesc={setLogDesc} logDate={logDate} setLogDate={setLogDate} logImg={logImg} setLogImg={setLogImg} includeWeather={includeWeather} setIncludeWeather={setIncludeWeather} logWeather={selectedGardenLog?.weather} logWeatherTemp={logWeatherTemp} setLogWeatherTemp={setLogWeatherTemp}
                            handleImageUpload={handleImageUpload} homeLocation={homeLocation} allowWeather={useWeather} getWeatherIcon={getWeatherIcon} getWeatherDesc={getWeatherDesc} tempUnit={tempUnit} t={t}
                        />;
                    case 'SOCIAL_POST_DETAILS': 
                        return <SocialPostDetailsView 
                            post={selectedPost} onBack={() => setView('DASHBOARD')} 
                            onLike={handleLikePost} 
                            onComment={handleCommentPost} 
                            showToast={showToast} formatDate={formatDate} getWeatherIcon={getWeatherIcon} getWeatherDesc={getWeatherDesc} t={t}
                        />;
                    case 'PHOTO_COLLAGE': 
                        return <PhotoCollageView config={collageConfig} plants={plants} gardenLogs={gardenLogs} onBack={() => { if (collageConfig?.type === 'PLANT') setView('PLANT_DETAILS'); else { setView('DASHBOARD'); setDashboardTab('GARDEN_LOGS'); } }} lang={lang} t={t} />;
                    case 'PLANT_ANALYSIS':
                        return <PlantAnalysisView plants={plants} onBack={() => setView('DASHBOARD')} onSaveToLog={handleSaveAnalysisToLog} onAddToNotebook={handleAddNotebookEntry} handleImageUpload={handleImageUpload} lang={lang} t={t} onAskFlora={handleAskFlora} />;
                    case 'PLANT_ADVICE':
                        return <PlantAdviceView onBack={() => setView('DASHBOARD')} onAddToNotebook={handleAddNotebookEntry} showToast={showToast} lang={lang} t={t} onAskFlora={handleAskFlora} />;
                    case 'IDENTIFY_PLANT_CAMERA':
                        return <IdentifyPlantView onBack={() => setView('DASHBOARD')} lang={lang} t={t} onAskFlora={handleAskFlora} />;
                    case 'PROFESSOR':
                        return <ProfessorView plants={plants} onBack={() => setView('DASHBOARD')} onSaveToLog={handleSaveProfessorToLog} onAddToNotebook={handleAddNotebookEntry} handleImageUpload={handleImageUpload} lang={lang} t={t} onAskFlora={handleAskFlora} />;
                    default: return null;
                }
            })()}
        </div>

        {!limitAI && isChatOpen && (
            <div className="fixed inset-0 z-[45] bg-black/20 backdrop-blur-[1px] md:hidden touch-none" />
        )}

        {view !== 'WELCOME' && view !== 'WAITLIST' && view !== 'SETTINGS' && !missingDatabase && !limitAI && !isMenuOpen && (
            <FlowerixChatWidget 
                plants={plants} gardenLogs={gardenLogs} lang={lang} 
                isOpen={isChatOpen} setIsOpen={setIsChatOpen}
                isDocked={isChatDocked} setIsDocked={setIsChatDocked}
                width={chatWidth} setWidth={setChatWidth}
                onAddToNotebook={handleAddNotebookEntry}
                chatTrigger={chatTrigger}
                modules={modules}
            />
        )}

        <ConfirmationModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} onConfirm={confirmModal.onConfirm} onCancel={confirmModal.onCancel ? confirmModal.onCancel : undefined} confirmText={confirmModal.confirmText} cancelText={confirmModal.cancelText} />
        <WebImagesModal isOpen={webImagesModal.isOpen} loading={webImagesModal.loading} images={webImagesModal.images} onClose={() => setWebImagesModal(prev => ({...prev, isOpen: false}))} t={t} />
        <LocationPickerModal isOpen={showLocationModal} onClose={() => setShowLocationModal(false)} homeLocation={homeLocation} setHomeLocation={updateHomeLocation} showToast={showToast} t={t} />
        <SummaryModal isOpen={summaryModal.isOpen} content={summaryModal.content} onClose={() => setSummaryModal(prev => ({...prev, isOpen: false}))} onCopy={() => { navigator.clipboard.writeText(summaryModal.content); showToast(t('copy_success')); }} t={t} />
        <AppReportModal isOpen={infoModal.isOpen} type={infoModal.type} onClose={() => setInfoModal(prev => ({...prev, isOpen: false}))} t={t} appVersion={APP_VERSION} />
        <EditPlantModal isOpen={showEditPlantModal} onClose={() => setShowEditPlantModal(false)} editPlantData={editPlantData} setEditPlantData={setEditPlantData} handleSave={handleSaveEditPlant} handleImageUpload={(e) => handleImageUpload(e, (b64) => setEditPlantData(prev => ({...prev, imageUrl: b64})), 'high')} t={t} />
        
        <SlideshowConfigModal isOpen={showSlideshowConfig} onClose={() => setShowSlideshowConfig(false)} onExecute={handleExecuteSlideshow} t={t} />
        <PhotoMergeModal isOpen={showPhotoMergeModal} onClose={() => setShowPhotoMergeModal(false)} plants={plants} gardenLogs={gardenLogs} showToast={showToast} lang={lang} t={t} />
        <PhotoOptimizeModal isOpen={showPhotoOptimizeModal} onClose={() => setShowPhotoOptimizeModal(false)} plants={plants} gardenLogs={gardenLogs} onUpdate={handlePhotoUpdate} lang={lang} t={t} limitAI={limitAI} />
        <PhotoTimelapseModal isOpen={showPhotoTimelapseModal} onClose={() => setShowPhotoTimelapseModal(false)} plants={plants} lang={lang} t={t} />
        <SeasonsModal isOpen={showSeasonsModal} onClose={() => setShowSeasonsModal(false)} plants={plants} gardenLogs={gardenLogs} onSaveToGarden={handleSaveSeasonToGarden} handleImageUpload={handleImageUpload} t={t} />
        
        {restrictionModalOpen && (
            <ConfirmationModal isOpen={restrictionModalOpen} title={t('ai_restricted_title')} message={t('ai_restricted_msg')} onConfirm={() => setRestrictionModalOpen(false)} onCancel={() => setRestrictionModalOpen(false)} confirmText="OK" cancelText="" />
        )}

        <PremiumFeatureModal isOpen={premiumModalOpen} onClose={() => setPremiumModalOpen(false)} onGoToPricing={() => { setPremiumModalOpen(false); setView('PRICING'); }} featureName={premiumFeatureName} t={t} />

        {slideshowState.active && (
            <SlideshowPlayer images={slideshowState.images} config={slideshowState.config} onClose={() => setSlideshowState(prev => ({ ...prev, active: false }))} />
        )}

        <CookieConsent lang={lang} t={t} />
      </>
  );
};

export default function App() {
    return (
        <AuthProvider>
            <MainContent />
        </AuthProvider>
    );
}
