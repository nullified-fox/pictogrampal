import {GoogleGenAI, HarmBlockThreshold, HarmCategory, SafetySetting} from "@google/genai";
import Logger from "@/utilities/logger";

export type GuessThePuzzle = {
    emojis: string;
    answer: string;
};

export type GuessFeedback = "correct theme" | "close to the theme" | "not part of the theme";

export default class GeminiAPI {
    // Private Properties
    private readonly model: string;
    private readonly system: GoogleGenAI;
    private readonly safetySettings: SafetySetting[];

    // Constructor
    constructor(system: GoogleGenAI, model: string) {
        this.system = system;
        this.model = model;

        // Defines the safety settings for the generative AI responses
        this.safetySettings = [
            {
                category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
            {
                category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
            {
                category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
            {
                category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
        ]
    }

    // Public Methods

    public async generatePuzzle(theme: string): Promise<GuessThePuzzle | null> {
        try {
            const prompt = `Generate a "guess the puzzle" game object based on the theme: "${theme}". The object should be in JSON format with two keys: "emojis" (a string of emojis) and "answer" (a string).`;

            const result = await this.system.models.generateContent({
                model: this.model,
                contents: prompt,
                config: {safetySettings: this.safetySettings}
            });

            const text = result.text?.trim() as string;

            const jsonMatch = text?.match(/```json\n(.*)\n```/s);
            const jsonString = jsonMatch ? jsonMatch[1] : text;

            return JSON.parse(jsonString) as GuessThePuzzle;
        } catch (exceptionStack) {
            // @ts-ignore
            if (exceptionStack.message.includes('[GoogleGenerativeAI Error]: Content blocked')) {
                 Logger.warn(`Puzzle generation was blocked for safety reasons on theme: "${theme}".`);
            } else {
                 Logger.error(`Failed to generate a puzzle: ${exceptionStack}`);
            }
            return null;
        }
    }

    public async generateHint(answer: string, theme: string, emojis: string): Promise<string | null> {
        try {
            const prompt = `Generate a short hint for a puzzle. Theme: "${theme}", Answer: "${answer}", Emojis: "${emojis}".`;

            const result = await this.system.models.generateContent({
                model: this.model,
                contents: prompt,
                config: {safetySettings: this.safetySettings},
            });

            return result.text?.trim() ?? null;
        } catch (exceptionStack) {
            Logger.error(`Failed to generate hint: ${exceptionStack}`);
            return null;
        }
    }

    public async evaluateGuess(guess: string, answer: string, theme: string): Promise<GuessFeedback | null> {
        try {
            const prompt = `You are an evaluator for a "guess the thing" game. The theme is "${theme}". The correct answer is "${answer}". The user's guess is "${guess}". Evaluate the user's guess and provide feedback. The feedback must be one of the following strings: "correct theme", "close to the theme", or "not part of the theme".`;

            const result = await this.system.models.generateContent({model: this.model, contents: prompt, config: {safetySettings: this.safetySettings}});
            const text = result.text?.trim();

            if (text === "correct theme" || text === "close to the theme" || text === "not part of the theme") {
                return text as GuessFeedback;
            }

            Logger.warn(`Unexpected response from Gemini for guess evaluation: ${text}`);
            return null;
        } catch (exceptionStack) {
            // @ts-ignore
            if (exceptionStack.message.includes('[GoogleGenerativeAI Error]: Content blocked')) {
                Logger.warn(`A user guess was blocked for safety reasons: "${guess}"`);
            } else {
                Logger.error(`Failed to evaluate guess: ${exceptionStack}`);
            }
            return null;
        }
    }

}
