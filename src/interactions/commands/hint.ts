import Command from "@/managers/commands/Command";
import {ChatInputCommandInteraction} from "discord.js";
import {InteractionReplyData} from "@/utilities/types";

export default class HintCommand extends Command<ChatInputCommandInteraction<"cached">> {
    constructor() {
        super({
            name: 'hint',
            description: 'Get a hint for the daily puzzle (2 max)'
        });
    }

    async execute(interaction: ChatInputCommandInteraction<"cached">): Promise<InteractionReplyData> {
        return {content: `Feature not yet implemented`}
    }
}