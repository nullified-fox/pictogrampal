import {
    ApplicationCommandData,
    AutocompleteInteraction,
    CommandInteraction,
    MessageFlags,
    TextChannel
} from "discord.js";
import {InteractionReplyData} from "@/utilities/types";
import {CLIENT_DEFAULT_COMMAND_PERMISSIONS, CLIENT_DEFAULT_DM_PERMISSIONS} from "@/utilities/constants";
import Boolean from "@/structures/Boolean";

export default abstract class Command<T extends CommandInteraction> {
    // Constructor
    protected constructor(public readonly data: ApplicationCommandData) {
    }

    // Public Methods
    public abstract execute(interaction: T): InteractionReplyData | Promise<InteractionReplyData>;

    public autocomplete?(interaction: AutocompleteInteraction): void | Promise<void>;

    public build(): ApplicationCommandData {
        this.data.defaultMemberPermissions ??= CLIENT_DEFAULT_COMMAND_PERMISSIONS;
        this.data.dmPermission ??= CLIENT_DEFAULT_DM_PERMISSIONS.value;
        return this.data
    }

    // Protected Methods
    protected reply(interaction: T, content: string, isPublic?: boolean): InteractionReplyData {
        return {
            content,
            flags: isPublic ? undefined : MessageFlags.Ephemeral
        };
    }

    protected replyEmbed(interaction: T, embedOptions: any, isPublic: boolean): InteractionReplyData {
        return {
            embeds: [embedOptions],
            flags: isPublic ? undefined : MessageFlags.Ephemeral
        }
    }
}