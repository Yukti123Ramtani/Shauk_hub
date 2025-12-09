import { GoogleGenAI } from "@google/genai";
import { Message } from "../types";

let ai: GoogleGenAI | null = null;

const getAI = () => {
  if (!ai && process.env.API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return ai;
};

// Returns true if content is safe, false if blocked
export const moderateContent = async (text: string): Promise<{ safe: boolean; reason?: string }> => {
  const client = getAI();
  if (!client) return { safe: true }; // Allow if no API key (dev mode)

  try {
    const model = "gemini-2.5-flash";
    const prompt = `
      You are a content moderator for a hobby chat app. 
      Strictly block any content related to:
      1. Religion (Islam, Christianity, Hinduism, God, etc.)
      2. Politics
      3. Hate speech or harassment

      Input text: "${text}"

      Respond in JSON format:
      {
        "safe": boolean,
        "reason": "string (short explanation if unsafe, null if safe)"
      }
    `;

    const response = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const result = JSON.parse(response.text || "{}");
    return {
      safe: result.safe,
      reason: result.reason
    };

  } catch (error) {
    console.error("Moderation error:", error);
    // Fail open or closed depending on policy. For this demo, fail open but log.
    return { safe: true }; 
  }
};

export const generateBotReply = async (hobby: string, chatHistory: Message[]): Promise<string> => {
  const client = getAI();
  if (!client) return "";

  try {
    const model = "gemini-2.5-flash";
    // Convert last 5 messages to a simple string format
    const context = chatHistory.slice(-5).map(m => `${m.username}: ${m.text}`).join("\n");

    const prompt = `
      You are a friendly, enthusiastic member of a ${hobby} hobby group chat.
      Read the recent chat history and provide a short, relevant, and engaging response as if you are another member named "HobbyBot".
      Do not be repetitive. Keep it under 2 sentences.
      
      Chat History:
      ${context}
    `;

    const response = await client.models.generateContent({
      model,
      contents: prompt,
    });

    return response.text || "";

  } catch (error) {
    console.error("Bot generation error:", error);
    return "";
  }
};