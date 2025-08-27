import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    Message,
    MessageFlags,
} from "discord.js";
import { evaluateGuess, generateGuessTheThing } from "@/managers/ai/gemini";
import { EMBED_DEFAULT_COLOR } from "@/utilities/constants";
import Command from "@/managers/commands/Command";
import { InteractionReplyData } from "@/utilities/types";
import { THEMES } from "@/utilities/themes";
import DatabaseManager from "@/managers/database/DatabaseManager";

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

            if (existingPlay) {
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
            const userPlay = await prisma.userPuzzlePlay.create({
                data: {
                    userId: userId,
                    puzzleId: dailyPuzzle.id,
                },
            });

            await interaction.editReply({
                content: "Your daily puzzle is ready! You can guess in the channel.",
            });

            const initialEmbed = new EmbedBuilder()
                .setColor(EMBED_DEFAULT_COLOR)
                .setTitle("Guess the Thing!")
                .setDescription(`Guess what this is: **${dailyPuzzle.emojis}**`)
                .addFields({ name: "Theme", value: dailyPuzzle.theme })
                .setFooter({ text: "You have 5 guesses. | Type your answer in the chat." });

            if (!interaction.channel || !interaction.channel.isTextBased()) {
                // This should ideally not happen with ephemeral reply, but as a safeguard
                return {
                    content: "This command can only be used in a text channel.",
                    flags: MessageFlags.Ephemeral
                };
            }

            const gameMessage = await interaction.channel.send({ embeds: [initialEmbed] });

            const collector = interaction.channel.createMessageCollector({
                filter: (m: Message) => m.author.id === interaction.user.id && !m.author.bot,
                time: 60000, // 60 seconds
            });

            const maxGuesses = 5;

            collector.on("collect", async (m: Message) => {
                const currentPlay = await prisma.userPuzzlePlay.findUnique({ where: { id: userPlay.id } });
                if (!currentPlay || currentPlay.guesses >= maxGuesses) {
                    collector.stop("limit");
                    return;
                }

                await prisma.userPuzzlePlay.update({
                    where: { id: userPlay.id },
                    data: { guesses: { increment: 1 } },
                });

                const newGuessCount = currentPlay.guesses + 1;

                if (m.content.toLowerCase() === dailyPuzzle!.thing.toLowerCase()) {
                    collector.stop("correct");
                    await prisma.userPuzzlePlay.update({
                        where: { id: userPlay.id },
                        data: { completed: true },
                    });
                    const successEmbed = new EmbedBuilder()
                        .setColor("Green")
                        .setTitle("You got it!")
                        .setDescription(`Congratulations ${m.author}, you guessed it right! The answer was **${dailyPuzzle!.thing}**.`)
                    await gameMessage.reply({ embeds: [successEmbed] });
                } else {
                    if (newGuessCount >= maxGuesses) {
                        collector.stop("limit");
                        return;
                    }

                    const feedback = await evaluateGuess(m.content, dailyPuzzle!.thing, dailyPuzzle!.theme);
                    const feedbackEmbed = new EmbedBuilder()
                        .setColor("Yellow")
                        .setTitle(`Guess ${newGuessCount}/${maxGuesses}`)
                        .setDescription(`**${m.content}**: ${feedback ?? "I'm not sure about that one."}`);
                    await m.reply({ embeds: [feedbackEmbed] });
                }
            });

            collector.on("end", async (collected, reason) => {
                const finalPlayState = await prisma.userPuzzlePlay.findUnique({ where: { id: userPlay.id }});
                if (reason !== "correct" && !finalPlayState?.completed) {
                    const failureEmbed = new EmbedBuilder()
                        .setColor("Red")
                        .setTitle("Game Over!")
                        .setDescription(`You've used all your guesses! The answer was **${dailyPuzzle!.thing}**.`)
                    await gameMessage.reply({ embeds: [failureEmbed] });
                }
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
