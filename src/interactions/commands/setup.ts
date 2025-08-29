import Command from "@/managers/commands/Command";
import {ApplicationCommandOptionType, ChatInputCommandInteraction} from "discord.js";
import {InteractionReplyData} from "@/utilities/types";
import GuildCommand from "@/managers/commands/GuildCommand";

export default class SetupCommand extends GuildCommand<ChatInputCommandInteraction<"cached">> {
    // Constructor
    constructor() {
        super({
            name: 'setup',
            description: 'Manage the bot\'s settings.',
            options: [
                {
                    name: 'time',
                    description: 'Set the time for the daily puzzle',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'time',
                            description: 'The time in HH:MM UTC format.',
                            type: ApplicationCommandOptionType.String,
                            required: true,
                        }
                    ]
                },
                {
                    name: 'themes',
                    description: 'Manage the puzzle themes.',
                    type: ApplicationCommandOptionType.SubcommandGroup,
                    options: [
                        {
                            name: 'use-ai',
                            description: 'Generate a new puzzle using AI (Will be used the next available day)',
                            type: ApplicationCommandOptionType.Subcommand,
                            options: [
                                {
                                    name: 'theme',
                                    description: 'The theme for the puzzle',
                                    type: ApplicationCommandOptionType.String,
                                    required: true,
                                }
                            ]
                        },
                        {
                            name: 'use-custom',
                            description: 'Create a new puzzle with a custom theme',
                            type: ApplicationCommandOptionType.Subcommand,
                            options: [
                                {
                                    name: 'theme',
                                    description: 'The theme for the puzzle',
                                    type: ApplicationCommandOptionType.String,
                                    required: true,
                                },
                                {
                                    name: 'emojis',
                                    description: 'The emojis for the puzzle',
                                    type: ApplicationCommandOptionType.String,
                                    required: true,
                                },
                                {
                                    name: 'answer',
                                    description: 'The answer for the puzzle',
                                    type: ApplicationCommandOptionType.String,
                                    required: true,
                                },
                                {
                                    name: 'day',
                                    description: 'The day in YYYY-MM-DD UTC format',
                                    type: ApplicationCommandOptionType.String,
                                    required: true
                                }
                            ]
                        },
                        {
                            name: 'remove',
                            description: 'Remove a puzzle',
                            type: ApplicationCommandOptionType.Subcommand,
                            options: [
                                {
                                    name: 'puzzle_id',
                                    description: 'The ID of the puzzle to remove',
                                    type: ApplicationCommandOptionType.Number,
                                    required: true,
                                }
                            ]
                        },
                        {
                            name: 'list',
                            description: 'View all created puzzles',
                            type: ApplicationCommandOptionType.Subcommand
                        }
                    ]
                },
                {
                    name: 'hint',
                    description: 'Manage the hint settings',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'toggle',
                            description: 'Toggle the hint feedback system',
                            type: ApplicationCommandOptionType.Boolean,
                            required: false,
                        },
                        {
                            name: 'amount',
                            description: 'How many hints can be used (max 3)',
                            type: ApplicationCommandOptionType.Number,
                            max_value: 3,
                            required: false,
                        }
                    ]
                }
            ]
        }, ['906838609502552064']);
    }

    // Public Methods
    public async execute(interaction: ChatInputCommandInteraction<"cached">): Promise<InteractionReplyData> {
        return {content: `Command under maintenance`}
    }
}