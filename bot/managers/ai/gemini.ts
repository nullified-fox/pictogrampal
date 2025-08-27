import {GoogleGenerativeAI} from "@google/generative-ai";
import {GEMINI_API_KEY} from "@/utilities/constants";
import Logger from "@/utilities/logger";

if (!GEMINI_API_KEY) {
    Logger.error("No Gemini API key provided! Configure the GEMINI_API_KEY environment variable.");
    throw new Error("No Gemini API key provided! Configure the GEMINI_API_KEY environment variable.");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export type GuessTheThing = {
    emojis: string;
    thing: string;
};

export async function generateGuessTheThing(theme: string): Promise<GuessTheThing | null> {
    try {
        const model = genAI.getGenerativeModel({model: "gemini-pro"});

        const prompt = `Generate a "guess the thing" game. The theme is "${theme}". Provide a short string of emojis that represent the thing to guess, and the name of the thing itself. The thing should be a single word or a short phrase. The output should be a JSON object with two keys: "emojis" and "thing". For example: { "emojis": "🦁👑", "thing": "The Lion King" }`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // The response might be in a markdown block, so I need to extract the JSON.
        const jsonMatch = text.match(/```json\n(.*)\n```/s);
        const jsonString = jsonMatch ? jsonMatch[1] : text;

        const parsed = JSON.parse(jsonString) as GuessTheThing;
        return parsed;

    } catch (error) {
        Logger.error("Failed to generate guess the thing:", error as string);
        return null;
    }
}

export type GuessFeedback = "correct theme" | "close to the theme" | "not part of the theme";

export async function evaluateGuess(guess: string, answer: string, theme: string): Promise<GuessFeedback | null> {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const prompt = `You are an evaluator for a "guess the thing" game. The theme is "${theme}". The correct answer is "${answer}". The user's guess is "${guess}". Evaluate the user's guess and provide feedback. The feedback must be one of the following strings: "correct theme", "close to the theme", or "not part of the theme".`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim();

        if (text === "correct theme" || text === "close to the theme" || text === "not part of the theme") {
            return text as GuessFeedback;
        }

        Logger.warn(`Unexpected response from Gemini for guess evaluation: ${text}`);
        return null;

    } catch (error) {
        Logger.error("Failed to evaluate guess:", error as string);
        return null;
    }
}
