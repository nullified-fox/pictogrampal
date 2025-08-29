import Command from "@/managers/commands/Command";
import {ApplicationCommandOptionType, ChatInputCommandInteraction} from "discord.js";
import {InteractionReplyData} from "@/utilities/types";

export default class StartCommand extends Command<ChatInputCommandInteraction<"cached">> {
    // Constructor
    constructor() {
        super({
            name: 'start',
            description: 'Start the daily puzzle',
            options: []
        });
    }

    // Public Methods
    public async execute(interaction: ChatInputCommandInteraction<"cached">): Promise<InteractionReplyData> {
        return {content: `Command under maintenance`}
    }
}