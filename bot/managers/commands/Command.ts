import {
    ApplicationCommandData,
    AutocompleteInteraction,
    CommandInteraction,
    MessageFlags,
    TextChannel
} from "discord.js";
import {InteractionReplyData} from "@/utilities/types";
import {CLIENT_DEFAULT_COMMAND_PERMISSIONS, CLIENT_DEFAULT_DM_PERMISSIONS} from "@/utilities/constants";
import Boolean from "@/methods/Boolean";

export default abstract class Command<T extends CommandInteraction> {
    protected constructor(public readonly data: ApplicationCommandData) {
    }

    abstract execute(interaction: T): InteractionReplyData | Promise<InteractionReplyData>;

    autocomplete?(interaction: AutocompleteInteraction): void | Promise<void>;

    build(): ApplicationCommandData {
        this.data.defaultMemberPermissions ??= CLIENT_DEFAULT_COMMAND_PERMISSIONS;
        this.data.dmPermission ??= CLIENT_DEFAULT_DM_PERMISSIONS.value;
        return this.data
    }

    protected reply(interaction: T, content: string, isPublic?: Boolean): InteractionReplyData {
        return {
            content,
            flags: (isPublic?.value) ? undefined : MessageFlags.Ephemeral
        };
    }
}