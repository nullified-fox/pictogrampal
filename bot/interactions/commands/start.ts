import Command from "@/managers/commands/Command";
import {ChatInputCommandInteraction} from "discord.js";
import {InteractionReplyData} from "@/utilities/types";

export default class StartCommand extends Command<ChatInputCommandInteraction<"cached">> {
    constructor() {
        super({
            name: 'start',
            description: 'Start the daily puzzle'
        });
    }

    async execute(interaction: ChatInputCommandInteraction<"cached">): Promise<InteractionReplyData> {
        return {content: `Command under maintenance`}
    }
}