import {AutocompleteInteraction, Collection, CommandInteraction, MessageFlags, Snowflake} from "discord.js";
import GuildCommand from "@/managers/commands/GuildCommand";
import path from "path";
import fs from "fs";
import Logger from "@/utilities/logger";
import {client} from "@/client";
import {pluralize} from "@/utilities";
import Command from "@/managers/commands/Command";
import {captureException} from "@sentry/bun";
import {InteractionReplyData} from "@/utilities/types";

/**
 * Manages the application's slash commands.
 * This includes caching, publishing, reloading, and handling command interactions.
 */
export default class CommandManager {
    /**
     * A collection of global commands, accessible in all guilds.
     * Keyed by the command name.
     */
    private static readonly globalCommands = new Collection<string, Command<CommandInteraction>>();

    /**
     * A collection of guild-specific commands.
     * The outer key is the guild ID, and the inner collection is keyed by the command name.
     */
    private static readonly guildCommands = new Collection<string, Collection<string, GuildCommand<CommandInteraction>>>();

    /**
     * Retrieves a collection of all commands applicable in a given guild context.
     * @param guildId The ID of the guild.
     * @returns A collection of commands.
     */
    static getCommands(guildId: Snowflake | null): Collection<string, Command<CommandInteraction>> {
        const guildCommands = guildId ? this.guildCommands.get(guildId) ?? new Collection() : new Collection();
        // Combine global commands with the specific guild's commands
        // @ts-ignore
        return this.globalCommands.clone().concat(guildCommands);
    }

    /**
     * Caches all command files from the `bot/interactions/commands` directory.
     * It dynamically imports command modules, instantiates them, and sorts them into
     * global or guild-specific collections.
     */
    static async cache(): Promise<void> {
        const dirPath = path.resolve('bot/interactions/commands');

        Logger.log("SETUP", "Starting caching commands...", {context: `Caching`})

        if (!fs.existsSync(dirPath)) {
            Logger.log("SETUP", "Ignoring commands: Commands directory not found.", {
                completed: true,
                context: `Caching`
            })
            return;
        }

        const fileNames = fs.readdirSync(dirPath);
        let count = 0;

        for (const name of fileNames) {
            const filePath = path.resolve(dirPath, name);

            // Import and initiate the command
            const commandModule = await import(filePath).catch(console.error);
            if (!commandModule) continue;

            const commandClass = commandModule.default;

            if (!(commandClass.prototype instanceof Command)) continue;

            let logMessage: string;

            if (commandClass.prototype instanceof GuildCommand) {
                const commandName = CommandManager.cacheGuildCommand(commandClass);

                logMessage = `Cached guild command ${commandName}`;
            } else {
                const command = new commandClass();
                CommandManager.globalCommands.set(command.data.name, command);

                logMessage = `Cached command ${command.data.name}`;
            }

            Logger.log("SETUP", `${logMessage}`, {completed: true, context: `Caching`});
            count++;
        }

        Logger.log("SETUP", `Cached ${count} ${pluralize(count, "command")} with no issues`, {
            context: `Caching`,
            completed: true
        })
    }

    /**
     * Publishes all cached commands to Discord.
     * It registers guild-specific commands for each respective guild and
     * registers global commands to the application.
     */
    static async publish(): Promise<void> {
        Logger.log("SETUP", `Attempting to publish commands to Discord...`, {
            context: `Publish`,
            completed: false
        })

        const logMessage = (commandCount: number): string => `${commandCount} ${pluralize(commandCount, "command")}`;

        // Publish guild commands
        for (const [_id, _commands] of CommandManager.guildCommands) {
            const guild = await client.guilds.fetch(_id);

            // Retrieve all the cached guild commands and build them
            const commands = _commands.map(command => command.build());
            const published = await guild.commands.set(commands).catch(() => null);

            if (!published) {
                Logger.log(`SETUP_COMMANDS_BY_GUILD_#${guild.id}`, `Could not publish guild commands...`)
                captureException(new Error(`Process exception: Failed to publish guild commands`));
                return;
            }

            Logger.log("SETUP", `Published ${logMessage(published.size)}`, {context: `Publish`, completed: true})
        }

        const globalCommands = CommandManager.globalCommands.map(command => command.build());

        if (!globalCommands.length) {
            Logger.log("SETUP", `Ignoring global commands: No commands found`, {context: `Publish`})
            return
        }

        const published = await client.application.commands.set(globalCommands).catch(console.error);

        if (!published) {
            Logger.log("SETUP", `Failed to publish global commands`, {context: `Publish`})
            captureException(new Error(`Process exception: Failed to publish global command`));
            return;
        }

        Logger.log("SETUP", `Published ${logMessage(published.size)}`, {
            context: `Publish`,
            completed: true
        })
    }

