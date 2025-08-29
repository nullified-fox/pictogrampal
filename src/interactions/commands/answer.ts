import Command from "@/managers/commands/Command";
import {ChatInputCommandInteraction} from "discord.js";
import {InteractionReplyData} from "@/utilities/types";

export default class AnswerCommand extends Command<ChatInputCommandInteraction<"cached">> {
    constructor() {
        super({
            name: 'answer',
            description: 'Submit a guess for the answer'
        });
    }

    async execute(interaction: ChatInputCommandInteraction<"cached">): Promise<InteractionReplyData> {
        return {content: `Command under maintenance`}
    }
}