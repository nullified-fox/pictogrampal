import { GoogleGenAI } from "@google/genai";
import Logger from "@/utilities/logger";
import GeminiAPI from "@/managers/ai/gemini";

export default class AIManager {
    public static gemini: GeminiAPI;

    public static async initialize() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            Logger.error("No Gemini API key provided! Configure the GEMINI_API_KEY environment variable.");
            throw new Error("No Gemini API key provided! Configure the GEMINI_API_KEY environment variable.");
        }

        const genAI = new GoogleGenAI({apiKey});
        this.gemini = new GeminiAPI(genAI, 'gemini-1.5-flash');
        Logger.log("SETUP", "Google Gemini API initiated", { completed: true, context: "AIManager" });
    }
}
