import GuildCommand from "@/managers/commands/GuildCommand";
import {
    ApplicationCommandOptionType,
    ChatInputCommandInteraction,
    EmbedBuilder,
    Interaction,
    Message,
    MessageFlags
} from "discord.js";
import {InteractionReplyData} from "@/utilities/types";
import PuzzleDatabaseManager from "@/managers/database/PuzzleDatabaseManager";
import {DailyPuzzle, UserPuzzlePlay} from "@prisma/client";
import AIManager from "@/managers/ai/manager";
import Command from "@/managers/commands/Command";

enum Subcommands {
    Start = "start",
    Guess = "guess",
    Hint = "hint",
}

export default class PuzzleCommand extends Command<ChatInputCommandInteraction<"cached">> {
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
                return this.startPuzzle(interaction);
            case Subcommands.Guess:
                return this.guessPuzzle(interaction);
            case Subcommands.Hint:
                return this.getHint(interaction);
        }
    }

    // Private methods

    private async startPuzzle(interaction: ChatInputCommandInteraction<"cached">): Promise<InteractionReplyData> {
        await PuzzleDatabaseManager.getOrCreateUser(interaction.user.id, interaction.user.username);

        const puzzle = await PuzzleDatabaseManager.getTodayPuzzle() || null;
        if (!puzzle) return {content: `\`\`\`❌ Sorry, there isn't a puzzle generated right now. Please check back later.\`\`\``, flags: MessageFlags.Ephemeral};

        const userPlay = await PuzzleDatabaseManager.getUserPlay(interaction.user.id, puzzle.id);
        if (userPlay?.completed) {
            return {content: `You've already completed today's puzzle! Come back tomorrow for a new one. The answer was: **${puzzle.thing}**`};
        }

        if (!userPlay) {
            await PuzzleDatabaseManager.createUserPlay(interaction.user.id, puzzle.id);
        }

        const embed = this.createPuzzleEmbed(puzzle);

        return {
            embeds: [embed],
            flags: MessageFlags.Ephemeral
        }
    }

    private async guessPuzzle(interaction: ChatInputCommandInteraction<"cached">): Promise<InteractionReplyData> {
        const puzzle = await PuzzleDatabaseManager.getTodayPuzzle() || null;
        if (!puzzle) return {content: `\`\`\`❌ Sorry, there isn't a puzzle generated right now. Please check back later.\`\`\``, flags: MessageFlags.Ephemeral};

        const userPlay = await PuzzleDatabaseManager.getUserPlay(interaction.user.id, puzzle.id);
        if (!userPlay) {
            return {content: `You haven't started today's puzzle. Use \`/puzzle start\` to begin.`, flags: MessageFlags.Ephemeral};
        }

        if (userPlay.completed) {
            return this.handleCorrectGuess(interaction, userPlay.id, puzzle.thing)
        }

        const guess = interaction.options.getString("answer", true);
        await PuzzleDatabaseManager.updateUserPlay(userPlay.id, {guesses: {increment: 1}});

        if (guess.toLowerCase() === puzzle.thing.toLowerCase()) {
            return this.handleCorrectGuess(interaction, userPlay.id, puzzle.thing);
        }

        if (userPlay.guesses >= 5) {
            return this.handleGameOver(interaction, userPlay.id, puzzle.thing);
        }

        await interaction.deferReply();

        const feedback = await AIManager.gemini.evaluateGuess(guess, puzzle.thing, puzzle.theme);
        if (feedback) return this.handleIncorrectGuess(userPlay, guess, feedback);

        // Error correction
        await PuzzleDatabaseManager.updateUserPlay(userPlay.id, {guesses: {decrement: 1}});
        return {content: `Something happened while processing this`}
    }

    private async getHint(interaction: ChatInputCommandInteraction<"cached">): Promise<InteractionReplyData> {
        await interaction.deferReply({flags: MessageFlags.Ephemeral});

        const puzzle = await PuzzleDatabaseManager.getTodayPuzzle();
        if (!puzzle) {
            return {
                content: `\`\`\`❌ Sorry, there isn't a puzzle generated right now. Please check back later.\`\`\``,
            };
        }

        const userPlay = await PuzzleDatabaseManager.getUserPlay(interaction.user.id, puzzle.id);
        if (!userPlay) {
            return { content: "You haven't started today's puzzle. Use `/puzzle start` to begin." };
        }

        if (userPlay.completed) {
            return this.handleCorrectGuess(interaction, userPlay.id, puzzle.thing)
        }

        const hintsAllowed = await PuzzleDatabaseManager.getHintsAllowed();
        if (userPlay.hintsUsed >= hintsAllowed) {
            return { content: "You've used all your hints for today's puzzle." };
        }

        const hint = await AIManager.gemini.generateHint(puzzle.thing, puzzle.theme, puzzle.emojis);
        if (!hint) {
            return { content: "Sorry, I couldn't generate a hint for you right now. Please try again later." };
        }

        await PuzzleDatabaseManager.updateUserPlay(userPlay.id, { hintsUsed: { increment: 1 } });

        const hintEmbed = new EmbedBuilder()
            .setTitle("🔎 Hint")
            .setDescription(hint)
            .setColor("Yellow")
            .setFooter({text: `You have ${hintsAllowed - userPlay.hintsUsed - 1} hints remaining.`});

        return { embeds: [hintEmbed], flags: MessageFlags.Ephemeral };
    }

    private async handleCorrectGuess(interaction: ChatInputCommandInteraction<"cached">, userPlayId: number, answer: string): Promise<InteractionReplyData> {
        await PuzzleDatabaseManager.updateUserPlay(userPlayId, { completed: true });
        await PuzzleDatabaseManager.incrementUserScore(interaction.user.id, 10);
        await PuzzleDatabaseManager.incrementUserStreak(interaction.user.id);

        const data = await PuzzleDatabaseManager.getOrCreateUser(interaction.user.id, interaction.user.username);

        const congratsEmbed = new EmbedBuilder()
            .setTitle("Congratulations! 🎉")
            .setDescription(`You solved the puzzle! The answer was **${answer}**.\n\nYou've been awarded 10 points!\n⭐ Your streak is now ${data.streak}`)
            .setColor("Gold")
            .setFooter({text: "Come back tomorrow for a new puzzle!"});

        return { embeds: [congratsEmbed], flags: MessageFlags.Ephemeral };
    }

    private async handleGameOver(interaction: ChatInputCommandInteraction<"cached">, userPlayId: number, answer: string): Promise<InteractionReplyData> {
        const data = await PuzzleDatabaseManager.getOrCreateUser(interaction.user.id, interaction.user.username);
        const oldStreak = data.streak;

        await PuzzleDatabaseManager.updateUserPlay(userPlayId, { completed: false });
        await PuzzleDatabaseManager.decrementUserScore(interaction.user.id, 3);
        await PuzzleDatabaseManager.clearUserStreak(interaction.user.id);

        const gameoverEmbed = new EmbedBuilder()
            .setTitle("Game Over! 😞")
            .setDescription(`You've exhausted all your guesses! The answer was **${answer}**.\n\nYou've lost 3 points!\n${data.streak > 1 ? `⛓️‍💥 Streak lost! You had a ${oldStreak} streak.` : `⛓️‍💥 You didn't have a streak, and you still don't.`}`)
            .setColor("Red")
            .setFooter({text: "Better luck next time. Come back tomorrow for a new puzzle!"})

        return {embeds: [gameoverEmbed], flags: MessageFlags.Ephemeral };
    }

    private async handleIncorrectGuess(userPlay: UserPuzzlePlay, guess: string, feedback: string): Promise<InteractionReplyData> {
        const incorrectEmbed = new EmbedBuilder()
            .setTitle(`Guess ${userPlay.guesses}/5`)
            .setDescription(`**${guess}**: ${feedback}`)

        return {embeds: [incorrectEmbed] };
    }

    private createPuzzleEmbed(puzzle: DailyPuzzle): EmbedBuilder {
        return new EmbedBuilder()
            .setTitle("Today's Puzzle")
            .setDescription(`Guess the puzzle based on the emojis below!\n\n**${puzzle.emojis}**`)
            .setColor("Aqua")
            .setFooter({ text: `Theme: ${puzzle.theme}` });
    }
}