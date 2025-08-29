import {InteractionReplyData} from "@/utilities/types";
import {MessageComponentInteraction, ModalSubmitInteraction} from "discord.js";

export default abstract class Component {
    // Constructor
    protected constructor(public readonly customId: CustomID) {
    };

    // Public Methods
    public abstract execute(interaction: ComponentInteraction): InteractionReplyData | Promise<InteractionReplyData>
}

export type ComponentInteraction = MessageComponentInteraction | ModalSubmitInteraction;
export type CustomID = string | { startsWith: string } | { endsWith: string } | { includes: string } | {
    matches: RegExp
};