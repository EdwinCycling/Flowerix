
import { UserTier } from "./pricingConfig"; 

export type TierType = UserTier;

// --- SUPABASE TYPES ---
export interface UserProfile {
    id: string;
    email: string;
    display_name?: string;
    avatar_url?: string;
    status: 'pending' | 'approved';
    settings?: any;
    subscription?: SubscriptionDetails; // Added
}

export interface SubscriptionDetails {
    tier: UserTier;
    status: 'active' | 'canceled' | 'past_due' | 'trialing';
    currentPeriodEnd: string; // ISO Date
    cancelAtPeriodEnd: boolean;
    stripeCustomerId?: string;
}
// ---------------------

export interface ModulesConfig {
    gardenLogs: boolean;
    gardenView: boolean;
    social: boolean;
    notebook: boolean;
}

export interface LogWeather {
    temperature: number;
    weatherCode: number;
    isDay: number;
}

export interface LogItem {
    id: string;
    date: string;
    title: string;
    description: string;
    imageUrl?: string;
    weather?: LogWeather;
}

export interface GardenLogItem {
    id: string;
    date: string;
    title: string;
    description: string;
    imageUrl?: string;
    weather?: LogWeather;
}

export interface PlantLocation {
    gardenAreaId: string;
    x: number;
    y: number;
}

export interface Plant {
    id: string;
    name: string;
    scientificName?: string;
    sequenceNumber: number;
    imageUrl?: string;
    description: string;
    careInstructions: string;
    location?: PlantLocation[]; // Changed to array for multiple locations
    logs: LogItem[];
    dateAdded: string;
    datePlanted?: string;
    isActive?: boolean; // New: Track active/archived status
    isIndoor?: boolean; // New: Track indoor/outdoor status
}

export interface GardenArea {
    id: string;
    name: string;
    imageUrl: string;
}

export interface HomeLocation {
    latitude: number;
    longitude: number;
    name: string;
    countryCode?: string; // Added for holidays
}

export type ViewState = 
    | 'WELCOME' 
    | 'WAITLIST' // New View
    | 'DASHBOARD' 
    | 'SETTINGS'
    | 'PRICING' // New view
    | 'ADD_PLANT_PHOTO' 
    | 'ADD_PLANT_IDENTIFY' 
    | 'PLANT_IDENTIFICATION_RESULT'
    | 'ADD_PLANT_DETAILS' 
    | 'PLANT_DETAILS' 
    | 'ADD_LOG'
    | 'LOG_DETAILS'
    | 'ADD_GARDEN_LOG'
    | 'GARDEN_LOG_DETAILS'
    | 'SOCIAL_POST_DETAILS'
    | 'PHOTO_COLLAGE'
    | 'PLANT_ANALYSIS'
    | 'PLANT_ADVICE'
    | 'IDENTIFY_PLANT_CAMERA'
    | 'WEATHER_DETAILS'
    | 'PROFESSOR'; // New view

export type DashboardTab = 'PLANTS' | 'GARDEN_LOGS' | 'GARDEN_VIEW' | 'WORLD' | 'NOTEBOOK' | 'EXTRAS';

export interface AISuggestion {
    name: string;
    scientificName: string;
    description: string;
    careInstructions: string;
    isIndoor: boolean; // New: Suggest indoor/outdoor
}

export interface IdentificationResult {
    name: string;
    scientificName: string;
    confidence: number; // 0-100
    description: string; // General info
    soil: string;        // Grondsoort & Verzorging
    climate: string;     // Klimaat
    size: string;        // Grootte
    pruning: string;     // Snoeien
    imageUrl?: string; // Fetched later
}

export interface DailyWeather {
    date: string;
    maxTemp: number;
    minTemp: number;
    weatherCode: number;
    precipitationSum?: number;
    sunshineDuration?: number; // Hours
    sunrise?: string;
    sunset?: string;
    uvIndex?: number;
}

export interface WeatherData {
    current: {
        temperature: number;
        weatherCode: number;
        isDay: number;
        maxTemp: number;
        minTemp: number;
        windSpeed?: number;
        humidity?: number;
        precipitation?: number;
        uvIndex?: number;
    };
    forecast: DailyWeather[];
    history: DailyWeather[]; // Last 28 days
    updatedAt?: string;
}

export interface SocialComment {
    id: string;
    userName: string;
    text: string;
    date: string;
}

export interface SocialPost {
    id: string;
    userName: string;
    userAvatarColor: string;
    country: string; // Country code e.g., 'NL', 'US', 'GB'
    plantName: string;
    title: string;
    description: string;
    imageUrl?: string;
    date: string; // Event/Log Date
    createdDate: string; // Post creation date
    weather?: LogWeather;
    likes: number;
    isLiked: boolean;
    isCurrentUser: boolean;
    comments: SocialComment[];
}

export type SlideshowTransition = 
    | 'fade' 
    | 'cut' 
    | 'slide_right' | 'slide_left' | 'slide_top' | 'slide_bottom' 
    | 'zoom'
    | 'rotate'
    | 'cube'
    | 'wipe_left' | 'wipe_right' | 'wipe_top' | 'wipe_bottom';

export interface SlideshowConfig {
    duration: number; // seconds
    transition: SlideshowTransition;
}

export type AnalysisType = 'general' | 'disease' | 'nutrition' | 'stress' | 'growth' | 'harvest' | 'pruning';

export interface AnalysisResult {
    healthy: boolean;
    diagnosis: string;
    confidence: number; // 0-100
    symptoms: string[];
    treatment: string;
}

// Plant Advice Types
export interface PlantAdviceFormData {
    location: 'indoor' | 'outdoor';
    outdoorType?: 'ground' | 'pot';
    climate: 'temperate' | 'continental' | 'mediterranean' | 'tropical' | 'arid';
    minTemperature: number; // Degrees Celsius
    sunlight: 'full_sun' | 'partial' | 'shade';
    soil: 'sandy' | 'clay' | 'loam' | 'peat' | 'unknown';
    moisture: 'dry' | 'average' | 'wet';
    space: 'small' | 'medium' | 'large';
    minHeight: number; // cm
    maxHeight: number; // cm
    plantTypes: string[]; // flowering, foliage, etc.
    colors: string[];
    seasons: string[];
    maintenance: number; // 0-100 smooth slider
    special: string[]; // scented, non-toxic etc.
}

export interface PlantRecommendation {
    name: string;
    scientificName: string;
    reason: string;
    matchPercentage: number;
}

// Timeline / Notebook Types
export type RecurrenceType = 'none' | 'weekly' | 'biweekly' | 'fourweekly' | 'monthly' | 'quarterly' | 'yearly';

export interface TimelineItem {
    id: string;
    type: 'NOTE' | 'TASK';
    title: string;
    description?: string;
    date: string;
    imageUrl?: string;
    
    // Task specific
    isDone?: boolean;
    recurrence?: RecurrenceType;
    originalParentId?: string; // To track recurring series
}

export interface PublicHoliday {
    date: string;
    localName: string;
    name: string;
    countryCode: string;
}

export type TempUnit = 'C' | 'F';
export type LengthUnit = 'mm' | 'in';
export type WindUnit = 'kmh' | 'mph' | 'bft';
export type TimeFormat = '12h' | '24h';
