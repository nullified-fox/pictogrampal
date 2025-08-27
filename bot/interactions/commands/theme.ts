import {
    ApplicationCommandOptionType,
    AutocompleteInteraction,
    ChatInputCommandInteraction,
    MessageFlags,
} from "discord.js";
import { THEMES } from "@/utilities/themes";
import GuildCommand from "@/managers/commands/GuildCommand";
import { InteractionReplyData } from "@/utilities/types";
import DatabaseManager from "@/managers/database/DatabaseManager";
import { generateGuessTheThing } from "@/managers/ai/gemini";

// Helper function to get the start of the day in UTC
function getStartOfDayUTC(date: Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export default class ThemeCommand extends GuildCommand<ChatInputCommandInteraction<"cached">> {
    constructor() {
        super({
            name: "theme",
            description: "Manage the daily themes for the bot.",
            options: [
                {
                    name: "set",
            description: "Set a custom puzzle for given days.",
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: "theme",
                    description: "The theme for the puzzle.",
                    type: ApplicationCommandOptionType.String,
                    required: true,
                },
                {
                    name: "emojis",
                    description: "The emojis for the puzzle.",
                    type: ApplicationCommandOptionType.String,
                    required: true,
                },
                {
                    name: "answer",
                    description: "The answer to the puzzle.",
                            type: ApplicationCommandOptionType.String,
                            required: true,
                        },
                        {
                            name: "days",
                    description: "The days to set the puzzle for (e.g., 'today', 'tomorrow', '2024-12-25').",
                            type: ApplicationCommandOptionType.String,
                            required: true,
                        },
                    ],
                },
                {
                    name: "ai",
                    description: "Let AI generate a theme for given days.",
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: "days",
                            description: "The days to generate a theme for (e.g., 'today', 'tomorrow', '2024-12-25').",
                            type: ApplicationCommandOptionType.String,
                            required: true,
                        },
                    ],
                },
            ],
        }, ['906838609502552064']);
    }

    override async autocomplete(interaction: AutocompleteInteraction) {
        const focusedValue = interaction.options.getFocused();
        const filtered = THEMES.filter(theme => theme.toLowerCase().startsWith(focusedValue.toLowerCase()));
        await interaction.respond(
            filtered.map(theme => ({name: theme, value: theme})),
        );
    }

    async execute(interaction: ChatInputCommandInteraction<"cached">): Promise<InteractionReplyData> {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === "set") {
            return this.handleSet(interaction);
        }

        if (subcommand === "ai") {
            return this.handleAi(interaction);
        }

        return {
            content: "Invalid subcommand.",
            flags: MessageFlags.Ephemeral,
        }
    }

    private parseDays(daysString: string): Date[] {
        const dates: Date[] = [];
        const parts = daysString.split(',').map(part => part.trim());

        for (const part of parts) {
            if (part.toLowerCase() === 'today') {
                const now = new Date();
                dates.push(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())));
            } else if (part.toLowerCase() === 'tomorrow') {
                const tomorrow = new Date();
                tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
                dates.push(new Date(Date.UTC(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth(), tomorrow.getUTCDate())));
            } else if (part.includes('-') && !part.startsWith('-')) {
                const [year, month, day] = part.split('-').map(Number);
                if (year && month && day) {
                    dates.push(new Date(Date.UTC(year, month - 1, day)));
                }
            }
        }

        return dates;
    }

    private async handleSet(interaction: ChatInputCommandInteraction<"cached">): Promise<InteractionReplyData> {
        const theme = interaction.options.getString("theme", true);
        const emojis = interaction.options.getString("emojis", true);
        const answer = interaction.options.getString("answer", true);
        const daysString = interaction.options.getString("days", true);
        const dates = this.parseDays(daysString);

        if (dates.length === 0) {
            return {
                content: "Invalid date format. Please use 'today', 'tomorrow', or 'YYYY-MM-DD'.",
                flags: MessageFlags.Ephemeral,
            };
        }

        const prisma = DatabaseManager.getPrismaClient();

        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            for (const date of dates) {
                const startOfDay = getStartOfDayUTC(date);
                await prisma.dailyPuzzle.upsert({
                    where: { date: startOfDay },
                    update: {
                        theme: theme,
                        emojis: emojis,
                        thing: answer,
                    },
                    create: {
                        date: startOfDay,
                        theme: theme,
                        emojis: emojis,
                        thing: answer,
                    },
                });
            }

            await interaction.editReply({
                content: `Custom puzzle has been set for the specified days.`,
            });

            return {};
        } catch (error) {
            console.error(error);
            return {
                content: "An error occurred while setting the custom puzzle. Please try again later.",
                flags: MessageFlags.Ephemeral,
            };
        }
    }

    private async handleAi(interaction: ChatInputCommandInteraction<"cached">): Promise<InteractionReplyData> {
        const daysString = interaction.options.getString("days", true);
        const dates = this.parseDays(daysString);

        if (dates.length === 0) {
            return {
                content: "Invalid date format. Please use 'today', 'tomorrow', or 'YYYY-MM-DD'.",
                flags: MessageFlags.Ephemeral,
            };
        }

        const prisma = DatabaseManager.getPrismaClient();

        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            for (const date of dates) {
                const startOfDay = getStartOfDayUTC(date);
                const theme = THEMES[Math.floor(Math.random() * THEMES.length)];

                if (!theme) {
                    await interaction.editReply({
                        content: `Failed to generate a theme for ${date.toDateString()}.`,
                    });
                    continue;
                }

                const puzzle = await generateGuessTheThing(theme);

                if (!puzzle) {
                    await interaction.editReply({
                        content: `Failed to generate a puzzle for ${date.toDateString()}.`,
                    });
                    continue;
                }

                await prisma.dailyPuzzle.upsert({
                    where: { date: startOfDay },
                    update: {
                        theme: theme,
                        emojis: puzzle.emojis,
                        thing: puzzle.thing,
                    },
                    create: {
                        date: startOfDay,
                        theme: theme,
                        emojis: puzzle.emojis,
                        thing: puzzle.thing,
                    },
                });
            }

            await interaction.editReply({
                content: `AI-generated themes have been set for the specified days.`,
            });

            return {};
        } catch (error) {
            console.error(error);
            return {
                content: "An error occurred while setting the AI-generated theme. Please try again later.",
                flags: MessageFlags.Ephemeral,
            };
        }
    }
}
