import {GoogleGenAI} from "@google/genai";

export type GuessTheThing = {
    emojis: string;
    thing: string;
};

export type GuessFeedback = "correct theme" | "close to the theme" | "not part of the theme";

export default class GeminiAPI {
    // Private Properties
    private readonly model: string;
    private readonly system: GoogleGenAI;

    // Constructor
    constructor(system: GoogleGenAI, model: string) {
        this.system = system;
        this.model = model;
    }
}
