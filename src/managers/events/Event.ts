import {ClientEvents, Events} from "discord.js";
import Boolean from "@/structures/Boolean";

export default abstract class Event {
    // Constructor
    protected constructor(
        public readonly event: Extract<Events, keyof ClientEvents>,
        public readonly options?: { once: Boolean }
    ) {
    }

    // Public Methods
    public abstract execute(...args: unknown[]): Promise<void> | void;
}