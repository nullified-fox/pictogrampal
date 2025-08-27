import {ApplicationCommandData, CommandInteraction, Snowflake} from "discord.js";
import Command from "@/managers/commands/Command";

export default abstract class GuildCommand<T extends CommandInteraction> extends Command<T> {
    protected constructor(public override data: ApplicationCommandData, public guildIds?: Snowflake[]) {
        super(data);
    }
}