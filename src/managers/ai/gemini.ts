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
}


