import { GoogleGenAI } from "@google/genai";
import { GEMINI_API_KEY } from "@/utilities/constants";
import Logger from "@/utilities/logger";
import GeminiAPI from "@/managers/ai/gemini";

export default class AIManager {
    public static gemini: GeminiAPI;

    public static async initialize() {
        if (!GEMINI_API_KEY) {
            Logger.error("No Gemini API key provided! Configure the GEMINI_API_KEY environment variable.");
            throw new Error("No Gemini API key provided! Configure the GEMINI_API_KEY environment variable.");
        }

        const genAI = new GoogleGenAI({apiKey: GEMINI_API_KEY});
        this.gemini = new GeminiAPI(genAI, 'gemini-1.5-flash');
        Logger.log("SETUP", "Google Gemini API initiated", { completed: true, context: "AIManager" });
    }
}
