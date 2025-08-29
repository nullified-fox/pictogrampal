import path from "path";
import fs from "fs";
import {captureException} from "@sentry/bun";
import EventListener from "@/managers/events/Event";
import {client} from "@/client";
import Logger from "@/utilities/logger";

/**
 * Manages the bot's event listeners.
 * This class is responsible for dynamically loading and attaching event handlers to the discord.
 */
export default class EventManager {
    /**
     * Loads all event listener files from the `bot/events` directory and attaches them to the discord.
     * It distinguishes between regular and once-only events based on the listener's options.
     */
    public static async mount(): Promise<void> {
        const dirPath = path.resolve("src/events")

        if (!fs.existsSync(dirPath)) {
            return;
        }

        const fileNames = fs.readdirSync(dirPath);
        let count = 0;

        try {
            for (const name of fileNames) {
                const filePath = path.resolve(dirPath, name);

                // Import and initiate the event listener
                const listenerModule = await import(filePath).catch(captureException);
                const listenerClass = listenerModule.default;
                const listener = new listenerClass();

                if (!(listener instanceof EventListener)) {
                    continue;
                }

                const logMessage = `Mounted event ${listener.event}`;

                // Attach the listener to the discord, either as a persistent or a one-time event.
                if (listener.options?.once) {
                    client.once(listener.event, (...args: unknown[]) => listener.execute(...args));
                } else {
                    client.on(listener.event, (...args: unknown[]) => listener.execute(...args));
                }

                Logger.log("SETUP", `Mounted event handler for: \`${listener.event}\``, {
                    completed: true,
                    context: `Event`
                });

                count++;
            }
        } catch (e) {
            captureException(e);
        }
    }
}