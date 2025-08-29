import {InteractionReplyData} from "@/utilities/types";
import {MessageComponentInteraction, ModalSubmitInteraction} from "discord.js";

export default abstract class Component {
    protected constructor(public readonly customId: CustomID) {
    };

    abstract execute(interaction: ComponentInteraction): InteractionReplyData | Promise<InteractionReplyData>
}

export type ComponentInteraction = MessageComponentInteraction | ModalSubmitInteraction;
export type CustomID = string | { startsWith: string } | { endsWith: string } | { includes: string } | {
    matches: RegExp
};