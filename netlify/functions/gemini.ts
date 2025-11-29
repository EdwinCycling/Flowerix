import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

const cleanBase64 = (base64: string) => base64.replace(/^data:image\/[a-z]+;base64,/, "");

export const handler = async (event: any) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const SUPABASE_URL = process.env.SUPABASE_URL as string;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: "Error: Missing GEMINI_API_KEY" }) };
    }

    const ai = new GoogleGenAI({ apiKey });
    const body = event.body ? JSON.parse(event.body) : {};
    const action = body.action;
    const userId = body.userId;
    const supabase = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : null;

    const enforceUsage = async (estimatedCost: number = 100): Promise<{ allowed: boolean; tier: string; dailyLimit: number; extraTokens: number }> => {
      if (!supabase || !userId) return { allowed: true, tier: 'FREE', dailyLimit: 50000, extraTokens: 0 };
      const { data: prof } = await supabase.from('profiles').select('settings').eq('id', userId).single();
      const tier = prof?.settings?.tier || 'FREE';
      const limitMap: any = { FREE: 50000, SILVER: 250000, GOLD: 500000 };
      const dailyLimit = limitMap[tier] || 50000;
      const today = new Date().toISOString().split('T')[0];
      const { data: counter } = await supabase.from('usage_counters').select('*').eq('user_id', userId).maybeSingle();
      const dailyScore = (counter?.daily_score || 0);
      const lastDate = counter?.last_usage_date || today;
      const extraTokens = (counter?.extra_tokens || 0);
      const currentDaily = (lastDate !== today) ? 0 : dailyScore;
      const totalCapacity = dailyLimit + extraTokens;
      const allowed = (currentDaily + estimatedCost) <= totalCapacity;
      return { allowed, tier, dailyLimit, extraTokens };
    };

    const burnUsage = async (inputTokens: number, outputTokens: number, imageCount: number = 0) => {
      if (!supabase || !userId) return;
      const today = new Date().toISOString().split('T')[0];
      const { data: counter } = await supabase.from('usage_counters').select('*').eq('user_id', userId).maybeSingle();
      const lastDate = counter?.last_usage_date || today;
      const prevDaily = (lastDate !== today) ? 0 : (counter?.daily_score || 0);
      const actionScore = inputTokens + (outputTokens * 5) + (imageCount * 258);
      const newDaily = prevDaily + actionScore;
      const newTotal = (counter?.total_score || 0) + actionScore;
      let extra = counter?.extra_tokens || 0;
      const limitMap: any = { FREE: 50000, SILVER: 250000, GOLD: 500000 };
      const tier = (await supabase.from('profiles').select('settings').eq('id', userId).single()).data?.settings?.tier || 'FREE';
      const dailyLimit = limitMap[tier] || 50000;
      if (newDaily > dailyLimit && extra > 0) {
        const overage = newDaily - dailyLimit;
        extra = Math.max(0, extra - overage);
      }
      await supabase.from('usage_counters').upsert({
        user_id: userId,
        daily_score: newDaily,
        total_score: newTotal,
        last_usage_date: today,
        input_tokens: (counter?.input_tokens || 0) + inputTokens,
        output_tokens: (counter?.output_tokens || 0) + outputTokens,
        images_scanned: (counter?.images_scanned || 0) + imageCount,
        extra_tokens: extra
      }, { onConflict: 'user_id' });
    };
    const lang = body.lang === "nl" ? "nl" : "en";

    const getModelForTier = (tier: string) => {
      switch (tier) {
        case 'GOLD':
        case 'DIAMOND':
          return "gemini-2.5-pro"; 
        case 'SILVER':
          return "gemini-2.5-flash-lite";
        case 'FREE':
        default:
          return "gemini-2.0-flash-lite";
      }
    };

    if (action === "identify") {
      const quota = await enforceUsage(1000);
      if (!quota.allowed) return { statusCode: 429, body: JSON.stringify({ error: "Error: Usage limit exceeded" }) };
      
      const modelId = getModelForTier(quota.tier);
      const base64Image = String(body.base64Image || "");
      const prompt = `Identify this plant. Provide name, scientific name, description, care instructions, and if it is typically an indoor plant. If you are unsure, provide the closest visual match. Always return a valid JSON object. Language: ${lang === "nl" ? "Dutch" : "English"}.`;
      const response = await ai.models.generateContent({
        model: modelId, 
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
      const text = response.text || "null";
      if (text !== "null") await burnUsage(1000, text.length / 4, 1);
      return { statusCode: 200, body: text };
    }

    if (action === "identifyMulti") {
      const quota = await enforceUsage(2000);
      if (!quota.allowed) return { statusCode: 429, body: JSON.stringify({ error: "Error: Usage limit exceeded" }) };
      
      const modelId = getModelForTier(quota.tier);
      const base64Images: string[] = Array.isArray(body.base64Images) ? body.base64Images : [];
      const prompt = `Identify the plant in these images. Return the top 3 most likely candidates. IMPORTANT: You must return at least one result. If the image is unclear or you are unsure, make a best guess based on visual features (leaves, shape, color). For each candidate provide: 1. Name 2. Scientific Name 3. Confidence (0-100) 4. Description 5. Soil & Care 6. Climate 7. Size 8. Pruning. Language: ${lang === "nl" ? "Dutch" : "English"}.`;
      const imageParts = base64Images.map(img => ({ inlineData: { mimeType: "image/jpeg", data: cleanBase64(img) } }));
      const response = await ai.models.generateContent({
        model: modelId,
        contents: { parts: [...imageParts, { text: prompt }] },
        config: {
          responseMimeType: "application/json",
          responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
            name: { type: Type.STRING }, scientificName: { type: Type.STRING }, confidence: { type: Type.NUMBER }, description: { type: Type.STRING }, soil: { type: Type.STRING }, climate: { type: Type.STRING }, size: { type: Type.STRING }, pruning: { type: Type.STRING }
          }, required: ["name", "scientificName", "confidence", "description", "soil", "climate", "size", "pruning"] } }
        }
      });
      const text = response.text || "[]";
      if (text !== "[]") await burnUsage(2000, text.length / 4, (Array.isArray(body.base64Images) ? body.base64Images.length : 0));
      return { statusCode: 200, body: text };
    }

    if (action === "generateDescription") {
      const quota = await enforceUsage(500);
      if (!quota.allowed) return { statusCode: 429, body: JSON.stringify({ error: "Error: Usage limit exceeded" }) };
      
      const modelId = getModelForTier(quota.tier);
      const name = String(body.name || "");
      const prompt = `Provide details for plant '${name}'. Language: ${lang === "nl" ? "Dutch" : "English"}. JSON format.`;
      const response = await ai.models.generateContent({
        model: modelId,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: { type: Type.OBJECT, properties: {
            description: { type: Type.STRING }, careInstructions: { type: Type.STRING }, scientificName: { type: Type.STRING }, isIndoor: { type: Type.BOOLEAN }
          }, required: ["description", "careInstructions", "scientificName", "isIndoor"] }
        }
      });
      const text = response.text || "null";
      if (text !== "null") await burnUsage(500, text.length / 4, 0);
      return { statusCode: 200, body: text };
    }

    if (action === "validateImageContent") {
      const quota = await enforceUsage(300);
      if (!quota.allowed) return { statusCode: 429, body: JSON.stringify({ error: "Error: Usage limit exceeded" }) };
      const base64Image = String(body.base64Image || "");
      const prompt = "Is this image related to plants, gardening, nature, or landscapes? Return JSON with 'allowed' (boolean) and 'reason' (string) if false.";
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: { parts: [ { inlineData: { mimeType: "image/jpeg", data: cleanBase64(base64Image) } }, { text: prompt } ] },
        config: {
          responseMimeType: "application/json",
          responseSchema: { type: Type.OBJECT, properties: { allowed: { type: Type.BOOLEAN }, reason: { type: Type.STRING } }, required: ["allowed"] }
        }
      });
      const text = response.text || JSON.stringify({ allowed: false, reason: "Error: Validation returned empty result" });
      await burnUsage(300, text.length / 4, 1);
      return { statusCode: 200, body: text };
    }

    if (action === "analyzePlantHealth") {
      const quota = await enforceUsage(1500);
      if (!quota.allowed) return { statusCode: 429, body: JSON.stringify({ error: "Error: Usage limit exceeded" }) };
      
      const modelId = getModelForTier(quota.tier);
      const base64Image = String(body.base64Image || "");
      const type = String(body.type || "general");
      const instructionMap: Record<string, string> = {
        general: "Analyze overall health. Look for any signs of distress, disease, or poor care.",
        disease: "Focus ONLY on pests, diseases, fungal infections, bacteria, or viruses.",
        nutrition: "Focus ONLY on nutrient deficiencies or toxicities.",
        stress: "Focus ONLY on environmental stress: water, light, temperature, humidity, transplant shock.",
        growth: "Focus ONLY on growth habit and development.",
        harvest: "Focus ONLY on readiness for harvest.",
        pruning: "Focus ONLY on structure and pruning needs."
      };
      const instruction = instructionMap[type] || instructionMap.general;
      const prompt = `You are a plant expert. Analyze this image strictly focusing on the category: "${type}". Specific Instructions: ${instruction}. Do NOT provide information unrelated to "${type}". Language: ${lang === 'nl' ? 'Dutch' : 'English'}. Return a valid JSON.`;
      const response = await ai.models.generateContent({
        model: modelId,
        contents: { parts: [ { inlineData: { mimeType: "image/jpeg", data: cleanBase64(base64Image) } }, { text: prompt } ] },
        config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { healthy: { type: Type.BOOLEAN }, diagnosis: { type: Type.STRING }, confidence: { type: Type.NUMBER }, symptoms: { type: Type.ARRAY, items: { type: Type.STRING } }, treatment: { type: Type.STRING } }, required: ["healthy", "diagnosis", "confidence", "symptoms", "treatment"] } }
      });
      const text = response.text || "null";
      if (text !== "null") await burnUsage(1500, text.length / 4, 1);
      return { statusCode: 200, body: text };
    }

    if (action === "getPlantAdvice") {
      const quota = await enforceUsage(800);
      if (!quota.allowed) return { statusCode: 429, body: JSON.stringify({ error: "Error: Usage limit exceeded" }) };
      
      const modelId = getModelForTier(quota.tier);
      const criteria = body.criteria || {};
      const prompt = `Recommend 5 plants based on: ${JSON.stringify(criteria)}. Language: ${lang === 'nl' ? 'Dutch' : 'English'}. Return JSON.`;
      const response = await ai.models.generateContent({
        model: modelId,
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, scientificName: { type: Type.STRING }, reason: { type: Type.STRING }, matchPercentage: { type: Type.NUMBER } }, required: ["name", "scientificName", "reason", "matchPercentage"] } } }
      });
      const text = response.text || "[]";
      await burnUsage(800, text.length / 4, 0);
      return { statusCode: 200, body: text };
    }

    if (action === "askPlantProfessor") {
      const quota = await enforceUsage(600);
      if (!quota.allowed) return { statusCode: 429, body: JSON.stringify({ error: "Error: Usage limit exceeded" }) };
      
      const modelId = getModelForTier(quota.tier);
      const base64Image = String(body.base64Image || "");
      const question = String(body.question || "");
      const languageName = lang === 'nl' ? 'Dutch' : 'English';
      const prompt = `You are "The Professor". Identify the plant, then answer: "${question}". Use clear formatting. Language: ${languageName}.`;
      const response = await ai.models.generateContent({
        model: modelId,
        contents: { parts: [ { inlineData: { mimeType: "image/jpeg", data: cleanBase64(base64Image) } }, { text: prompt } ] }
      });
      const text = response.text || "";
      await burnUsage(600, text.length / 4, 1);
      return { statusCode: 200, body: JSON.stringify({ text }) };
    }

    if (action === "webSearch") {
      const quota = await enforceUsage(400);
      if (!quota.allowed) return { statusCode: 429, body: JSON.stringify({ error: "Error: Usage limit exceeded" }) };
      const query = String(body.query || "");
      const prompt = `Search for '${query}'. Provide a summary and sources. Language: ${lang === 'nl' ? 'Dutch' : 'English'}.`;
      const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] }
      });
      const summary = response.text || "";
      const sources: { title: string, url: string }[] = [];
      if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        response.candidates[0].groundingMetadata.groundingChunks.forEach((chunk: any) => {
          if (chunk.web?.uri) {
            sources.push({ title: chunk.web.title || "Source", url: chunk.web.uri });
          }
        });
      }
      await burnUsage(400, (summary || '').length / 4, 0);
      return { statusCode: 200, body: JSON.stringify({ summary, sources }) };
    }

    if (action === "chat") {
      const quota = await enforceUsage(400);
      if (!quota.allowed) return { statusCode: 429, body: JSON.stringify({ error: "Error: Usage limit exceeded" }) };
      
      const modelId = getModelForTier(quota.tier);
      const prompt = String(body.prompt || "");
      const response = await ai.models.generateContent({
        model: modelId,
        contents: { parts: [{ text: prompt }] }
      });
      const text = response.text || "";
      await burnUsage(400, text.length / 4, 0);
      return { statusCode: 200, body: JSON.stringify({ text }) };
    }

    return { statusCode: 400, body: JSON.stringify({ error: "Error: Unknown action" }) };
  } catch (e: any) {
    return { statusCode: 500, body: JSON.stringify({ error: `Error: ${e?.message || "Server failure"}` }) };
  }
};

