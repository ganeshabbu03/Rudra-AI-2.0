import { GoogleGenAI, Modality, Type } from "@google/genai";

// Helper to get AI instance (re-instantiate to pick up fresh keys if selection happens)
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- MAPS GROUNDING ---
export const queryMaps = async (query: string, userLocation?: { lat: number, lng: number }) => {
  const ai = getAI();
  const toolConfig = userLocation ? {
    retrievalConfig: {
      latLng: {
        latitude: userLocation.lat,
        longitude: userLocation.lng
      }
    }
  } : undefined;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: query,
    config: {
      tools: [{ googleMaps: {} }],
      toolConfig: toolConfig
    },
  });

  return {
    text: response.text,
    chunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks
  };
};

// --- VEO VIDEO GENERATION ---
export const generateVeoVideo = async (prompt: string, imageBase64?: string) => {
  // Ensure API Key Selection for Veo
  if ((window as any).aistudio) {
    const hasKey = await (window as any).aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await (window as any).aistudio.openSelectKey();
    }
  }
  
  // Re-instantiate AI after potential key selection to ensure it uses the correct context
  const aiFresh = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let operation;

  if (imageBase64) {
    operation = await aiFresh.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt || "Animated video",
      image: {
        imageBytes: imageBase64,
        mimeType: 'image/png', 
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });
  } else {
    operation = await aiFresh.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });
  }

  // Polling
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await aiFresh.operations.getVideosOperation({ operation: operation });
  }

  const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!videoUri) throw new Error("No video URI returned");

  // Fetch actual bytes using the key
  const vidResponse = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
  const vidBlob = await vidResponse.blob();
  return URL.createObjectURL(vidBlob);
};

// --- VISION (Image/Video Analysis) ---
export const analyzeMedia = async (fileBase64: string, mimeType: string, prompt: string, isVideo: boolean = false) => {
  const ai = getAI();
  // Use Gemini 3 Pro for deep analysis
  const model = "gemini-3-pro-preview";
  
  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        {
          inlineData: {
            mimeType,
            data: fileBase64
          }
        },
        { text: prompt || (isVideo ? "Analyze this video in detail." : "Analyze this image.") }
      ]
    }
  });
  return response.text;
};

// --- THINKING MODE ---
export const thinkingChat = async (prompt: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: {
      thinkingConfig: { thinkingBudget: 32768 } // Max for 3 Pro
    }
  });
  return response.text;
};

// --- IMAGE EDITING (Flash Image / Nano Banana) ---
export const editImage = async (imageBase64: string, prompt: string) => {
  const ai = getAI();
  // Use 2.5 Flash Image for editing/generation
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          inlineData: {
            data: imageBase64,
            mimeType: 'image/png', 
          },
        },
        {
          text: prompt,
        },
      ],
    },
  });

  // Extract image
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image generated");
};

// --- TTS ---
export const generateSpeech = async (text: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("No audio generated");
  
  return base64Audio; 
};

// --- TRANSCRIBE ---
export const transcribeAudio = async (audioBase64: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: {
      parts: [
        {
            inlineData: {
                mimeType: "audio/wav", 
                data: audioBase64
            }
        },
        { text: "Transcribe this audio exactly." }
      ]
    }
  });
  return response.text;
};

// --- FAST CHAT ---
export const fastChat = async (prompt: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents: prompt
  });
  return response.text;
}