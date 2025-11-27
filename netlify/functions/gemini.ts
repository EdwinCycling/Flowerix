import { GoogleGenAI, Type } from "@google/genai";

const cleanBase64 = (base64: string) => base64.replace(/^data:image\/[a-z]+;base64,/, "");

export const handler = async (event: any) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: "Error: Missing GEMINI_API_KEY" }) };
    }

    const ai = new GoogleGenAI({ apiKey });
    const body = event.body ? JSON.parse(event.body) : {};
    const action = body.action;
    const lang = body.lang === "nl" ? "nl" : "en";

    if (action === "identify") {
      const base64Image = String(body.base64Image || "");
      const prompt = `Identify this plant. Provide name, scientific name, description, care instructions, and if it is typically an indoor plant. If you are unsure, provide the closest visual match. Always return a valid JSON object. Language: ${lang === "nl" ? "Dutch" : "English"}.`;
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-lite", // fallback; client decides active model if needed later
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
      return { statusCode: 200, body: response.text || "null" };
    }

    if (action === "identifyMulti") {
      const base64Images: string[] = Array.isArray(body.base64Images) ? body.base64Images : [];
      const prompt = `Identify the plant in these images. Return the top 3 most likely candidates. IMPORTANT: You must return at least one result. If the image is unclear or you are unsure, make a best guess based on visual features (leaves, shape, color). For each candidate provide: 1. Name 2. Scientific Name 3. Confidence (0-100) 4. Description 5. Soil & Care 6. Climate 7. Size 8. Pruning. Language: ${lang === "nl" ? "Dutch" : "English"}.`;
      const imageParts = base64Images.map(img => ({ inlineData: { mimeType: "image/jpeg", data: cleanBase64(img) } }));
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-lite",
        contents: { parts: [...imageParts, { text: prompt }] },
        config: {
          responseMimeType: "application/json",
          responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
            name: { type: Type.STRING }, scientificName: { type: Type.STRING }, confidence: { type: Type.NUMBER }, description: { type: Type.STRING }, soil: { type: Type.STRING }, climate: { type: Type.STRING }, size: { type: Type.STRING }, pruning: { type: Type.STRING }
          }, required: ["name", "scientificName", "confidence", "description", "soil", "climate", "size", "pruning"] } }
        }
      });
      return { statusCode: 200, body: response.text || "[]" };
    }

    if (action === "generateDescription") {
      const name = String(body.name || "");
      const prompt = `Provide details for plant '${name}'. Language: ${lang === "nl" ? "Dutch" : "English"}. JSON format.`;
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-lite",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: { type: Type.OBJECT, properties: {
            description: { type: Type.STRING }, careInstructions: { type: Type.STRING }, scientificName: { type: Type.STRING }, isIndoor: { type: Type.BOOLEAN }
          }, required: ["description", "careInstructions", "scientificName", "isIndoor"] }
        }
      });
      return { statusCode: 200, body: response.text || "null" };
    }

    if (action === "validateImageContent") {
      const base64Image = String(body.base64Image || "");
      const prompt = "Is this image related to plants, gardening, nature, or landscapes? Return JSON with 'allowed' (boolean) and 'reason' (string) if false.";
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-lite",
        contents: { parts: [ { inlineData: { mimeType: "image/jpeg", data: cleanBase64(base64Image) } }, { text: prompt } ] },
        config: {
          responseMimeType: "application/json",
          responseSchema: { type: Type.OBJECT, properties: { allowed: { type: Type.BOOLEAN }, reason: { type: Type.STRING } }, required: ["allowed"] }
        }
      });
      return { statusCode: 200, body: response.text || JSON.stringify({ allowed: false, reason: "Error: Validation returned empty result" }) };
    }

    if (action === "analyzePlantHealth") {
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
        model: "gemini-2.0-flash-lite",
        contents: { parts: [ { inlineData: { mimeType: "image/jpeg", data: cleanBase64(base64Image) } }, { text: prompt } ] },
        config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { healthy: { type: Type.BOOLEAN }, diagnosis: { type: Type.STRING }, confidence: { type: Type.NUMBER }, symptoms: { type: Type.ARRAY, items: { type: Type.STRING } }, treatment: { type: Type.STRING } }, required: ["healthy", "diagnosis", "confidence", "symptoms", "treatment"] } }
      });
      return { statusCode: 200, body: response.text || "null" };
    }

    if (action === "getPlantAdvice") {
      const criteria = body.criteria || {};
      const prompt = `Recommend 5 plants based on: ${JSON.stringify(criteria)}. Language: ${lang === 'nl' ? 'Dutch' : 'English'}. Return JSON.`;
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-lite",
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, scientificName: { type: Type.STRING }, reason: { type: Type.STRING }, matchPercentage: { type: Type.NUMBER } }, required: ["name", "scientificName", "reason", "matchPercentage"] } } }
      });
      return { statusCode: 200, body: response.text || "[]" };
    }

    if (action === "askPlantProfessor") {
      const base64Image = String(body.base64Image || "");
      const question = String(body.question || "");
      const languageName = lang === 'nl' ? 'Dutch' : 'English';
      const prompt = `You are "The Professor". Identify the plant, then answer: "${question}". Use clear formatting. Language: ${languageName}.`;
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-lite",
        contents: { parts: [ { inlineData: { mimeType: "image/jpeg", data: cleanBase64(base64Image) } }, { text: prompt } ] }
      });
      const text = response.text || "";
      return { statusCode: 200, body: JSON.stringify({ text }) };
    }

    if (action === "webSearch") {
      const query = String(body.query || "");
      const prompt = `Search for '${query}'. Provide a summary and sources. Language: ${lang === 'nl' ? 'Dutch' : 'English'}.`;
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
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
      return { statusCode: 200, body: JSON.stringify({ summary, sources }) };
    }

    if (action === "chat") {
      const prompt = String(body.prompt || "");
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts: [{ text: prompt }] }
      });
      const text = response.text || "";
      return { statusCode: 200, body: JSON.stringify({ text }) };
    }

    return { statusCode: 400, body: JSON.stringify({ error: "Error: Unknown action" }) };
  } catch (e: any) {
    return { statusCode: 500, body: JSON.stringify({ error: `Error: ${e?.message || "Server failure"}` }) };
  }
};

