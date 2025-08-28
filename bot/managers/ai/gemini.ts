import {GoogleGenAI} from "@google/genai";
import Logger from "@/utilities/logger";

export type GuessTheThing = {
    emojis: string;
    thing: string;
};

export type GuessFeedback = "correct theme" | "close to the theme" | "not part of the theme";

export default class GeminiAPI {
    private readonly model: string;
    private readonly system: GoogleGenAI;

    constructor(system: GoogleGenAI, model: string) {
        this.system = system;
        this.model = model;
    }

    async generateGuessTheThing(theme: string): Promise<GuessTheThing | null> {
        try {
            const prompt = `Generate a "guess the thing" game. The theme is "${theme}". Provide a short string of emojis that represent the thing to guess, and the name of the thing itself. The thing should be a single word or a short phrase. The output should be a JSON object with two keys: "emojis" and "thing". For example: { "emojis": "🦁👑", "thing": "The Lion King" }`;

            const result = await this.system.models.generateContent({model: this.model, contents: prompt});
            const text = result.text as string;

            const jsonMatch = text.match(/```json\n(.*)\n```/s);
            const jsonString = jsonMatch ? jsonMatch[1] : text;

            return JSON.parse(jsonString) as GuessTheThing;
        } catch (error) {
            Logger.error(`Failed to generate guess the thing: ${error}`);
            return null;
        }
    }

    async generateHint(thing: string, theme: string, emojis: string): Promise<string | null> {
        try {
            const prompt = `You are a hint generator for a "guess the thing" game. The theme is "${theme}". The emojis are "${emojis}". The correct answer is "${thing}". Generate a single, short hint for the user. The hint should not reveal the answer, but should guide the user towards it. The hint should be a single sentence.`;

            const result = await this.system.models.generateContent({model: this.model, contents: prompt});
            return result.text?.trim() ?? null;
        } catch (error) {
            Logger.error(`Failed to generate hint: ${error}`);
            return null;
        }
    }

    async evaluateGuess(guess: string, answer: string, theme: string): Promise<GuessFeedback | null> {
        try {
            const prompt = `You are an evaluator for a "guess the thing" game. The theme is "${theme}". The correct answer is "${answer}". The user's guess is "${guess}". Evaluate the user's guess and provide feedback. The feedback must be one of the following strings: "correct theme", "close to the theme", or "not part of the theme".`;

            const result = await this.system.models.generateContent({model: this.model, contents: prompt});
            const text = result.text?.trim();

            if (text === "correct theme" || text === "close to the theme" || text === "not part of the theme") {
                return text as GuessFeedback;
            }

            Logger.warn(`Unexpected response from Gemini for guess evaluation: ${text}`);
            return null;
        } catch (error) {
            Logger.error(`Failed to evaluate guess: ${error}`);
            return null;
        }
    }
}


