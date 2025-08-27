import {
    ApplicationCommandOptionType, ChatInputCommandInteraction,
    CommandInteraction,
    EmbedBuilder,
    Message, MessageFlags,
} from "discord.js";
import {evaluateGuess, generateGuessTheThing} from "@/managers/ai/gemini";
import {EMBED_DEFAULT_COLOR} from "@/utilities/constants";
import Command from "@/managers/commands/Command";
import {InteractionReplyData} from "@/utilities/types";

export default class GuessCommand extends Command<ChatInputCommandInteraction<"cached">> {
    constructor() {
        super({
            name: "guess",
            description: "Starts a 'guess the thing' game using emojis.",
            options: [
                {
                    name: "theme",
                    description: "The theme for the thing to guess.",
                    type: ApplicationCommandOptionType.String,
                    required: true,
                },
            ],
        });
    }

    async execute(interaction: ChatInputCommandInteraction<"cached">): Promise<InteractionReplyData> {
        const theme = interaction.options.get("theme")?.value as string;

        if (!theme) {
            return {
                content: "Please provide a theme.",
                flags: MessageFlags.Ephemeral
            };
        }

        await interaction.deferReply();

        const guessTheThing = await generateGuessTheThing(theme);

        if (!guessTheThing) {
            return {
                content: "Failed to generate a 'guess the thing' game. Please try again later.",
                flags: MessageFlags.Ephemeral
            };
        }

        const initialEmbed = new EmbedBuilder()
            .setColor(EMBED_DEFAULT_COLOR)
            .setTitle("Guess the Thing!")
            .setDescription(`Guess what this is: **${guessTheThing.emojis}**`)
            .addFields({name: "Theme", value: theme})
            .setFooter({text: "You have 5 guesses. | Type your answer in the chat."});

        if (!interaction.channel || !interaction.channel.isTextBased()) {
            return {
                content: "This command can only be used in a text channel.",
                flags: MessageFlags.Ephemeral
            };
        }

        await interaction.editReply({embeds: [initialEmbed]});

        const collector = interaction.channel.createMessageCollector({
            filter: (m: Message) => !m.author.bot,
            time: 60000, // 60 seconds
        });

        let guessCount = 0;
        const maxGuesses = 5;

        collector.on("collect", async (m: Message) => {
            guessCount++;
            if (m.content.toLowerCase() === guessTheThing.thing.toLowerCase()) {
                collector.stop("correct");
                const successEmbed = new EmbedBuilder()
                    .setColor("Green")
                    .setTitle("You got it!")
                    .setDescription(`Congratulations ${m.author}, you guessed it right! The answer was **${guessTheThing.thing}**.`)
                await interaction.followUp({embeds: [successEmbed]});
            } else {
                if(guessCount >= maxGuesses) {
                    collector.stop("limit");
                    return;
                }

                const feedback = await evaluateGuess(m.content, guessTheThing.thing, theme);
                const feedbackEmbed = new EmbedBuilder()
                    .setColor("Yellow")
                    .setTitle(`Guess ${guessCount}/${maxGuesses}`)
                    .setDescription(`**${m.content}**: ${feedback ?? "I'm not sure about that one."}`);
                await m.reply({embeds: [feedbackEmbed]});
            }
        });

        collector.on("end", (collected, reason) => {
            if (reason !== "correct") {
                const failureEmbed = new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("Game Over!")
                    .setDescription(`Nobody guessed it correctly. The answer was **${guessTheThing.thing}**.`)
                interaction.followUp({embeds: [failureEmbed]});
            }
        });
        return {}
    }
}
