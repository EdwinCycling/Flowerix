
import { GoogleGenAI, Type } from "@google/genai";
import { AISuggestion, AnalysisResult, AnalysisType, PlantAdviceFormData, PlantRecommendation, IdentificationResult } from "../types";
import { trackUsage, getActiveModelId } from "./usageService";

// Initialize Gemini client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Clean Base64 string (remove data URL header if present)
const cleanBase64 = (base64: string) => {
    // Supports jpeg, png, webp, etc.
    return base64.replace(/^data:image\/[a-z]+;base64,/, "");
};

export const identifyPlant = async (base64Image: string, lang: 'en' | 'nl'): Promise<AISuggestion | null> => {
  try {
    const prompt = `Identify this plant. Provide name, scientific name, description, care instructions, and if it is typically an indoor plant. 
    If you are unsure, provide the closest visual match. Always return a valid JSON object.
    Language: ${lang === 'nl' ? 'Dutch' : 'English'}.`;
    
    const response = await ai.models.generateContent({
      model: getActiveModelId(),
      contents: {
        parts: [
            { inlineData: { mimeType: "image/jpeg", data: cleanBase64(base64Image) } },
            { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING },
                scientificName: { type: Type.STRING },
                description: { type: Type.STRING },
                careInstructions: { type: Type.STRING },
                isIndoor: { type: Type.BOOLEAN }
            },
            required: ["name", "scientificName", "description", "careInstructions", "isIndoor"]
        }
      }
    });

    if (response.text) {
        trackUsage(prompt, response.text, 1); // 1 Image
        return JSON.parse(response.text) as AISuggestion;
    }
    return null;
  } catch (error) {
    console.error("Identify Error:", error);
    return null;
  }
};

export const identifyPlantMulti = async (base64Images: string[], lang: 'en' | 'nl'): Promise<IdentificationResult[]> => {
    try {
        const prompt = `Identify the plant in these images. Return the top 3 most likely candidates.
        IMPORTANT: You must return at least one result. If the image is unclear or you are unsure, make a best guess based on visual features (leaves, shape, color).
        
        For each candidate provide:
        1. Name (Common Name)
        2. Scientific Name
        3. Confidence (0-100)
        4. Description (General plant info)
        5. Soil & Care (Grondsoort en verzorging details)
        6. Climate (Standplaats en klimaat details)
        7. Size (Grootte, hoogte, breedte)
        8. Pruning (Snoei instructies)
        
        Language: ${lang === 'nl' ? 'Dutch' : 'English'}.`;
        
        // Explicitly construct parts array
        const imageParts = base64Images.map(img => ({
            inlineData: { mimeType: "image/jpeg", data: cleanBase64(img) }
        }));
        
        const response = await ai.models.generateContent({
            model: getActiveModelId(),
            contents: {
                parts: [
                    ...imageParts,
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            scientificName: { type: Type.STRING },
                            confidence: { type: Type.NUMBER },
                            description: { type: Type.STRING },
                            soil: { type: Type.STRING },
                            climate: { type: Type.STRING },
                            size: { type: Type.STRING },
                            pruning: { type: Type.STRING },
                        },
                        required: ["name", "scientificName", "confidence", "description", "soil", "climate", "size", "pruning"]
                    }
                }
            }
        });

        if (response.text) {
            trackUsage(prompt, response.text, base64Images.length); // Multi Image
            try {
                const parsed = JSON.parse(response.text);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            } catch (e) {
                console.error("JSON Parsing failed", e);
            }
        }
        
        console.warn("AI returned empty result for multi-ID.");
        return [];
    } catch (e) {
        console.error("Multi Identify Error:", e);
        return []; 
    }
};

export const generateDefaultDescription = async (name: string, lang: 'en' | 'nl'): Promise<{ description: string, careInstructions: string, scientificName: string, isIndoor: boolean } | null> => {
    try {
        const prompt = `Provide details for plant '${name}'. Language: ${lang === 'nl' ? 'Dutch' : 'English'}. JSON format.`;
        const response = await ai.models.generateContent({
            model: getActiveModelId(),
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        description: { type: Type.STRING },
                        careInstructions: { type: Type.STRING },
                        scientificName: { type: Type.STRING },
                        isIndoor: { type: Type.BOOLEAN }
                    },
                    required: ["description", "careInstructions", "scientificName", "isIndoor"]
                }
            }
        });
        if (response.text) {
            trackUsage(prompt, response.text, 0);
            return JSON.parse(response.text);
        }
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
        const prompt = "Is this image related to plants, gardening, nature, or landscapes? Return JSON with 'allowed' (boolean) and 'reason' (string) if false.";
        const response = await ai.models.generateContent({
            model: getActiveModelId(),
            contents: {
                parts: [
                    { inlineData: { mimeType: "image/jpeg", data: cleanBase64(base64Image) } },
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        allowed: { type: Type.BOOLEAN },
                        reason: { type: Type.STRING }
                    },
                    required: ["allowed"]
                }
            }
        });

        if (response.text) {
            trackUsage(prompt, response.text, 1);
            return JSON.parse(response.text);
        }
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
        const prompt = `Search for '${query}'. Provide a summary and sources. Language: ${lang === 'nl' ? 'Dutch' : 'English'}.`;
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview", // Force Pro for Search tool access if needed, otherwise fallback
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }]
            }
        });

        const summary = response.text || "";
        if (summary) {
            trackUsage(prompt, summary, 0);
        }

        const sources: { title: string, url: string }[] = [];
        if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
            response.candidates[0].groundingMetadata.groundingChunks.forEach((chunk: any) => {
                if (chunk.web?.uri) {
                    sources.push({
                        title: chunk.web.title || "Source",
                        url: chunk.web.uri
                    });
                }
            });
        }

        return { summary, sources };
    } catch (e) {
        console.error("Web Search Error", e);
        return null;
    }
};

