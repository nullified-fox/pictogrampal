import {ClientEvents, Events} from "discord.js";
import Boolean from "@/methods/Boolean";

export default abstract class Event {
    protected constructor(
        public readonly event: Extract<Events, keyof ClientEvents>,
        public readonly options?: { once: Boolean }
    ) {
    }

    abstract execute(...args: unknown[]): Promise<void> | void;
}