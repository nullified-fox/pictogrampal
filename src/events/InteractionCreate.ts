import Event from "@/managers/events/Event";
import {
    AutocompleteInteraction,
    Events,
    Interaction,
    InteractionEditReplyOptions,
    InteractionReplyOptions,
    MessageFlags
} from "discord.js";
import CommandManager from "@/managers/commands/CommandManager";
import Logger from "@/utilities/logger";
import {captureException} from "@sentry/bun";
import {InteractionReplyData} from "@/utilities/types";
import ComponentManager from "@/managers/component/ComponentManager";

export default class InteractionCreate extends Event {
    // Constructor
    constructor() {
        super(Events.InteractionCreate);
    }

    // Public Methods
    public async execute(interaction: Interaction): Promise<void> {
        if (interaction.isAutocomplete()) {
            return this.handleAutocomplete(interaction);
        }

        if (!interaction.inCachedGuild()) {
            if (interaction.isRepliable()) {
                await interaction.reply({
                    content: "This command is not available in this context.",
                    flags: MessageFlags.Ephemeral
                }).catch(() => {
                });
            }
            return;
        }

        try {
            let response: InteractionReplyData | null = null;
            if (interaction.isCommand()) {
                response = await CommandManager.handleCommand(interaction);
            } else if (interaction.isMessageComponent() || interaction.isModalSubmit()) {
                response = await ComponentManager.handle(interaction);
            }

            if (response && interaction.isRepliable()) {
                const options = typeof response === 'string' ? {content: response} : response;
                if (interaction.deferred) {
                    await interaction.editReply(options as InteractionEditReplyOptions);
                } else {
                    await interaction.reply(options as InteractionReplyOptions);
                }
            }

        } catch (err) {
            await this.handleInteractionError(err, interaction);
        }
    }

    // Private Methods
    private async handleAutocomplete(interaction: AutocompleteInteraction): Promise<void> {
        try {
            await CommandManager.handleAutocomplete(interaction);
        } catch (err) {
            Logger.error(`Autocomplete failed for ${interaction.commandName}: ${err}`, interaction.guildId!);
        }
    }

    private async handleInteractionError(err: unknown, interaction: Interaction): Promise<void> {
        const error = err as Error;
        const sentryId = captureException(error, {user: {id: interaction.user.id}});
        Logger.error(`Error handling interaction: ${error.message}`, interaction.guild?.id);

        if (interaction.isRepliable()) {
            const errorMessage: InteractionReplyOptions | InteractionEditReplyOptions = {
                content: `⚠️ An unexpected error occurred. (ID: \`${sentryId}\`)`,
                flags: MessageFlags.Ephemeral
            };
            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply(errorMessage as InteractionEditReplyOptions);
                } else {
                    await interaction.reply(errorMessage);
                }
            } catch (replyError) {
                Logger.error(`Failed to send error reply: ${replyError}`, interaction.guild?.id);
            }
        }
    }
}