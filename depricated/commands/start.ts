import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    MessageFlags,
} from "discord.js";
import { generateGuessTheThing } from "../../bot/managers/ai/gemini";
import { EMBED_DEFAULT_COLOR } from "../../bot/utilities/constants";
import Command from "../../bot/managers/commands/Command";
import { InteractionReplyData } from "../../bot/utilities/types";
import { THEMES } from "../../bot/utilities/themes";
import DatabaseManager from "../../bot/managers/database/DatabaseManager";

// Helper function to get the start of the day in UTC
function getStartOfDayUTC() {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export default class StartCommand extends Command<ChatInputCommandInteraction<"cached">> {
    constructor() {
        super({
            name: "start",
            description: "Start the daily theme puzzle",
        });
    }

    async execute(interaction: ChatInputCommandInteraction<"cached">): Promise<InteractionReplyData> {
        const prisma = DatabaseManager.getPrismaClient();
        const today = getStartOfDayUTC();
        const userId = interaction.user.id;

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            // Check if the user exists in the DB, if not create them
            await prisma.user.upsert({
                where: { id: userId },
                update: { username: interaction.user.username },
                create: { id: userId, username: interaction.user.username },
            });

            // Check if the user has already played today
            const existingPlay = await prisma.userPuzzlePlay.findFirst({
                where: {
                    userId: userId,
                    puzzle: {
                        date: today,
                    },
                },
            });

            if (existingPlay && existingPlay.completed) {
                return {
                    content: "You have already attempted the puzzle for today. Please come back tomorrow for a new one!",
                    flags: MessageFlags.Ephemeral,
                };
            }

            // Get or create the daily puzzle
            let dailyPuzzle = await prisma.dailyPuzzle.findUnique({
                where: { date: today },
            });

            if (!dailyPuzzle) {
                const theme = THEMES[Math.floor(Math.random() * THEMES.length)];
                const generatedPuzzle = await generateGuessTheThing(theme);

                if (!generatedPuzzle) {
                    return {
                        content: "Could not generate a puzzle for today. Please try again later.",
                        flags: MessageFlags.Ephemeral,
                    };
                }

                dailyPuzzle = await prisma.dailyPuzzle.create({
                    data: {
                        date: today,
                        theme: theme,
                        emojis: generatedPuzzle.emojis,
                        thing: generatedPuzzle.thing,
                    },
                });
            }

            // User hasn't played, so create a play record
            if (!existingPlay) {
                const userPlay = await prisma.userPuzzlePlay.create({
                    data: {
                        userId: userId,
                        puzzleId: dailyPuzzle.id,
                    },
                });
            }

            const initialEmbed = new EmbedBuilder()
                .setColor(EMBED_DEFAULT_COLOR)
                .setTitle("Guess the Thing!")
                .setDescription(`Guess what this is: **${dailyPuzzle.emojis}**`)
                .addFields({ name: "Theme", value: dailyPuzzle.theme })
                .setFooter({ text: `You have 5 guesses. Use the /answer command to make a guess.` });

            await interaction.editReply({
                embeds: [initialEmbed],
            });

            return {};
        } catch (error) {
            console.error(error);
            return {
                content: "An error occurred while starting the puzzle. Please try again later.",
                flags: MessageFlags.Ephemeral,
            };
        }
    }
}