export const analyzePlantHealth = async (base64Image: string, type: AnalysisType, lang: 'en' | 'nl'): Promise<AnalysisResult | null> => {
    try {
        let instruction = "";
        switch (type) {
            case 'general':
                instruction = "Analyze overall health. Look for any signs of distress, disease, or poor care. Give a general assessment.";
                break;
            case 'disease':
                instruction = "Focus ONLY on pests, diseases, fungal infections, bacteria, or viruses. Ignore abiotic factors unless they mimic disease.";
                break;
            case 'nutrition':
                instruction = "Focus ONLY on nutrient deficiencies (N, P, K, micronutrients) or toxicities (fertilizer burn). Look for leaf discoloration patterns specific to nutrition.";
                break;
            case 'stress':
                instruction = "Focus ONLY on environmental stress: water (over/under), light (too much/little), temperature (cold/heat), humidity, or transplant shock.";
                break;
            case 'growth':
                instruction = "Focus ONLY on growth habit and development. Is it leggy, stunted, or growing well? Are leaves forming correctly?";
                break;
            case 'harvest':
                instruction = "Focus ONLY on readiness for harvest. Are fruits/vegetables ripe? Is the flower ready? Provide signs of maturity.";
                break;
            case 'pruning':
                instruction = "Focus ONLY on structure and pruning needs. Are there dead branches, crossing stems, or overgrowth that needs cutting?";
                break;
            default:
                instruction = "Analyze the plant health.";
        }

        const prompt = `You are a plant expert. Analyze this image strictly focusing on the category: "${type}".
        
        Specific Instructions: ${instruction}
        
        Do NOT provide information unrelated to "${type}".
        
        Language: ${lang === 'nl' ? 'Dutch' : 'English'}.
        
        Return a valid JSON object matching the schema:
        - 'diagnosis': The main conclusion regarding ${type}.
        - 'symptoms': List of visual signs related to ${type}.
        - 'treatment': Advice or action plan specifically for ${type}.
        - 'healthy': Boolean (true if status is good/optimal for this category, false if action is needed).
        - 'confidence': Number (0-100).`;
        
        const response = await ai.models.generateContent({
            model: getActiveModelId(),
            contents: {
                parts: [
                    { inlineData: { mimeType: "image/jpeg", data: cleanBase64(base64Image) } },
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        healthy: { type: Type.BOOLEAN },
                        diagnosis: { type: Type.STRING },
                        confidence: { type: Type.NUMBER },
                        symptoms: { type: Type.ARRAY, items: { type: Type.STRING } },
                        treatment: { type: Type.STRING }
                    },
                    required: ["healthy", "diagnosis", "confidence", "symptoms", "treatment"]
                }
            }
        });

        if (response.text) {
            trackUsage(prompt, response.text, 1);
            return JSON.parse(response.text);
        }
        return null;
    } catch (e) {
        console.error("Analysis Error", e);
        return null;
    }
};

export const getPlantAdvice = async (criteria: PlantAdviceFormData, lang: 'en' | 'nl'): Promise<PlantRecommendation[]> => {
    try {
        const prompt = `Recommend 5 plants based on: ${JSON.stringify(criteria)}. Language: ${lang === 'nl' ? 'Dutch' : 'English'}. Return JSON.`;
        
        const response = await ai.models.generateContent({
            model: getActiveModelId(),
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            scientificName: { type: Type.STRING },
                            reason: { type: Type.STRING },
                            matchPercentage: { type: Type.NUMBER }
                        },
                        required: ["name", "scientificName", "reason", "matchPercentage"]
                    }
                }
            }
        });

        if (response.text) {
            trackUsage(prompt, response.text, 0);
            return JSON.parse(response.text);
        }
        return [];
    } catch (e) {
        console.error("Advice Error", e);
        return [];
    }
};

// --- The Professor ---
export const askPlantProfessor = async (base64Image: string, question: string, lang: 'en' | 'nl'): Promise<string | null> => {
    try {
        const languageName = lang === 'nl' ? 'Dutch' : 'English';
        const prompt = `You are "The Professor", a wise and extremely knowledgeable botany expert. 
        Identify the plant in the image first. Then, answer the following specific question about it: "${question}"
        
        Format the answer clearly using markdown headers and lists if necessary.
        Keep the tone educational, helpful, and professional.
        Language: ${languageName}.`;

        const response = await ai.models.generateContent({
            model: getActiveModelId(),
            contents: {
                parts: [
                    { inlineData: { mimeType: "image/jpeg", data: cleanBase64(base64Image) } },
                    { text: prompt }
                ]
            }
        });

        if (response.text) {
            trackUsage(prompt, response.text, 1);
            return response.text;
        }
        return null;
    } catch (e) {
        console.error("Professor Error", e);
        return null;
    }
};
