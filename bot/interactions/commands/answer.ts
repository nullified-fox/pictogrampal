import {
    ApplicationCommand,
    ApplicationCommandOptionType,
    ChatInputCommandInteraction,
    EmbedBuilder,
    MessageFlags,
    SlashCommandBuilder
} from "discord.js";
import Command from "@/managers/commands/Command";
import { InteractionReplyData } from "@/utilities/types";
import DatabaseManager from "@/managers/database/DatabaseManager";
import { evaluateGuess } from "@/managers/ai/gemini";
import Boolean from "@/methods/Boolean";

// Helper function to get the start of the day in UTC
function getStartOfDayUTC() {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

const MAX_GUESSES = 5;

export default class AnswerCommand extends Command<ChatInputCommandInteraction<"cached">> {
    constructor() {
        super({
            name: "answer",
            description: "Submit a guess for the daily puzzle.",
            options: [
                {
                    name: 'guess',
                    description: 'Your guess for the puzzle',
                    type: ApplicationCommandOptionType.String,
                    required: true
                }
            ]
        });
    }

    async execute(interaction: ChatInputCommandInteraction<"cached">): Promise<InteractionReplyData> {
        const guess = interaction.options.getString("guess", true);
        const prisma = DatabaseManager.getPrismaClient();
        const today = getStartOfDayUTC();
        const userId = interaction.user.id;

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
                return this.reply(interaction, `You haven't started the puzzle yet! Use \`/start\` to begin.`, false);
            }

            if (userPlay.completed) {
                return this.reply(interaction, `You have already completed today's puzzle! The answer was **${userPlay.puzzle.thing}**.`, false);
            }

            if (userPlay.guesses >= MAX_GUESSES) {
                return this.reply(interaction, `You have no more guesses left for today. The answer was **${userPlay.puzzle.thing}**.`, false);
            }

            const updatedPlay = await prisma.userPuzzlePlay.update({
                where: {
                    id: userPlay.id,
                },
                data: {
                    guesses: {
                        increment: 1,
                    },
                },
            });

            const newGuessCount = updatedPlay.guesses;
            const puzzle = userPlay.puzzle;

            if (guess.toLowerCase() === puzzle.thing.toLowerCase()) {
                await prisma.userPuzzlePlay.update({
                    where: { id: userPlay.id },
                    data: { completed: true },
                });

                const successEmbed = new EmbedBuilder()
                    .setColor("Green")
                    .setTitle("You got it!")
                    .setDescription(`Congratulations, you guessed it right! The answer was **${puzzle.thing}**.`)
                    .setFooter({ text: `You got it in ${newGuessCount} ${newGuessCount === 1 ? 'guess' : 'guesses'}!` });

                return this.replyEmbed(interaction, successEmbed, false)
            } else {
                if (newGuessCount >= MAX_GUESSES) {
                    const failureEmbed = new EmbedBuilder()
                        .setColor("Red")
                        .setTitle("Game Over!")
                        .setDescription(`That was your last guess! The answer was **${puzzle.thing}**.`)
                    return this.replyEmbed(interaction, failureEmbed, false)
                } else {
                    const feedback = await evaluateGuess(guess, puzzle.thing, puzzle.theme);
                    const remainingGuesses = MAX_GUESSES - newGuessCount;
                    const feedbackEmbed = new EmbedBuilder()
                        .setColor("Yellow")
                        .setTitle(`Guess ${newGuessCount}/${MAX_GUESSES}`)
                        .setDescription(`**${guess}**: ${feedback ?? "I'm not sure about that one."}`)
                        .setFooter({ text: `You have ${remainingGuesses} ${remainingGuesses === 1 ? 'guess' : 'guesses'} left.` });
                    return this.replyEmbed(interaction, feedbackEmbed, true)
                }
            }
        } catch (error) {
            console.error(error);
            // Consider using a more robust logger here
            return {
                content: "An error occurred while processing your guess. Please try again later.",
                flags: MessageFlags.Ephemeral,
            };
        }
    }
}
