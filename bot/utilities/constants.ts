import {Colors, GatewayIntentBits, MessageMentionOptions, Partials, PermissionFlagsBits} from "discord.js";
import Boolean from "@/methods/Boolean";

export const EXIT_EVENTS = ["SIGHUP", "SIGINT", "SIGQUIT", "SIGILL", "SIGTRAP", "SIGABRT", "SIGBUS", "SIGFPE", "SIGUSR1", "SIGSEGV", "SIGUSR2", "SIGTERM", "uncaughtException", "unhandledRejection"];

// =======================================================================================
// APPLICATION INTENTS AND PARTIALS
// =======================================================================================

export const APP_CLIENT_INTENTS: readonly GatewayIntentBits[] = [
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.Guilds
];

export const APP_CLIENT_PARTIALS: readonly Partials[] = [
    Partials.Message,
    Partials.Reaction
];

// =======================================================================================
// TIMEZONE CONSTANTS
// =======================================================================================

export const DATE_DEFAULT_TIMEZONE = "UTC";

export const DATE_DEFAULT_FORMAT = "YYYY-MM-dd HH:mm:ss";

export const DATE_LOG_ENTRY_FORMAT: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: DATE_DEFAULT_TIMEZONE
};

// =======================================================================================
// discord CONSTANTS
// =======================================================================================

export const CLIENT_ALLOWED_MENTIONS: MessageMentionOptions = {parse: ["roles", "users"], repliedUser: false};
export const CLIENT_DEFAULT_COMMAND_PERMISSIONS: readonly bigint[] = [PermissionFlagsBits.ManageGuild];
export const CLIENT_DEFAULT_DM_PERMISSIONS: Boolean = new Boolean(true);

export const EMBED_FIELD_CHAR_LIMIT = 1000;
export const EMBED_DEFAULT_COLOR = Colors.Blurple;

export const DEVELOPERS: string[] = ['197402126597619713']

// =======================================================================================
// MISC
// =======================================================================================

export const DURATION_FORMAT = /^(\d+ *(days?|h(ou)?rs?|min(utes?)?|[mhd]) *)+$/gmi;

export const MAX_MUTE_DURATION = 1000 * 60 * 60 * 24 * 28;