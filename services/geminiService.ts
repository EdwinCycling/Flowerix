
import { AISuggestion, AnalysisResult, AnalysisType, PlantAdviceFormData, PlantRecommendation, IdentificationResult } from "../types";
import { trackUsage } from "./usageService";

const endpoint = "/.netlify/functions/gemini";
const postGemini = async (payload: any) => {
  const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(`Error: Gemini function unavailable (${res.status})`);
  return res.json();
};

export const identifyPlant = async (base64Image: string, lang: 'en' | 'nl'): Promise<AISuggestion | null> => {
  try {
    const data = await postGemini({ action: 'identify', base64Image, lang });
    if (data) { trackUsage('identify', JSON.stringify(data), 1); return data as AISuggestion; }
    return null;
  } catch (error) {
    console.error("Identify Error:", error);
    return null;
  }
};

export const identifyPlantMulti = async (base64Images: string[], lang: 'en' | 'nl'): Promise<IdentificationResult[]> => {
  try {
    const data = await postGemini({ action: 'identifyMulti', base64Images, lang });
    if (Array.isArray(data) && data.length > 0) { trackUsage('identifyMulti', JSON.stringify(data), base64Images.length); return data as IdentificationResult[]; }
    console.warn("AI returned empty result for multi-ID.");
    return [];
  } catch (e) {
    console.error("Multi Identify Error:", e);
    return [];
  }
};

export const generateDefaultDescription = async (name: string, lang: 'en' | 'nl'): Promise<{ description: string, careInstructions: string, scientificName: string, isIndoor: boolean } | null> => {
  try {
    const data = await postGemini({ action: 'generateDescription', name, lang });
    if (data) { trackUsage('generateDescription', JSON.stringify(data), 0); return data; }
    return null;
  } catch (e) {
    console.error("Generate Description Error:", e);
    return null;
  }
};

export const searchWikiImages = async (query: string): Promise<string[]> => {
    // Wiki API does not use AI tokens
    try {
        const endpoint = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(query)}&gsrlimit=5&prop=imageinfo&iiprop=url&format=json&origin=*`;
        const res = await fetch(endpoint);
        const data = await res.json();
        const pages = data?.query?.pages;
        if (!pages) return [];
        return Object.values(pages).map((p: any) => p.imageinfo?.[0]?.url).filter(Boolean) as string[];
    } catch (e) {
        console.error("Wiki Search Error:", e);
        return [];
    }
};

export const validateImageContent = async (base64Image: string): Promise<{ allowed: boolean, reason?: string }> => {
  try {
    const data = await postGemini({ action: 'validateImageContent', base64Image });
    if (data) { trackUsage('validateImageContent', JSON.stringify(data), 1); return data; }
    return { allowed: false, reason: "Error: Validation returned empty result" };
  } catch (e) {
    console.error("Validation Error", e);
    return { allowed: false, reason: "Error: Validation failed" };
  }
};

// --- New AI Features ---

export const editImageWithAI = async (base64Image: string, promptText: string): Promise<string | null> => {
    // Placeholder: Gemini Flash currently doesn't generate images via generateContent easily without Imagen.
    // For usage logic, we assume if it worked, it would cost tokens.
    return null; 
};

export interface TransformationConfig {
    season: 'spring' | 'summer' | 'autumn' | 'winter';
    weather: 'sunny' | 'rainy' | 'windy' | 'misty' | 'hail' | 'stormy';
    time: 'morning' | 'noon' | 'sunset' | 'night';
    style: 'realistic' | 'watercolor' | 'oil' | 'sketch' | 'cyberpunk' | 'ghibli';
}

export const transformToSeason = async (base64Image: string, config: TransformationConfig): Promise<string | null> => {
   // Placeholder
   return null;
};

export const performWebSearch = async (query: string, lang: 'en' | 'nl'): Promise<{ summary: string, sources: { title: string, url: string }[] } | null> => {
  try {
    const data = await postGemini({ action: 'webSearch', query, lang });
    if (data && data.summary) { trackUsage('webSearch', data.summary, 0); return data; }
    return null;
  } catch (e) {
    console.error("Web Search Error", e);
    return null;
  }
};

export const analyzePlantHealth = async (base64Image: string, type: AnalysisType, lang: 'en' | 'nl'): Promise<AnalysisResult | null> => {
  try {
    const data = await postGemini({ action: 'analyzePlantHealth', base64Image, type, lang });
    if (data) { trackUsage('analyzePlantHealth', JSON.stringify(data), 1); return data as AnalysisResult; }
    return null;
  } catch (e) {
    console.error("Analysis Error", e);
    return null;
  }
};

export const getPlantAdvice = async (criteria: PlantAdviceFormData, lang: 'en' | 'nl'): Promise<PlantRecommendation[]> => {
  try {
    const data = await postGemini({ action: 'getPlantAdvice', criteria, lang });
    if (Array.isArray(data)) { trackUsage('getPlantAdvice', JSON.stringify(data), 0); return data as PlantRecommendation[]; }
    return [];
  } catch (e) {
    console.error("Advice Error", e);
    return [];
  }
};

// --- The Professor ---
export const askPlantProfessor = async (base64Image: string, question: string, lang: 'en' | 'nl'): Promise<string | null> => {
  try {
    const data = await postGemini({ action: 'askPlantProfessor', base64Image, question, lang });
    if (data && data.text) { trackUsage('askPlantProfessor', data.text, 1); return data.text as string; }
    return null;
  } catch (e) {
    console.error("Professor Error", e);
    return null;
  }
};

export const chatText = async (prompt: string): Promise<string> => {
  try {
    const data = await postGemini({ action: 'chat', prompt });
    const text = (data && data.text) ? data.text : "";
    trackUsage('chat', text, 0);
    return text;
  } catch (e) {
    console.error("Chat Error", e);
    return "";
  }
};
