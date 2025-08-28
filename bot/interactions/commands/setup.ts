import Command from "@/managers/commands/Command";
import {ChatInputCommandInteraction} from "discord.js";
import {InteractionReplyData} from "@/utilities/types";

export default class SetupCommand extends Command<ChatInputCommandInteraction<"cached">> {
    constructor() {
        super({
            name: 'setup',
            description: 'Placeholder'
        });
    }

    async execute(interaction: ChatInputCommandInteraction<"cached">): Promise<InteractionReplyData> {
        return {content: `Command under maintenance`}
    }
}