import {Client, Events, Options} from "discord.js";
import {captureException, init as initSentry} from "@sentry/bun";

import {APP_CLIENT_INTENTS, APP_CLIENT_PARTIALS, EXIT_EVENTS} from "@/utilities/constants"
import process from "node:process";
import Logger from "@/utilities/logger";
import {startCleanupOperations} from "@/utilities";
import ComponentManager from "@/managers/component/ComponentManager";
import CommandManager from "@/managers/commands/CommandManager";
import EventManager from "@/managers/events/EventManager";

// --- Initialize Sentry for error tracking ---
if (!process.env.SENTRY_DSN) {
    Logger.error("No Sentry DSN provided! Configure the SENTRY_DSN environment variable.");
    throw new Error("No Sentry DSN provided! Configure the SENTRY_DSN environment variable.")
}
initSentry({
    dsn: process.env.SENTRY_DSN,
});

import DatabaseManager from "@/managers/database/DatabaseManager";

/**
 * --- Main Discord Client Instance ---
 * This is the main instance of the Discord Client.
 * It is configured with specific intents, partials, and cache settings.
 */
export const client: Client<true> = new Client({
    intents: APP_CLIENT_INTENTS,
    partials: APP_CLIENT_PARTIALS,
    presence: {status: "idle"},
    makeCache: Options.cacheWithLimits({
        ...Options.DefaultMakeCacheSettings,

        // [?] Limit messages cached per channel
        MessageManager: 50,

        // [?] Enable/Disable emoji cache
        BaseGuildEmojiManager: 0, // Has been set to disable, will not be using Custom Emojis at this time

        // [?] Enable/Disable presence cache
        PresenceManager: 0, // Has been set to disable, not necessary to be caching user activities

        // [?] Configures member caching
        GuildMemberManager: {
            // discord needs to be able to access member data without fail
            maxSize: 200, // Maximum number of members to cache *per guild*
            keepOverLimit: member => member.id === client.user?.id, // discord will always remain cached regardless of over-limit boundaries
        },

        UserManager: {
            // discord may need access to Users globally
            maxSize: 1000,
        }
    })
});

/**
 * --- Graceful Shutdown ---
 * This section handles the graceful shutdown of the application.
 * It listens for specific process events and triggers cleanup operations.
 */
EXIT_EVENTS.forEach(event => {
    process.once(event, async () => {
        await startCleanupOperations(event);
    });
})

/**
 * Initializes the services required for the bot to operate.
 * This includes caching components and commands.
 */
async function initializeServices(): Promise<void> {
    Logger.log("SETUP", "Configuring services...", {context: "Process"});
    await ComponentManager.cache();
    await CommandManager.cache();
    Logger.log("SETUP", "Services configured successfully", {completed: true, context: "Process"});
}

/**
 * Logs the discord in to Discord.
 * It also performs post-login operations like caching guild configs, mounting events, and publishing commands.
 */
async function login(): Promise<void> {
    if (!process.env.BOT_TOKEN) {
        Logger.error("No token provided! Configure the BOT_TOKEN environment variable.");
        throw new Error("No token provided! Configure the BOT_TOKEN environment variable.");
    }

    Logger.log("SETUP", "Attempting to login to Discord...", {context: "Process"});
    await client.login(process.env.BOT_TOKEN);
    Logger.log("SETUP", "Login successful.", {completed: true, context: "Process"});

    // NOTE: These actions are dependent on the discord being logged in.
    // DO NOT REMOVE THESE!
    await EventManager.mount();
    await CommandManager.publish();

    client.emit(Events.ClientReady, client);
}

/**
 * Main entry point for this application.
 * It initializes services and logs the discord in.
 */
async function main(): Promise<void> {
    await initializeServices();
    try {
        await DatabaseManager.connect();
    } catch (e) {
        // The DatabaseManager will log the error and start the reconnection process.
        // We don't need to do anything here, the bot can start without a database connection.
    }
    await login();
}

// --- Start the bot, but not in a test environment ---
if (process.env.NODE_ENV !== "test") {
    main().catch(error => {
        const sentryId = captureException(error);
        Logger.error(`An unhandled error occurred: ${sentryId}`);
        if (error instanceof Error) {
            Logger.error(error.message);
        }
        process.exit(1);
    });
}