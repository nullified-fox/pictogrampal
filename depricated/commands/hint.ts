import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    MessageFlags,
} from "discord.js";
import Command from "../../bot/managers/commands/Command";
import { InteractionReplyData } from "../../bot/utilities/types";
import DatabaseManager from "../../bot/managers/database/DatabaseManager";
import { generateHint } from "../../bot/managers/ai/gemini";

// Helper function to get the start of the day in UTC
function getStartOfDayUTC() {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

const MAX_GUESSES = 5;

export default class HintCommand extends Command<ChatInputCommandInteraction<"cached">> {
    constructor() {
        super({
            name: "hint",
            description: "Get a hint for the daily puzzle.",
        });
    }

    async execute(interaction: ChatInputCommandInteraction<"cached">): Promise<InteractionReplyData> {
        const prisma = DatabaseManager.getPrismaClient();
        const today = getStartOfDayUTC();
        const userId = interaction.user.id;

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const userPlay = await prisma.userPuzzlePlay.findFirst({
                where: {
                    userId: userId,
                    puzzle: {
                        date: today,
                    },
                },
                include: {
                    puzzle: true,
                },
            });

            if (!userPlay) {
                return {
                    content: "You haven't started the puzzle yet! Use `/start` to begin.",
                    flags: MessageFlags.Ephemeral,
                };
            }

            if (userPlay.completed) {
                return {
                    content: `You have already completed today's puzzle! The answer was **${userPlay.puzzle.thing}**.`,
                    flags: MessageFlags.Ephemeral,
                };
            }

            if (userPlay.guesses >= MAX_GUESSES) {
                return {
                    content: `You have no more guesses left. The answer was **${userPlay.puzzle.thing}**.`,
                    flags: MessageFlags.Ephemeral,
                };
            }

            if (userPlay.hintsUsed >= 2) {
                return {
                    content: "You have already used your hints for today's puzzle.",
                    flags: MessageFlags.Ephemeral,
                };
            }

            const hint = await generateHint(userPlay.puzzle.thing, userPlay.puzzle.theme, userPlay.puzzle.emojis);

            if (!hint) {
                return {
                    content: "I couldn't generate a hint for you right now. Please try again later.",
                    flags: MessageFlags.Ephemeral,
                };
            }

            const updatedPlay = await prisma.userPuzzlePlay.update({
                where: {
                    id: userPlay.id,
                },
                data: {
                    hintsUsed: {increment: 1},
                },
            });

            const hintEmbed = new EmbedBuilder()
                .setColor("Blue")
                .setTitle("Here's a hint!")
                .setDescription(hint)

            await interaction.editReply({ embeds: [hintEmbed] });

            return {};
        } catch (error) {
            console.error(error);
            return {
                content: "An error occurred while getting a hint. Please try again later.",
                flags: MessageFlags.Ephemeral,
            };
        }
    }
}
