import GuildCommand from "@/managers/commands/GuildCommand";
import {ApplicationCommandOptionType, ChatInputCommandInteraction, Interaction} from "discord.js";
import {InteractionReplyData} from "@/utilities/types";

enum Subcommands {
    Start = "start",
    Guess = "guess",
    Hint = "hint",
}

export default class PuzzleCommand extends GuildCommand<ChatInputCommandInteraction<"cached">> {
    // Constructor
    constructor() {
        super({
            name: 'puzzle',
            description: 'Ready to test your wits? Solve emoji puzzles and prove you\'re the champion!',
            options: [
                {
                    name: Subcommands.Start,
                    description: 'Start the daily puzzle',
                    type: ApplicationCommandOptionType.Subcommand,
                },
                {
                    name: Subcommands.Guess,
                    description: 'Submit a guess',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'answer',
                            description: 'The answer you want to submit',
                            type: ApplicationCommandOptionType.String,
                            required: true,
                        }
                    ]
                },
                {
                    name: Subcommands.Hint,
                    description: 'Get a hint for the current puzzle',
                    type: ApplicationCommandOptionType.Subcommand,
                },
            ]
        })
    }

    async execute(interaction: ChatInputCommandInteraction<"cached">): Promise<InteractionReplyData> {
        switch (interaction.options.getSubcommand() as Subcommands) {
            case Subcommands.Start:
            case Subcommands.Guess:
            case Subcommands.Hint:
                return {content: `Work in progress`}
        }
    }

    // Private methods

    private static async startPuzzle() {

    }

    private static async guessPuzzle() {

    }

    private static async getHint() {

    }
}