    /**
     * Hot-reloads all commands.
     * This involves clearing all commands from Discord, clearing internal caches,
     * clearing the Node.js module cache for the command files, and then re-running
     * the caching and publishing process.
     * @returns A promise that resolves with the count of reloaded commands or an error.
     */
    static async reload(): Promise<{ count: number, error?: Error }> {
        Logger.log("RELOAD", "Initiating hot-reload of commands...");

        try {
            const dirPath = path.resolve('bot/interactions/commands');
            if (!fs.existsSync(dirPath)) {
                Logger.warn("Cannot reload commands: Commands directory not found.", "RELOAD");
                return {count: 0};
            }

            // Unregister all commands from Discord to prevent ghost commands
            const guildIds = [...this.guildCommands.keys()];
            await client.application.commands.set([]);
            Logger.log("RELOAD", `Cleared all global commands from Discord.`);
            for (const guildId of guildIds) {
                const guild = await client.guilds.fetch(guildId).catch(() => null);
                if (guild) {
                    await guild.commands.set([]);
                    Logger.log("RELOAD", `Cleared commands from guild ${guild.name} (${guild.id}).`);
                }
            }

            // Clear internal command collections
            this.globalCommands.clear();
            this.guildCommands.clear();

            // Find and delete all command files from the Node.js module cache
            // This is the crucial step that allows updated files to be read
            const fileNames = fs.readdirSync(dirPath);
            for (const name of fileNames) {
                const filePath = path.resolve(dirPath, name);
                if (require.cache[filePath]) {
                    delete require.cache[filePath];
                }
            }
            Logger.log("RELOAD", `Un-cached ${fileNames.length} command modules.`);

            // Re-run the original caching and publishing logic
            await this.cache();
            await this.publish();

            const commandCount = this.globalCommands.size + this.guildCommands.reduce((acc, col) => acc + col.size, 0);
            return {count: commandCount};
        } catch (e) {
            const error = e as Error;
            Logger.error(`Command reload failed: ${error.message}`, 'RELOAD');
            captureException(error);
            return {count: 0, error};
        }
    }

    /**
     * Handles an incoming autocomplete interaction.
     * It retrieves the appropriate command and delegates the autocomplete logic to it.
     * @param interaction The autocomplete interaction to handle.
     */
    static handleAutocomplete(interaction: AutocompleteInteraction): Promise<void> | void {
        const command = CommandManager.get(interaction.commandId, interaction.commandName, interaction.guildId);

        if (!command) {
            throw new Error(`Command ${interaction.commandName} not found.`);
        }

        // @ts-ignore
        return command.autocomplete(interaction)
    }

    /**
     * Handles an incoming command interaction.
     * It retrieves the appropriate command and delegates the execution logic to it.
     * @param interaction The command interaction to handle.
     * @returns The reply data from the command execution.
     */
    static handleCommand(interaction: CommandInteraction): InteractionReplyData | Promise<InteractionReplyData> {
        const command = CommandManager.get(interaction.commandId, interaction.commandName, interaction.guildId);

        if (!command) {
            Logger.warn(`Command '${interaction.commandName}' not found or not registered for guild ${interaction.guildId}.`, 'Interaction');
            return {
                content: `The command '${interaction.commandName}' does not exist. It may have been recently removed.`,
                flags: MessageFlags.Ephemeral
            }
        }

        Logger.log("INFO", `Executing command: \`/${interaction.commandName}\` for user \`${interaction.user.tag}\` - In guild: ${interaction.guildId}`, {context: `Interaction`});
        return command.execute(interaction);
    }

    /**
     * Caches a guild-specific command.
     * It instantiates the command and adds it to the collection for each specified guild ID.
     * @param commandClass The guild command class to cache.
     * @returns The name of the cached command.
     */
    private static cacheGuildCommand(commandClass: any): string {
        const command = new commandClass() as GuildCommand<CommandInteraction>; // Instantiate the command
        const commandName = command.data.name;

        // Check if the command has specific guildIds, otherwise, it might be a global command misplaced.
        if (!command.guildIds || command.guildIds.length === 0) {
            Logger.warn(`GuildCommand '${commandName}' has no guildIds specified. It will not be cached for any guild.`, `Caching`);
            return commandName;
        }

        // Iterate over the guildIds SPECIFIED BY THE COMMAND
        for (const guildId of command.guildIds) {
            const guildCommands = CommandManager.guildCommands.get(guildId);

            if (guildCommands) {
                guildCommands.set(commandName, command);
            } else {
                // If this is the first command for this guild, create a new collection
                const newGuildCollection = new Collection<string, GuildCommand<CommandInteraction>>();
                newGuildCollection.set(commandName, command);
                CommandManager.guildCommands.set(guildId, newGuildCollection);
            }
        }

        return commandName;
    }

    /**
     * Retrieves a command from the cache.
     * It determines whether to look in the global or guild-specific cache based on the command ID.
     * @param commandId The snowflake ID of the command.
     * @param commandName The name of the command.
     * @param guildId The snowflake ID of the guild where the interaction occurred, if any.
     * @returns The command instance, or undefined if not found.
     */
    private static get(
        commandId: Snowflake,
        commandName: string,
        guildId: Snowflake | null,
    ): Command<CommandInteraction> | undefined {
        const isGlobal = client.application.commands.cache.has(commandId);

        if (isGlobal) {
            return CommandManager.globalCommands.get(commandName);
        }

        if (!guildId) return;

        const guildCommands = CommandManager.guildCommands.get(guildId);
        return guildCommands?.get(commandName);
    }
}